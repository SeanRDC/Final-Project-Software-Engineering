# Initial migration that creates every HAU-Sync database table.

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('medicines',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=120), nullable=False),
    sa.Column('strength', sa.String(length=50), nullable=False),
    sa.Column('form', sa.String(length=50), nullable=True),
    sa.Column('unit', sa.String(length=30), nullable=False),
    sa.Column('quantity_on_hand', sa.Integer(), nullable=False),
    sa.Column('low_stock_threshold', sa.Integer(), nullable=False),
    sa.Column('expiry_date', sa.Date(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name', 'strength', name='uq_medicine_name_strength')
    )
    with op.batch_alter_table('medicines', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_medicines_name'), ['name'], unique=False)

    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('type', sa.Enum('low_stock', 'appointment_pending', 'appointment_decided', name='notificationtype', native_enum=False, length=32), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('body', sa.String(length=255), nullable=True),
    sa.Column('audience_role', sa.String(length=32), nullable=True),
    sa.Column('entity_type', sa.String(length=40), nullable=True),
    sa.Column('entity_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notifications_audience_role'), ['audience_role'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_notifications_type'), ['type'], unique=False)

    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('username', sa.String(length=50), nullable=False),
    sa.Column('full_name', sa.String(length=120), nullable=False),
    sa.Column('role', sa.String(length=32), nullable=False),
    sa.Column('job_title', sa.String(length=80), nullable=True),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('must_change_password', sa.Boolean(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_role'), ['role'], unique=False)
        batch_op.create_index(batch_op.f('ix_users_username'), ['username'], unique=True)

    op.create_table('audit_logs',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('username', sa.String(length=50), nullable=True),
    sa.Column('action', sa.String(length=60), nullable=False),
    sa.Column('entity_type', sa.String(length=40), nullable=True),
    sa.Column('entity_id', sa.Integer(), nullable=True),
    sa.Column('detail', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_audit_logs_action'), ['action'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_entity_type'), ['entity_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_audit_logs_user_id'), ['user_id'], unique=False)

    op.create_table('notification_reads',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('notification_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('read_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('notification_id', 'user_id', name='uq_notification_read')
    )
    with op.batch_alter_table('notification_reads', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_notification_reads_notification_id'), ['notification_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_notification_reads_user_id'), ['user_id'], unique=False)

    op.create_table('patients',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_type', sa.Enum('student', 'employee', name='patienttype', native_enum=False, length=32), nullable=False),
    sa.Column('id_number', sa.String(length=30), nullable=False),
    sa.Column('last_name', sa.String(length=80), nullable=False),
    sa.Column('first_name', sa.String(length=80), nullable=False),
    sa.Column('middle_name', sa.String(length=80), nullable=True),
    sa.Column('birth_date', sa.Date(), nullable=True),
    sa.Column('sex', sa.Enum('male', 'female', name='sex', native_enum=False, length=32), nullable=True),
    sa.Column('department', sa.String(length=120), nullable=True),
    sa.Column('program_or_position', sa.String(length=120), nullable=True),
    sa.Column('contact_number', sa.String(length=30), nullable=True),
    sa.Column('email', sa.String(length=120), nullable=True),
    sa.Column('address', sa.String(length=255), nullable=True),
    sa.Column('guardian_name', sa.String(length=120), nullable=True),
    sa.Column('guardian_relationship', sa.String(length=50), nullable=True),
    sa.Column('guardian_contact', sa.String(length=30), nullable=True),
    sa.Column('blood_type', sa.String(length=5), nullable=True),
    sa.Column('allergies', sa.Text(), nullable=True),
    sa.Column('medical_conditions', sa.Text(), nullable=True),
    sa.Column('medication_restrictions', sa.Text(), nullable=True),
    sa.Column('activity_restrictions', sa.Text(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('consent_on_file', sa.Boolean(), nullable=False),
    sa.Column('is_archived', sa.Boolean(), nullable=False),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_patients_department'), ['department'], unique=False)
        batch_op.create_index(batch_op.f('ix_patients_id_number'), ['id_number'], unique=True)
        batch_op.create_index(batch_op.f('ix_patients_is_archived'), ['is_archived'], unique=False)
        batch_op.create_index(batch_op.f('ix_patients_last_name'), ['last_name'], unique=False)
        batch_op.create_index(batch_op.f('ix_patients_patient_type'), ['patient_type'], unique=False)

    op.create_table('record_locks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('resource_type', sa.String(length=20), nullable=False),
    sa.Column('resource_id', sa.Integer(), nullable=False),
    sa.Column('locked_by_id', sa.Integer(), nullable=False),
    sa.Column('locked_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['locked_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('resource_type', 'resource_id', name='uq_record_lock')
    )
    op.create_table('reports',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=150), nullable=False),
    sa.Column('period_start', sa.Date(), nullable=False),
    sa.Column('period_end', sa.Date(), nullable=False),
    sa.Column('summary_json', sa.Text(), nullable=False),
    sa.Column('generated_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['generated_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('appointments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('scheduled_date', sa.Date(), nullable=False),
    sa.Column('start_time', sa.Time(), nullable=False),
    sa.Column('end_time', sa.Time(), nullable=False),
    sa.Column('reason', sa.String(length=255), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('status', sa.Enum('pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show', name='appointmentstatus', native_enum=False, length=32), nullable=False),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('decided_by_id', sa.Integer(), nullable=True),
    sa.Column('decided_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('cancellation_reason', sa.String(length=255), nullable=True),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['decided_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_appointments_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_scheduled_date'), ['scheduled_date'], unique=False)
        batch_op.create_index(batch_op.f('ix_appointments_status'), ['status'], unique=False)

    op.create_table('visits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('appointment_id', sa.Integer(), nullable=True),
    sa.Column('visit_date', sa.Date(), nullable=False),
    sa.Column('status', sa.Enum('open', 'completed', 'cancelled', name='visitstatus', native_enum=False, length=32), nullable=False),
    sa.Column('visit_type', sa.Enum('consultation', 'medicine_request', 'treatment', 'medical_clearance', 'excuse_letter', 'follow_up', 'monitoring', 'other', name='visittype', native_enum=False, length=32), nullable=False),
    sa.Column('complaint', sa.Text(), nullable=False),
    sa.Column('doctor_id', sa.Integer(), nullable=True),
    sa.Column('temperature_c', sa.Float(), nullable=True),
    sa.Column('bp_systolic', sa.Integer(), nullable=True),
    sa.Column('bp_diastolic', sa.Integer(), nullable=True),
    sa.Column('pulse_rate', sa.Integer(), nullable=True),
    sa.Column('respiratory_rate', sa.Integer(), nullable=True),
    sa.Column('oxygen_saturation', sa.Integer(), nullable=True),
    sa.Column('weight_kg', sa.Float(), nullable=True),
    sa.Column('height_cm', sa.Float(), nullable=True),
    sa.Column('assessment', sa.Text(), nullable=True),
    sa.Column('treatment', sa.Text(), nullable=True),
    sa.Column('remarks', sa.Text(), nullable=True),
    sa.Column('guardian_notified', sa.Boolean(), nullable=False),
    sa.Column('referred', sa.Boolean(), nullable=False),
    sa.Column('referral_details', sa.Text(), nullable=True),
    sa.Column('disposition', sa.Enum('returned', 'sent_home', 'referred', 'admitted', name='visitdisposition', native_enum=False, length=32), nullable=True),
    sa.Column('consultation_notes', sa.Text(), nullable=True),
    sa.Column('diagnosis', sa.Text(), nullable=True),
    sa.Column('medication_details', sa.Text(), nullable=True),
    sa.Column('checked_in_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('cancelled_reason', sa.String(length=255), nullable=True),
    sa.Column('created_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_by_id', sa.Integer(), nullable=True),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['appointment_id'], ['appointments.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['doctor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['updated_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('visits', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_visits_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_visits_status'), ['status'], unique=False)
        batch_op.create_index(batch_op.f('ix_visits_visit_date'), ['visit_date'], unique=False)

    op.create_table('attachments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('patient_id', sa.Integer(), nullable=False),
    sa.Column('visit_id', sa.Integer(), nullable=True),
    sa.Column('original_filename', sa.String(length=255), nullable=False),
    sa.Column('stored_filename', sa.String(length=80), nullable=False),
    sa.Column('content_type', sa.String(length=100), nullable=False),
    sa.Column('size_bytes', sa.Integer(), nullable=False),
    sa.Column('description', sa.String(length=255), nullable=True),
    sa.Column('uploaded_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('stored_filename')
    )
    with op.batch_alter_table('attachments', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_attachments_patient_id'), ['patient_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_attachments_visit_id'), ['visit_id'], unique=False)

    op.create_table('stock_movements',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('movement_type', sa.Enum('stock_in', 'release', 'adjustment', name='stockmovementtype', native_enum=False, length=32), nullable=False),
    sa.Column('quantity_change', sa.Integer(), nullable=False),
    sa.Column('balance_after', sa.Integer(), nullable=False),
    sa.Column('visit_id', sa.Integer(), nullable=True),
    sa.Column('reason', sa.String(length=255), nullable=True),
    sa.Column('performed_by_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.ForeignKeyConstraint(['performed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('stock_movements', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_stock_movements_created_at'), ['created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_movements_medicine_id'), ['medicine_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_movements_movement_type'), ['movement_type'], unique=False)
        batch_op.create_index(batch_op.f('ix_stock_movements_visit_id'), ['visit_id'], unique=False)

    op.create_table('visit_medicines',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('visit_id', sa.Integer(), nullable=False),
    sa.Column('medicine_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('instructions', sa.String(length=255), nullable=True),
    sa.Column('dispensed_by_id', sa.Integer(), nullable=True),
    sa.Column('dispensed_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['dispensed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.ForeignKeyConstraint(['visit_id'], ['visits.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('visit_medicines', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_visit_medicines_medicine_id'), ['medicine_id'], unique=False)
        batch_op.create_index(batch_op.f('ix_visit_medicines_visit_id'), ['visit_id'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('visit_medicines', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_visit_medicines_visit_id'))
        batch_op.drop_index(batch_op.f('ix_visit_medicines_medicine_id'))

    op.drop_table('visit_medicines')
    with op.batch_alter_table('stock_movements', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_stock_movements_visit_id'))
        batch_op.drop_index(batch_op.f('ix_stock_movements_movement_type'))
        batch_op.drop_index(batch_op.f('ix_stock_movements_medicine_id'))
        batch_op.drop_index(batch_op.f('ix_stock_movements_created_at'))

    op.drop_table('stock_movements')
    with op.batch_alter_table('attachments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_attachments_visit_id'))
        batch_op.drop_index(batch_op.f('ix_attachments_patient_id'))

    op.drop_table('attachments')
    with op.batch_alter_table('visits', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_visits_visit_date'))
        batch_op.drop_index(batch_op.f('ix_visits_status'))
        batch_op.drop_index(batch_op.f('ix_visits_patient_id'))

    op.drop_table('visits')
    with op.batch_alter_table('appointments', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_appointments_status'))
        batch_op.drop_index(batch_op.f('ix_appointments_scheduled_date'))
        batch_op.drop_index(batch_op.f('ix_appointments_patient_id'))

    op.drop_table('appointments')
    op.drop_table('reports')
    op.drop_table('record_locks')
    with op.batch_alter_table('patients', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_patients_patient_type'))
        batch_op.drop_index(batch_op.f('ix_patients_last_name'))
        batch_op.drop_index(batch_op.f('ix_patients_is_archived'))
        batch_op.drop_index(batch_op.f('ix_patients_id_number'))
        batch_op.drop_index(batch_op.f('ix_patients_department'))

    op.drop_table('patients')
    with op.batch_alter_table('notification_reads', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notification_reads_user_id'))
        batch_op.drop_index(batch_op.f('ix_notification_reads_notification_id'))

    op.drop_table('notification_reads')
    with op.batch_alter_table('audit_logs', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_audit_logs_user_id'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_entity_type'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_created_at'))
        batch_op.drop_index(batch_op.f('ix_audit_logs_action'))

    op.drop_table('audit_logs')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_username'))
        batch_op.drop_index(batch_op.f('ix_users_role'))

    op.drop_table('users')
    with op.batch_alter_table('notifications', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_notifications_type'))
        batch_op.drop_index(batch_op.f('ix_notifications_created_at'))
        batch_op.drop_index(batch_op.f('ix_notifications_audience_role'))

    op.drop_table('notifications')
    with op.batch_alter_table('medicines', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_medicines_name'))

    op.drop_table('medicines')
