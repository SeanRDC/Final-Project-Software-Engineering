# API routes for the dashboard, notifications, attachments, edit locks, audit log, system status and live events.

from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from fastapi.responses import FileResponse
from sqlalchemy import text

from app import __version__
from app.api.deps import Authorized, CurrentUser, DbSession, PageNumber, PageSize, user_from_token
from app.core.clock import utcnow
from app.core.config import settings
from app.core.events import broadcaster
from app.core.permissions import Permission, Role
from app.db.session import SessionLocal
from app.models import enums
from app.schemas.common import Message, Page
from app.schemas.support import (
    AuditLogOut,
    Dashboard,
    Health,
    NotificationList,
    Options,
)
from app.schemas.visit import LockInfo
from app.services import attachments, audit, dashboard, locks, notifications, patients

router = APIRouter()


@router.get("/dashboard", response_model=Dashboard, tags=["Dashboard"],
            summary="Everything on the Clinic Main Menu (FR-15)")
def get_dashboard(db: DbSession, user: CurrentUser):
    return dashboard.build(db, user)


@router.get("/notifications", response_model=NotificationList, tags=["Notifications"])
def list_notifications(
    db: DbSession, user: CurrentUser, limit: PageSize = 20, unread_only: bool = False
):
    return notifications.list_for_user(db, user, limit=limit, unread_only=unread_only)


@router.post("/notifications/read-all", response_model=Message, tags=["Notifications"])
def read_all_notifications(db: DbSession, user: CurrentUser):
    count = notifications.mark_read(db, user)
    return Message(message=f"{count} notification(s) marked as read.")


@router.post("/notifications/{notification_id}/read", response_model=Message,
             tags=["Notifications"])
def read_notification(notification_id: int, db: DbSession, user: CurrentUser):
    notifications.mark_read(db, user, notification_id)
    return Message(message="Notification marked as read.")


@router.get("/attachments/{attachment_id}/download", tags=["Attachments"],
            summary="Download an attached file")
def download_attachment(
    attachment_id: int, db: DbSession, actor: Authorized(Permission.ATTACHMENTS_READ)
):
    attachment, path = attachments.get_for_download(db, attachment_id, actor)
    return FileResponse(
        path, media_type=attachment.content_type, filename=attachment.original_filename
    )


@router.delete("/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT,
               tags=["Attachments"], summary="Delete an attachment (coordinator)")
def delete_attachment(
    attachment_id: int, db: DbSession, actor: Authorized(Permission.ATTACHMENTS_DELETE)
):
    attachments.delete(db, attachment_id, actor)


@router.get("/locks/{resource_type}/{resource_id}", response_model=LockInfo | None,
            tags=["Record locks"], summary="Who is editing this patient or visit, if anyone")
def get_lock(resource_type: str, resource_id: int, db: DbSession, _: CurrentUser):
    return locks.get_active_lock(db, resource_type, resource_id)


@router.put("/locks/{resource_type}/{resource_id}", response_model=LockInfo,
            tags=["Record locks"],
            summary="Take the edit lock, or extend it while the form stays open")
def acquire_lock(resource_type: str, resource_id: int, db: DbSession, user: CurrentUser):
    lock = locks.acquire(db, resource_type, resource_id, user)
    broadcaster.publish("lock.updated", resource_type=resource_type, resource_id=resource_id,
                        locked_by=user.full_name)
    return lock


@router.delete("/locks/{resource_type}/{resource_id}", status_code=status.HTTP_204_NO_CONTENT,
               tags=["Record locks"], summary="Release the edit lock")
def release_lock(resource_type: str, resource_id: int, db: DbSession, user: CurrentUser):
    locks.release(db, resource_type, resource_id, user)
    broadcaster.publish("lock.updated", resource_type=resource_type, resource_id=resource_id,
                        locked_by=None)


@router.get("/audit-logs", response_model=Page[AuditLogOut], tags=["Audit log"],
            summary="Who viewed or changed which record (coordinator)")
def list_audit_logs(
    db: DbSession,
    _: Authorized(Permission.AUDIT_VIEW),
    user_id: int | None = None,
    action: str | None = None,
    entity_type: str | None = None,
    entity_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    page: PageNumber = 1,
    page_size: PageSize = 50,
):
    items, total = audit.list_logs(
        db, user_id=user_id, action=action, entity_type=entity_type, entity_id=entity_id,
        start=start, end=end, page=page, page_size=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/health", response_model=Health, tags=["System"],
            summary="Server and database status, for the 'Clinic server connected' indicator")
def health(db: DbSession):
    try:
        db.execute(text("SELECT 1"))
        database_ok = True
    except Exception:
        database_ok = False
    return Health(
        status="ok" if database_ok else "degraded",
        database=database_ok,
        server_time=utcnow(),
        version=__version__,
    )


@router.get("/options", response_model=Options, tags=["System"],
            summary="Choices for dropdowns: departments and enumerations")
def options(db: DbSession, _: CurrentUser):
    return Options(
        departments=patients.list_departments(db),
        enums={
            "role": [r.value for r in Role],
            "patient_type": [e.value for e in enums.PatientType],
            "sex": [e.value for e in enums.Sex],
            "visit_status": [e.value for e in enums.VisitStatus],
            "visit_type": [e.value for e in enums.VisitType],
            "visit_disposition": [e.value for e in enums.VisitDisposition],
            "appointment_status": [e.value for e in enums.AppointmentStatus],
            "stock_movement_type": [e.value for e in enums.StockMovementType],
        },
        lock_timeout_minutes=settings.LOCK_TIMEOUT_MINUTES,
        max_upload_mb=settings.MAX_UPLOAD_MB,
        allowed_upload_types=sorted(attachments.ALLOWED_TYPES),
    )


@router.websocket("/ws")
async def events(websocket: WebSocket, token: str | None = None):
    with SessionLocal() as db:
        user = user_from_token(db, token) if token else None
    if user is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    await broadcaster.connect(websocket)
    try:
        while True:
            if await websocket.receive_text() == "ping":
                await websocket.send_json({"event": "pong", "at": utcnow().isoformat()})
    except WebSocketDisconnect:
        pass
    finally:
        broadcaster.disconnect(websocket)
