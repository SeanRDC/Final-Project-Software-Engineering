# Roles, permissions and the map of which role may do what.

from enum import StrEnum


class Role(StrEnum):
    COORDINATOR = "coordinator"
    DOCTOR = "doctor"
    CLINIC_STAFF = "clinic_staff"


class Permission(StrEnum):
    USERS_MANAGE = "users:manage"
    AUDIT_VIEW = "audit:view"

    PATIENTS_READ = "patients:read"
    PATIENTS_WRITE = "patients:write"
    PATIENTS_ARCHIVE = "patients:archive"

    VISITS_READ = "visits:read"
    VISITS_RECORD = "visits:record"
    VISITS_CONSULT = "visits:consult"
    MEDICINES_DISPENSE = "medicines:dispense"

    APPOINTMENTS_READ = "appointments:read"
    APPOINTMENTS_WRITE = "appointments:write"
    APPOINTMENTS_DECIDE = "appointments:decide"

    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"

    REPORTS_VIEW = "reports:view"
    REPORTS_GENERATE = "reports:generate"

    ATTACHMENTS_READ = "attachments:read"
    ATTACHMENTS_WRITE = "attachments:write"
    ATTACHMENTS_DELETE = "attachments:delete"


P = Permission

ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.COORDINATOR: frozenset(Permission),
    Role.CLINIC_STAFF: frozenset(
        {
            P.PATIENTS_READ,
            P.PATIENTS_WRITE,
            P.VISITS_READ,
            P.VISITS_RECORD,
            P.MEDICINES_DISPENSE,
            P.APPOINTMENTS_READ,
            P.APPOINTMENTS_WRITE,
            P.INVENTORY_READ,
            P.INVENTORY_WRITE,
            P.REPORTS_VIEW,
            P.ATTACHMENTS_READ,
            P.ATTACHMENTS_WRITE,
        }
    ),
    Role.DOCTOR: frozenset(
        {
            P.PATIENTS_READ,
            P.PATIENTS_WRITE,
            P.VISITS_READ,
            P.VISITS_CONSULT,
            P.APPOINTMENTS_READ,
            P.INVENTORY_READ,
            P.REPORTS_VIEW,
            P.ATTACHMENTS_READ,
            P.ATTACHMENTS_WRITE,
        }
    ),
}


def has_permission(role: str, permission: Permission) -> bool:
    try:
        return permission in ROLE_PERMISSIONS[Role(role)]
    except ValueError:
        return False


def permissions_for(role: str) -> list[str]:
    try:
        return sorted(ROLE_PERMISSIONS[Role(role)])
    except ValueError:
        return []
