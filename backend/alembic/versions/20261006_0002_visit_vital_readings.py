# Adds the table of vital-sign readings taken while a patient is monitored.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('visit_vital_readings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('visit_id', sa.Integer(), nullable=False),
    sa.Column('taken_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('temperature_c', sa.Float(), nullable=True),
    sa.Column('bp_systolic', sa.Integer(), nullable=True),
    sa.Column('bp_diastolic', sa.Integer(), nullable=True),
    sa.Column('pulse_rate', sa.Integer(), nullable=True),
    sa.Column('respiratory_rate', sa.Integer(), nullable=True),
    sa.Column('oxygen_saturation', sa.Integer(), nullable=True),
    sa.Column('note', sa.String(length=255), nullable=True),
    sa.Column('recorded_by_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['recorded_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('visit_vital_readings', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_visit_vital_readings_visit_id'), ['visit_id'], unique=False)



def downgrade() -> None:
    with op.batch_alter_table('visit_vital_readings', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_visit_vital_readings_visit_id'))

    op.drop_table('visit_vital_readings')
