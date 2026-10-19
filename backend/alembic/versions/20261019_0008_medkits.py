# Adds medical kits, their standard contents and loans, and links stock movements to a loan.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0008'
down_revision: Union[str, None] = '0007'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

KIT_STATUS = sa.Enum('available', 'out', 'lost', name='medkitstatus',
                     native_enum=False, length=32)
REQUEST_STATUS = sa.Enum('requested', 'issued', 'returned', 'lost', 'cancelled',
                         name='medkitrequeststatus', native_enum=False, length=32)


def upgrade() -> None:
    op.create_table('medkits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('kit_number', sa.Integer(), nullable=False),
    sa.Column('label', sa.String(length=80), nullable=True),
    sa.Column('status', KIT_STATUS, nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('kit_number')
    )
    op.create_table('medkit_template_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('default_quantity', sa.Integer(), nullable=False),
    sa.Column('sort_order', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('medicine_id')
    )
    op.create_table('medkit_requests',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('organization', sa.String(length=150), nullable=False),
    sa.Column('activity', sa.String(length=150), nullable=False),
    sa.Column('activity_date', sa.Date(), nullable=False),
    sa.Column('venue', sa.String(length=150), nullable=True),
    sa.Column('person_responsible', sa.String(length=120), nullable=False),
    sa.Column('contact_number', sa.String(length=30), nullable=True),
    sa.Column('requested_by', sa.String(length=120), nullable=False),
    sa.Column('request_date', sa.Date(), nullable=False),
    sa.Column('status', REQUEST_STATUS, nullable=False),
    sa.Column('medkit_id', sa.Integer(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('issued_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('issued_by_id', sa.Integer(), nullable=True),
    sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('closed_by_id', sa.Integer(), nullable=True),
    sa.Column('overdue_notified_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['medkit_id'], ['medkits.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['issued_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['closed_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_medkit_requests_activity_date', 'medkit_requests', ['activity_date'])
    op.create_index('ix_medkit_requests_status', 'medkit_requests', ['status'])
    op.create_index('ix_medkit_requests_medkit_id', 'medkit_requests', ['medkit_id'])
    op.create_index('ix_medkit_requests_created_at', 'medkit_requests', ['created_at'])
    op.create_table('medkit_request_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('request_id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('quantity_issued', sa.Integer(), nullable=False),
    sa.Column('quantity_returned', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['request_id'], ['medkit_requests.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_medkit_request_items_request_id', 'medkit_request_items', ['request_id'])

    # Plain ADD COLUMN: a batch would rebuild stock_movements, which SQLite refuses with rows
    # pointing at it. Elsewhere the column also gets its foreign key.
    op.add_column('stock_movements', sa.Column('medkit_request_id', sa.Integer(), nullable=True))
    op.create_index('ix_stock_movements_medkit_request_id', 'stock_movements',
                    ['medkit_request_id'])
    if op.get_bind().dialect.name != 'sqlite':
        op.create_foreign_key('fk_stock_movements_medkit_request_id', 'stock_movements',
                              'medkit_requests', ['medkit_request_id'], ['id'])


def downgrade() -> None:
    if op.get_bind().dialect.name != 'sqlite':
        op.drop_constraint('fk_stock_movements_medkit_request_id', 'stock_movements',
                           type_='foreignkey')
    op.drop_index('ix_stock_movements_medkit_request_id', table_name='stock_movements')
    op.drop_column('stock_movements', 'medkit_request_id')
    op.drop_index('ix_medkit_request_items_request_id', table_name='medkit_request_items')
    op.drop_table('medkit_request_items')
    for name in ('created_at', 'medkit_id', 'status', 'activity_date'):
        op.drop_index(f'ix_medkit_requests_{name}', table_name='medkit_requests')
    op.drop_table('medkit_requests')
    op.drop_table('medkit_template_items')
    op.drop_table('medkits')
