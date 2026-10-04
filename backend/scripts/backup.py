# Command-line tool that backs up and restores the database and uploaded files.

import argparse
import shutil
import sqlite3
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import settings

PREFIX = "hau-sync-backup-"
SQLITE_MEMBER = "database.sqlite3"
POSTGRES_MEMBER = "database.dump"
UPLOADS_MEMBER = "uploads/"


def _libpq_url() -> str:
    url = make_url(settings.DATABASE_URL).set(drivername="postgresql")
    return url.render_as_string(hide_password=False)


def _run(command: list[str]) -> None:
    try:
        subprocess.run(command, check=True)
    except FileNotFoundError:
        raise SystemExit(f"'{command[0]}' was not found. Add PostgreSQL's bin folder to PATH.")
    except subprocess.CalledProcessError as exc:
        raise SystemExit(f"{command[0]} failed with exit code {exc.returncode}.")


def _dump_database(destination_dir: Path) -> Path:
    if settings.is_sqlite:
        source_path = settings.sqlite_path
        if not source_path.is_file():
            raise SystemExit(f"No database found at {source_path}.")
        target = destination_dir / SQLITE_MEMBER
        source, copy = sqlite3.connect(source_path), sqlite3.connect(target)
        try:
            source.backup(copy)
        finally:
            copy.close()
            source.close()
        return target
    target = destination_dir / POSTGRES_MEMBER
    _run(["pg_dump", "--format=custom", f"--file={target}", f"--dbname={_libpq_url()}"])
    return target


def list_backups() -> list[Path]:
    if not settings.backup_dir.is_dir():
        return []
    return sorted(settings.backup_dir.glob(f"{PREFIX}*.zip"), reverse=True)


def create(keep: int | None = None) -> Path:
    settings.backup_dir.mkdir(parents=True, exist_ok=True)
    archive = settings.backup_dir / f"{PREFIX}{datetime.now():%Y%m%d-%H%M%S}.zip"
    with tempfile.TemporaryDirectory() as tmp:
        dump = _dump_database(Path(tmp))
        with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as bundle:
            bundle.write(dump, dump.name)
            if settings.upload_dir.is_dir():
                for file in sorted(settings.upload_dir.iterdir()):
                    if file.is_file():
                        bundle.write(file, f"{UPLOADS_MEMBER}{file.name}")
    if keep is not None and keep > 0:
        for old in list_backups()[keep:]:
            old.unlink()
    return archive


def restore(archive: Path) -> None:
    if not archive.is_file():
        candidate = settings.backup_dir / archive.name
        if not candidate.is_file():
            raise SystemExit(f"Backup not found: {archive}")
        archive = candidate

    with tempfile.TemporaryDirectory() as tmp, zipfile.ZipFile(archive) as bundle:
        names = bundle.namelist()
        expected = SQLITE_MEMBER if settings.is_sqlite else POSTGRES_MEMBER
        if expected not in names:
            raise SystemExit(
                f"This backup has no {expected}. It was made from a different kind of "
                "database than DATABASE_URL now points to."
            )
        dump = Path(bundle.extract(expected, tmp))

        if settings.is_sqlite:
            target = settings.sqlite_path
            target.parent.mkdir(parents=True, exist_ok=True)
            for leftover in (target.with_name(target.name + "-wal"),
                             target.with_name(target.name + "-shm")):
                leftover.unlink(missing_ok=True)
            shutil.copyfile(dump, target)
        else:
            _run(["pg_restore", "--clean", "--if-exists", "--no-owner",
                  f"--dbname={_libpq_url()}", str(dump)])

        settings.upload_dir.mkdir(parents=True, exist_ok=True)
        for existing in settings.upload_dir.iterdir():
            if existing.is_file():
                existing.unlink()
        for name in names:
            if name.startswith(UPLOADS_MEMBER) and not name.endswith("/"):
                with bundle.open(name) as source, \
                        (settings.upload_dir / Path(name).name).open("wb") as out:
                    shutil.copyfileobj(source, out)


def main() -> int:
    parser = argparse.ArgumentParser(description="Back up and restore HAU-Sync data.")
    commands = parser.add_subparsers(dest="command", required=True)
    create_cmd = commands.add_parser("create", help="Write a new backup archive")
    create_cmd.add_argument("--keep", type=int, help="Keep only this many newest backups")
    commands.add_parser("list", help="List existing backups, newest first")
    restore_cmd = commands.add_parser("restore", help="Restore a backup (stop the server first)")
    restore_cmd.add_argument("archive", type=Path)
    restore_cmd.add_argument("--yes", action="store_true", help="Do not ask for confirmation")
    args = parser.parse_args()

    if args.command == "create":
        archive = create(args.keep)
        print(f"Backup written to {archive} ({archive.stat().st_size / 1024:.0f} KB)")
    elif args.command == "list":
        backups = list_backups()
        for backup in backups:
            print(f"{backup.name}  {backup.stat().st_size / 1024:.0f} KB")
        if not backups:
            print(f"No backups in {settings.backup_dir}")
    elif args.command == "restore":
        if not args.yes:
            print("This REPLACES the current database and uploaded files with the backup.")
            print("Stop the HAU-Sync server before continuing.")
            if input("Type RESTORE to continue: ").strip() != "RESTORE":
                print("Cancelled.")
                return 1
        restore(args.archive)
        print("Restore complete. Start the server again.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
