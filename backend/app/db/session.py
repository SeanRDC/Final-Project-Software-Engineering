# Database engine, session factory and the per-request session dependency.

from collections.abc import Iterator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings


def build_engine(url: str) -> Engine:
    if url.startswith("sqlite"):
        if settings.sqlite_path and url == settings.DATABASE_URL:
            settings.sqlite_path.parent.mkdir(parents=True, exist_ok=True)
            url = f"sqlite:///{settings.sqlite_path.as_posix()}"
        engine = create_engine(url, connect_args={"check_same_thread": False})

        @event.listens_for(engine, "connect")
        def _enable_foreign_keys(dbapi_connection, _record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        return engine
    return create_engine(url, pool_pre_ping=True)


engine = build_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Iterator[Session]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
