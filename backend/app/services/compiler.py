from app.models.graph import GraphDocument
from app.services.graph_algorithms import kahn_order


def compile_to_es_module(graph: GraphDocument) -> str:
    ordered = kahn_order(graph)
    incoming: dict[str, list] = {}
    for link in graph.links:
        incoming.setdefault(link.targetNode, []).append(link)

    lines = [
        "export class PromptFlowPipeline {",
        "  constructor({ endpoint = 'http://localhost:8000', headers = {} } = {}) {",
        "    this.endpoint = endpoint.replace(/\\/$/, '');",
        "    this.headers = headers;",
        "  }",
        "  interpolate(template, values) {",
        "    return template.replace(/\\{\\{\\s*([a-zA-Z_$][\\w$.-]*)\\s*\\}\\}/g, (_, key) => values[key] ?? '');",
        "  }",
        "  async run(inputs = {}) {",
        "    const state = { ...inputs };",
    ]

    for node in ordered:
        var_name = _safe_var(node.id)
        lines.append(f"    // {node.label} ({node.type})")
        for link in incoming.get(node.id, []):
            lines.append(f"    state[{link.targetPort!r}] = state[{link.sourceNode!r}];")
        if node.type == "input":
            key = node.data.get("key", node.label)
            value = node.data.get("value", "")
            lines.append(f"    const {var_name} = state[{key!r}] ?? {value!r};")
        elif node.type == "prompt":
            template = node.data.get("template", "")
            lines.append(f"    const {var_name} = this.interpolate({template!r}, state);")
        elif node.type == "llm":
            provider = node.data.get("provider", "openai")
            model = node.data.get("model", "gpt-4o-mini")
            lines.extend([
                f"    const {var_name}Response = await fetch(this.endpoint + '/llm/complete', {{",
                "      method: 'POST',",
                "      headers: { 'content-type': 'application/json', ...this.headers },",
                f"      body: JSON.stringify({{ provider: {provider!r}, model: {model!r}, messages: [{{ role: 'user', content: state.prompt ?? '' }}] }})",
                "    });",
                f"    const {var_name}Json = await {var_name}Response.json();",
                f"    const {var_name} = {var_name}Json.content ?? '';",
            ])
        elif node.type == "vector":
            collection = node.data.get("collection", "documents")
            limit = int(node.data.get("limit", 4))
            lines.extend([
                f"    const {var_name}Response = await fetch(this.endpoint + '/vector/search', {{",
                "      method: 'POST',",
                "      headers: { 'content-type': 'application/json', ...this.headers },",
                f"      body: JSON.stringify({{ query: state.query ?? state.prompt ?? '', collection: {collection!r}, limit: {limit} }})",
                "    });",
                f"    const {var_name} = await {var_name}Response.json();",
            ])
        elif node.type == "subagent":
            role = node.data.get("role", "Specialist")
            handoff = node.data.get("handoff", "Return a concise result to the parent agent.")
            provider = node.data.get("provider", "openai")
            model = node.data.get("model", "gpt-4o-mini")
            lines.extend([
                f"    const {var_name}System = {f'You are a helpful sub-agent acting in the role of: {role}. Your instructions are: {handoff}'!r};",
                f"    const {var_name}User = `Task/Input: ${{state.task ?? state.prompt ?? ''}}\\nContext/Additional Info: ${{state.context ?? state.documents ?? ''}}`;",
                f"    const {var_name}Response = await fetch(this.endpoint + '/llm/complete', {{",
                "      method: 'POST',",
                "      headers: { 'content-type': 'application/json', ...this.headers },",
                f"      body: JSON.stringify({{ provider: {provider!r}, model: {model!r}, messages: [{{ role: 'system', content: {var_name}System }}, {{ role: 'user', content: {var_name}User }}] }})",
                "    });",
                f"    const {var_name}Json = await {var_name}Response.json();",
                f"    const {var_name} = {var_name}Json.content ?? '';",
            ])
        else:
            lines.append(f"    const {var_name} = state[{node.id!r}] ?? '';")
        lines.append(f"    state[{node.id!r}] = {var_name};")
    lines.extend(["    return state;", "  }", "}"])
    return "\n".join(lines)


def _safe_var(value: str) -> str:
    return "node_" + "".join(char if char.isalnum() or char == "_" else "_" for char in value)
