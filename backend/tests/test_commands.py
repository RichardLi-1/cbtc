"""Manual command API."""

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client():
    return TestClient(main.app)


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_switch_command(client):
    r = client.post("/commands/switch/sw_start", json={"state": "reverse"})
    assert r.status_code == 200
    assert r.json()["state"] == "reverse"


def test_signal_command(client):
    sig_id = main.topology.YUS_TOPOLOGY["signals"][0]["id"]
    r = client.post(f"/commands/signal/{sig_id}", json={"aspect": "red"})
    assert r.status_code == 200
    assert r.json()["aspect"] == "red"
