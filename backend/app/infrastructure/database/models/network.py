from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.infrastructure.database.session import Base


class RoadNetwork(Base):
    __tablename__ = "road_networks"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("public.organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    source = Column(String, default="OSM")
    version = Column(String, default="v1.0")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NetworkNode(Base):
    __tablename__ = "network_nodes"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    network_id = Column(UUID(as_uuid=True), ForeignKey("public.road_networks.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(String, nullable=True)
    lat = Column(Numeric, nullable=False)
    lng = Column(Numeric, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class NetworkEdge(Base):
    __tablename__ = "network_edges"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    network_id = Column(UUID(as_uuid=True), ForeignKey("public.road_networks.id", ondelete="CASCADE"), nullable=False)
    external_id = Column(String, nullable=True)
    from_node_id = Column(UUID(as_uuid=True), ForeignKey("public.network_nodes.id"), nullable=True)
    to_node_id = Column(UUID(as_uuid=True), ForeignKey("public.network_nodes.id"), nullable=True)
    road_name = Column(String, nullable=False)
    length_meters = Column(Numeric, default=1000)
    speed_limit_kph = Column(Numeric, default=50)
    road_type = Column(String, default="PRIMARY")
    capacity_vehicles = Column(Integer, default=200)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
