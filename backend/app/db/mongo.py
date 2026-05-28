from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings
from app.models.graph import GraphDocument


_client: AsyncIOMotorClient | None = None
_memory_graphs: dict[str, dict[str, Any]] = {}


def get_database() -> AsyncIOMotorDatabase | None:
    global _client
    if not settings.mongodb_uri:
        return None
    if _client is None:
        _client = AsyncIOMotorClient(settings.mongodb_uri)
    return _client[settings.mongodb_db]


def _safe_id(graph_id: str) -> ObjectId | str:
    try:
        return ObjectId(graph_id)
    except InvalidId:
        return graph_id


async def save_graph(graph: GraphDocument) -> str:
    payload = graph.model_dump(exclude={"id"})
    payload["updatedAt"] = datetime.now(UTC)
    db = get_database()
    if db is None:
        graph_id = graph.id or str(len(_memory_graphs) + 1)
        _memory_graphs[graph_id] = {**payload, "_id": graph_id}
        return graph_id
    if graph.id:
        await db.graphs.update_one({"_id": _safe_id(graph.id)}, {"$set": payload}, upsert=True)
        return graph.id
    result = await db.graphs.insert_one(payload)
    return str(result.inserted_id)


async def load_graph(graph_id: str) -> dict[str, Any] | None:
    db = get_database()
    if db is None:
        return _memory_graphs.get(graph_id)
    document = await db.graphs.find_one({"_id": _safe_id(graph_id)})
    if document:
        document["id"] = str(document.pop("_id"))
    return document


async def list_graphs() -> list[dict[str, Any]]:
    db = get_database()
    if db is None:
        return [{"id": k, "name": v.get("name", "Untitled Graph")} for k, v in _memory_graphs.items()]
    cursor = db.graphs.find({}, {"name": 1})
    results = []
    async for document in cursor:
        results.append({"id": str(document["_id"]), "name": document.get("name", "Untitled Graph")})
    return results


async def delete_graph(graph_id: str) -> bool:
    db = get_database()
    if db is None:
        if graph_id in _memory_graphs:
            del _memory_graphs[graph_id]
            return True
        return False
    result = await db.graphs.delete_one({"_id": _safe_id(graph_id)})
    return result.deleted_count > 0


async def vector_search(collection: str, index: str, path: str, embedding: list[float], limit: int) -> list[dict[str, Any]]:
    db = get_database()
    if db is None:
        return [{"text": "MongoDB is not configured; returning an in-memory placeholder context.", "score": 0.0}]
    pipeline = [
        {
            "$vectorSearch": {
                "index": index,
                "path": path,
                "queryVector": embedding,
                "numCandidates": max(limit * 20, 100),
                "limit": limit,
            }
        },
        {"$project": {"_id": 0, "text": 1, "metadata": 1, "score": {"$meta": "vectorSearchScore"}}},
    ]
    return await db[collection].aggregate(pipeline).to_list(length=limit)

