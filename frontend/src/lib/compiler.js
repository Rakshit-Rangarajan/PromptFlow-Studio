import { topologicalOrder } from "./graph";

export function compileGraphToSdk(graph) {
  const order = topologicalOrder(graph.nodes, graph.links);
  const nodesById = Object.fromEntries(graph.nodes.map((node) => [node.id, node]));
  const incoming = graph.links.reduce((acc, link) => {
    acc[link.targetNode] ||= [];
    acc[link.targetNode].push(link);
    return acc;
  }, {});

  const lines = [
    "export class PromptFlowPipeline {",
    "  constructor({ endpoint = 'http://localhost:8000', provider = 'openai', model = 'gpt-4o-mini', headers = {} } = {}) {",
    "    this.endpoint = endpoint.replace(/\\/$/, '');",
    "    this.provider = provider;",
    "    this.model = model;",
    "    this.headers = headers;",
    "  }",
    "",
    "  interpolate(template, values) {",
    "    return template.replace(/\\{\\{\\s*([a-zA-Z_$][\\w$.-]*)\\s*\\}\\}/g, (_, key) => values[key] ?? '');",
    "  }",
    "",
    "  async run(inputs = {}) {",
    "    const state = { ...inputs };"
  ];

  for (const id of order) {
    const node = nodesById[id];
    const varName = safeVar(id);
    const parents = incoming[id] || [];
    lines.push(`    // ${node.label} (${node.type})`);
    for (const link of parents) {
      lines.push(`    state[${JSON.stringify(link.targetPort)}] = state[${JSON.stringify(link.sourceNode + "." + link.sourcePort)}] ?? state[${JSON.stringify(link.sourceNode)}] ?? '';`);
    }
    if (node.type === "input") {
      lines.push(`    const ${varName} = state[${JSON.stringify(node.data.key || node.label)}] ?? ${JSON.stringify(node.data.value || "")};`);
    } else if (node.type === "prompt") {
      lines.push(`    const ${varName} = this.interpolate(${JSON.stringify(node.data.template || "")}, state);`);
    } else if (node.type === "llm") {
      lines.push(`    const ${varName}Response = await fetch(this.endpoint + '/llm/complete', {`);
      lines.push("      method: 'POST',");
      lines.push("      headers: { 'content-type': 'application/json', ...this.headers },");
      lines.push(`      body: JSON.stringify({ provider: ${JSON.stringify(node.data.provider || "openai")}, model: ${JSON.stringify(node.data.model || "gpt-4o-mini")}, messages: [{ role: 'user', content: state.prompt ?? state.template ?? '' }] })`);
      lines.push("    });");
      lines.push(`    const ${varName}Json = await ${varName}Response.json();`);
      lines.push(`    const ${varName} = ${varName}Json.content ?? '';`);
    } else if (node.type === "vector") {
      lines.push(`    const ${varName}Response = await fetch(this.endpoint + '/vector/search', {`);
      lines.push("      method: 'POST',");
      lines.push("      headers: { 'content-type': 'application/json', ...this.headers },");
      lines.push(`      body: JSON.stringify({ query: state.query ?? state.prompt ?? '', collection: ${JSON.stringify(node.data.collection || "documents")}, limit: ${Number(node.data.limit || 4)} })`);
      lines.push("    });");
      lines.push(`    const ${varName} = await ${varName}Response.json();`);
    } else if (node.type === "subagent") {
      const role = node.data.role || "Specialist";
      const handoff = node.data.handoff || "Return a concise result to the parent agent.";
      const provider = node.data.provider || "openai";
      const model = node.data.model || "gpt-4o-mini";
      lines.push(`    const ${varName}System = ${JSON.stringify(`You are a helpful sub-agent acting in the role of: ${role}. Your instructions are: ${handoff}`)};`);
      lines.push(`    const ${varName}User = \`Task/Input: \${state.task ?? state.prompt ?? ''}\\nContext/Additional Info: \${state.context ?? state.documents ?? ''}\`;`);
      lines.push(`    const ${varName}Response = await fetch(this.endpoint + '/llm/complete', {`);
      lines.push("      method: 'POST',");
      lines.push("      headers: { 'content-type': 'application/json', ...this.headers },");
      lines.push(`      body: JSON.stringify({ provider: ${JSON.stringify(provider)}, model: ${JSON.stringify(model)}, messages: [{ role: 'system', content: ${varName}System }, { role: 'user', content: ${varName}User }] })`);
      lines.push("    });");
      lines.push(`    const ${varName}Json = await ${varName}Response.json();`);
      lines.push(`    const ${varName} = ${varName}Json.content ?? '';`);
    } else if (node.type === "output") {
      lines.push(`    const ${varName} = state.input ?? state.result ?? state.completion ?? state.prompt ?? '';`);
    } else if (node.type === "router") {
      const condition = node.data.condition || "true";
      let jsCondition = condition.replace(/\band\b/g, "&&").replace(/\bor\b/g, "||").replace(/\bnot\b/g, "!").replace(/\blen\((.*?)\)/g, "$1.length");
      lines.push(`    let ${varName}_condition = false;`);
      lines.push("    try {");
      lines.push(`      const input = state.input ?? state.result ?? state.completion ?? '';`);
      lines.push(`      ${varName}_condition = !!(eval(${JSON.stringify(jsCondition)}));`);
      lines.push("    } catch (err) {");
      lines.push(`      ${varName}_condition = true;`);
      lines.push("    }");
      lines.push(`    const ${varName} = state.input ?? state.result ?? state.completion ?? '';`);
      lines.push(`    state['_router_condition'] = ${varName}_condition;`);
    } else if (node.type === "code") {
      let pyCode = node.data.code || "output = input";
      lines.push(`    let ${varName} = state.input ?? state.result ?? state.completion ?? state.prompt ?? '';`);
      lines.push("    try {");
      lines.push(`      // Simple compiled fallback for JS code transform`);
      lines.push(`      let input = ${varName};`);
      lines.push(`      let output = "";`);
      lines.push(`      ${pyCode.replace(/\boutput\b/g, "output").replace(/\binput\b/g, "input")};`);
      lines.push(`      ${varName} = output || input;`);
      lines.push("    } catch (err) {}");
    } else if (node.type === "custom") {
      let pyCode = node.data.code || "";
      lines.push(`    // Custom dynamic node execution`);
      for (const inp of node.inputs) {
        lines.push(`    let ${inp.id} = state[${JSON.stringify(inp.id)}] ?? '';`);
      }
      lines.push(`    let output = '';`);
      lines.push(`    try {`);
      lines.push(`      ${pyCode};`);
      lines.push(`    } catch (err) {}`);
      for (const outp of node.outputs) {
        lines.push(`    state[${JSON.stringify(node.id + "." + outp.id)}] = ${outp.id} ?? '';`);
      }
      lines.push(`    const ${varName} = output;`);
    } else {
      lines.push(`    const ${varName} = state[${JSON.stringify(node.id)}] ?? '';`);
    }
    lines.push(`    state[${JSON.stringify(node.id)}] = ${varName};`);
    for (const outp of node.outputs) {
      lines.push(`    state[${JSON.stringify(node.id + "." + outp.id)}] = state[${JSON.stringify(node.id + "." + outp.id)}] ?? ${varName};`);
    }
    lines.push("");
  }

  lines.push("    return state;");
  lines.push("  }");
  lines.push("}");
  return lines.join("\n");
}

function safeVar(id) {
  return `node_${id.replace(/[^a-zA-Z0-9_$]/g, "_")}`;
}
