# Application settings loaded from environment variables or the .env file.

from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    APP_NAME: str = "HAU-Sync API"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = False

    DATABASE_URL: str = "sqlite:///./data/hau_sync.db"

    SECRET_KEY: str = "change-me-to-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720

    TIMEZONE: str = "Asia/Manila"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    LOCK_TIMEOUT_MINUTES: int = 5

    UPLOAD_DIR: str = "./data/uploads"
    MAX_UPLOAD_MB: int = 10

    BACKUP_DIR: str = "./data/backups"

    # The built frontend (npm run build). Served by the backend when the folder exists.
    FRONTEND_DIST: str = "../frontend/dist"

    @field_validator("DATABASE_URL")
    @classmethod
    def _use_psycopg3_driver(cls, value: str) -> str:
        for prefix in ("postgresql://", "postgres://"):
            if value.startswith(prefix):
                return "postgresql+psycopg://" + value[len(prefix):]
        return value

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.TIMEZONE)

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def resolve_path(self, value: str) -> Path:
        path = Path(value)
        return path if path.is_absolute() else (BACKEND_DIR / path).resolve()

    @property
    def upload_dir(self) -> Path:
        return self.resolve_path(self.UPLOAD_DIR)

    @property
    def backup_dir(self) -> Path:
        return self.resolve_path(self.BACKUP_DIR)

    @property
    def frontend_dist(self) -> Path:
        return self.resolve_path(self.FRONTEND_DIST)

    @property
    def sqlite_path(self) -> Path | None:
        if not self.is_sqlite:
            return None
        raw = self.DATABASE_URL.split("///", 1)[-1]
        return self.resolve_path(raw)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
