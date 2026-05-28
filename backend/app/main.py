from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, StreamingResponse


from app.config import settings
from app.db.mongo import delete_graph, list_graphs, load_graph, save_graph
from app.models.graph import CompletionRequest, ExecutionRequest, GraphDocument, VectorSearchRequest

from app.providers.registry import get_provider
from app.services.compiler import compile_to_es_module
from app.services.embeddings import embed_text
from app.services.executor import execute_graph_stream
from app.services.graph_algorithms import CycleError, assert_acyclic, kahn_order
from app.services.vector_databases import search_vector_database


app = FastAPI(title="PromptFlow Studio API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/graphs")
async def upsert_graph(graph: GraphDocument) -> dict[str, str]:
    graph_id = await save_graph(graph)
    return {"id": graph_id}


@app.get("/graphs")
async def list_saved_graphs() -> list[dict[str, Any]]:
    return await list_graphs()


@app.get("/graphs/{graph_id}")
async def get_graph(graph_id: str):
    graph = await load_graph(graph_id)
    if not graph:
        raise HTTPException(status_code=404, detail="Graph not found")
    return graph


@app.delete("/graphs/{graph_id}")
async def remove_graph(graph_id: str) -> dict[str, bool]:
    success = await delete_graph(graph_id)
    if not success:
        raise HTTPException(status_code=404, detail="Graph not found")
    return {"success": success}



@app.post("/validate")
async def validate_graph(graph: GraphDocument) -> dict[str, object]:
    try:
        assert_acyclic(graph.nodes, graph.links)
        order = [node.id for node in kahn_order(graph)]
        return {"valid": True, "order": order}
    except CycleError as exc:
        return {"valid": False, "error": str(exc)}


@app.post("/execute/stream")
async def execute_stream(request: ExecutionRequest):
    try:
        assert_acyclic(request.graph.nodes, request.graph.links)
    except CycleError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return StreamingResponse(execute_graph_stream(request.graph, request.runtime), media_type="text/event-stream")


@app.post("/llm/complete")
async def complete(request: CompletionRequest) -> dict[str, str]:
    provider = get_provider(request.provider, request.runtime)
    content = await provider.complete(request)
    return {"content": content}


@app.post("/llm/stream")
async def stream_llm(request: CompletionRequest):
    provider = get_provider(request.provider, request.runtime)

    async def events():
        async for chunk in provider.stream(request):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(events(), media_type="text/event-stream")


@app.post("/vector/search")
async def search_vectors(request: VectorSearchRequest):
    embedding = await embed_text(request.query, request.provider, request.model, request.runtime)
    vector_config = request.runtime.vectorDatabase.model_copy(update={
        "collection": request.collection,
        "index": request.index,
        "path": request.path,
    })
    return await search_vector_database(vector_config, embedding, request.limit)


@app.post("/compile", response_class=PlainTextResponse)
async def compile_graph(graph: GraphDocument) -> str:
    try:
        return compile_to_es_module(graph)
    except CycleError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
