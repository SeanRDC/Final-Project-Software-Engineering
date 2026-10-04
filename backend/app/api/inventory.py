# API routes for the medicine inventory, stock changes and the release log.

from datetime import date

from fastapi import APIRouter, status

from app.api.deps import Authorized, DbSession, PageNumber, PageSize
from app.core.events import broadcaster
from app.core.permissions import Permission
from app.models.enums import StockMovementType
from app.schemas.common import Page
from app.schemas.inventory import (
    MedicineCreate,
    MedicineOut,
    MedicineUpdate,
    StockAdjustment,
    StockIn,
    StockMovementOut,
)
from app.services import inventory
from app.services.common import get_or_404
from app.models import Medicine

router = APIRouter(prefix="/inventory", tags=["Medicine inventory"])

Reader = Authorized(Permission.INVENTORY_READ)
Writer = Authorized(Permission.INVENTORY_WRITE)


def _changed(medicine_id: int) -> None:
    broadcaster.publish("inventory.updated", medicine_id=medicine_id)
    broadcaster.publish("notifications.updated")


@router.get("/medicines", response_model=list[MedicineOut], summary="Medicine inventory (FR-11)")
def list_medicines(
    db: DbSession,
    _: Reader,
    q: str | None = None,
    low_stock_only: bool = False,
    include_inactive: bool = False,
):
    return inventory.list_medicines(
        db, q=q, low_stock_only=low_stock_only, include_inactive=include_inactive
    )


@router.get("/low-stock", response_model=list[MedicineOut],
            summary="Medicines at or below their low-stock threshold (FR-12)")
def low_stock(db: DbSession, _: Reader):
    return inventory.low_stock(db)


@router.post("/medicines", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(data: MedicineCreate, db: DbSession, actor: Writer):
    medicine = inventory.create(db, data, actor)
    _changed(medicine.id)
    return medicine


@router.get("/medicines/{medicine_id}", response_model=MedicineOut)
def get_medicine(medicine_id: int, db: DbSession, _: Reader):
    return get_or_404(db, Medicine, medicine_id, "Medicine")


@router.patch("/medicines/{medicine_id}", response_model=MedicineOut,
              summary="Edit details or the low-stock threshold")
def update_medicine(medicine_id: int, data: MedicineUpdate, db: DbSession, actor: Writer):
    medicine = inventory.update(db, medicine_id, data, actor)
    _changed(medicine.id)
    return medicine


@router.post("/medicines/{medicine_id}/stock-in", response_model=MedicineOut,
             summary="Add delivered stock")
def stock_in(medicine_id: int, data: StockIn, db: DbSession, actor: Writer):
    medicine = inventory.stock_in(db, medicine_id, data, actor)
    _changed(medicine.id)
    return medicine


@router.post("/medicines/{medicine_id}/adjust", response_model=MedicineOut,
             summary="Set the counted quantity, with a reason")
def adjust(medicine_id: int, data: StockAdjustment, db: DbSession, actor: Writer):
    medicine = inventory.adjust(db, medicine_id, data, actor)
    _changed(medicine.id)
    return medicine


@router.get("/movements", response_model=Page[StockMovementOut],
            summary="Stock history; use movement_type=release for the release log")
def list_movements(
    db: DbSession,
    _: Reader,
    medicine_id: int | None = None,
    movement_type: StockMovementType | None = None,
    start: date | None = None,
    end: date | None = None,
    page: PageNumber = 1,
    page_size: PageSize = 50,
):
    items, total = inventory.list_movements(
        db, medicine_id=medicine_id, movement_type=movement_type, start=start, end=end,
        page=page, page_size=page_size,
    )
    return Page(items=items, total=total, page=page, page_size=page_size)
