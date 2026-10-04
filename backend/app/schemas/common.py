# Schema building blocks shared across the API, such as pagination and optional text.

from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, BeforeValidator, ConfigDict

T = TypeVar("T")


def _blank_to_none(value):
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class Message(BaseModel):
    message: str
