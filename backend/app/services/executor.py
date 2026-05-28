import asyncio
import json
import time
from collections import defaultdict
from collections.abc import AsyncIterator

from app.models.graph import CompletionRequest, GraphDocument, RuntimeConfig
from app.providers.registry import get_provider
from app.services.embeddings import embed_text
from app.services.graph_algorithms import assert_acyclic, kahn_order
from app.services.vector_databases import search_vector_database


def _field(value: object, key: str, default: str = "") -> str:
    if isinstance(value, dict):
        return str(value.get(key, default) or default)
    return str(getattr(value, key, default) or default)


def _runtime_provider_map(runtime: RuntimeConfig) -> dict[str, object]:
    providers = getattr(runtime, "providers", {}) or {}
    alias_map: dict[str, object] = {}
    if isinstance(providers, dict):
        provider_iter = providers.items()
    else:
        provider_iter = ((getattr(provider, "id", None), provider) for provider in providers)

    for key, provider in provider_iter:
        if provider is None:
            continue
        for alias in {
            str(key or "").lower(),
            _field(provider, "id").lower(),
            _field(provider, "providerType").lower(),
            _field(provider, "name").lower(),
        }:
            if alias:
                alias_map[alias] = provider
    return alias_map


def _best_provider_name(runtime: RuntimeConfig, mode: str = "completion") -> str:
    providers = _runtime_provider_map(runtime)
    order = ["mongodb", "mongo", "mongodb_atlas"] if mode == "embedding" else []
    order += ["openai", "gemini", "openrouter", "nvidia", "nim", "nvidia-nim", "ollama", "lmstudio", "lm-studio"]
    local = {"ollama", "lmstudio", "lm-studio"}

    for candidate in order:
        provider = providers.get(candidate)
        if not provider:
            continue
        provider_type = _field(provider, "providerType").lower() or candidate
        if provider_type in local or _field(provider, "apiKey"):
            return provider_type
    return "mongodb" if mode == "embedding" else "openai"


def _resolve_provider_name(provider_ref: str, runtime: RuntimeConfig, mode: str = "completion") -> str:
    ref = str(provider_ref or "").lower()
    if not ref:
        return _best_provider_name(runtime, mode)

    provider = _runtime_provider_map(runtime).get(ref)
    if provider:
        provider_type = _field(provider, "providerType").lower()
        if provider_type:
            return provider_type
    return _best_provider_name(runtime, mode)


def _preflight_errors(graph: GraphDocument, runtime: RuntimeConfig) -> list[dict[str, str]]:
    errors: list[dict[str, str]] = []
    providers = _runtime_provider_map(runtime)
    databases = getattr(runtime, "databases", []) or []
    local_providers = {"ollama", "lmstudio", "lm-studio"}

    for node in graph.nodes:
        if node.type in {"llm", "subagent"}:
            provider_name = _resolve_provider_name(str(node.data.get("provider", "")), runtime, "completion")
            if provider_name not in local_providers:
                provider_config = providers.get(provider_name)
                api_key = _field(provider_config, "apiKey") if provider_config else ""
                if not provider_config or not api_key:
                    errors.append({
                        "node": node.id,
                        "label": node.label,
                        "message": f"{provider_name} needs an API key in Settings."
                    })

        if node.type == "vector":
            embedding_provider = _resolve_provider_name(str(node.data.get("provider", "")), runtime, "embedding")
            node.data.setdefault("provider", embedding_provider)
            vector_db_id = node.data.get("vectorDatabase")
            if not vector_db_id:
                errors.append({
                    "node": node.id,
                    "label": node.label,
                    "message": "Pick a vector database in the node settings."
                })
                continue
            vector_db = next((db for db in databases if _field(db, "id") == str(vector_db_id)), None)
            if not vector_db:
                errors.append({
                    "node": node.id,
                    "label": node.label,
                    "message": "Vector database not found in Settings."
                })
                continue

            if not getattr(vector_db, "connectionString", None):
                errors.append({
                    "node": node.id,
                    "label": node.label,
                    "message": f"{getattr(vector_db, 'kind', 'database')} needs a connection string in Settings."
                })

    return errors


async def execute_graph_stream(graph: GraphDocument, runtime: RuntimeConfig | None = None) -> AsyncIterator[str]:
    runtime = runtime or RuntimeConfig()
    assert_acyclic(graph.nodes, graph.links)
    ordered = kahn_order(graph)
    incoming = defaultdict(list)
    for link in graph.links:
        incoming[link.targetNode].append(link)

    state: dict[str, object] = {}
    node_count = len(ordered)
    node_errors: list[dict[str, str]] = []
    last_output_text = ""
    last_executed_result = ""

    for error in _preflight_errors(graph, runtime):
        node_errors.append(error)
        yield _sse({"event": "node:error", "node": error["node"], "message": error["message"], "label": error["label"], "durationMs": 0})

    if node_errors:
        yield _sse({
            "event": "complete",
            "stateKeys": [],
            "hasOutput": False,
            "output": "",
            "errorCount": len(node_errors),
            "errors": node_errors[:3],
        })
        return

    active_paths: set[tuple[str, str]] = set()
    for node in ordered:
        if not incoming[node.id]:
            active_paths.add((node.id, "default"))

    for step_index, node in enumerate(ordered):
        is_active = True
        if incoming[node.id]:
            is_active = any((link.sourceNode, link.sourcePort) in active_paths for link in incoming[node.id])

        if not is_active:
            yield _sse({"event": "node:skipped", "node": node.id, "label": node.label, "step": step_index})
            continue

        for link in incoming[node.id]:
            source_port_key = f"{link.sourceNode}.{link.sourcePort}"
            if source_port_key in state:
                state[link.targetPort] = state[source_port_key]
            else:
                state[link.targetPort] = state.get(link.sourceNode, "")

        t0 = time.perf_counter()
        yield _sse({"event": "node:start", "node": node.id, "label": node.label, "step": step_index, "total": node_count})

        try:
            if node.type == "input":
                result = node.data.get("value", "")

            elif node.type == "prompt":
                result = _interpolate(node.data.get("template", ""), state)
                state["prompt"] = result

            elif node.type == "vector":
                query = str(state.get("query") or state.get("prompt") or "")
                embedding_provider = _resolve_provider_name(str(node.data.get("provider", "")), runtime, "embedding")
                embedding_model = node.data.get("model") or ("mongodb-embedding" if embedding_provider in {"mongodb", "mongo", "mongodb_atlas"} else "text-embedding-3-small")
                embedding = await embed_text(query, embedding_provider, embedding_model, runtime)
                selected_db_id = node.data.get("vectorDatabase")
                selected_db = None
                for db in getattr(runtime, "databases", []):
                    if db.id == selected_db_id:
                        selected_db = db
                        break

                vector_base = selected_db or runtime.vectorDatabase
                vector_config = vector_base.model_copy(update={
                    "collection": node.data.get("collection") or _field(vector_base, "collection"),
                    "index": node.data.get("index") or _field(vector_base, "index"),
                    "path": node.data.get("path") or _field(vector_base, "path"),
                })
                docs = await search_vector_database(vector_config, embedding, int(node.data.get("limit", 4)))
                result = "\n".join(str(item.get("text", item)) for item in docs)
                state["documents"] = result

            elif node.type == "llm":
                provider_name = _resolve_provider_name(str(node.data.get("provider", "")), runtime, "completion")
                request = CompletionRequest(
                    provider=provider_name,
                    model=node.data.get("model", "gpt-4o-mini"),
                    temperature=float(node.data.get("temperature", 0.2)),
                    messages=[{"role": "user", "content": str(state.get("prompt") or state.get("input") or "")}],
                    stream=True,
                    runtime=runtime,
                )
                chunks = []
                provider = get_provider(request.provider, runtime)
                async for chunk in provider.stream(request):
                    chunks.append(chunk)
                    yield _sse({"event": "token", "node": node.id, "chunk": chunk})
                    await asyncio.sleep(0)
                result = "".join(chunks)

            elif node.type == "subagent":
                role = node.data.get("role", "Specialist")
                handoff = node.data.get("handoff", "Return a concise result to the parent agent.")
                provider_name = _resolve_provider_name(str(node.data.get("provider", "")), runtime, "completion")
                model_name = node.data.get("model", "gpt-4o-mini")

                task = str(state.get("task") or state.get("prompt") or state.get("input") or "")
                context = str(state.get("context") or state.get("documents") or "")

                system_prompt = f"You are a helpful sub-agent acting in the role of: {role}. Your instructions are: {handoff}"
                user_content = f"Task/Input: {task}\nContext/Additional Info: {context}"

                request = CompletionRequest(
                    provider=provider_name,
                    model=model_name,
                    temperature=float(node.data.get("temperature", 0.2)),
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    stream=True,
                    runtime=runtime,
                )
                chunks = []
                provider = get_provider(request.provider, runtime)
                async for chunk in provider.stream(request):
                    chunks.append(chunk)
                    yield _sse({"event": "token", "node": node.id, "chunk": chunk})
                    await asyncio.sleep(0)
                result = "".join(chunks)

            elif node.type == "output":
                result = str(state.get("input") or state.get("result") or state.get("completion") or state.get("prompt") or "")
                if result:
                    last_output_text = result

            elif node.type == "router":
                condition = node.data.get("condition", "true")
                input_val = str(state.get("input") or state.get("result") or state.get("completion") or "")
                try:
                    eval_context = {"input": input_val, "len": len, "str": str, "int": int, "float": float}
                    condition_result = bool(eval(condition, {"__builtins__": {}}, eval_context))
                except Exception:
                    condition_result = True
                result = input_val
                state["_router_condition"] = condition_result
                yield _sse({"event": "router:result", "node": node.id, "condition": condition_result})

            elif node.type == "custom" or node.type == "code":
                code_str = node.data.get("code", "")
                if not code_str and node.type == "code":
                    code_str = "output = input"

                local_ns = {}
                for inp in node.inputs:
                    local_ns[inp.id] = state.get(inp.id, "")

                if "input" not in local_ns:
                    local_ns["input"] = str(state.get("input") or state.get("result") or state.get("completion") or state.get("prompt") or "")

                for outp in node.outputs:
                    local_ns[outp.id] = ""
                if "output" not in local_ns:
                    local_ns["output"] = ""

                try:
                    exec(code_str, {"__builtins__": {
                        "len": len, "str": str, "int": int, "float": float, "list": list, "dict": dict,
                        "print": lambda *a: None, "range": range, "enumerate": enumerate, "zip": zip,
                        "map": map, "filter": filter, "sorted": sorted, "reversed": reversed,
                        "upper": str.upper, "lower": str.lower, "split": str.split, "join": str.join,
                        "strip": str.strip, "replace": str.replace
                    }}, local_ns)

                    for outp in node.outputs:
                        state[f"{node.id}.{outp.id}"] = local_ns.get(outp.id, "")

                    result = local_ns.get("output", "")
                    if not result and node.outputs:
                        result = local_ns.get(node.outputs[0].id, "")
                except Exception as exc:
                    result = f"[Custom Code Error] {exc}"

            else:
                result = state.get("input", "")

            elapsed_ms = round((time.perf_counter() - t0) * 1000)
            state[node.id] = result

            for outp in node.outputs:
                state[f"{node.id}.{outp.id}"] = state.get(f"{node.id}.{outp.id}") or result

            if node.type == "router":
                router_result = state.get("_router_condition", True)
                if router_result:
                    active_paths.add((node.id, "true"))
                else:
                    active_paths.add((node.id, "false"))
                active_paths.add((node.id, "default"))
            else:
                for outp in node.outputs:
                    active_paths.add((node.id, outp.id))
                active_paths.add((node.id, "default"))

            last_executed_result = result
            output_preview = str(result) if result else ""
            yield _sse({"event": "node:output", "node": node.id, "output": output_preview})
            yield _sse({"event": "node:complete", "node": node.id, "durationMs": elapsed_ms, "step": step_index})

        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - t0) * 1000)
            node_errors.append({"node": node.id, "label": node.label, "message": str(exc)})
            yield _sse({"event": "node:error", "node": node.id, "message": str(exc), "durationMs": elapsed_ms})

    if not last_output_text and last_executed_result:
        last_output_text = last_executed_result

    yield _sse({
        "event": "complete",
        "stateKeys": list(state.keys()),
        "hasOutput": bool(last_output_text),
        "output": last_output_text,
        "errorCount": len(node_errors),
        "errors": node_errors[:3],
    })


def _interpolate(template: str, values: dict[str, object]) -> str:
    import re

    def replace(match: re.Match[str]) -> str:
        return str(values.get(match.group(1).strip(), ""))

    return re.sub(r"\{\{\s*([a-zA-Z_$][\w$.-]*)\s*\}\}", replace, template)


def _sse(payload: dict[str, object]) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"
