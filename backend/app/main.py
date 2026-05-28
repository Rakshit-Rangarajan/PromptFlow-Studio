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


@app.post("/runtime/models")
async def list_runtime_models(request: dict[str, Any]) -> dict[str, Any]:
    provider = request.get("providerType", "openai")
    base_url = request.get("baseUrl") or ""
    api_key = request.get("apiKey") or ""
    mode = request.get("mode", "completion")
    
    if mode == "embedding":
        fallbacks = {
            "openai": ["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"],
            "gemini": ["text-embedding-004"],
            "nvidia": ["nvidia/embeddings-nv-embed-qa-4", "meta/llama3-8b-instruct"],
            "openrouter": ["mistralai/mxtral-embed", "nomic/nomic-embed-text-v1.5"],
            "ollama": ["nomic-embed-text", "all-minilm"],
            "lmstudio": ["embedding-model-1"]
        }
    else:
        fallbacks = {
            "openai": ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
            "gemini": ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro"],
            "nvidia": ["meta/llama3-70b-instruct", "meta/llama3-8b-instruct", "nvidia/llama-3.1-nemotron-51b-instruct"],
            "openrouter": ["meta-llama/llama-3-8b-instruct:free", "mistralai/mistral-7b-instruct", "google/gemma-2-9b-it:free"],
            "ollama": ["llama3", "mistral", "gemma", "phi3"],
            "lmstudio": ["model-identifier-1", "model-identifier-2"]
        }
    
    models = []
    
    try:
        if provider == "gemini" and api_key:
            import httpx
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            async with httpx.AsyncClient(timeout=4) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    if mode == "embedding":
                        models = [m["name"].split("/")[-1] for m in data.get("models", []) if "embedContent" in m.get("supportedGenerationMethods", [])]
                    else:
                        models = [m["name"].split("/")[-1] for m in data.get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])]
        
        elif provider in ["openai", "nvidia", "openrouter", "lmstudio"] and (api_key or provider == "lmstudio"):
            import httpx
            url = base_url.rstrip("/") + "/models"
            headers = {}
            if api_key:
                headers["authorization"] = f"Bearer {api_key}"
            async with httpx.AsyncClient(timeout=4) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    raw_models = [m["id"] for m in data.get("data", [])]
                    if mode == "embedding":
                        models = [m for m in raw_models if "embed" in m.lower() or "similarity" in m.lower()]
                    else:
                        models = raw_models
                        
        elif provider == "ollama":
            import httpx
            url = base_url.rstrip("/").replace("/v1", "") + "/api/tags"
            async with httpx.AsyncClient(timeout=3) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    raw_models = [m["name"] for m in data.get("models", [])]
                    if mode == "embedding":
                        models = [m for m in raw_models if "embed" in m.lower() or "minilm" in m.lower()]
                    else:
                        models = raw_models
    except Exception:
        pass
        
    if not models:
        models = fallbacks.get(provider, [fallbacks["openai"][0]])
        
    models = sorted(list(set(models)))
    
    if mode == "embedding":
        recommendation = "text-embedding-3-small"
        if provider == "openai":
            recommendation = "text-embedding-3-small"
        elif provider == "gemini":
            recommendation = "text-embedding-004"
        elif provider == "nvidia":
            recommendation = "nvidia/embeddings-nv-embed-qa-4"
        elif provider == "openrouter":
            recommendation = "nomic/nomic-embed-text-v1.5"
        elif provider == "ollama":
            recommendation = "nomic-embed-text" if "nomic-embed-text" in models else models[0] if models else ""
        elif provider == "lmstudio":
            recommendation = models[0] if models else ""
    else:
        recommendation = "gpt-4o-mini"
        if provider == "openai":
            recommendation = "gpt-4o-mini"
        elif provider == "gemini":
            recommendation = "gemini-1.5-flash"
        elif provider == "nvidia":
            recommendation = "meta/llama3-70b-instruct"
        elif provider == "openrouter":
            recommendation = "meta-llama/llama-3-8b-instruct:free"
        elif provider == "ollama":
            recommendation = "llama3" if "llama3" in models else models[0] if models else ""
        elif provider == "lmstudio":
            recommendation = models[0] if models else ""
        
    return {
        "models": models,
        "recommendation": recommendation
    }


@app.post("/runtime/databases/info")
async def list_database_info(request: dict[str, Any]) -> dict[str, Any]:
    kind = request.get("kind", "mongodb_atlas")
    
    recommendations = {
        "mongodb_atlas": {
            "index": "vector_index",
            "collection": "knowledge_base",
            "path": "embedding",
            "suggested_setup": "We recommend creating an Atlas Vector Search index named 'vector_index' with path 'embedding'."
        },
        "pinecone": {
            "index": "news_index",
            "collection": "",
            "path": "",
            "suggested_setup": "For Pinecone, recommend a 1536-dimension index for text-embedding-3-small / Ada-002 models."
        },
        "qdrant": {
            "collection": "knowledge_base",
            "index": "",
            "path": "",
            "suggested_setup": "For Qdrant, we recommend starting a local docker container on port 6333 and creating collection 'knowledge_base'."
        },
        "postgres": {
            "collection": "embeddings",
            "index": "vector_idx",
            "path": "embedding_col",
            "suggested_setup": "Ensure the 'vector' extension is enabled in PostgreSQL: CREATE EXTENSION IF NOT EXISTS vector;"
        }
    }
    
    return recommendations.get(kind, {
        "index": "vector_index",
        "collection": "documents",
        "suggested_setup": "Ensure connection string is configured securely."
    })
