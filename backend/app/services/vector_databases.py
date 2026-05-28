from typing import Any

import httpx
from motor.motor_asyncio import AsyncIOMotorClient

from app.models.graph import VectorDatabaseRuntime


async def search_vector_database(config: VectorDatabaseRuntime, embedding: list[float], limit: int) -> list[dict[str, Any]]:
    kind = config.kind.lower()
    if not config.connectionString and kind == "mongodb_atlas":
        return [{"text": "Add a BYO MongoDB Atlas connection string in Settings to run live vector search.", "score": 0.0}]
    if kind == "mongodb_atlas":
        return await _mongodb_vector_search(config, embedding, limit)
    if kind == "qdrant":
        return await _qdrant_search(config, embedding, limit)
    if kind == "pinecone":
        return await _pinecone_search(config, embedding, limit)
    return [{"text": f"Unsupported vector database adapter: {config.kind}", "score": 0.0}]


async def _mongodb_vector_search(config: VectorDatabaseRuntime, embedding: list[float], limit: int) -> list[dict[str, Any]]:
    client = AsyncIOMotorClient(config.connectionString)
    try:
        db = client[config.database]
        pipeline = [
            {
                "$vectorSearch": {
                    "index": config.index,
                    "path": config.path,
                    "queryVector": embedding,
                    "numCandidates": max(limit * 20, 100),
                    "limit": limit,
                }
            },
            {"$project": {"_id": 0, "text": 1, "metadata": 1, "score": {"$meta": "vectorSearchScore"}}},
        ]
        return await db[config.collection].aggregate(pipeline).to_list(length=limit)
    finally:
        client.close()


async def _qdrant_search(config: VectorDatabaseRuntime, embedding: list[float], limit: int) -> list[dict[str, Any]]:
    base_url = (config.connectionString or config.endpoint or "").rstrip("/")
    headers = {"content-type": "application/json"}
    if config.apiKey:
        headers["api-key"] = config.apiKey
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f"{base_url}/collections/{config.collection}/points/search",
            headers=headers,
            json={"vector": embedding, "limit": limit, "with_payload": True},
        )
        response.raise_for_status()
        data = response.json().get("result", [])
    return [{"text": item.get("payload", {}).get("text", item.get("payload", "")), "score": item.get("score", 0)} for item in data]


async def _pinecone_search(config: VectorDatabaseRuntime, embedding: list[float], limit: int) -> list[dict[str, Any]]:
    host = (config.connectionString or config.endpoint or "").rstrip("/")
    headers = {"content-type": "application/json"}
    if config.apiKey:
        headers["api-key"] = config.apiKey
    body: dict[str, Any] = {"vector": embedding, "topK": limit, "includeMetadata": True}
    if config.namespace:
        body["namespace"] = config.namespace
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{host}/query", headers=headers, json=body)
        response.raise_for_status()
        data = response.json().get("matches", [])
    return [{"text": item.get("metadata", {}).get("text", item.get("metadata", "")), "score": item.get("score", 0)} for item in data]
