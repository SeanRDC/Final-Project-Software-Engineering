# API routes for medical kits: the kits, their standard contents, and lending them out and back.

from fastapi import APIRouter, status

from app.api.deps import Authorized, DbSession, PageNumber, PageSize
from app.core.events import broadcaster
from app.core.permissions import Permission
from app.models.enums import MedkitRequestStatus
from app.schemas.common import Page
from app.schemas.medkit import (
    MedkitClose,
    MedkitCreate,
    MedkitIssue,
    MedkitOut,
    MedkitRequestCreate,
    MedkitRequestOut,
    MedkitRequestSummary,
    MedkitReturn,
    MedkitUpdate,
    TemplateItemIn,
    TemplateItemOut,
)
from app.services import medkits

kits_router = APIRouter(prefix="/medkits", tags=["Medical kits"])
requests_router = APIRouter(prefix="/medkit-requests", tags=["Medical kits"])

Reader = Authorized(Permission.MEDKITS_READ)
Writer = Authorized(Permission.MEDKITS_WRITE)
Manager = Authorized(Permission.MEDKITS_MANAGE)


def _changed(stock_moved: bool = False) -> None:
    broadcaster.publish("medkits.updated")
    if stock_moved:
        broadcaster.publish("inventory.updated")
        broadcaster.publish("notifications.updated")


@kits_router.get("", response_model=list[MedkitOut],
                 summary="Every kit, with the loan it is out on")
def list_kits(db: DbSession, _: Reader):
    return medkits.list_kits(db)


@kits_router.post("", response_model=MedkitOut, status_code=status.HTTP_201_CREATED)
def create_kit(data: MedkitCreate, db: DbSession, actor: Manager):
    kit = medkits.create_kit(db, data, actor)
    _changed()
    return kit


@kits_router.get("/template", response_model=list[TemplateItemOut],
                 summary="What a kit normally carries (the boxed items of FM-SSA-MDS-8033)")
def get_template(db: DbSession, _: Reader):
    return medkits.get_template(db)


@kits_router.put("/template", response_model=list[TemplateItemOut],
                 summary="Replace the standard contents, in the order given")
def set_template(items: list[TemplateItemIn], db: DbSession, actor: Manager):
    template = medkits.set_template(db, items, actor)
    _changed()
    return template


@kits_router.patch("/{kit_id}", response_model=MedkitOut,
                   summary="Rename or retire a kit, or put a replaced lost kit back")
def update_kit(kit_id: int, data: MedkitUpdate, db: DbSession, actor: Manager):
    kit = medkits.update_kit(db, kit_id, data, actor)
    _changed()
    return kit


@requests_router.get("", response_model=Page[MedkitRequestSummary],
                     summary="Kit requests, newest first")
def list_requests(
    db: DbSession,
    _: Reader,
    status: MedkitRequestStatus | None = None,
    overdue_only: bool = False,
    page: PageNumber = 1,
    page_size: PageSize = 20,
):
    if medkits.flag_overdue(db):
        broadcaster.publish("notifications.updated")
    items, total = medkits.list_requests(
        db, status=status, overdue_only=overdue_only, page=page, page_size=page_size
    )
    return Page(items=items, total=total, page=page, page_size=page_size)


@requests_router.post("", response_model=MedkitRequestOut, status_code=status.HTTP_201_CREATED,
                      summary="File a request for a medical kit (FM-SSA-MDS-8032)")
def create_request(data: MedkitRequestCreate, db: DbSession, actor: Writer):
    request = medkits.create_request(db, data, actor)
    _changed()
    return request


@requests_router.get("/{request_id}", response_model=MedkitRequestOut)
def get_request(request_id: int, db: DbSession, _: Reader):
    return medkits.get_request(db, request_id)


@requests_router.post("/{request_id}/issue", response_model=MedkitRequestOut,
                      summary="Hand over a kit; its contents leave the medicine stock")
def issue(request_id: int, data: MedkitIssue, db: DbSession, actor: Writer):
    request = medkits.issue(db, request_id, data, actor)
    _changed(stock_moved=True)
    return request


@requests_router.post("/{request_id}/return", response_model=MedkitRequestOut,
                      summary="Take a kit back; what came back returns to stock")
def return_kit(request_id: int, data: MedkitReturn, db: DbSession, actor: Writer):
    request = medkits.return_kit(db, request_id, data, actor)
    _changed(stock_moved=True)
    return request


@requests_router.post("/{request_id}/lost", response_model=MedkitRequestOut,
                      summary="Record a kit that did not come back")
def mark_lost(request_id: int, data: MedkitClose, db: DbSession, actor: Writer):
    request = medkits.mark_lost(db, request_id, data, actor)
    _changed()
    return request


@requests_router.post("/{request_id}/cancel", response_model=MedkitRequestOut,
                      summary="Withdraw a request that was not issued")
def cancel(request_id: int, db: DbSession, actor: Writer):
    request = medkits.cancel(db, request_id, actor)
    _changed()
    return request
