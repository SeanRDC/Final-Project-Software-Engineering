# In-process WebSocket broadcaster that pushes live change events to connected stations.

import logging
from typing import Any

import anyio
from fastapi import WebSocket

from app.core.clock import utcnow

logger = logging.getLogger(__name__)


class EventBroadcaster:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        for websocket in list(self._connections):
            try:
                await websocket.send_json(message)
            except Exception:
                self.disconnect(websocket)

    def publish(self, event: str, **data: Any) -> None:
        message = {"event": event, "data": data, "at": utcnow().isoformat()}
        try:
            anyio.from_thread.run(self.broadcast, message)
        except RuntimeError:
            logger.debug("Skipped broadcast of %s outside the server loop", event)


broadcaster = EventBroadcaster()
