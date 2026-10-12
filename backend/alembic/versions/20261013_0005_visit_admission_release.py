# Adds when an admitted patient left the clinic, where they went and who recorded it.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0005'
down_revision: Union[str, None] = '0004'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('visits', schema=None) as batch_op:
        batch_op.add_column(sa.Column('released_at', sa.DateTime(timezone=True), nullable=True))
        batch_op.add_column(sa.Column('release_disposition', sa.Enum('returned', 'sent_home', 'referred', 'admitted', name='visitdisposition', native_enum=False, length=32), nullable=True))
        batch_op.add_column(sa.Column('released_by_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(batch_op.f('fk_visits_released_by_id_users'), 'users', ['released_by_id'], ['id'])


def downgrade() -> None:
    with op.batch_alter_table('visits', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('fk_visits_released_by_id_users'), type_='foreignkey')
        batch_op.drop_column('released_by_id')
        batch_op.drop_column('release_disposition')
        batch_op.drop_column('released_at')
