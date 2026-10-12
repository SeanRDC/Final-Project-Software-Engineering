# Adds when an admitted patient left the clinic, where they went and who recorded it.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Plain ADD COLUMN. A batch would rebuild the table, and SQLite refuses to drop visits
    # while medicines and readings point at its rows.
    op.add_column('visits', sa.Column('released_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('visits', sa.Column('release_disposition', sa.Enum('returned', 'sent_home', 'referred', 'admitted', name='visitdisposition', native_enum=False, length=32), nullable=True))
    # Written out, because Alembic adds a reference as a separate ALTER, which SQLite lacks.
    op.execute("ALTER TABLE visits ADD COLUMN released_by_id INTEGER REFERENCES users (id)")


def downgrade() -> None:
    op.drop_column('visits', 'released_by_id')
    op.drop_column('visits', 'release_disposition')
    op.drop_column('visits', 'released_at')
