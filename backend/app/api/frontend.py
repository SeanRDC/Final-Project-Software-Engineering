# Serves the built frontend from the backend, so the clinic opens one address for the whole app.

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Paths the API owns. A wrong address under them is an error, never the app's page.
_API_PATHS = ("api/", "docs", "redoc", "openapi.json")
# index.html names the current build's files, so a station must not keep an old copy of it.
_NO_CACHE = {"Cache-Control": "no-cache"}


def mount_frontend(app: FastAPI, dist: Path) -> bool:
    """Serve the build in `dist` (the output of `npm run build`). Returns False when there is none.

    Call it after every API route is registered: the catch-all below must come last.
    """
    index = dist / "index.html"
    if not index.is_file():
        return False

    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="frontend-assets")

    @app.get("/{path:path}", include_in_schema=False)
    def frontend(path: str) -> FileResponse:
        if path.startswith(_API_PATHS):
            raise HTTPException(status_code=404, detail="Not Found")
        requested = (dist / path).resolve()
        # A real file in the build (the favicon); never anything outside the build folder.
        if path and requested.is_relative_to(dist.resolve()) and requested.is_file():
            return FileResponse(requested)
        # Every other address is a screen of the app, which the browser routes itself.
        return FileResponse(index, headers=_NO_CACHE)

    return True
