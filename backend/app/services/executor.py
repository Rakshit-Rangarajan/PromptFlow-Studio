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


async def execute_graph_stream(graph: GraphDocument, runtime: RuntimeConfig | None = None) -> AsyncIterator[str]:
    runtime = runtime or RuntimeConfig()
    assert_acyclic(graph.nodes, graph.links)
    ordered = kahn_order(graph)
    incoming = defaultdict(list)
    for link in graph.links:
        incoming[link.targetNode].append(link)

    state: dict[str, object] = {}
    node_count = len(ordered)

    active_paths: set[tuple[str, str]] = set()
    # Seed active paths for nodes with no incoming links (like inputs)
    for node in ordered:
        if not incoming[node.id]:
            active_paths.add((node.id, "default"))

    for step_index, node in enumerate(ordered):
        # Determine if node is active
        is_active = True
        if incoming[node.id]:
            is_active = any((link.sourceNode, link.sourcePort) in active_paths for link in incoming[node.id])

        if not is_active:
            yield _sse({"event": "node:skipped", "node": node.id, "label": node.label, "step": step_index})
            continue

        # Wire incoming links into state using port-specific routing
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
                embedding = await embed_text(query, node.data.get("provider", "openai"), node.data.get("model", "text-embedding-3-small"), runtime)
                vector_config = runtime.vectorDatabase.model_copy(update={
                    "collection": node.data.get("collection") or runtime.vectorDatabase.collection,
                    "index": node.data.get("index") or runtime.vectorDatabase.index,
                    "path": node.data.get("path") or runtime.vectorDatabase.path,
                })
                docs = await search_vector_database(vector_config, embedding, int(node.data.get("limit", 4)))
                result = "\n".join(str(item.get("text", item)) for item in docs)
                state["documents"] = result

            elif node.type == "llm":
                request = CompletionRequest(
                    provider=node.data.get("provider", "openai"),
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
                provider_name = node.data.get("provider", "openai")
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
                # Output node — passthrough, emits the value piped into it
                result = str(state.get("input") or state.get("result") or state.get("completion") or state.get("prompt") or "")

            elif node.type == "router":
                # Router node — evaluates a simple condition string
                condition = node.data.get("condition", "true")
                input_val = str(state.get("input") or state.get("result") or state.get("completion") or "")
                try:
                    # Safe eval of simple conditions: contains, length checks, etc.
                    eval_context = {"input": input_val, "len": len, "str": str, "int": int, "float": float}
                    condition_result = bool(eval(condition, {"__builtins__": {}}, eval_context))
                except Exception:
                    condition_result = True
                result = input_val
                state["_router_condition"] = condition_result
                yield _sse({"event": "router:result", "node": node.id, "condition": condition_result})

            elif node.type == "custom" or node.type == "code":
                # Custom Node / Code node — runs dynamic Python code transform
                code_str = node.data.get("code", "")
                if not code_str and node.type == "code":
                    code_str = "output = input"

                # Populate dynamic inputs from local state
                local_ns = {}
                for inp in node.inputs:
                    local_ns[inp.id] = state.get(inp.id, "")

                if "input" not in local_ns:
                    local_ns["input"] = str(state.get("input") or state.get("result") or state.get("completion") or state.get("prompt") or "")

                # Pre-populate outputs
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

                    # Map output variables to output ports
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

            # Also store under all output port keys
            for outp in node.outputs:
                state[f"{node.id}.{outp.id}"] = state.get(f"{node.id}.{outp.id}") or result

            # Activate output paths
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

            # Emit the output preview (truncated for SSE)
            output_preview = str(result)[:500] if result else ""
            yield _sse({"event": "node:output", "node": node.id, "output": output_preview})
            yield _sse({"event": "node:complete", "node": node.id, "durationMs": elapsed_ms, "step": step_index})

        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - t0) * 1000)
            yield _sse({"event": "node:error", "node": node.id, "message": str(exc), "durationMs": elapsed_ms})
            # Continue execution for remaining nodes

    yield _sse({"event": "complete", "stateKeys": list(state.keys())})


def _interpolate(template: str, values: dict[str, object]) -> str:
    import re

    def replace(match: re.Match[str]) -> str:
        return str(values.get(match.group(1).strip(), ""))

    return re.sub(r"\{\{\s*([a-zA-Z_$][\w$.-]*)\s*\}\}", replace, template)


def _sse(payload: dict[str, object]) -> str:
    return f"data: {json.dumps(payload, default=str)}\n\n"
