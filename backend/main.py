# Entry point that creates the HAU-Sync FastAPI application, mounts the API routes and serves the built frontend.

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import __version__
from app.api.frontend import mount_frontend
from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import AppError

logging.basicConfig(level=logging.DEBUG if settings.DEBUG else logging.INFO)

if not settings.DEBUG and settings.SECRET_KEY == "change-me-to-a-long-random-string":
    raise RuntimeError("Set a real SECRET_KEY in backend/.env before running with DEBUG=False")

DESCRIPTION = """
Backend of **HAU-Sync**, the Patient Record Management and Appointment System of the
Holy Angel University Clinic. It runs on the clinic's local network.

Log in through **Authorize** with a clinic account. What an account may do depends on its
role: `coordinator`, `doctor`, or `clinic_staff` (nurse / student assistant).
"""

app = FastAPI(
    title=settings.APP_NAME,
    version=__version__,
    description=DESCRIPTION,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.exception_handler(AppError)
async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message, **exc.extra})


app.include_router(api_router, prefix=settings.API_PREFIX)


# With a frontend build present the app itself answers at "/"; otherwise the API says what it is.
if not mount_frontend(app, settings.frontend_dist):

    @app.get("/", include_in_schema=False)
    def root() -> dict[str, str]:
        return {"name": settings.APP_NAME, "version": __version__, "docs": "/docs"}
