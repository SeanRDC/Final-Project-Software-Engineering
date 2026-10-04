# Collects every API router into the single router that main.py mounts.

from fastapi import APIRouter

from app.api import appointments, auth, inventory, misc, patients, reports, users, visits

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(patients.router)
api_router.include_router(visits.router)
api_router.include_router(appointments.router)
api_router.include_router(inventory.router)
api_router.include_router(reports.router)
api_router.include_router(misc.router)
