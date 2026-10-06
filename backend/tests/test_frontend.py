# Tests for serving the built frontend from the backend.

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.frontend import mount_frontend


def _app_with_build(tmp_path) -> TestClient:
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "index.html").write_text("<title>HAU-Sync</title>", encoding="utf-8")
    (dist / "favicon.svg").write_text("<svg/>", encoding="utf-8")
    (dist / "assets" / "index-abc.js").write_text("console.log(1)", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("not part of the build", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok"}

    assert mount_frontend(app, dist) is True
    return TestClient(app)


def test_every_screen_address_gets_the_app(tmp_path):
    client = _app_with_build(tmp_path)
    for address in ("/", "/patients/12", "/reports?from=2026-08-01"):
        response = client.get(address)
        assert response.status_code == 200
        assert "HAU-Sync" in response.text
        assert response.headers["cache-control"] == "no-cache"


def test_build_files_are_served_and_nothing_outside_the_build(tmp_path):
    client = _app_with_build(tmp_path)
    assert client.get("/assets/index-abc.js").text == "console.log(1)"
    assert client.get("/favicon.svg").text == "<svg/>"
    assert "not part of the build" not in client.get("/%2e%2e/secret.txt").text


def test_the_api_keeps_its_own_addresses(tmp_path):
    client = _app_with_build(tmp_path)
    assert client.get("/api/v1/health").json() == {"status": "ok"}
    missing = client.get("/api/v1/no-such-route")
    assert missing.status_code == 404
    assert missing.json() == {"detail": "Not Found"}


def test_without_a_build_nothing_is_mounted(tmp_path):
    app = FastAPI()
    assert mount_frontend(app, tmp_path / "missing") is False
    assert TestClient(app).get("/patients").status_code == 404
