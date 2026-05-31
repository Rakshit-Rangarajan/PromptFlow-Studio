export const NODE_SIZE = { width: 292, header: 58, row: 28 };

export function scanTemplateVariables(template = "") {
  const variables = new Set();
  const pattern = /\{\{\s*([a-zA-Z_$][\w$.-]*)\s*\}\}/g;
  let match;
  while ((match = pattern.exec(template))) variables.add(match[1]);
  return [...variables];
}

export function withPromptPorts(node) {
  if (!node) return { id: `node-${Date.now()}`, type: "custom", inputs: [], outputs: [], data: {}, position: { x: 100, y: 100 } };
  const type = `${node.type || "custom"}`.toLowerCase();
  const inputs = Array.isArray(node.inputs) ? node.inputs : [];
  const outputs = Array.isArray(node.outputs) ? node.outputs : [];
  const data = node.data || {};
  const position = node.position && typeof node.position.x === "number" && typeof node.position.y === "number"
    ? node.position
    : { x: 100, y: 100 };

  if (type !== "prompt") {
    return { ...node, type, inputs, outputs, data, position };
  }

  const template = typeof data.template === "string" ? data.template : "";
  const variables = scanTemplateVariables(template);
  const promptInputs = variables.map((name) => ({ id: name, label: name }));

  return {
    ...node,
    type,
    inputs: promptInputs,
    outputs,
    data: { ...data, template },
    position
  };
}

export function normalizeNodes(nodes) {
  return nodes.map(withPromptPorts);
}

export function portPosition(node, portId, side) {
  const ports = side === "input" ? node.inputs : node.outputs;
  const index = Math.max(0, ports.findIndex((port) => port.id === portId));
  const top = NODE_SIZE.header + 27 + index * NODE_SIZE.row;
  return {
    x: node.position.x + (side === "input" ? 0 : NODE_SIZE.width),
    y: node.position.y + top
  };
}

export function bezierPath(source, target) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.hypot(dx, dy);
  
  const forward = Math.min(220, Math.max(72, distance * 0.38));
  const verticalBias = Math.max(-80, Math.min(80, dy * 0.12));
  
  // If the connection spans across an intermediate column (e.g. distance is wide and vertical diff is small),
  // we add a beautiful vertical loop/dip to avoid passing directly through intermediate node cards!
  if (dx > 400 && Math.abs(dy) < 120) {
    const dip = 136; // Clear the 138px card height centered vertically
    return [
      `M ${source.x} ${source.y}`,
      `C ${source.x + 100} ${source.y + dip}`,
      `${target.x - 100} ${target.y + dip}`,
      `${target.x} ${target.y}`
    ].join(" ");
  }

  return [
    `M ${source.x} ${source.y}`,
    `C ${source.x + forward} ${source.y + verticalBias}`,
    `${target.x - forward} ${target.y - verticalBias}`,
    `${target.x} ${target.y}`
  ].join(" ");
}

export function filterDuplicateLinks(links = []) {
  const seen = new Set();
  return links.filter((link) => {
    if (!link.sourceNode || !link.targetNode) return true;
    const key = linkSignature(link);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function linkSignature(link) {
  return [
    link.sourceNode || "",
    link.sourcePort || "",
    link.targetNode || "",
    link.targetPort || ""
  ].join("::");
}


export function wouldCreateCycle(nodes, links, candidate) {
  const nextLinks = candidate ? [...links, candidate] : links;
  const graph = new Map(nodes.map((node) => [node.id, []]));
  for (const link of nextLinks) graph.get(link.sourceNode)?.push(link.targetNode);
  const colors = new Map(nodes.map((node) => [node.id, 0]));

  function visit(nodeId) {
    colors.set(nodeId, 1);
    for (const child of graph.get(nodeId) || []) {
      if (colors.get(child) === 1) return true;
      if (colors.get(child) === 0 && visit(child)) return true;
    }
    colors.set(nodeId, 2);
    return false;
  }

  return nodes.some((node) => colors.get(node.id) === 0 && visit(node.id));
}

export function topologicalOrder(nodes, links) {
  const nodeCoords = new Map(nodes.map((n) => [n.id, n.position?.x ?? 0]));
  const indegree = new Map(nodes.map((node) => [node.id, 0]));
  const graph = new Map(nodes.map((node) => [node.id, []]));

  // Filter links to only valid ones connecting existing nodes and not marked invalid
  const nodeIds = new Set(nodes.map((n) => n.id));
  const validLinks = (links || []).filter(
    (link) => !link.invalid && nodeIds.has(link.sourceNode) && nodeIds.has(link.targetNode)
  );

  for (const link of validLinks) {
    graph.get(link.sourceNode)?.push(link.targetNode);
    indegree.set(link.targetNode, (indegree.get(link.targetNode) || 0) + 1);
  }

  // Initial queue of nodes with indegree 0, sorted by visual x coordinate
  const queue = nodes
    .filter((node) => indegree.get(node.id) === 0)
    .sort((a, b) => (a.position?.x ?? 0) - (b.position?.x ?? 0))
    .map((node) => node.id);

  const ordered = [];
  while (queue.length) {
    // Sort the queue to always prioritize the leftmost node visually
    queue.sort((a, b) => (nodeCoords.get(a) || 0) - (nodeCoords.get(b) || 0));

    const current = queue.shift();
    ordered.push(current);

    for (const child of graph.get(current) || []) {
      indegree.set(child, indegree.get(child) - 1);
      if (indegree.get(child) === 0) {
        queue.push(child);
      }
    }
  }

  if (ordered.length !== nodes.length) {
    throw new Error("Graph contains a cycle.");
  }
  return ordered;
}

export function buildGraphPayload(name, nodes, links) {
  return {
    name,
    nodes: normalizeNodes(nodes),
    links: links.filter((link) => !link.invalid),
    version: 1
  };
}
