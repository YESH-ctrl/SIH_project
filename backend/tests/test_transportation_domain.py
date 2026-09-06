import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.infrastructure.database.session import get_db

async def override_get_db():
    yield None

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_routes_endpoint_with_ops_manager():
    response = client.get("/api/v1/routes", headers={"X-Demo-User": "ops@qswarm.io"})
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "pagination" in data


def test_delivery_points_endpoint():
    response = client.get("/api/v1/delivery-points", headers={"X-Demo-User": "ops@qswarm.io"})
    assert response.status_code == 200
    data = response.json()
    assert "data" in data


def test_traffic_endpoint():
    response = client.get("/api/v1/traffic", headers={"X-Demo-User": "ops@qswarm.io"})
    assert response.status_code == 200
    data = response.json()
    assert "data" in data


def test_restrictions_endpoint():
    response = client.get("/api/v1/restrictions", headers={"X-Demo-User": "ops@qswarm.io"})
    assert response.status_code == 200
    data = response.json()
    assert "data" in data


def test_unauthorized_dashboard_access_denied():
    # Analyst attempting to access Org Admin dashboard without permissions should be forbidden
    response = client.get("/api/v1/dashboards/admin", headers={"X-Demo-User": "analyst@qswarm.io"})
    assert response.status_code == 403
    err = response.json()
    assert err["error"]["code"] == "FORBIDDEN"
