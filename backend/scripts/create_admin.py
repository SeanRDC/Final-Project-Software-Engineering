# Command-line tool that creates the first Clinic Coordinator account.

import argparse
import getpass
import sys

from pydantic import ValidationError

from app.core.exceptions import AppError
from app.core.permissions import Role
from app.db.session import SessionLocal
from app.schemas.user import UserCreate
from app.services import users


def main() -> int:
    parser = argparse.ArgumentParser(description="Create the first Clinic Coordinator account.")
    parser.add_argument("--username", required=True)
    parser.add_argument("--name", required=True, help='Full name, e.g. "Salazar, CJ"')
    parser.add_argument("--job-title", default="Clinic Coordinator")
    parser.add_argument("--password", help="Omit to be prompted (recommended)")
    args = parser.parse_args()

    password = args.password
    if password is None:
        password = getpass.getpass("Password (at least 8 characters): ")
        if password != getpass.getpass("Repeat password: "):
            print("The passwords do not match.", file=sys.stderr)
            return 1

    try:
        data = UserCreate(username=args.username, full_name=args.name, role=Role.COORDINATOR,
                          job_title=args.job_title, password=password)
        with SessionLocal() as db:
            user = users.create_user(db, data, actor=None)
    except ValidationError as exc:
        for error in exc.errors():
            print(f"{error['loc'][0]}: {error['msg']}", file=sys.stderr)
        return 1
    except AppError as exc:
        print(exc.message, file=sys.stderr)
        return 1

    print(f"Created coordinator account '{user.username}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
