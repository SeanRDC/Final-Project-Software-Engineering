# Adds the education level of a student, which decides the ISO form code of the record.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.add_column(sa.Column('education_level', sa.Enum('basic_education', 'college', name='educationlevel', native_enum=False, length=32), nullable=True))

    # Students already on record: basic education by their department, the rest college.
    op.execute(
        "UPDATE patients SET education_level = 'basic_education' "
        "WHERE patient_type = 'student' AND LOWER(department) LIKE 'basic education%'"
    )
    op.execute(
        "UPDATE patients SET education_level = 'college' "
        "WHERE patient_type = 'student' AND education_level IS NULL"
    )


def downgrade() -> None:
    # Not in a batch: that would rebuild patients, which SQLite refuses while visits point at it.
    op.drop_column('patients', 'education_level')
