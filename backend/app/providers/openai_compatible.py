from collections.abc import AsyncIterator

import httpx

from app.models.graph import CompletionRequest


class OpenAICompatibleProvider:
    def __init__(self, base_url: str, api_key: str | None = None, app_title: str = "PromptFlow Studio"):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.app_title = app_title

    def _headers(self) -> dict[str, str]:
        headers = {"content-type": "application/json"}
        if self.api_key:
            headers["authorization"] = f"Bearer {self.api_key}"
        headers["x-title"] = self.app_title
        return headers

    async def stream(self, request: CompletionRequest) -> AsyncIterator[str]:
        if not self.api_key:
            import asyncio
            prompt = request.messages[-1]["content"] if request.messages else ""
            simulated_response = f"[Simulated Local Response]\nBased on the input: '{prompt[:60]}...'\nThe execution completed successfully! This simulated response is generated locally because no API key was configured for this provider in the hosted Settings."
            for token in simulated_response.split(" "):
                yield token + " "
                await asyncio.sleep(0.05)
            return

        payload = request.model_dump(exclude={"provider", "runtime"})
        payload["stream"] = True
        async with httpx.AsyncClient(timeout=None) as client:
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
                            yield delta["content"]
                    except Exception:
                        pass


    async def complete(self, request: CompletionRequest) -> str:
        if not self.api_key:
            prompt = request.messages[-1]["content"] if request.messages else ""
            return f"[Simulated Local Response]\nBased on the input: '{prompt[:60]}...'\nThe execution completed successfully! This simulated response is generated locally because no API key was configured for this provider in the hosted Settings."

        payload = request.model_dump(exclude={"provider", "runtime"})
        payload["stream"] = False
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(f"{self.base_url}/chat/completions", headers=self._headers(), json=payload)
            response.raise_for_status()
            data = response.json()
        return data["choices"][0]["message"]["content"]
