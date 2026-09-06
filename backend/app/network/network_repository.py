import os
import uuid
from typing import List, Optional, Tuple
from pathlib import Path
import httpx
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete

from app.infrastructure.database.models.network import RoadNetwork, NetworkNode, NetworkEdge

# Ensure env variables are loaded
env_file = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_file)


class NetworkRepository:
    def __init__(self, db: Optional[AsyncSession] = None):
        self.db = db
        self.supabase_url = os.getenv("SUPABASE_URL", "https://oiehjulozbktlapmctsr.supabase.co")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "sb_publishable_VFCbkxMC6AhePvJ6N6fVUA_bT4cVkyi")
        self.headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    async def get_or_create_road_network(
        self,
        organization_id: str,
        name: str,
        source: str = "OSM",
        version: str = "v1.0"
    ) -> Tuple[RoadNetwork, bool]:
        """
        Idempotent network lookup/creation.
        Returns (road_network_model, created_boolean).
        """
        org_uuid = uuid.UUID(organization_id) if isinstance(organization_id, str) else organization_id
        
        # Try SQLAlchemy first if available
        if self.db:
            try:
                stmt = select(RoadNetwork).where(
                    RoadNetwork.organization_id == org_uuid,
                    RoadNetwork.name == name,
                    RoadNetwork.source == source,
                    RoadNetwork.version == version
                )
                res = await self.db.execute(stmt)
                existing = res.scalar_one_or_none()
                if existing:
                    return existing, False

                new_net = RoadNetwork(
                    id=uuid.uuid4(),
                    organization_id=org_uuid,
                    name=name,
                    source=source,
                    version=version,
                )
                self.db.add(new_net)
                await self.db.commit()
                await self.db.refresh(new_net)
                return new_net, True
            except Exception as e:
                print(f"[NetworkRepository] SQLAlchemy error: {e}. Falling back to Supabase REST API.")

        # Fallback / Direct Supabase REST API
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Query existing
            q_url = f"{self.supabase_url}/rest/v1/road_networks?organization_id=eq.{org_uuid}&name=eq.{name}&source=eq.{source}&version=eq.{version}"
            r = await client.get(q_url, headers=self.headers)
            if r.status_code == 200 and r.json():
                item = r.json()[0]
                net = RoadNetwork(
                    id=uuid.UUID(item["id"]),
                    organization_id=uuid.UUID(item["organization_id"]),
                    name=item["name"],
                    source=item["source"],
                    version=item["version"]
                )
                return net, False

            # Create new
            net_id = uuid.uuid4()
            payload = {
                "id": str(net_id),
                "organization_id": str(org_uuid),
                "name": name,
                "source": source,
                "version": version
            }
            r_post = await client.post(f"{self.supabase_url}/rest/v1/road_networks", headers=self.headers, json=payload)
            if r_post.status_code in (200, 201):
                item = r_post.json()[0] if isinstance(r_post.json(), list) and r_post.json() else payload
                net = RoadNetwork(
                    id=uuid.UUID(item["id"]),
                    organization_id=uuid.UUID(item["organization_id"]),
                    name=item["name"],
                    source=item["source"],
                    version=item["version"]
                )
                return net, True
            else:
                print(f"[NetworkRepository] REST POST error: {r_post.status_code} - {r_post.text}")
                net = RoadNetwork(id=net_id, organization_id=org_uuid, name=name, source=source, version=version)
                return net, True

    async def save_nodes_and_edges(
        self,
        network_id: uuid.UUID,
        nodes: List[NetworkNode],
        edges: List[NetworkEdge]
    ) -> Tuple[int, int]:
        """
        Persist network_nodes and network_edges to Supabase database.
        Clears previous nodes/edges for this network_id if re-importing.
        Returns (inserted_node_count, inserted_edge_count).
        """
        if self.db:
            try:
                await self.db.execute(delete(NetworkEdge).where(NetworkEdge.network_id == network_id))
                await self.db.execute(delete(NetworkNode).where(NetworkNode.network_id == network_id))

                self.db.add_all(nodes)
                await self.db.flush()

                self.db.add_all(edges)
                await self.db.commit()

                return len(nodes), len(edges)
            except Exception as e:
                print(f"[NetworkRepository] SQLAlchemy batch insert error: {e}. Falling back to Supabase REST API.")

        # Batch insert via Supabase REST API
        async with httpx.AsyncClient(timeout=60.0) as client:
            # 1. Clear existing edges and nodes
            await client.delete(f"{self.supabase_url}/rest/v1/network_edges?network_id=eq.{network_id}", headers=self.headers)
            await client.delete(f"{self.supabase_url}/rest/v1/network_nodes?network_id=eq.{network_id}", headers=self.headers)

            # 2. Insert nodes in chunks of 200
            node_payloads = [
                {
                    "id": str(node.id),
                    "network_id": str(node.network_id),
                    "external_id": node.external_id,
                    "lat": float(node.lat),
                    "lng": float(node.lng),
                }
                for node in nodes
            ]
            for i in range(0, len(node_payloads), 200):
                chunk = node_payloads[i:i + 200]
                await client.post(f"{self.supabase_url}/rest/v1/network_nodes", headers=self.headers, json=chunk)

            # 3. Insert edges in chunks of 200
            edge_payloads = [
                {
                    "id": str(edge.id),
                    "network_id": str(edge.network_id),
                    "external_id": edge.external_id,
                    "from_node_id": str(edge.from_node_id),
                    "to_node_id": str(edge.to_node_id),
                    "road_name": edge.road_name,
                    "length_meters": float(edge.length_meters),
                    "speed_limit_kph": float(edge.speed_limit_kph),
                    "road_type": edge.road_type,
                    "capacity_vehicles": int(edge.capacity_vehicles),
                    "geometry": edge.geometry,
                }
                for edge in edges
            ]
            for i in range(0, len(edge_payloads), 200):
                chunk = edge_payloads[i:i + 200]
                await client.post(f"{self.supabase_url}/rest/v1/network_edges", headers=self.headers, json=chunk)

        return len(nodes), len(edges)

    async def get_networks_by_org(self, organization_id: str) -> List[RoadNetwork]:
        org_uuid = uuid.UUID(organization_id) if isinstance(organization_id, str) else organization_id
        if self.db:
            try:
                stmt = select(RoadNetwork).where(RoadNetwork.organization_id == org_uuid).order_by(RoadNetwork.created_at.desc())
                res = await self.db.execute(stmt)
                return list(res.scalars().all())
            except Exception:
                pass

        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{self.supabase_url}/rest/v1/road_networks?organization_id=eq.{org_uuid}&order=created_at.desc", headers=self.headers)
            if r.status_code == 200:
                return [
                    RoadNetwork(
                        id=uuid.UUID(item["id"]),
                        organization_id=uuid.UUID(item["organization_id"]),
                        name=item["name"],
                        source=item["source"],
                        version=item["version"]
                    )
                    for item in r.json()
                ]
        return []

    async def get_network_by_id(self, network_id: str, organization_id: str) -> Optional[RoadNetwork]:
        net_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
        org_uuid = uuid.UUID(organization_id) if isinstance(organization_id, str) else organization_id
        if self.db:
            try:
                stmt = select(RoadNetwork).where(RoadNetwork.id == net_uuid, RoadNetwork.organization_id == org_uuid)
                res = await self.db.execute(stmt)
                return res.scalar_one_or_none()
            except Exception:
                pass

        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{self.supabase_url}/rest/v1/road_networks?id=eq.{net_uuid}&organization_id=eq.{org_uuid}", headers=self.headers)
            if r.status_code == 200 and r.json():
                item = r.json()[0]
                return RoadNetwork(
                    id=uuid.UUID(item["id"]),
                    organization_id=uuid.UUID(item["organization_id"]),
                    name=item["name"],
                    source=item["source"],
                    version=item["version"]
                )
        return None

    async def get_network_nodes(self, network_id: str, page: int = 1, page_size: int = 50) -> List[NetworkNode]:
        net_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
        if self.db:
            try:
                stmt = (
                    select(NetworkNode)
                    .where(NetworkNode.network_id == net_uuid)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
                res = await self.db.execute(stmt)
                return list(res.scalars().all())
            except Exception:
                pass

        offset = (page - 1) * page_size
        headers = {**self.headers, "Range": f"{offset}-{offset + page_size - 1}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{self.supabase_url}/rest/v1/network_nodes?network_id=eq.{net_uuid}", headers=headers)
            if r.status_code in (200, 206):
                return [
                    NetworkNode(
                        id=uuid.UUID(item["id"]),
                        network_id=uuid.UUID(item["network_id"]),
                        external_id=item["external_id"],
                        lat=item["lat"],
                        lng=item["lng"]
                    )
                    for item in r.json()
                ]
        return []

    async def get_network_edges(self, network_id: str, page: int = 1, page_size: int = 50) -> List[NetworkEdge]:
        net_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
        if self.db:
            try:
                stmt = (
                    select(NetworkEdge)
                    .where(NetworkEdge.network_id == net_uuid)
                    .offset((page - 1) * page_size)
                    .limit(page_size)
                )
                res = await self.db.execute(stmt)
                return list(res.scalars().all())
            except Exception:
                pass

        offset = (page - 1) * page_size
        headers = {**self.headers, "Range": f"{offset}-{offset + page_size - 1}"}
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.get(f"{self.supabase_url}/rest/v1/network_edges?network_id=eq.{net_uuid}", headers=headers)
            if r.status_code in (200, 206):
                return [
                    NetworkEdge(
                        id=uuid.UUID(item["id"]),
                        network_id=uuid.UUID(item["network_id"]),
                        external_id=item["external_id"],
                        from_node_id=uuid.UUID(item["from_node_id"]),
                        to_node_id=uuid.UUID(item["to_node_id"]),
                        road_name=item["road_name"],
                        length_meters=item["length_meters"],
                        speed_limit_kph=item["speed_limit_kph"],
                        road_type=item["road_type"],
                        capacity_vehicles=item["capacity_vehicles"],
                        geometry=item.get("geometry")
                    )
                    for item in r.json()
                ]
        return []

    async def get_all_nodes(self, network_id: str) -> List[NetworkNode]:
        net_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
        if self.db:
            try:
                stmt = select(NetworkNode).where(NetworkNode.network_id == net_uuid)
                res = await self.db.execute(stmt)
                return list(res.scalars().all())
            except Exception:
                pass

        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(f"{self.supabase_url}/rest/v1/network_nodes?network_id=eq.{net_uuid}&limit=10000", headers=self.headers)
            if r.status_code == 200:
                return [
                    NetworkNode(
                        id=uuid.UUID(item["id"]),
                        network_id=uuid.UUID(item["network_id"]),
                        external_id=item["external_id"],
                        lat=item["lat"],
                        lng=item["lng"]
                    )
                    for item in r.json()
                ]
        return []

    async def get_all_edges(self, network_id: str) -> List[NetworkEdge]:
        net_uuid = uuid.UUID(network_id) if isinstance(network_id, str) else network_id
        if self.db:
            try:
                stmt = select(NetworkEdge).where(NetworkEdge.network_id == net_uuid)
                res = await self.db.execute(stmt)
                return list(res.scalars().all())
            except Exception:
                pass

        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.get(f"{self.supabase_url}/rest/v1/network_edges?network_id=eq.{network_id}&limit=10000", headers=self.headers)
            if r.status_code == 200:
                return [
                    NetworkEdge(
                        id=uuid.UUID(item["id"]),
                        network_id=uuid.UUID(item["network_id"]),
                        external_id=item["external_id"],
                        from_node_id=uuid.UUID(item["from_node_id"]),
                        to_node_id=uuid.UUID(item["to_node_id"]),
                        road_name=item["road_name"],
                        length_meters=item["length_meters"],
                        speed_limit_kph=item["speed_limit_kph"],
                        road_type=item["road_type"],
                        capacity_vehicles=item["capacity_vehicles"],
                        geometry=item.get("geometry")
                    )
                    for item in r.json()
                ]
        return []

