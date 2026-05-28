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
            
            # Check if user is asking to create/make/build an agent or workflow
            if any(word in prompt.lower() for word in ["make", "create", "build", "generate", "setup", "design", "flow", "agent", "workflow"]):
                simulated_response = """Here is a custom agent workflow I've designed for you:

### News Aggregator Agent Workflow
This pipeline contains:
1. **User Query Input**: Captures search topic
2. **Search Prompt Template**: Prepares search query formatting
3. **LLM Search Mimic**: Simulates Google News search parsing
4. **Aggregator Writer Sub-agent**: Formats raw findings into a beautiful top-10 list
5. **Output**: Terminal display showcases the aggregated report

```json
{
  "nodes": [
    { "id": "input-1", "type": "input", "label": "Search Topic", "position": {"x": 60, "y": 140}, "inputs": [], "outputs": [{"id": "value", "label": "value"}], "data": {"key": "topic", "value": "Google AI news"} },
    { "id": "prompt-1", "type": "prompt", "label": "Search Prompt", "position": {"x": 320, "y": 140}, "inputs": [{"id": "topic", "label": "topic"}], "outputs": [{"id": "prompt", "label": "prompt"}], "data": {"template": "Extract top 10 relevant news items for search query: {{topic}}"} },
    { "id": "llm-search", "type": "llm", "label": "Google News Mimic", "position": {"x": 580, "y": 140}, "inputs": [{"id": "prompt", "label": "prompt"}], "outputs": [{"id": "completion", "label": "completion"}], "data": {"provider": "openai", "model": "gpt-4o-mini", "temperature": 0.2} },
    { "id": "subagent-writer", "type": "subagent", "label": "Aggregator Writer", "position": {"x": 840, "y": 140}, "inputs": [{"id": "task", "label": "task"}, {"id": "context", "label": "context"}], "outputs": [{"id": "result", "label": "result"}], "data": {"role": "Technical Writer", "handoff": "Organize these news details into a beautiful top-10 list."} },
    { "id": "output-1", "type": "output", "label": "Aggregated Report", "position": {"x": 1100, "y": 140}, "inputs": [{"id": "input", "label": "input"}], "outputs": [], "data": {} }
  ],
  "links": [
    { "id": "l1", "sourceNode": "input-1", "sourcePort": "value", "targetNode": "prompt-1", "targetPort": "topic" },
    { "id": "l2", "sourceNode": "prompt-1", "sourcePort": "prompt", "targetNode": "llm-search", "targetPort": "prompt" },
    { "id": "l3", "sourceNode": "llm-search", "sourcePort": "completion", "targetNode": "subagent-writer", "targetPort": "context" },
    { "id": "l4", "sourceNode": "input-1", "sourcePort": "value", "targetNode": "subagent-writer", "targetPort": "task" },
    { "id": "l5", "sourceNode": "subagent-writer", "sourcePort": "result", "targetNode": "output-1", "targetPort": "input" }
  ]
}
```

Click the **'Load Workflow into Canvas'** button below to automatically load these nodes and connections into your drag-and-drop workspace!"""
            else:
                simulated_response = f"[Simulated Local Response]\nBased on the input: '{prompt[:60]}...'\nThe execution completed successfully! This simulated response is generated locally because no API key was configured for this provider in the hosted Settings."
            
            for token in simulated_response.split(" "):
                yield token + " "
                await asyncio.sleep(0.04)
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
