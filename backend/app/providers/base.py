from collections.abc import AsyncIterator
from typing import Protocol

from app.models.graph import CompletionRequest


class LLMProvider(Protocol):
    async def stream(self, request: CompletionRequest) -> AsyncIterator[str]:
        ...

    async def complete(self, request: CompletionRequest) -> str:
        ...
