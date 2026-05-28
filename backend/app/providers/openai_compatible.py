import asyncio
from collections.abc import AsyncIterator

import httpx

from app.models.graph import CompletionRequest


class OpenAICompatibleProvider:
    def __init__(self, base_url: str, api_key: str | None = None, app_title: str = "PromptFlow Studio", provider_name: str = "openai"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.app_title = app_title
        self.provider_name = provider_name.lower()

    def _needs_key(self) -> bool:
        return self.provider_name not in {"ollama", "lmstudio", "lm-studio"}

    def _ensure_key(self) -> None:
        if self._needs_key() and not self.api_key:
            raise RuntimeError(
                f"{self.provider_name} needs an API key in Settings before this workflow can run."
            )

    def _headers(self) -> dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["authorization"] = f"Bearer {self.api_key}"
        headers["x-title"] = self.app_title
        return headers

    async def stream(self, request: CompletionRequest) -> AsyncIterator[str]:
        self._ensure_key()

        payload = request.model_dump(exclude={"provider", "runtime"})
        payload["stream"] = True
        
        max_retries = 3
        backoff = 1.0
        tokens_yielded = False
        
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=60) as client:
                    async with client.stream("POST", f"{self.base_url}/chat/completions", headers=self._headers(), json=payload) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line.startswith("data:"):
                                continue
                            data = line.removeprefix("data:").strip()
                            if data == "[DONE]":
                                break
                            try:
                                import json
                                chunk_data = json.loads(data)
                                delta = chunk_data.get("choices", [{}])[0].get("delta", {})
                                if "content" in delta:
                                    tokens_yielded = True
                                    yield delta["content"]
                            except Exception:
                                pass
                        
                        # Stream completed successfully
                        break
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                is_transient = status in {408, 429, 502, 503, 504}
                
                # If we've already yielded tokens, or it's the last attempt, or it's not a transient error, propagate
                if tokens_yielded or attempt == max_retries or not is_transient:
                    provider_name = self.provider_name.upper()
                    try:
                        await exc.response.aread()
                        err_detail = exc.response.text
                    except Exception:
                        err_detail = str(exc)

                    if status == 504:
                        raise RuntimeError(
                            f"The upstream LLM provider ({provider_name}) took too long to respond (504 Gateway Timeout). "
                            "This usually means the model server is currently overloaded or undergoing maintenance. Please try again in a few moments."
                        ) from exc
                    elif status == 429:
                        raise RuntimeError(
                            f"Rate limit exceeded (429) for upstream LLM provider ({provider_name}). "
                            "Please reduce request frequency or check your API key usage limits."
                        ) from exc
                    elif status == 503:
                        raise RuntimeError(
                            f"The upstream LLM provider ({provider_name}) is temporarily unavailable (503 Service Unavailable). "
                            "Please try again shortly."
                        ) from exc
                    elif status == 502:
                        raise RuntimeError(
                            f"Bad Gateway (502) encountered while contacting upstream LLM provider ({provider_name}). "
                            "Please try again."
                        ) from exc
                    else:
                        raise RuntimeError(
                            f"LLM provider ({provider_name}) returned error status {status}: {err_detail}"
                        ) from exc
                
                # Exponential backoff
                await asyncio.sleep(backoff)
                backoff *= 2.0
                
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if tokens_yielded or attempt == max_retries:
                    raise RuntimeError(
                        f"Network timeout or connectivity issue while calling upstream LLM provider ({self.provider_name.upper()}). "
                        "Please verify your internet connection or try again."
                    ) from exc
                
                await asyncio.sleep(backoff)
                backoff *= 2.0


    async def complete(self, request: CompletionRequest) -> str:
        self._ensure_key()

        payload = request.model_dump(exclude={"provider", "runtime"})
        payload["stream"] = False
        
        max_retries = 3
        backoff = 1.0
        
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=90) as client:
                    response = await client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=payload)
                    response.raise_for_status()
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
            except httpx.HTTPStatusError as exc:
                status = exc.response.status_code
                is_transient = status in {408, 429, 502, 503, 504}
                
                if attempt == max_retries or not is_transient:
                    provider_name = self.provider_name.upper()
                    if status == 504:
                        raise RuntimeError(
                            f"The upstream LLM provider ({provider_name}) took too long to respond (504 Gateway Timeout). "
                            "This usually means the model server is currently overloaded or undergoing maintenance. Please try again in a few moments."
                        ) from exc
                    elif status == 429:
                        raise RuntimeError(
                            f"Rate limit exceeded (429) for upstream LLM provider ({provider_name}). "
                            "Please reduce request frequency or check your API key usage limits."
                        ) from exc
                    elif status == 503:
                        raise RuntimeError(
                            f"The upstream LLM provider ({provider_name}) is temporarily unavailable (503 Service Unavailable). "
                            "Please try again shortly."
                        ) from exc
                    elif status == 502:
                        raise RuntimeError(
                            f"Bad Gateway (502) encountered while contacting upstream LLM provider ({provider_name}). "
                            "Please try again."
                        ) from exc
                    else:
                        raise RuntimeError(
                            f"LLM provider ({provider_name}) returned error status {status}: {exc.response.text or str(exc)}"
                        ) from exc
                
                await asyncio.sleep(backoff)
                backoff *= 2.0
                
            except (httpx.TimeoutException, httpx.NetworkError) as exc:
                if attempt == max_retries:
                    raise RuntimeError(
                        f"Network timeout or connectivity issue while calling upstream LLM provider ({self.provider_name.upper()}). "
                        "Please verify your internet connection or try again."
                    ) from exc
                
                await asyncio.sleep(backoff)
                backoff *= 2.0

