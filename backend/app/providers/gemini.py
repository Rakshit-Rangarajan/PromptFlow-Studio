from collections.abc import AsyncIterator

from app.models.graph import CompletionRequest


class GeminiProvider:
    def __init__(self, api_key: str | None):
        self.api_key = api_key

    async def stream(self, request: CompletionRequest) -> AsyncIterator[str]:
        if not self.api_key:
            yield "Gemini API key is not configured."
            return
        from google import genai

        client = genai.Client(api_key=self.api_key)
        prompt = "\n".join(message["content"] for message in request.messages)
        stream = client.models.generate_content_stream(model=request.model, contents=prompt)
        for chunk in stream:
            if chunk.text:
                yield chunk.text

    async def complete(self, request: CompletionRequest) -> str:
        chunks = []
        async for chunk in self.stream(request):
            chunks.append(chunk)
        return "".join(chunks)
