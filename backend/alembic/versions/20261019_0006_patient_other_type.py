# Adds the description of an Others patient (visitor, guest, contractor); the type itself is a new enum value.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0006'
down_revision: Union[str, None] = '0005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # patient_type is a plain string column (native_enum=False), so "other" needs no change there.
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('other_description', sa.String(length=120), nullable=True))


def downgrade() -> None:
    # Others patients have no type to fall back to; keep them findable as employees without a level.
    op.execute("UPDATE patients SET patient_type = 'employee' WHERE patient_type = 'other'")
    # Not in a batch: that would rebuild patients, which SQLite refuses while visits point at it.
    op.drop_column('patients', 'other_description')
