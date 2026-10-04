# Business logic for the medicine inventory, stock movements and low-stock alerts.

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.clock import day_end, day_start
from app.core.exceptions import AppError, ConflictError
from app.models import Medicine, StockMovement, User
from app.models.enums import NotificationType, StockMovementType
from app.schemas.inventory import MedicineCreate, MedicineUpdate, StockAdjustment, StockIn
from app.services import audit, notifications
from app.services.common import apply_updates, get_or_404, like_pattern, paginate


def _ensure_unique(db: Session, name: str, strength: str, exclude_id: int | None = None) -> None:
    query = select(Medicine.id).where(
        func.lower(Medicine.name) == name.lower(), func.lower(Medicine.strength) == strength.lower()
    )
    if exclude_id is not None:
        query = query.where(Medicine.id != exclude_id)
    if db.scalar(query) is not None:
        raise ConflictError(f"'{f'{name} {strength}'.strip()}' is already in the inventory")


def list_medicines(
    db: Session, *, q: str | None = None, low_stock_only: bool = False, include_inactive: bool = False
) -> list[Medicine]:
    query = select(Medicine).order_by(Medicine.name, Medicine.strength)
    if not include_inactive:
        query = query.where(Medicine.is_active.is_(True))
    if q and q.strip():
        query = query.where(Medicine.name.ilike(like_pattern(q.strip()), escape="\\"))
    if low_stock_only:
        query = query.where(Medicine.quantity_on_hand <= Medicine.low_stock_threshold)
    return list(db.scalars(query))


def low_stock(db: Session) -> list[Medicine]:
    return list_medicines(db, low_stock_only=True)


def _lock_medicine(db: Session, medicine_id: int) -> Medicine:
    medicine = db.scalar(select(Medicine).where(Medicine.id == medicine_id).with_for_update())
    if medicine is None:
        return get_or_404(db, Medicine, medicine_id, "Medicine")
    return medicine


def apply_movement(
    db: Session,
    medicine_id: int,
    movement_type: StockMovementType,
    quantity_change: int,
    actor: User,
    *,
    reason: str | None = None,
    visit_id: int | None = None,
) -> Medicine:
    medicine = _lock_medicine(db, medicine_id)
    new_quantity = medicine.quantity_on_hand + quantity_change
    if new_quantity < 0:
        raise AppError(
            f"Not enough stock of {medicine.display_name}: "
            f"{medicine.quantity_on_hand} {medicine.unit} left"
        )
    was_low = medicine.is_low_stock
    medicine.quantity_on_hand = new_quantity
    db.add(
        StockMovement(
            medicine_id=medicine.id,
            movement_type=movement_type,
            quantity_change=quantity_change,
            balance_after=new_quantity,
            visit_id=visit_id,
            reason=reason,
            performed_by_id=actor.id,
        )
    )
    if medicine.is_low_stock and not was_low:
        notifications.notify(
            db,
            NotificationType.LOW_STOCK,
            f"Low stock: {medicine.display_name}",
            f"{new_quantity} left (threshold {medicine.low_stock_threshold})",
            entity_type="medicine",
            entity_id=medicine.id,
        )
    return medicine


def create(db: Session, data: MedicineCreate, actor: User) -> Medicine:
    name, strength = data.name.strip(), data.strength.strip()
    _ensure_unique(db, name, strength)
    medicine = Medicine(
        name=name,
        strength=strength,
        form=data.form,
        unit=data.unit.strip(),
        low_stock_threshold=data.low_stock_threshold,
        expiry_date=data.expiry_date,
        quantity_on_hand=0,
    )
    db.add(medicine)
    db.flush()
    audit.record(db, actor, "medicine.create", "medicine", medicine.id, name=medicine.display_name)
    if data.quantity_on_hand:
        apply_movement(
            db, medicine.id, StockMovementType.STOCK_IN, data.quantity_on_hand, actor,
            reason="Opening stock",
        )
    db.commit()
    return medicine


def update(db: Session, medicine_id: int, data: MedicineUpdate, actor: User) -> Medicine:
    medicine = get_or_404(db, Medicine, medicine_id, "Medicine")
    changes = data.model_dump(exclude_unset=True)
    for field in ("name", "strength", "unit"):
        if changes.get(field) is not None:
            changes[field] = changes[field].strip()
    if "name" in changes or "strength" in changes:
        _ensure_unique(
            db,
            changes.get("name") or medicine.name,
            changes["strength"] if changes.get("strength") is not None else medicine.strength,
            exclude_id=medicine_id,
        )
    changed = apply_updates(
        medicine, changes, required={"name", "strength", "unit", "low_stock_threshold", "is_active"}
    )
    if changed:
        audit.record(db, actor, "medicine.update", "medicine", medicine.id, fields=changed)
    db.commit()
    return medicine


def stock_in(db: Session, medicine_id: int, data: StockIn, actor: User) -> Medicine:
    medicine = apply_movement(
        db, medicine_id, StockMovementType.STOCK_IN, data.quantity, actor, reason=data.reason
    )
    audit.record(db, actor, "medicine.stock_in", "medicine", medicine.id, quantity=data.quantity)
    db.commit()
    return medicine


def adjust(db: Session, medicine_id: int, data: StockAdjustment, actor: User) -> Medicine:
    medicine = _lock_medicine(db, medicine_id)
    change = data.new_quantity - medicine.quantity_on_hand
    if change == 0:
        return medicine
    medicine = apply_movement(
        db, medicine_id, StockMovementType.ADJUSTMENT, change, actor, reason=data.reason
    )
    audit.record(db, actor, "medicine.adjust", "medicine", medicine.id, change=change,
                 reason=data.reason)
    db.commit()
    return medicine


def list_movements(
    db: Session,
    *,
    medicine_id: int | None = None,
    movement_type: StockMovementType | None = None,
    start: date | None = None,
    end: date | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[StockMovement], int]:
    query = select(StockMovement).order_by(StockMovement.created_at.desc(), StockMovement.id.desc())
    if medicine_id is not None:
        query = query.where(StockMovement.medicine_id == medicine_id)
    if movement_type is not None:
        query = query.where(StockMovement.movement_type == movement_type)
    if start is not None:
        query = query.where(StockMovement.created_at >= day_start(start))
    if end is not None:
        query = query.where(StockMovement.created_at <= day_end(end))
    return paginate(db, query, page, page_size)
