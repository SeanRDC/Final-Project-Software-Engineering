# Records when a patient was archived and by whom, for the Archive page.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0007'
down_revision: Union[str, None] = '0006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Plain ADD COLUMN: a batch would rebuild patients, which SQLite refuses while visits point at it.
    op.add_column('patients', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('patients', sa.Column('archived_by_id', sa.Integer(), nullable=True))
    # SQLite cannot add a constraint to a table in place; elsewhere the column gets its key.
    if op.get_bind().dialect.name != 'sqlite':
        op.create_foreign_key('fk_patients_archived_by_id_users', 'patients', 'users',
                              ['archived_by_id'], ['id'])
    # Patients archived before now: take the latest archive entry of the audit log.
    op.execute("""
        UPDATE patients SET
            archived_at = (SELECT a.created_at FROM audit_logs a
                           WHERE a.entity_type = 'patient' AND a.entity_id = patients.id
                             AND a.action = 'patient.archive'
                           ORDER BY a.created_at DESC, a.id DESC LIMIT 1),
            archived_by_id = (SELECT a.user_id FROM audit_logs a
                              WHERE a.entity_type = 'patient' AND a.entity_id = patients.id
                                AND a.action = 'patient.archive'
                              ORDER BY a.created_at DESC, a.id DESC LIMIT 1)
        WHERE is_archived
    """)


def downgrade() -> None:
    if op.get_bind().dialect.name != 'sqlite':
        op.drop_constraint('fk_patients_archived_by_id_users', 'patients', type_='foreignkey')
    op.drop_column('patients', 'archived_by_id')
    op.drop_column('patients', 'archived_at')
