import asyncio
from httpx import AsyncClient, ASGITransport

from app.main import app

async def test_agent():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create an Agent graph payload
        payload = {
            "graph": {
                "name": "Test Agent Flow",
                "nodes": [
                    {
                        "id": "input-1",
                        "type": "input",
                        "label": "User brief",
                        "position": {"x": 0, "y": 0},
                        "data": { "key": "task", "value": "Say hello!" }
                    },
                    {
                        "id": "llm-1",
                        "type": "llm",
                        "label": "Coordinator",
                        "position": {"x": 0, "y": 0},
                        "data": { "provider": "openai", "model": "gpt-4o-mini" }
                    }
                ],
                "links": [
                    {
                        "id": "l1",
                        "sourceNode": "input-1",
                        "sourcePort": "value",
                        "targetNode": "llm-1",
                        "targetPort": "prompt",
                        "active": True
                    }
                ]
            },
            "runtime": {
                "providers": {
                    "openai": {
                        "apiKey": "",
                        "baseUrl": "https://api.openai.com/v1"
                    }
                }
            }
        }

        print("Sending request to create and execute agent...")
        async with client.stream("POST", "/execute/stream", json=payload) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line:
                    print(line)

if __name__ == "__main__":
    asyncio.run(test_agent())
