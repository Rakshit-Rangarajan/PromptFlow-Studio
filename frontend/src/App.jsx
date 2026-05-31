import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  Bot,
  Boxes,
  BrainCircuit,
  Braces,
  Check,
  CirclePlay,
  Clipboard,
  Clock,
  Code,
  Database,
  Download,
  FileText,
  Folder,
  GitBranch,
  Globe,
  Hand,
  KeyRound,
  Link2Off,
  LogIn,
  LogOut,
  MousePointer2,
  Plus,
  Save,
  Search,
  Sliders,
  Sparkles,
  Split,
  User,
  Trash2,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  bezierPath,
  buildGraphPayload,
  filterDuplicateLinks,
  normalizeNodes,
  linkSignature,
  portPosition,
  scanTemplateVariables,
  topologicalOrder,
  wouldCreateCycle
} from "./lib/graph";
import { compileGraphToSdk } from "./lib/compiler";
import { Home } from "./Home.jsx";
import "./home.css";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const initialNodes = normalizeNodes([
  {
    id: "input-1",
    type: "input",
    label: "User input",
    position: { x: 60, y: 140 },
    inputs: [],
    outputs: [{ id: "value", label: "value" }],
    data: { key: "input", value: "Describe quantum physics in one sentence." }
  },
  {
    id: "prompt-1",
    type: "prompt",
    label: "Prompt instructions",
    position: { x: 360, y: 140 },
    inputs: [],
    outputs: [{ id: "prompt", label: "prompt" }],
    data: { template: "" }
  },
  {
    id: "llm-1",
    type: "llm",
    label: "LLM model",
    position: { x: 700, y: 140 },
    inputs: [{ id: "prompt", label: "prompt" }],
    outputs: [{ id: "completion", label: "completion" }],
    data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.3 }
  },
  {
    id: "output-1",
    type: "output",
    label: "Final output",
    position: { x: 1000, y: 140 },
    inputs: [{ id: "input", label: "input" }],
    outputs: [],
    data: {}
  }
]);

const initialLinks = [
  { id: "l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "input", active: true },
  { id: "l2", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
  { id: "l3", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
];

const nodeTypes = [
  { type: "input", label: "Input", icon: Braces, color: "#20a4f3", category: "Core" },
  { type: "prompt", label: "Prompt", icon: Sparkles, color: "#9b5cff", category: "AI" },
  { type: "llm", label: "LLM", icon: BrainCircuit, color: "#10b981", category: "AI" },
  { type: "subagent", label: "Sub-agent", icon: Bot, color: "#6366f1", category: "Agents" },
  { type: "vector", label: "Vector Search", icon: Database, color: "#f97316", category: "Data" },
  { type: "datastore", label: "Data Store", icon: Folder, color: "#f59e0b", category: "Data" },
  { type: "document_loader", label: "Document Loader", icon: Globe, color: "#06b6d4", category: "Data" },
  { type: "output", label: "Output", icon: ArrowDownToLine, color: "#ec4899", category: "Core" },
  { type: "router", label: "Conditional", icon: Split, color: "#eab308", category: "Core" },
  { type: "code", label: "Code Transform", icon: Code, color: "#8b5cf6", category: "Core" },
  { type: "custom", label: "Custom Node", icon: Boxes, color: "#f43f5e", category: "Core" }
];

const navItems = [
  { id: "home", label: "Home" },
  { id: "ide", label: "IDE" },
  { id: "flows", label: "Flows" },
  { id: "templates", label: "Templates" },
  { id: "logs", label: "Logs" },
  { id: "settings", label: "Settings" }
];

const workflowTemplates = [
  {
    name: "Blank Agent",
    description: "Start with an open prompt box. Type any task you want and let the model answer it directly.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "User input", position: { x: 80, y: 150 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "input", value: "Ask me anything." } },
      { id: "prompt-1", type: "prompt", label: "Prompt instructions", position: { x: 380, y: 150 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "" } },
      { id: "llm-1", type: "llm", label: "LLM Model", position: { x: 680, y: 150 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.3 } },
      { id: "output-1", type: "output", label: "Final output", position: { x: 980, y: 150 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "input", active: true },
      { id: "l2", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
      { id: "l3", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  },
  {
    name: "Meeting Notes",
    description: "Turns rough notes into clean action items and a short summary.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Notes", position: { x: 80, y: 150 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "notes", value: "Project kickoff: finish MVP, test login, ship demo." } },
      { id: "prompt-1", type: "prompt", label: "Prompt instructions", position: { x: 380, y: 150 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "Turn these notes into a short summary with bullet action items.\n\nNotes:\n{{input}}" } },
      { id: "llm-1", type: "llm", label: "Meeting writer", position: { x: 680, y: 150 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 } },
      { id: "output-1", type: "output", label: "Final output", position: { x: 980, y: 150 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "mn-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "input", active: true },
      { id: "mn-l2", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
      { id: "mn-l3", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  },
  {
    name: "Email Reply",
    description: "Drafts a polite reply from a short message or customer request.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Incoming email", position: { x: 80, y: 150 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "email", value: "Can you confirm the delivery date?" } },
      { id: "prompt-1", type: "prompt", label: "Prompt instructions", position: { x: 380, y: 150 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "Write a clear, warm, professional email reply.\n\nEmail:\n{{input}}" } },
      { id: "llm-1", type: "llm", label: "Reply drafter", position: { x: 680, y: 150 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.4 } },
      { id: "output-1", type: "output", label: "Final output", position: { x: 980, y: 150 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "er-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "input", active: true },
      { id: "er-l2", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
      { id: "er-l3", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  },
  {
    name: "Support Answer",
    description: "Helps answer a user question with a short, useful response.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Question", position: { x: 80, y: 150 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "question", value: "How do I reset my password?" } },
      { id: "prompt-1", type: "prompt", label: "Prompt instructions", position: { x: 380, y: 150 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "Answer the user question in a short, helpful, step-by-step way.\n\nQuestion:\n{{input}}" } },
      { id: "llm-1", type: "llm", label: "Support agent", position: { x: 680, y: 150 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 } },
      { id: "output-1", type: "output", label: "Final output", position: { x: 980, y: 150 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "sa-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "input", active: true },
      { id: "sa-l2", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
      { id: "sa-l3", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  },
  {
    name: "Code Helper",
    description: "Explains a code snippet or suggests a fix in plain language.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Code or bug", position: { x: 80, y: 150 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "code", value: "My API call fails with 401." } },
      { id: "prompt-1", type: "prompt", label: "Prompt instructions", position: { x: 380, y: 150 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "Help me understand or fix this code/problem.\n\nInput:\n{{input}}" } },
      { id: "llm-1", type: "llm", label: "Code helper", position: { x: 680, y: 150 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 } },
      { id: "output-1", type: "output", label: "Final output", position: { x: 980, y: 150 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "ch-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "input", active: true },
      { id: "ch-l2", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
      { id: "ch-l3", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  }
];

const defaultRuntime = {
  providers: [],
  databases: [],
  caches: [
    { id: "in_memory", name: "Local LRU Cache", kind: "in_memory", maxLimit: 1000, ttl: 300 }
  ]
};

const defaultUiPreferences = {
  simplifyEverything: false,
  compactLayout: false,
  readableText: false,
  reduceMotion: false,
  hideAdvancedPanels: false
};

const defaultTestCases = [
  { id: "test-1", name: "Happy path", input: "Explain the workflow in one clear sentence.", expected: "" },
  { id: "test-2", name: "Short input", input: "Summarize this.", expected: "" }
];

const STORAGE_PREFIX = "promptflow-studio";

function storageKey(kind, username = "guest") {
  return `${STORAGE_PREFIX}:${kind}:${username}`;
}

function readStoredJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function normalizeUiPreferences(value = {}) {
  return {
    ...defaultUiPreferences,
    ...(value || {}),
    simplifyEverything: !!value?.simplifyEverything,
    compactLayout: !!value?.compactLayout,
    readableText: !!value?.readableText,
    reduceMotion: !!value?.reduceMotion,
    hideAdvancedPanels: !!value?.hideAdvancedPanels
  };
}

function buildWorkflowHealthIssues(nodes = [], links = [], runtime = {}) {
  const issues = [];
  const nodeIds = new Set(nodes.map((node) => node.id));
  const providers = runtime.providers || [];
  const databases = runtime.databases || [];
  const providerMap = new Map();
  const databaseMap = new Map();
  const incomingMap = new Map(nodes.map((node) => [node.id, []]));
  const outgoingMap = new Map(nodes.map((node) => [node.id, []]));
  const seenLinks = new Set();

  for (const provider of providers) {
    const aliases = [
      provider?.id,
      provider?.providerType,
      provider?.name
    ].map((item) => `${item || ""}`.toLowerCase()).filter(Boolean);
    for (const alias of aliases) {
      providerMap.set(alias, provider);
    }
  }

  for (const database of databases) {
    const id = `${database?.id || ""}`.toLowerCase();
    if (id) databaseMap.set(id, database);
  }

  for (const link of links || []) {
    if (nodeIds.has(link.sourceNode)) outgoingMap.get(link.sourceNode)?.push(link);
    if (nodeIds.has(link.targetNode)) incomingMap.get(link.targetNode)?.push(link);
    const signature = linkSignature(link);
    if (seenLinks.has(signature)) {
      issues.push({
        severity: "warning",
        title: "Duplicate connection",
        message: `The link from ${link.sourceNode}.${link.sourcePort} to ${link.targetNode}.${link.targetPort} is duplicated.`,
        nodeId: link.targetNode,
        focus: "canvas",
        action: "Remove duplicate"
      });
    } else {
      seenLinks.add(signature);
    }
  }

  if (nodes.length === 0) {
    issues.push({
      severity: "info",
      title: "Blank canvas",
      message: "Add an input, prompt, and output to get the first run moving.",
      focus: "canvas",
      action: "Create starter flow"
    });
  }

  if (!nodes.some((node) => node.type === "output")) {
    issues.push({
      severity: "warning",
      title: "Missing output node",
      message: "The workflow does not have a final output node yet.",
      focus: "canvas",
      action: "Add output node"
    });
  }

  if (links.some((link) => link.invalid)) {
    issues.push({
      severity: "error",
      title: "Invalid cycle link",
      message: "A red invalid link is blocking execution.",
      focus: "canvas",
      action: "Fix cycle"
    });
  }

  if (nodes.length > 1 && wouldCreateCycle(nodes, links)) {
    issues.push({
      severity: "error",
      title: "Cycle detected",
      message: "The graph loops back into itself and cannot execute safely.",
      focus: "canvas",
      action: "Break cycle"
    });
  }

  for (const node of nodes) {
    const incoming = incomingMap.get(node.id) || [];
    const outgoing = outgoingMap.get(node.id) || [];
    const isIsolated = incoming.length === 0 && outgoing.length === 0;

    if (isIsolated && nodes.length > 1) {
      issues.push({
        severity: "info",
        title: "Isolated node",
        message: `${node.label} is not connected to anything yet.`,
        nodeId: node.id,
        focus: "node",
        action: "Focus node"
      });
    }

    if (node.type === "prompt" && !`${node.data?.template || ""}`.trim()) {
      issues.push({
        severity: "info",
        title: "Empty prompt",
        message: "The prompt template is blank, so the model will get very little guidance.",
        nodeId: node.id,
        focus: "node",
        action: "Edit prompt"
      });
    }

    if ((node.type === "llm" || node.type === "subagent") && !`${node.data?.model || ""}`.trim()) {
      issues.push({
        severity: "warning",
        title: "Model not selected",
        message: `${node.label} still needs a model choice.`,
        nodeId: node.id,
        focus: "node",
        action: "Pick model"
      });
    }

    if (node.type === "llm" || node.type === "subagent") {
      const selectedProvider = `${node.data?.provider || ""}`.toLowerCase();
      const provider = providerMap.get(selectedProvider) || providerMap.get(normalizeProviderType({ providerType: selectedProvider }));
      const providerIsLocal = ["ollama", "lmstudio", "lm-studio"].includes(selectedProvider);
      if (!selectedProvider) {
        issues.push({
          severity: "warning",
          title: "Provider not selected",
          message: `${node.label} should point to a provider from Settings.`,
          nodeId: node.id,
          focus: "settings",
          action: "Open providers"
        });
      } else if (!provider && !providerIsLocal) {
        issues.push({
          severity: "warning",
          title: "Provider missing in Settings",
          message: `${selectedProvider} is not configured in the runtime panel.`,
          nodeId: node.id,
          focus: "settings",
          action: "Open providers"
        });
      } else if (provider && !providerIsLocal && !`${provider.apiKey || ""}`.trim()) {
        issues.push({
          severity: "warning",
          title: "API key missing",
          message: `${selectedProvider} needs an API key in Settings.`,
          nodeId: node.id,
          focus: "settings",
          action: "Open providers"
        });
      }
    }

    if (node.type === "vector") {
      const selectedDbId = `${node.data?.vectorDatabase || ""}`.toLowerCase();
      const database = databaseMap.get(selectedDbId);
      if (!selectedDbId) {
        issues.push({
          severity: "error",
          title: "Vector DB not selected",
          message: "Pick a vector database before running this node.",
          nodeId: node.id,
          focus: "node",
          action: "Choose database"
        });
      } else if (!database) {
        issues.push({
          severity: "error",
          title: "Vector DB missing",
          message: "The selected vector database no longer exists in Settings.",
          nodeId: node.id,
          focus: "settings",
          action: "Open databases"
        });
      } else if (!`${database.connectionString || ""}`.trim()) {
        issues.push({
          severity: "warning",
          title: "Connection string missing",
          message: `${database.name || "The database"} needs a connection string.`,
          nodeId: node.id,
          focus: "settings",
          action: "Open databases"
        });
      }
      if (!`${node.data?.collection || ""}`.trim()) {
        issues.push({
          severity: "info",
          title: "Collection not set",
          message: "Choose the collection or namespace you want to search.",
          nodeId: node.id,
          focus: "node",
          action: "Edit collection"
        });
      }
    }

    if (node.type === "router" && !`${node.data?.condition || ""}`.trim()) {
      issues.push({
        severity: "info",
        title: "Router has no condition",
        message: "The conditional branch will be more useful with an explicit rule.",
        nodeId: node.id,
        focus: "node",
        action: "Edit router"
      });
    }

    if ((node.type === "code" || node.type === "custom") && !`${node.data?.code || ""}`.trim()) {
      issues.push({
        severity: "info",
        title: "Code step is empty",
        message: "This node will not transform anything until it has code.",
        nodeId: node.id,
        focus: "node",
        action: "Add code"
      });
    }

    if (node.type === "output" && incoming.length === 0) {
      issues.push({
        severity: "warning",
        title: "Output is disconnected",
        message: "The final output node is not receiving any data yet.",
        nodeId: node.id,
        focus: "node",
        action: "Connect input"
      });
    }
  }

  const severityRank = { error: 0, warning: 1, info: 2 };
  return issues.sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9));
}

function buildReplaySummary(events = [], finalEvent = null) {
  const starts = events.filter((entry) => entry.event === "node:start").length;
  const completed = events.filter((entry) => entry.event === "node:complete").length;
  const skipped = events.filter((entry) => entry.event === "node:skipped").length;
  const errors = events.filter((entry) => entry.event === "node:error").length;

  if (finalEvent?.errorCount) {
    return `Ran ${starts} step(s), completed ${completed}, and finished with ${finalEvent.errorCount} error(s).`;
  }

  if (finalEvent?.hasOutput) {
    return `Ran ${completed} step(s)${skipped ? `, skipped ${skipped}` : ""}, and produced output successfully.`;
  }

  if (errors > 0) {
    return `Execution stopped with ${errors} node error(s).`;
  }

  return `Executed ${completed} step(s)${skipped ? `, with ${skipped} skipped` : ""}.`;
}

async function streamGraphExecution({ graph, runtime, onEvent, signal }) {
  const response = await fetch(`${API_BASE}/execute/stream`, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ graph, runtime })
  });

  if (!response.ok) {
    return { ok: false, errorMessage: await readErrorMessage(response) };
  }

  if (!response.body) {
    return { ok: false, errorMessage: "Streaming unavailable." };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalEvent = null;

  const processChunk = (chunk) => {
    const line = chunk.split("\n").find((entry) => entry.startsWith("data:"));
    if (!line) return;
    const payloadStr = line.replace(/^data:\s?/, "").trim();
    if (!payloadStr) return;
    try {
      const data = JSON.parse(payloadStr);
      onEvent?.(data);
      if (data.event === "complete") {
        finalEvent = data;
      }
    } catch {}
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop();
    for (const chunk of chunks) {
      processChunk(chunk);
    }
  }

  if (buffer.trim()) {
    processChunk(buffer);
  }

  return { ok: true, finalEvent };
}

function buildExecutionRuntime(nodes, runtime) {
  const providers = Object.fromEntries((runtime.providers || []).map((provider) => [provider.id, provider]));
  const databases = runtime.databases || [];
  const selectedVectorNode = normalizeNodes(nodes).find((node) => node.type === "vector" && node.data?.vectorDatabase);
  const selectedVectorDatabase =
    databases.find((db) => db.id === selectedVectorNode?.data?.vectorDatabase) ||
    databases[0] ||
    {};

  return {
    providers,
    databases,
    vectorDatabase: selectedVectorDatabase
  };
}

function defaultModelForProvider(providerType = "openai", mode = "completion") {
  const type = `${providerType || "openai"}`.toLowerCase();
  if (mode === "embedding") {
    if (type === "mongodb" || type === "mongo" || type === "mongodb_atlas") return "mongodb-embedding";
    if (type === "gemini") return "text-embedding-004";
    if (type === "nvidia" || type === "nim" || type === "nvidia-nim") return "nvidia/embeddings-nv-embed-qa-4";
    if (type === "openrouter") return "nomic/nomic-embed-text-v1.5";
    if (type === "ollama") return "nomic-embed-text";
    if (type === "lmstudio" || type === "lm-studio") return "";
    return "text-embedding-3-small";
  }

  if (type === "gemini") return "gemini-1.5-flash";
  if (type === "nvidia" || type === "nim" || type === "nvidia-nim") return "meta/llama-3.1-70b-instruct";
  if (type === "openrouter") return "meta-llama/llama-3-8b-instruct:free";
  if (type === "ollama") return "llama3";
  if (type === "lmstudio" || type === "lm-studio") return "";
  return "gpt-4o-mini";
}

function normalizeProviderType(provider) {
  return `${provider?.providerType || provider?.id || ""}`.toLowerCase();
}

function pickBestProvider(runtime, mode = "completion") {
  const providers = runtime?.providers || [];
  const priority = mode === "embedding"
    ? ["mongodb", "mongo", "mongodb_atlas", "openai", "gemini", "openrouter", "nvidia", "ollama", "lmstudio", "lm-studio"]
    : ["openai", "gemini", "openrouter", "nvidia", "nim", "nvidia-nim", "ollama", "lmstudio", "lm-studio"];

  const live = providers.filter(Boolean).map((provider) => ({
    provider,
    type: normalizeProviderType(provider),
    hasKey: !!provider.apiKey
  }));

  for (const wanted of priority) {
    const match = live.find((entry) => entry.type === wanted && (entry.hasKey || ["ollama", "lmstudio", "lm-studio", "mongodb", "mongo", "mongodb_atlas"].includes(entry.type)));
    if (match) return match.provider;
  }

  return live[0]?.provider || null;
}

function providerKey(provider) {
  return provider?.id || provider?.providerType || "openai";
}

function parseJsonWorkflow(text) {
  if (!text) return null;
  try {
    // 1. Try markdown JSON codeblock first
    const match = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.nodes && parsed.links) return parsed;
    }
    
    // 2. Try raw markdown codeblock
    const matchRaw = text.match(/```\s*([\s\S]*?)\s*```/);
    if (matchRaw && matchRaw[1]) {
      const parsed = JSON.parse(matchRaw[1].trim());
      if (parsed.nodes && parsed.links) return parsed;
    }

    // 3. Find first { and last } and try to parse it
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = text.substring(start, end + 1);
      const parsed = JSON.parse(candidate);
      if (parsed.nodes && parsed.links) return parsed;
    }
  } catch (err) {}
  return null;
}

function stripJsonBlocks(text) {
  if (!text) return "";
  
  let clean = text;
  
  // Strip active or partial ```json code blocks (handles streaming state gracefully)
  const jsonIndex = clean.toLowerCase().indexOf("```json");
  if (jsonIndex !== -1) {
    const nextCloseIndex = clean.indexOf("```", jsonIndex + 7);
    if (nextCloseIndex !== -1) {
      clean = clean.substring(0, jsonIndex) + clean.substring(nextCloseIndex + 3);
    } else {
      clean = clean.substring(0, jsonIndex);
    }
  }
  
  // Strip generic ``` code blocks if they enclose JSON structures
  const genericIndex = clean.indexOf("```");
  if (genericIndex !== -1) {
    const nextCloseIndex = clean.indexOf("```", genericIndex + 3);
    if (nextCloseIndex !== -1) {
      const inner = clean.substring(genericIndex + 3, nextCloseIndex).trim();
      if (inner.startsWith("{") && inner.endsWith("}")) {
        clean = clean.substring(0, genericIndex) + clean.substring(nextCloseIndex + 3);
      }
    } else {
      const innerPart = clean.substring(genericIndex + 3).trim();
      if (innerPart.startsWith("{")) {
        clean = clean.substring(0, genericIndex);
      }
    }
  }

  // Strip raw un-fenced JSON structures if they represent parsed workflows
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = clean.substring(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (parsed.nodes && parsed.links) {
        clean = clean.substring(0, start) + clean.substring(end + 1);
      }
    } catch (e) {}
  }
  
  return clean.replace(/\n{3,}/g, "\n\n").trim();
}

function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  
  const parseInline = (chunk) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const splitChunks = chunk.split(regex);
    
    return splitChunks.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} style={{ fontWeight: "700" }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code 
            key={index} 
            style={{ 
              fontFamily: "Geist Mono, monospace", 
              fontSize: "11px", 
              background: "rgba(0, 0, 0, 0.05)", 
              padding: "2px 5px", 
              borderRadius: "4px", 
              border: "1px solid rgba(0, 0, 0, 0.08)",
              color: "#e11d48"
            }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const listItems = [];
  const content = [];
  
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const trimmed = line.trim();
    
    if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
      const bulletText = trimmed.slice(2);
      listItems.push(
        <li key={lineIndex} style={{ margin: "4px 0", paddingLeft: "4px" }}>
          {parseInline(bulletText)}
        </li>
      );
    } else {
      if (listItems.length > 0) {
        content.push(
          <ul key={`list-${lineIndex}`} style={{ margin: "8px 0", paddingLeft: "20px", listStyleType: "disc" }}>
            {[...listItems]}
          </ul>
        );
        listItems.length = 0;
      }
      
      if (trimmed === "") {
        content.push(<div key={`space-${lineIndex}`} style={{ height: "8px" }} />);
      } else {
        content.push(
          <p key={lineIndex} style={{ margin: "4px 0", lineHeight: "1.6" }}>
            {parseInline(line)}
          </p>
        );
      }
    }
  }
  
  if (listItems.length > 0) {
    content.push(
      <ul key="list-final" style={{ margin: "8px 0", paddingLeft: "20px", listStyleType: "disc" }}>
        {listItems}
      </ul>
    );
  }
  
  return <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>{content}</div>;
}

function buildFixGuide(issue = {}) {
  const message = `${issue.message || ""}`.toLowerCase();
  const code = `${issue.code || ""}`.toLowerCase();

  if (code === "missing_provider_key" || message.includes("api key")) {
    return {
      title: "API key missing",
      focus: "providers",
      command: "Open Settings, pick the provider, paste the API key, then save.",
      steps: [
        "Open Settings.",
        "Pick the right AI provider.",
        "Paste the API key.",
        "Hit Save."
      ],
      action: "Open Providers"
    };
  }

  if (code === "missing_vector_db" || code === "missing_db_connection" || message.includes("connection string")) {
    return {
      title: "DB setup missing",
      focus: "databases",
      command: "Open Settings, pick the database, add the connection string, then save.",
      steps: [
        "Open Settings.",
        "Pick the database.",
        "Add the connection string.",
        "Hit Save."
      ],
      action: "Open Databases"
    };
  }

  if (message.includes("404") || message.includes("not found") || message.includes("embedding")) {
    return {
      title: "Embedding path broke",
      focus: "databases",
      command: "Open the vector node and switch the embedding provider to MongoDB Embeddings.",
      steps: [
        "Open the vector node.",
        "Switch Embedding Provider to MongoDB Embeddings.",
        "Save settings.",
        "Run again."
      ],
      action: "Open Databases"
    };
  }

  if (message.includes("pick a vector database")) {
    return {
      title: "Pick DB first",
      focus: "databases",
      command: "Open the vector node and choose a database before running again.",
      steps: [
        "Open the vector node.",
        "Choose a database in the node panel.",
        "Save settings if needed."
      ],
      action: "Open Databases"
    };
  }

  if (code === "no_output" || message.includes("no output")) {
    return {
      title: "No output",
      focus: "settings",
      command: "Add an Output node and wire the last step into it.",
      steps: [
        "Check the flow has an Output node.",
        "Wire the last node into it.",
        "Run again."
      ],
      action: "Open Settings"
    };
  }

  return null;
}

function summarizeErrorDetail(detail) {
  if (!detail) return "Run failed.";

  if (typeof detail === "string") {
    return detail.trim() || "Run failed.";
  }

  if (Array.isArray(detail)) {
    const parts = detail
      .slice(0, 3)
      .map((item) => summarizeErrorDetail(item))
      .filter(Boolean);
    return parts.length ? parts.join(" | ") : "Run failed.";
  }

  if (typeof detail === "object") {
    if (typeof detail.detail === "string") return detail.detail.trim() || "Run failed.";
    if (Array.isArray(detail.detail)) return summarizeErrorDetail(detail.detail);
    if (typeof detail.message === "string") return detail.message.trim() || "Run failed.";
    if (typeof detail.error === "string") return detail.error.trim() || "Run failed.";
    if (Array.isArray(detail.errors)) return summarizeErrorDetail(detail.errors);
    if (detail.loc && detail.msg) {
      const loc = Array.isArray(detail.loc)
        ? detail.loc.filter((part) => part !== "body").join(".")
        : String(detail.loc);
      return `${loc ? `${loc}: ` : ""}${detail.msg}`;
    }
    if (typeof detail.code === "string" && typeof detail.title === "string") {
      return `${detail.title}: ${detail.code}`;
    }
  }

  return "Run failed.";
}

async function readErrorMessage(response) {
  try {
    const data = await response.json();
    return summarizeErrorDetail(data.detail || data.message || data.error || data);
  } catch {
    try {
      const text = await response.text();
      const trimmed = `${text || ""}`.trim();
      if (!trimmed) return "Run failed.";
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return summarizeErrorDetail(JSON.parse(trimmed));
        } catch {}
      }
      return trimmed;
    } catch {
      return "Run failed.";
    }
  }
}

export function App() {
  const storedAccount = readStoredJson(storageKey("account"), null);
  const storedSession = readStoredJson(storageKey("session"), null) || { username: "workspace" };
  const storedWorkspace = readStoredJson(storageKey("workspace", storedSession.username), null) || {};
  const storedRuntime = readStoredJson(storageKey("runtime", storedSession.username), defaultRuntime) || defaultRuntime;
  const storedUiPreferences = readStoredJson(storageKey("ui", storedSession.username), defaultUiPreferences) || defaultUiPreferences;
  const storedTestCases = readStoredJson(storageKey("tests", storedSession.username), defaultTestCases) || defaultTestCases;

  const [account, setAccount] = useState(storedAccount);
  const [sessionUser, setSessionUser] = useState(storedSession);
  const [authMode, setAuthMode] = useState(storedAccount ? "login" : "create");
  const [authForm, setAuthForm] = useState({ username: storedAccount?.username || "", password: "" });
  const [authError, setAuthError] = useState("");
  const [runtimeSaveStatus, setRuntimeSaveStatus] = useState("Saved locally");
  const [activeView, setActiveView] = useState("home");
  const [nodes, setNodes] = useState(() => normalizeNodes(storedWorkspace?.nodes || initialNodes));
  const [links, setLinks] = useState(() => filterDuplicateLinks(storedWorkspace?.links || initialLinks));
  const [graphId, setGraphId] = useState(storedWorkspace?.graphId || null);
  const [graphName, setGraphName] = useState(storedWorkspace?.graphName || "New Workflow");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(storedWorkspace?.graphName || "New Workflow");
  const [savedFlows, setSavedFlows] = useState([]);
  const [emptyCanvasPrompt, setEmptyCanvasPrompt] = useState("");
  const [canvasMode, setCanvasMode] = useState("select");

  function handleEmptyCanvasSubmit(promptText) {
    if (!promptText.trim()) return;
    setChatOpen(true);
    setChatMode("copilot");
    setChatInput("");
    sendCopilotInput(promptText);
    setEmptyCanvasPrompt("");
  }
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState("tester");
  const [chatMessages, setChatMessages] = useState([
    { id: "msg-1", role: "assistant", text: "Hello! I'm your PromptFlow assistant.\n\n* **AI Copilot mode**: Ask me to build or modify workflows.\n* **Agent Tester mode**: Interact and test your live active flow directly here!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [nodeModelCatalog, setNodeModelCatalog] = useState({ models: [], recommendation: "" });
  const [nodeLoadingModels, setNodeLoadingModels] = useState(false);
  const [nodeDbInfo, setNodeDbInfo] = useState({ suggested_setup: "" });
  const [lastExecutionIssue, setLastExecutionIssue] = useState(null);
  const [settingsFocus, setSettingsFocus] = useState(null);

  const [viewport, setViewport] = useState(storedWorkspace?.viewport || { x: 16, y: 30, scale: 0.52 });
  const [selectedId, setSelectedId] = useState(storedWorkspace?.selectedId || storedWorkspace?.nodes?.[0]?.id || "prompt-1");
  const [selectedLinkId, setSelectedLinkId] = useState(storedWorkspace?.selectedLinkId || null);
  const [dragging, setDragging] = useState(null);
  const [linkDraft, setLinkDraft] = useState(null);
  const [hoverPort, setHoverPort] = useState(null);
  const [pointerWorld, setPointerWorld] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [executionLog, setExecutionLog] = useState(["Execution engine idle."]);
  const [nodeStates, setNodeStates] = useState({});
  const [nodeOutputs, setNodeOutputs] = useState({});
  const [executionActive, setExecutionActive] = useState(false);
  const [currentExecutionNode, setCurrentExecutionNode] = useState(null);
  const [executionProgress, setExecutionProgress] = useState({ current: 0, total: 0 });
  const [compiledCode, setCompiledCode] = useState("");
  const [runtime, setRuntime] = useState(storedRuntime);
  const [uiPreferences, setUiPreferences] = useState(normalizeUiPreferences(storedUiPreferences));
  const [lastExecutionReplay, setLastExecutionReplay] = useState(null);
  const [testCases, setTestCases] = useState(storedTestCases);
  const [testResults, setTestResults] = useState([]);
  const [testRunning, setTestRunning] = useState(false);
  const canvasRef = useRef(null);
  const panRef = useRef(null);



  const fetchFlows = async () => {
    try {
      const response = await fetch(`${API_BASE}/graphs`);
      if (response.ok) {
        const data = await response.json();
        setSavedFlows(data);
      }
    } catch (err) {
      console.error("Failed to fetch saved flows", err);
    }
  };

  useEffect(() => {
    fetchFlows();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === "INPUT" ||
        activeEl.tagName === "TEXTAREA" ||
        activeEl.tagName === "SELECT" ||
        activeEl.isContentEditable
      );

      // Global save shortcut (Ctrl+S / Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveGraph();
        return;
      }

      if (isTyping) {
        return;
      }

      const key = e.key.toLowerCase();

      // Tool switching
      if (key === "h") {
        setCanvasMode("hand");
      } else if (key === "v") {
        setCanvasMode("select");
      }

      // Escape to deselect
      if (e.key === "Escape") {
        setSelectedId(null);
        setSelectedLinkId(null);
      }

      // Delete / Backspace to delete active node or link
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          deleteNode(selectedId);
        } else if (selectedLinkId) {
          deleteSelectedLink();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, selectedLinkId]);

  async function loadGraphById(id) {
    setStatus(`Loading flow ${id}...`);
    try {
      const response = await fetch(`${API_BASE}/graphs/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGraphId(data.id);
        setGraphName(data.name || "Untitled Flow");
        setTempName(data.name || "Untitled Flow");
        setNodes(normalizeNodes(data.nodes || []));
        setLinks(filterDuplicateLinks(data.links || []));
        setActiveView("ide");
        setStatus("Flow loaded successfully.");
      } else {
        setStatus("Failed to load flow.");
      }
    } catch (err) {
      setStatus("Error loading flow.");
    }
  }

  async function deleteGraphById(id, event) {
    if (event) event.stopPropagation();
    if (!confirm("Are you sure you want to delete this workflow?")) return;
    setStatus(`Deleting flow ${id}...`);
    try {
      const response = await fetch(`${API_BASE}/graphs/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setStatus("Flow deleted.");
        if (graphId === id) {
          setGraphId(null);
          setGraphName("New Flow");
          setNodes([]);
          setLinks([]);
        }
        fetchFlows();
      } else {
        setStatus("Failed to delete flow.");
      }
    } catch (err) {
      setStatus("Error deleting flow.");
    }
  }

  const workspaceUser = sessionUser?.username || "workspace";

  useEffect(() => {
    writeStoredJson(storageKey("workspace", workspaceUser), {
      graphId,
      graphName,
      nodes,
      links,
      viewport,
      selectedId,
      selectedLinkId,
      activeView
    });
  }, [graphId, graphName, nodes, links, viewport, selectedId, selectedLinkId, activeView, workspaceUser]);

  useEffect(() => {
    writeStoredJson(storageKey("runtime", workspaceUser), runtime);
    setRuntimeSaveStatus("Saved locally");
  }, [runtime, workspaceUser]);

  useEffect(() => {
    writeStoredJson(storageKey("ui", workspaceUser), uiPreferences);
  }, [uiPreferences, workspaceUser]);

  useEffect(() => {
    writeStoredJson(storageKey("tests", workspaceUser), testCases);
  }, [testCases, workspaceUser]);

  function saveRuntimeNow() {
    writeStoredJson(storageKey("runtime", workspaceUser), runtime);
    setRuntimeSaveStatus("Saved locally");
  }

  function resetRuntime() {
    setRuntime(defaultRuntime);
    writeStoredJson(storageKey("runtime", workspaceUser), defaultRuntime);
    setRuntimeSaveStatus("Reset to blank.");
  }

  function applySimplifyPreset(nextValue) {
    setUiPreferences((current) => {
      const next = {
        ...current,
        simplifyEverything: nextValue
      };

      if (nextValue) {
        next.compactLayout = true;
        next.readableText = true;
        next.reduceMotion = true;
        next.hideAdvancedPanels = true;
      }

      return next;
    });
  }

  function submitAuth() {
    const username = authForm.username.trim();
    const password = authForm.password.trim();
    if (!username || !password) {
      setAuthError("Need name and password.");
      return;
    }

    const existing = account;
    if (authMode === "create") {
      const nextAccount = { username, password };
      setAccount(nextAccount);
      writeStoredJson(storageKey("account"), nextAccount);
      setSessionUser({ username });
      writeStoredJson(storageKey("session"), { username });
      setRuntime(readStoredJson(storageKey("runtime", username), defaultRuntime));
      setAuthError("");
      setRuntimeSaveStatus("Saved locally");
      return;
    }

    if (!existing || existing.username !== username || existing.password !== password) {
      setAuthError("Wrong name or password.");
      return;
    }

    setSessionUser({ username });
    writeStoredJson(storageKey("session"), { username });
    setRuntime(readStoredJson(storageKey("runtime", username), defaultRuntime));
    setAuthError("");
    setRuntimeSaveStatus("Saved locally");
  }

  function logout() {
    setSessionUser(null);
    try {
      localStorage.removeItem(storageKey("session"));
    } catch {}
  }

  const graphNodes = useMemo(() => normalizeNodes(nodes), [nodes]);
  const sortedGraphNodes = useMemo(() => {
    try {
      const order = topologicalOrder(graphNodes, links);
      const nMap = new Map(graphNodes.map((n) => [n.id, n]));
      return order.map((id) => nMap.get(id)).filter(Boolean);
    } catch {
      return [...graphNodes].sort((a, b) => {
        const ax = a.position?.x ?? 0;
        const bx = b.position?.x ?? 0;
        if (ax !== bx) return ax - bx;
        return (a.position?.y ?? 0) - (b.position?.y ?? 0);
      });
    }
  }, [graphNodes, links]);
  const nodeMap = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);
  const selectedNode = nodeMap.get(selectedId);
  const selectedLink = links.find((link) => link.id === selectedLinkId);
  const hasCycle = useMemo(() => wouldCreateCycle(graphNodes, links), [graphNodes, links]);
  const fixGuide = lastExecutionIssue ? buildFixGuide(lastExecutionIssue) : null;
  const workflowHealth = useMemo(() => {
    const issues = buildWorkflowHealthIssues(graphNodes, links, runtime);
    const score = Math.max(
      0,
      100 - issues.filter((issue) => issue.severity === "error").length * 20 - issues.filter((issue) => issue.severity === "warning").length * 8 - issues.filter((issue) => issue.severity === "info").length * 2
    );
    return {
      issues,
      score,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
      info: issues.filter((issue) => issue.severity === "info").length
    };
  }, [graphNodes, links, runtime]);

  function graphWithInputValue(nodesList, value) {
    let applied = false;
    return normalizeNodes(
      nodesList.map((node) => {
        if (!applied && node.type === "input") {
          applied = true;
          return { ...node, data: { ...node.data, value } };
        }
        return node;
      })
    );
  }

  async function executeWorkflowRun({
    graphNodesOverride = graphNodes,
    linksOverride = links,
    runtimeOverride = runtime,
    onEvent,
    signal
  } = {}) {
    return streamGraphExecution({
      graph: buildGraphPayload(graphName, graphNodesOverride, linksOverride),
      runtime: buildExecutionRuntime(graphNodesOverride, runtimeOverride),
      onEvent,
      signal
    });
  }

  useEffect(() => {
    const providerList = runtime.providers || [];
    if (providerList.length === 0) return;

    const bestCompletion = pickBestProvider(runtime, "completion");
    const bestEmbedding = pickBestProvider(runtime, "embedding");
    if (!bestCompletion && !bestEmbedding) return;

    let changed = false;
    const nextNodes = graphNodes.map((node) => {
      if (node.type === "llm" || node.type === "subagent") {
        const currentProvider = node.data.provider || "";
        const providerExists = providerList.some((provider) => provider.id === currentProvider || provider.providerType === currentProvider);
        const chosenProvider = providerExists ? currentProvider : providerKey(bestCompletion || providerList[0]);
        const chosenModel = node.data.model || defaultModelForProvider(normalizeProviderType(bestCompletion || providerList[0]), "completion");
        if (chosenProvider !== currentProvider || chosenModel !== node.data.model) {
          changed = true;
          return { ...node, data: { ...node.data, provider: chosenProvider, model: chosenModel } };
        }
      }

      if (node.type === "vector") {
        const providerChanged = node.data.provider !== "mongodb";
        const modelChanged = node.data.model !== "mongodb-embedding";
        if (providerChanged || modelChanged) {
          changed = true;
          return { ...node, data: { ...node.data, provider: "mongodb", model: "mongodb-embedding" } };
        }
      }

      return node;
    });

    if (changed) {
      setNodes(normalizeNodes(nextNodes));
    }
  }, [runtime.providers, graphNodes]);

  useEffect(() => {
    if (selectedNode && (selectedNode.type === "llm" || selectedNode.type === "subagent" || selectedNode.type === "vector")) {
      const activeProvId = selectedNode.data.provider || "openai";
      const provConf = (runtime.providers || []).find(p => p.id === activeProvId);
      const isEmbedding = selectedNode.type === "vector";

      if (isEmbedding && activeProvId === "mongodb") {
        setNodeModelCatalog({ models: ["mongodb-embedding"], recommendation: "mongodb-embedding", source: "local" });
        setNodeLoadingModels(false);
        return;
      }
      
      setNodeLoadingModels(true);
      fetch(`${API_BASE}/runtime/models`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerType: provConf?.providerType || activeProvId,
          baseUrl: provConf?.baseUrl || "",
          apiKey: provConf?.apiKey || "",
          mode: isEmbedding ? "embedding" : "completion"
        })
      })
      .then(res => res.json())
      .then(data => {
        setNodeModelCatalog(data);
        const recommended = data?.recommendation || "";
        const currentModel = selectedNode.data.model || "";
        const modelList = Array.isArray(data?.models) ? data.models : [];
        const shouldAutoPick = Boolean(
          selectedNode &&
          (selectedNode.type === "llm" || selectedNode.type === "subagent") &&
          recommended &&
          (!currentModel || (modelList.length > 0 && !modelList.includes(currentModel) && currentModel !== recommended))
        );

        if (shouldAutoPick) {
          setNodes((current) =>
            normalizeNodes(
              current.map((node) =>
                node.id === selectedNode.id
                  ? { ...node, data: { ...node.data, model: recommended } }
                  : node
              )
            )
          );
        }

        setNodeLoadingModels(false);
      })
      .catch(() => {
        setNodeLoadingModels(false);
      });
    }
  }, [selectedNode?.id, selectedNode?.data?.provider, selectedNode?.data?.model, runtime.providers]);

  useEffect(() => {
    if (selectedNode && selectedNode.type === "vector") {
      const activeDbId = selectedNode.data.vectorDatabase;
      const dbConf = (runtime.databases || []).find(db => db.id === activeDbId);
      if (dbConf) {
        fetch(`${API_BASE}/runtime/databases/info`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: dbConf.kind })
        })
        .then(res => res.json())
        .then(data => {
          setNodeDbInfo(data);
        })
        .catch(() => {});
      } else {
        setNodeDbInfo({ suggested_setup: "" });
      }
    }
  }, [selectedNode?.id, selectedNode?.data?.vectorDatabase, runtime.databases]);

  function toWorld(clientX, clientY) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale
    };
  }

  function beginNodeDrag(event, node) {
    if (event.button !== 0) return;
    event.stopPropagation();
    if (canvasMode === "hand") {
      panRef.current = { x: event.clientX, y: event.clientY, start: viewport };
      return;
    }
    setSelectedId(node.id);
    setSelectedLinkId(null);
    const world = toWorld(event.clientX, event.clientY);
    setDragging({ nodeId: node.id, dx: world.x - node.position.x, dy: world.y - node.position.y });
  }

  function beginPan(event) {
    if (event.button !== 0 || event.target.closest("[data-node]")) return;
    panRef.current = { x: event.clientX, y: event.clientY, start: viewport };
  }

  function onPointerMove(event) {
    if (dragging) {
      const world = toWorld(event.clientX, event.clientY);
      setNodes((current) =>
        current.map((node) =>
          node.id === dragging.nodeId
            ? { ...node, position: { x: world.x - dragging.dx, y: world.y - dragging.dy } }
            : node
        )
      );
      return;
    }
    if (panRef.current) {
      const dx = event.clientX - panRef.current.x;
      const dy = event.clientY - panRef.current.y;
      setViewport({ ...panRef.current.start, x: panRef.current.start.x + dx, y: panRef.current.start.y + dy });
      return;
    }
    if (linkDraft) {
      const pointer = toWorld(event.clientX, event.clientY);
      setPointerWorld(pointer);
      let nearest = null;
      let min = 42;
      for (const node of graphNodes) {
        for (const input of node.inputs) {
          const pos = portPosition(node, input.id, "input");
          const dist = Math.hypot(pos.x - pointer.x, pos.y - pointer.y);
          if (dist < min && node.id !== linkDraft.sourceNode) {
            min = dist;
            nearest = { nodeId: node.id, portId: input.id };
          }
        }
      }
      setHoverPort(nearest);
    }
  }

  function endPointer() {
    setDragging(null);
    panRef.current = null;
    if (linkDraft && hoverPort) {
      const candidate = {
        id: crypto.randomUUID(),
        sourceNode: linkDraft.sourceNode,
        sourcePort: linkDraft.sourcePort,
        targetNode: hoverPort.nodeId,
        targetPort: hoverPort.portId,
        active: false
      };
      const duplicateExists = links.some((link) => linkSignature(link) === linkSignature(candidate));
      if (duplicateExists) {
        setStatus("Same link already there.");
      } else if (wouldCreateCycle(graphNodes, links, candidate)) {
        setLinks((current) => [...current, { ...candidate, invalid: true }]);
        setStatus("Cycle intercepted: execution locked until the red path is removed.");
      } else {
        setLinks((current) => [...current, candidate]);
        setStatus("Connection added.");
      }
    }
    setLinkDraft(null);
    setHoverPort(null);
    setPointerWorld(null);
  }

  function setZoom(nextScale, anchor) {
    setViewport((current) => {
      const scale = Math.min(2.2, Math.max(0.35, nextScale));
      if (!anchor || !canvasRef.current) return { ...current, scale };
      const rect = canvasRef.current.getBoundingClientRect();
      const worldX = (anchor.clientX - rect.left - current.x) / current.scale;
      const worldY = (anchor.clientY - rect.top - current.y) / current.scale;
      return {
        scale,
        x: anchor.clientX - rect.left - worldX * scale,
        y: anchor.clientY - rect.top - worldY * scale
      };
    });
  }

  function onWheel(event) {
    event.preventDefault();
    setZoom(viewport.scale * Math.exp(-event.deltaY * 0.001), event);
  }

  function fitContent(nodesList = nodes) {
    if (!canvasRef.current || nodesList.length === 0) return;

    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    nodesList.forEach(node => {
      const x = node.position.x;
      const y = node.position.y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x + 240); // 240px estimated node width
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y + 160); // 160px estimated height
    });

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const viewWidth = rect.width;
    const viewHeight = rect.height;

    // Ideal scale with padding
    const PADDING = 80;
    const scaleX = (viewWidth - PADDING * 2) / graphWidth;
    const scaleY = (viewHeight - PADDING * 2) / graphHeight;
    let scale = Math.min(scaleX, scaleY);
    
    scale = Math.min(1.4, Math.max(0.35, scale));

    // Center the bounding box in the viewport
    const graphCenterX = minX + graphWidth / 2;
    const graphCenterY = minY + graphHeight / 2;
    
    const x = viewWidth / 2 - graphCenterX * scale;
    const y = viewHeight / 2 - graphCenterY * scale;

    setViewport({ x, y, scale });
    setStatus("Canvas fitted to content.");
  }

  function autoLayoutNodes() {
    if (nodes.length === 0) return;

    // 1. Calculate incoming links and predecessors for each node
    const predecessorsMap = new Map();
    nodes.forEach(node => {
      predecessorsMap.set(node.id, []);
    });
    
    links.forEach(link => {
      if (predecessorsMap.has(link.targetNode)) {
        predecessorsMap.get(link.targetNode).push(link.sourceNode);
      }
    });

    // 2. Compute column/level for each node using topological depth
    const columns = new Map();
    const visited = new Set();
    
    function getDepth(nodeId) {
      if (columns.has(nodeId)) return columns.get(nodeId);
      if (visited.has(nodeId)) return 0; // Cycle safety
      
      visited.add(nodeId);
      const preds = predecessorsMap.get(nodeId) || [];
      if (preds.length === 0) {
        columns.set(nodeId, 0);
        visited.delete(nodeId);
        return 0;
      }
      
      let maxPredDepth = -1;
      for (const pred of preds) {
        maxPredDepth = Math.max(maxPredDepth, getDepth(pred));
      }
      const depth = maxPredDepth + 1;
      columns.set(nodeId, depth);
      visited.delete(nodeId);
      return depth;
    }

    nodes.forEach(node => getDepth(node.id));

    // 3. Group nodes by column
    const columnGroups = {};
    nodes.forEach(node => {
      const col = columns.get(node.id) || 0;
      if (!columnGroups[col]) columnGroups[col] = [];
      columnGroups[col].push(node);
    });

    // 4. Update node positions left-to-right (horizontal flow)
    const COLUMN_WIDTH = 420;
    const ROW_HEIGHT = 220;
    const START_X = 120;
    const START_Y = 240;

    const newNodes = nodes.map(node => {
      const col = columns.get(node.id) || 0;
      const group = columnGroups[col];
      const index = group.indexOf(node);
      const totalRows = group.length;
      
      // Perfectly aligned left-to-right, centered vertically
      const x = START_X + col * COLUMN_WIDTH;
      const y = START_Y + (index - (totalRows - 1) / 2) * ROW_HEIGHT;
      
      return {
        ...node,
        position: { x, y }
      };
    });

    setNodes(normalizeNodes(newNodes));
    setStatus("Nodes auto-aligned neatly.");
    
    // Auto-fit after tidy up to perfectly center the new clean graph
    setTimeout(() => {
      fitContent(newNodes);
    }, 60);
  }

  useEffect(() => {
    if (!storedWorkspace?.nodes?.length) {
      autoLayoutNodes();
    }
    // one tidy start for the first canvas load when there is no saved draft
  }, []);

  function deleteSelectedLink() {
    if (!selectedLinkId) return;
    setLinks((current) => current.filter((link) => link.id !== selectedLinkId));
    setSelectedLinkId(null);
    setStatus("Connection removed.");
  }

  function deleteNode(nodeId) {
    setNodes((current) => current.filter((node) => node.id !== nodeId));
    setLinks((current) => current.filter((link) => link.sourceNode !== nodeId && link.targetNode !== nodeId));
    if (selectedId === nodeId) {
      setSelectedId(null);
    }
    setStatus("Node deleted.");
  }



  function addNode(type) {
    const meta = nodeTypes.find((item) => item.type === type);
    const id = `${type}-${Date.now()}`;
    const base = {
      id,
      type,
      label: meta.label,
      position: { x: 180 + graphNodes.length * 32, y: 100 + graphNodes.length * 28 },
      inputs: type === "input" ? [] : [{ id: "input", label: "input" }],
      outputs: type === "output" ? []
             : type === "router" ? [{ id: "true", label: "True" }, { id: "false", label: "False" }]
             : [{ id: type === "llm" ? "completion" : "output", label: type === "llm" ? "completion" : "output" }],
      data: {}
    };
    if (type === "prompt") base.data.template = "";
    if (type === "llm") base.data = { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 };
    if (type === "subagent") {
      base.label = "Sub-agent";
      base.inputs = [{ id: "task", label: "task" }, { id: "context", label: "context" }];
      base.outputs = [{ id: "result", label: "result" }];
      base.data = { role: "Specialist", handoff: "Return a concise result to the parent agent." };
    }
    if (type === "vector") base.data = { collection: "knowledge_base", index: "vector_index", limit: 4, provider: "mongodb", model: "mongodb-embedding" };
    if (type === "datastore") {
      base.label = "Data Store";
      base.data = { operation: "save", collection: "data_store", key: "text", database: "" };
    }
    if (type === "document_loader") {
      base.label = "Document Loader";
      base.inputs = [{ id: "url", label: "url" }];
      base.outputs = [{ id: "text", label: "text" }];
      base.data = { source_type: "url", url: "https://raw.githubusercontent.com/run-llama/llama_index/main/README.md", text: "" };
    }
    if (type === "router") base.data = { condition: "len(input) > 10" };
    if (type === "code") base.data = { code: "output = input.upper()" };
    if (type === "custom") {
      base.label = "Custom Step";
      base.inputs = [{ id: "input", label: "input" }];
      base.outputs = [{ id: "output", label: "output" }];
      base.data = { code: "# Custom dynamic execution\n# Access inputs like: val = input\n# Set outputs like: output = val.upper()" };
    }
    setNodes((current) => normalizeNodes([...current, base]));
    setSelectedId(id);
  }

  function createNewAgent() {
    setGraphId(null);
    setGraphName("New Workflow");
    setTempName("New Workflow");
    setNodes([]);
    setLinks([]);
    setSelectedId(null);
    setSelectedLinkId(null);
    setViewport({ x: 16, y: 30, scale: 0.8 });
    setActiveView("ide");
    setStatus("Blank agent ready.");
  }

  function applyTemplate(template) {
    setGraphId(null);
    setNodes(normalizeNodes(template.nodes));
    setLinks(filterDuplicateLinks(template.links));
    setGraphName(template.name || "New Workflow");
    setTempName(template.name || "New Workflow");
    setSelectedId(template.nodes[0]?.id || null);
    setSelectedLinkId(null);
    setViewport({ x: 16, y: 30, scale: 0.52 });
    setActiveView("ide");
    setStatus(`${template.name} template loaded.`);
  }

  function optimizeImportedWorkflow(workflow) {
    const nextNodes = normalizeNodes(Array.isArray(workflow?.nodes) ? workflow.nodes : []);
    const nodeIds = new Set(nextNodes.map((node) => node.id));
    let nextLinks = filterDuplicateLinks(
      (Array.isArray(workflow?.links) ? workflow.links : []).filter(
        (link) => nodeIds.has(link.sourceNode) && nodeIds.has(link.targetNode)
      )
    );

    const hasOutputNode = nextNodes.some((node) => node.type === "output");
    if (!hasOutputNode && nextNodes.length > 0) {
      const attachSource = [...nextNodes].reverse().find((node) => node.outputs?.length) || nextNodes[nextNodes.length - 1];
      const sourcePort = attachSource?.outputs?.[0]?.id || "completion";
      const outputId = `output-${Date.now()}`;
      const x = (attachSource?.position?.x ?? 0) + 360;
      const y = attachSource?.position?.y ?? 0;
      nextNodes.push({
        id: outputId,
        type: "output",
        label: "Final Output",
        position: { x, y },
        inputs: [{ id: "input", label: "input" }],
        outputs: [],
        data: {}
      });
      nextLinks.push({
        id: `link-${Date.now()}`,
        sourceNode: attachSource.id,
        sourcePort,
        targetNode: outputId,
        targetPort: "input",
        active: true
      });
    }

    return {
      name: `${workflow?.name || ""}`.trim(),
      nodes: nextNodes,
      links: nextLinks
    };
  }

  function loadWorkflowIntoCanvas(workflow, message = "Workflow loaded.") {
    const next = optimizeImportedWorkflow(workflow);
    const firstId = next.nodes[0]?.id || null;
    setGraphId(null);
    setNodes(next.nodes);
    setLinks(next.links);
    setSelectedId(firstId);
    setSelectedLinkId(null);
    setViewport({ x: 16, y: 30, scale: 0.52 });
    setActiveView("ide");
    if (next.name) {
      setGraphName(next.name);
      setTempName(next.name);
    }
    setStatus(message);
    setTimeout(() => fitContent(next.nodes), 60);
  }

  function addStarterNode() {
    addNode("input");
    setViewport({ x: 16, y: 30, scale: 0.8 });
  }

  function updateSelectedData(key, value) {
    setNodes((current) =>
      normalizeNodes(current.map((node) => (node.id === selectedId ? { ...node, data: { ...node.data, [key]: value } } : node)))
    );
  }

  async function saveGraph() {
    setStatus("Saving graph...");
    const payload = buildGraphPayload(graphName, graphNodes, links);
    if (graphId) {
      payload.id = graphId;
    }
    const response = await fetch(`${API_BASE}/graphs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const data = await response.json();
      setGraphId(data.id);
      setStatus("Graph saved to MongoDB.");
      fetchFlows();
    } else {
      setStatus("Save failed. Is the backend running?");
    }
  }


  async function runGraph() {
    if (hasCycle || links.some((link) => link.invalid)) {
      setStatus("Execution locked: remove invalid cycle paths first.");
      setLastExecutionIssue({ code: "cycle", label: "Workflow", message: "Remove the red cycle link first." });
      return;
    }

    const trace = [];
    const startedAt = Date.now();
    setNodeStates({});
    setNodeOutputs({});
    setLastExecutionIssue(null);
    setExecutionActive(true);
    setCurrentExecutionNode(null);
    setExecutionProgress({ current: 0, total: 0 });
    setExecutionLog(["Starting SSE execution..."]);
    setStatus("Executing graph...");

    try {
      const result = await executeWorkflowRun({
        onEvent: (data) => {
          trace.push({ ...data, at: Date.now() });
          const { event, node, label, step, total, chunk: tokenChunk, durationMs, message, condition } = data;

          setExecutionLog((current) => [
            ...current.slice(-15),
            `[${event}] ${node || ""} ${message || label || tokenChunk || ""}`
          ]);

          if (event === "node:start") {
            setNodeStates((prev) => ({ ...prev, [node]: "running" }));
            setExecutionProgress({ current: step + 1, total });
            setCurrentExecutionNode(node);
            setStatus(`Running node: ${label || node}`);
          } else if (event === "node:skipped") {
            setNodeStates((prev) => ({ ...prev, [node]: "skipped" }));
          } else if (event === "token") {
            setNodeOutputs((prev) => {
              const nodeOut = prev[node] || { chunks: [], result: "" };
              const updatedChunks = [...nodeOut.chunks, tokenChunk];
              return {
                ...prev,
                [node]: {
                  ...nodeOut,
                  chunks: updatedChunks,
                  result: updatedChunks.join("")
                }
              };
            });
          } else if (event === "router:result") {
            setNodeOutputs((prev) => ({
              ...prev,
              [node]: {
                ...(prev[node] || { chunks: [], result: "" }),
                routerResult: condition
              }
            }));
          } else if (event === "node:output") {
            setNodeOutputs((prev) => ({
              ...prev,
              [node]: {
                ...(prev[node] || { chunks: [], result: "" }),
                result: data.output
              }
            }));
          } else if (event === "node:complete") {
            setNodeStates((prev) => ({ ...prev, [node]: "completed" }));
            setNodeOutputs((prev) => ({
              ...prev,
              [node]: {
                ...(prev[node] || { chunks: [], result: "" }),
                duration: durationMs
              }
            }));
          } else if (event === "node:error") {
            setNodeStates((prev) => ({ ...prev, [node]: "error" }));
            setNodeOutputs((prev) => ({
              ...prev,
              [node]: {
                ...(prev[node] || { chunks: [], result: "" }),
                error: message,
                duration: durationMs
              }
            }));
          } else if (event === "complete") {
            setExecutionActive(false);
            setCurrentExecutionNode(null);
            if (data.errorCount > 0) {
              const firstError = data.errors?.[0];
              setStatus(`Error: ${firstError?.label || firstError?.node || "node"} - ${firstError?.message || "unknown"}`);
              setLastExecutionIssue(firstError || { code: "runtime_error", label: "Workflow", message: "Flow failed." });
            } else if (data.hasOutput) {
              setStatus("Execution complete.");
              setLastExecutionIssue(null);
            } else {
              setStatus("No output came out.");
              setLastExecutionIssue({ code: "no_output", label: "Workflow", message: "No output came out." });
            }
          }
        }
      });

      if (!result.ok) {
        const message = result.errorMessage || "Run failed.";
        setStatus(`Error: ${message}`);
        setLastExecutionIssue({
          code: message.toLowerCase().includes("api key") ? "missing_provider_key" : message.toLowerCase().includes("connection string") ? "missing_vector_db" : "runtime_error",
          label: "Workflow",
          message
        });
        return;
      }

      setLastExecutionReplay({
        source: "workflow",
        startedAt,
        summary: buildReplaySummary(trace, result.finalEvent),
        events: trace
      });
    } catch (err) {
      console.error("Execution error:", err);
      setStatus(`Execution error: ${err?.message || "connection failed"}`);
      setLastExecutionIssue({ code: "runtime_error", label: "Workflow", message: err?.message || "Execution connection failed." });
    } finally {
      setExecutionActive(false);
      setCurrentExecutionNode(null);
    }
  }

  async function sendChatInput(queryText) {
    if (!queryText.trim()) return;
    
    const isBuildRequest = /make|create|build|generate|setup|design|flow|agent|workflow/i.test(queryText);
    const inputNode = nodes.find(n => n.type === "input");
    
    if (isBuildRequest || !inputNode) {
      setChatMode("copilot");
      sendCopilotInput(queryText);
      return;
    }
    
    // Add user message
    const userMsg = { id: `user-${Date.now()}`, role: "user", text: queryText };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    
    // Update input node value in state
    const updatedNodes = nodes.map(n => n.id === inputNode.id ? { ...n, data: { ...n.data, value: queryText } } : n);
    setNodes(normalizeNodes(updatedNodes));
    
    let responseId = `bot-${Date.now()}`;
    let currentText = "";
    
    // Add streaming placeholder
    setChatMessages((prev) => [...prev, { id: responseId, role: "assistant", text: "", isStreaming: true }]);
    
    // Start graph execution
    setNodeStates({});
    setNodeOutputs({});
    setLastExecutionIssue(null);
    setExecutionActive(true);
    setCurrentExecutionNode(null);
    setExecutionProgress({ current: 0, total: 0 });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);
    const trace = [];
    const startedAt = Date.now();

    try {
      const result = await executeWorkflowRun({
        graphNodesOverride: normalizeNodes(updatedNodes),
        linksOverride: links,
        runtimeOverride: runtime,
        signal: controller.signal,
        onEvent: (data) => {
          trace.push({ ...data, at: Date.now() });
          const { event, node, label, step, total, chunk: tokenChunk, durationMs, message, condition } = data;

          if (event === "node:start") {
            setNodeStates((prev) => ({ ...prev, [node]: "running" }));
            setExecutionProgress({ current: step + 1, total });
            setCurrentExecutionNode(node);
          } else if (event === "node:skipped") {
            setNodeStates((prev) => ({ ...prev, [node]: "skipped" }));
          } else if (event === "token" && tokenChunk) {
            currentText += tokenChunk;
            setChatMessages((prev) => prev.map((m) => m.id === responseId ? { ...m, text: currentText } : m));
            setNodeOutputs((prev) => {
              const nodeOut = prev[node] || { chunks: [], result: "" };
              const updatedChunks = [...nodeOut.chunks, tokenChunk];
              return {
                ...prev,
                [node]: { ...nodeOut, chunks: updatedChunks, result: updatedChunks.join("") }
              };
            });
          } else if (event === "node:output" && data.output) {
            if (!currentText) {
              currentText = String(data.output);
              setChatMessages((prev) => prev.map((m) => m.id === responseId ? { ...m, text: currentText } : m));
            }
            setNodeOutputs((prev) => ({
              ...prev,
              [node]: { ...(prev[node] || { chunks: [], result: "" }), result: data.output }
            }));
          } else if (event === "node:complete") {
            setNodeStates((prev) => ({ ...prev, [node]: "completed" }));
            setNodeOutputs((prev) => ({
              ...prev,
              [node]: { ...(prev[node] || { chunks: [], result: "" }), duration: durationMs }
            }));
          } else if (event === "node:error") {
            setNodeStates((prev) => ({ ...prev, [node]: "error" }));
            currentText += `\n\nError in step "${label || node}": ${message}`;
            setChatMessages((prev) => prev.map((m) => m.id === responseId ? { ...m, text: currentText } : m));
          } else if (event === "complete") {
            setExecutionActive(false);
            setCurrentExecutionNode(null);

            if (!currentText) {
              if (data.errorCount > 0) {
                const firstError = data.errors?.[0];
                currentText = `Error: ${firstError?.label || firstError?.node || "node"} - ${firstError?.message || "unknown"}`;
                setLastExecutionIssue(firstError || { code: "runtime_error", label: "Workflow", message: "Flow failed." });
              } else if (data.hasOutput && data.output) {
                currentText = data.output;
                setLastExecutionIssue(null);
              } else {
                currentText = "No output came out.";
                setLastExecutionIssue({ code: "no_output", label: "Workflow", message: "No output came out." });
              }
              setChatMessages((prev) => prev.map((m) => m.id === responseId ? { ...m, text: currentText } : m));
            }
          }
        }
      });

      if (!result.ok) {
        const message = result.errorMessage || "Execution stream unavailable.";
        setLastExecutionIssue({
          code: message.toLowerCase().includes("api key") ? "missing_provider_key" : message.toLowerCase().includes("connection string") ? "missing_vector_db" : "runtime_error",
          label: "Workflow",
          message
        });
        setChatMessages((prev) => prev.map((m) => m.id === responseId ? { ...m, text: `Error: ${message}`, isStreaming: false } : m));
        setChatLoading(false);
        setExecutionActive(false);
        return;
      }

      setLastExecutionReplay({
        source: "tester",
        startedAt,
        summary: buildReplaySummary(trace, result.finalEvent),
        events: trace
      });
    } catch (err) {
      console.error(err);
      const message = err?.name === "AbortError" ? "Workflow timed out." : (err?.message || "Connection error during workflow execution.");
      setLastExecutionIssue({ code: "runtime_error", label: "Workflow", message });
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: `Error: ${message}`, isStreaming: false } : m));
    } finally {
      clearTimeout(timeoutId);
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, isStreaming: false } : m));
      setChatLoading(false);
      setExecutionActive(false);
    }
  }

  async function runTestHarness() {
    const inputNode = graphNodes.find((node) => node.type === "input");
    if (!inputNode) {
      setStatus("Add an input node before running tests.");
      return;
    }

    if (hasCycle || links.some((link) => link.invalid)) {
      setStatus("Execution locked: remove invalid cycle paths first.");
      setLastExecutionIssue({ code: "cycle", label: "Workflow", message: "Remove the red cycle link first." });
      return;
    }

    setTestRunning(true);
    setStatus("Running test harness...");
    setTestResults([]);

    const results = [];
    let passedCount = 0;

    try {
      for (const testCase of testCases) {
        const trace = [];
        const startedAt = Date.now();
        const testNodes = graphWithInputValue(graphNodes, testCase.input);
        const result = await executeWorkflowRun({
          graphNodesOverride: testNodes,
          linksOverride: links,
          runtimeOverride: runtime,
          onEvent: (data) => {
            trace.push({ ...data, at: Date.now() });
          }
        });

        const outputText = result.ok ? (result.finalEvent?.output || "") : "";
        const expectedText = `${testCase.expected || ""}`.trim().toLowerCase();
        const normalizedOutput = `${outputText || ""}`.trim().toLowerCase();
        const passed = result.ok && (!expectedText || normalizedOutput.includes(expectedText));
        const summary = buildReplaySummary(trace, result.finalEvent);

        if (passed) passedCount += 1;

        results.push({
          ...testCase,
          passed,
          output: outputText,
          error: result.ok ? "" : (result.errorMessage || "Run failed."),
          summary,
          durationMs: Date.now() - startedAt
        });

        setTestResults([...results]);
        setLastExecutionReplay({
          source: "test",
          startedAt,
          summary,
          events: trace
        });

        if (!result.ok) {
          const errorText = `${result.errorMessage || ""}`.toLowerCase();
          setLastExecutionIssue({
            code: errorText.includes("api key") ? "missing_provider_key" : errorText.includes("connection string") ? "missing_vector_db" : "runtime_error",
            label: "Workflow",
            message: result.errorMessage || "Test run failed."
          });
        }
      }

      if (passedCount === results.length) {
        setLastExecutionIssue(null);
      }

      setStatus(`Test harness finished: ${passedCount}/${results.length} passed.`);
    } finally {
      setTestRunning(false);
    }
  }

  async function sendCopilotInput(queryText) {
    if (!queryText.trim()) return;
    
    const userMsg = { id: `user-${Date.now()}`, role: "user", text: queryText };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    
    let responseId = `bot-${Date.now()}`;
    let currentText = "";
    
    setChatMessages((prev) => [...prev, { id: responseId, role: "assistant", text: "", isStreaming: true }]);
    
const systemPrompt = `You are PromptFlow Copilot, an expert AI assistant that helps users construct and refine LLM workflows in PromptFlow Studio.
You can generate nodes and connections. Prefer the smallest workflow that solves the task. Avoid extra nodes, duplicate links, disconnected nodes, and vague labels.
If the workspace is in simplify mode, bias even harder toward fewer nodes, short labels, and very explicit defaults.
If the user did not ask for retrieval, databases, or RAG, keep the flow to the simplest useful chain.
To create or modify a workflow, output a single JSON codeblock wrapped in \`\`\`json ... \`\`\` with this exact structure:
{
  "name": "A short, clean, descriptive title of this workflow (e.g. News Summarizer or PDF Generator)",
  "nodes": [
    { "id": "input-1", "type": "input", "label": "User Input", "position": {"x": 60, "y": 240}, "inputs": [], "outputs": [{"id": "value", "label": "value"}], "data": {"key": "input", "value": "What is the refund policy?"} },
    { "id": "prompt-1", "type": "prompt", "label": "Prompt Template", "position": {"x": 420, "y": 240}, "inputs": [], "outputs": [{"id": "prompt", "label": "prompt"}], "data": {"template": "Answer this clearly: {{input}}"} },
    { "id": "llm-1", "type": "llm", "label": "Model Response", "position": {"x": 780, "y": 240}, "inputs": [{"id": "prompt", "label": "prompt"}], "outputs": [{"id": "completion", "label": "completion"}], "data": {"provider": "openai", "model": "gpt-4o-mini"} },
    { "id": "output-1", "type": "output", "label": "Final Output", "position": {"x": 1140, "y": 240}, "inputs": [{"id": "input", "label": "input"}], "outputs": [], "data": {} }
  ],
  "links": [
    { "id": "l1", "sourceNode": "input-1", "sourcePort": "value", "targetNode": "prompt-1", "targetPort": "input" },
    { "id": "l2", "sourceNode": "prompt-1", "sourcePort": "prompt", "targetNode": "llm-1", "targetPort": "prompt" },
    { "id": "l3", "sourceNode": "llm-1", "sourcePort": "completion", "targetNode": "output-1", "targetPort": "input" }
  ]
}

CRITICAL RULES:
1. Every node in "nodes" MUST have a "type" string that is EXACTLY one of these lowercase values:
   - "input" (User input)
   - "prompt" (Prompt instructions / template)
   - "llm" (Model response)
   - "vector" (Vector Database search / retrieve)
   - "datastore" (Database insert or query operation)
   - "document_loader" (Fetch document from URL or static text)
   - "output" (Final output)
   - "router" (Conditional routing / branching)
   - "subagent" (Autonomous sub-agent specialist)
   - "code" (Python code transform)
   - "custom" (Custom dynamic ports node)
DO NOT capitalize node types (like "Input", "LLM") and do not use generic names not in this list.
2. Keep duplicate links out. One exact source-port to target-port link is enough, but different ports between the same nodes are allowed.
3. Use simple input -> prompt -> llm -> output flows unless the user clearly asks for retrieval or database context.
4. If the flow can work with fewer nodes, use fewer nodes.
5. Do not include any commentary outside the JSON block.
Be helpful, professional, and keep the output focused on the JSON structure only.`;

    let timeoutId = null;
    try {
      const activeProvider = pickBestProvider(runtime, "completion");
      const providerType = normalizeProviderType(activeProvider) || "openai";
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${API_BASE}/llm/stream`, {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: providerType,
          model: activeProvider?.model || defaultModelForProvider(providerType, "completion"),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: queryText }
          ],
          runtime: buildExecutionRuntime(nodes, runtime)
        })
      });
      if (!response.ok) {
        const message = await readErrorMessage(response);
        setLastExecutionIssue({
          code: message.toLowerCase().includes("api key") ? "missing_provider_key" : message.toLowerCase().includes("connection string") ? "missing_vector_db" : "runtime_error",
          label: "Workflow",
          message
        });
        throw new Error(message);
      }

      if (!response.body) {
        setLastExecutionIssue({ code: "runtime_error", label: "Workflow", message: "Copilot stream is not available." });
        setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: "Error: Copilot stream is not available.", isStreaming: false } : m));
        setChatLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line) => {
        let payloadStr = line;
        if (payloadStr.startsWith("data: ")) {
          payloadStr = payloadStr.slice(6);
        } else if (payloadStr.startsWith("data:")) {
          payloadStr = payloadStr.slice(5);
        }
        currentText += payloadStr;
        setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: currentText } : m));
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop();
        for (const line of lines) {
          const cleanLine = line.split("\n").find(e => e.startsWith("data:"));
          if (cleanLine) processLine(cleanLine);
        }
      }

      if (buffer.trim()) {
        const cleanLine = buffer.split("\n").find(e => e.startsWith("data:"));
        if (cleanLine) processLine(cleanLine);
      }

    } catch (err) {
      console.error(err);
      const message = err?.name === "AbortError" ? "Copilot timed out." : (err?.message || "Copilot error.");
      setLastExecutionIssue({ code: "runtime_error", label: "Workflow", message });
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: `Error: ${message}`, isStreaming: false } : m));
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, isStreaming: false } : m));
      setChatLoading(false);
      
      try {
        // Automatically load the generated workflow onto the canvas!
        const workflow = parseJsonWorkflow(currentText);
        if (workflow) {
          loadWorkflowIntoCanvas(workflow, "Workflow built automatically on canvas!");
        }
      } catch (workflowErr) {
        console.error("Error auto-loading workflow from Copilot:", workflowErr);
      }
    }
  }

  function compileSdk() {
    const code = compileGraphToSdk(buildGraphPayload(graphName, graphNodes, links));
    setCompiledCode(code);
    setStatus("Standalone ES module compiled.");
  }

  function downloadSdk() {
    const code = compiledCode || compileGraphToSdk(buildGraphPayload(graphName, graphNodes, links));
    const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "promptflow-pipeline.js";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const authScreen = (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)" }}>
      <div style={{ width: "min(520px, 100%)", background: "#fff", border: "1px solid var(--border)", borderRadius: "20px", boxShadow: "0 24px 80px rgba(15, 23, 42, 0.12)", padding: "28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "18px" }}>
          <KeyRound size={18} />
          <strong>PromptFlow Login</strong>
        </div>
        <p style={{ margin: "0 0 18px", color: "var(--muted)", fontSize: "13px", lineHeight: "1.5" }}>
          Simple local login. No cloud. No big rig.
        </p>
        <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
          <button className={authMode === "create" ? "primary" : "ghost"} onClick={() => setAuthMode("create")} style={{ flex: 1 }}>Create account</button>
          <button className={authMode === "login" ? "primary" : "ghost"} onClick={() => setAuthMode("login")} style={{ flex: 1 }}>Login</button>
        </div>
        <div className="form-stack">
          <label>Username
            <input value={authForm.username} onChange={(e) => setAuthForm((prev) => ({ ...prev, username: e.target.value }))} placeholder="Your name" />
          </label>
          <label>Password
            <input type="password" value={authForm.password} onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))} placeholder="Your password" />
          </label>
        </div>
        {authError && <p style={{ marginTop: "10px", color: "var(--red)", fontSize: "12px" }}>{authError}</p>}
        <div style={{ display: "flex", gap: "8px", marginTop: "18px" }}>
          <button className="primary" onClick={submitAuth} style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
            <LogIn size={15} /> {authMode === "create" ? "Make account" : "Enter"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!sessionUser?.username) {
    return authScreen;
  }

  const formatExecutionResult = (result) => {
    if (!result) return "(Empty Output)";
    try {
      const stringified = typeof result === "string" ? result : JSON.stringify(result);
      const parsed = JSON.parse(stringified);
      return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
    } catch {
      return String(result);
    }
  };

  return (
    <div className={`app-shell ${chatOpen ? "chat-open" : ""} ${uiPreferences.simplifyEverything ? "simplify-mode" : ""} ${uiPreferences.compactLayout ? "compact-layout" : ""} ${uiPreferences.readableText ? "readable-text" : ""} ${uiPreferences.reduceMotion ? "reduce-motion" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <Waypoints size={22} />
          <strong>PromptFlow Studio</strong>
          {isEditingName ? (
            <input
              className="workflow-chip-input"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={() => {
                if (tempName.trim()) {
                  setGraphName(tempName.trim());
                }
                setIsEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (tempName.trim()) {
                    setGraphName(tempName.trim());
                  }
                  setIsEditingName(false);
                } else if (e.key === "Escape") {
                  setIsEditingName(false);
                }
              }}
              autoFocus
              style={{
                background: "var(--surface-soft)",
                border: "1px solid var(--blue)",
                borderRadius: "16px",
                padding: "4px 12px",
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--text)",
                outline: "none",
                width: "150px"
              }}
            />
          ) : (
            <span 
              className="workflow-chip"
              onDoubleClick={() => {
                setTempName(graphName);
                setIsEditingName(true);
              }}
              title="Double click to edit flow name"
              style={{ cursor: "pointer", userSelect: "none" }}
            >
              {graphName}
            </span>
          )}
          <nav>
            {navItems.map((item) => (
              <button 
                key={item.id} 
                className={activeView === item.id ? "active" : ""} 
                onClick={() => { setActiveView(item.id); if (item.id === "flows") fetchFlows(); }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="top-actions">
          {activeView === "home" ? (
            <button className="primary" onClick={() => setActiveView("ide")}>
              <CirclePlay size={15} /> Launch Studio
            </button>
          ) : (
            <>
              <label className="search"><Search size={15} /><input placeholder="Search prompts..." /></label>
              <button className="ghost" onClick={createNewAgent}><Plus size={15} /> New agent</button>
              <button className="ghost" onClick={compileSdk}><ArrowDownToLine size={15} /> Compile</button>
              <button className={`ghost ${chatOpen ? "active" : ""}`} style={{ color: chatOpen ? "var(--blue)" : "inherit", borderColor: chatOpen ? "var(--blue)" : "var(--border)" }} onClick={() => setChatOpen(!chatOpen)}>
                <Bot size={15} /> Agent Chat
              </button>
              <button className="primary" onClick={runGraph}><CirclePlay size={15} /> Execute workflow</button>
            </>
          )}
        </div>
      </header>



      {activeView === "home" ? (
        <Home
          onLaunchIde={() => setActiveView("ide")}
          onOpenTemplates={() => setActiveView("templates")}
        />
      ) : activeView === "ide" ? (
      <>
      <section className="palette">
        <div className="panel-heading">
          <span>Nodes</span>
          <h2>Add a step</h2>
        </div>
        <label className="node-search"><Search size={15} /><input placeholder="Search nodes..." /></label>
        <div className="node-list">
          {["Core", "AI", "Agents", "Data"].map((category) => (
            <div className="node-category" key={category}>
              <span>{category}</span>
              {nodeTypes.filter((item) => item.category === category).map((item) => (
                <button key={item.type} onClick={() => addNode(item.type)} className="palette-item">
                  <span className="palette-icon" style={{ "--item-color": item.color }}><item.icon size={16} /></span>
                  <span>{item.label}</span>
                  <Plus size={14} />
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="runtime-card">
          <span>Runtime</span>
          <strong className={hasCycle ? "danger" : ""}>{hasCycle ? "Cycle blocked" : status}</strong>
          <p>{graphNodes.length} nodes / {links.length} links / {Math.round(viewport.scale * 100)}%</p>
        </div>
      </section>

      <main
        ref={canvasRef}
        className={`canvas mode-${canvasMode}`}
        onPointerDown={beginPan}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
        onWheel={onWheel}
      >
        <div className="canvas-mode-selector">
          <button 
            title="Select Tool (V)" 
            onClick={() => setCanvasMode("select")} 
            className={canvasMode === "select" ? "active" : ""}
          >
            <MousePointer2 size={16} />
          </button>
          <button 
            title="Hand / Pan Tool (H)" 
            onClick={() => setCanvasMode("hand")} 
            className={canvasMode === "hand" ? "active" : ""}
          >
            <Hand size={16} />
          </button>
        </div>

        {executionActive && (
          <div className="execution-progress-bar">
            <div 
              className="execution-progress-fill" 
              style={{ width: `${(executionProgress.current / (executionProgress.total || 1)) * 100}%` }}
            />
          </div>
        )}
        <div className="canvas-toolbar">
          <button title="Zoom in" onClick={() => setZoom(viewport.scale + 0.12)}><ZoomIn size={16} /></button>
          <button title="Zoom out" onClick={() => setZoom(viewport.scale - 0.12)}><ZoomOut size={16} /></button>
          <span className="zoom-readout">{Math.round(viewport.scale * 100)}%</span>
          <button title="Fit all nodes to screen" onClick={() => fitContent()}>Fit Content</button>
          <button title="Auto-align nodes neatly (left-to-right)" onClick={autoLayoutNodes} style={{ background: "color-mix(in srgb, var(--blue) 8%, white)", color: "var(--blue)", borderColor: "color-mix(in srgb, var(--blue) 20%, white)", border: "1px solid", borderRadius: "6px", display: "inline-flex", alignItems: "center", gap: "4px", padding: "0 10px" }}>
            <Waypoints size={14} /> Tidy Up
          </button>
          <button onClick={saveGraph}><Save size={16} /></button>
          <button onClick={downloadSdk}><Download size={16} /></button>
          <button title="Delete selected connection" disabled={!selectedLinkId} onClick={deleteSelectedLink}><Link2Off size={16} /></button>
        </div>
        <div
          className="world"
          style={{ transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale(${viewport.scale})` }}
        >
          <svg className="connections" width="2200" height="1400">
            <defs>
              <filter id="soften"><feGaussianBlur stdDeviation="0.2" /></filter>
            </defs>
            {links.map((link) => {
              const source = nodeMap.get(link.sourceNode);
              const target = nodeMap.get(link.targetNode);
              if (!source || !target) return null;
              const d = bezierPath(portPosition(source, link.sourcePort, "output"), portPosition(target, link.targetPort, "input"));
              
              // Custom path execution tracking
              const sourceState = nodeStates[link.sourceNode];
              const targetState = nodeStates[link.targetNode];
              const isSourceCompleted = sourceState === "completed";
              const isRunning = sourceState === "running" || targetState === "running";
              
              // Router branch pruning display
              let isPathUntaken = false;
              if (source.type === "router" && isSourceCompleted) {
                const routerVal = nodeOutputs[link.sourceNode]?.routerResult;
                const isTruePort = link.sourcePort === "true";
                if ((routerVal && !isTruePort) || (!routerVal && isTruePort)) {
                  isPathUntaken = true;
                }
              }

              let linkClass = "link";
              if (link.invalid) linkClass += " invalid";
              if (selectedLinkId === link.id) linkClass += " selected-link";
              if (isRunning) linkClass += " running";
              if (isSourceCompleted && !isPathUntaken) linkClass += " completed";
              if (isPathUntaken) linkClass += " untaken";

              return (
                <g
                  key={link.id}
                  className={linkClass}
                  onPointerDown={(event) => {
                    if (canvasMode !== "hand") {
                      event.stopPropagation();
                      setSelectedLinkId(link.id);
                      setSelectedId(null);
                    }
                  }}
                >
                  <path className="link-hit" d={d} />
                  <path d={d} />
                  <path className={(isSourceCompleted && !isPathUntaken) || isRunning ? "particle-path active" : "particle-path"} d={d} />
                  {selectedLinkId === link.id && (
                    <foreignObject x={(portPosition(source, link.sourcePort, "output").x + portPosition(target, link.targetPort, "input").x) / 2 - 15} y={(portPosition(source, link.sourcePort, "output").y + portPosition(target, link.targetPort, "input").y) / 2 - 15} width="30" height="30">
                      <button className="connection-delete" onClick={(event) => { event.stopPropagation(); deleteSelectedLink(); }}>
                        <Trash2 size={13} />
                      </button>
                    </foreignObject>
                  )}
                </g>
              );
            })}
            {linkDraft && pointerWorld && (() => {
              const source = nodeMap.get(linkDraft.sourceNode);
              if (!source) return null;
              const start = portPosition(source, linkDraft.sourcePort, "output");
              const end = hoverPort ? portPosition(nodeMap.get(hoverPort.nodeId), hoverPort.portId, "input") : pointerWorld;
              return <path className="draft-link" d={bezierPath(start, end)} />;
            })()}
          </svg>
          {graphNodes.length === 0 && (
            <div className="empty-canvas">
              <div className="empty-canvas-header">
                <h2>Design Your PromptFlow Agent</h2>
                <p>Use our next-gen AI builder or assemble your workflow visually using node templates.</p>
              </div>
              <div className="empty-canvas-body">
                <div className="empty-canvas-col empty-canvas-ai">
                  <h3><Sparkles size={14} /> Generate with AI</h3>
                  <div className="ai-prompt-area">
                    <textarea 
                      className="ai-prompt-textarea"
                      placeholder="Describe what your AI agent should do (e.g. 'Build a news summarizer pipeline that reads from Google news, runs it through LLM, and writes to MongoDB datastore')..."
                      value={emptyCanvasPrompt}
                      onChange={(e) => setEmptyCanvasPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleEmptyCanvasSubmit(emptyCanvasPrompt);
                        }
                      }}
                    />
                    <button 
                      className="ai-generate-btn"
                      onClick={() => handleEmptyCanvasSubmit(emptyCanvasPrompt)}
                      disabled={!emptyCanvasPrompt.trim()}
                      style={{ opacity: emptyCanvasPrompt.trim() ? 1 : 0.6, cursor: emptyCanvasPrompt.trim() ? "pointer" : "not-allowed" }}
                    >
                      <Sparkles size={14} /> Generate Workflow
                    </button>
                  </div>
                  <div className="empty-canvas-suggestions">
                    <span>💡 Try These Prompts</span>
                    <div className="suggestion-pills">
                      <button className="suggestion-pill" onClick={() => handleEmptyCanvasSubmit("Build a RAG pipeline that loads a PDF document loader, indexes it, and retrieves documents on query.")}>🔍 RAG Search Agent</button>
                      <button className="suggestion-pill" onClick={() => handleEmptyCanvasSubmit("Create a news collector that gets 10 top articles, drafts meeting notes summarizing them, and stores the summary in a MongoDB collection.")}>📰 News Summarizer</button>
                    </div>
                  </div>
                </div>
                
                <div className="empty-canvas-divider">
                  <span>OR</span>
                </div>
                
                <div className="empty-canvas-col empty-canvas-visual">
                  <h3>Build Visually</h3>
                  <button className="visual-plus-btn" onClick={addStarterNode} title="Add starting input node"><Plus size={24} /></button>
                  <p>Add a blank start node, or load one of our optimized starter patterns below.</p>
                  <div className="visual-templates-box">
                    <button onClick={() => applyTemplate(workflowTemplates[1])}>💼 Use sub-agent template</button>
                    <button onClick={() => setActiveView("templates")}>📂 Browse all templates</button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {graphNodes.map((node) => (
            <FlowNode
              key={node.id}
              node={node}
              selected={node.id === selectedId}
              hoverPort={hoverPort}
              onPointerDown={(event) => beginNodeDrag(event, node)}
              onSelect={() => {
                if (canvasMode !== "hand") {
                  setSelectedId(node.id);
                  setSelectedLinkId(null);
                }
              }}
              onBeginLink={(portId) => {
                if (canvasMode !== "hand") {
                  setLinkDraft({ sourceNode: node.id, sourcePort: portId });
                }
              }}
              onDelete={deleteNode}
              nodeState={nodeStates[node.id]}
              nodeOutput={nodeOutputs[node.id]}
            />
          ))}
        </div>
      </main>

      {chatOpen && (
        <aside className="chat-panel" style={{ gridRow: 2, background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", padding: "18px", overflow: "hidden" }}>
          <div className="panel-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot size={18} style={{ color: "var(--blue)" }} />
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Agent Sandbox</h2>
            </div>
            <button onClick={() => setChatOpen(false)} style={{ color: "var(--muted)", padding: "4px" }} title="Close Chat">
              <X size={16} />
            </button>
          </div>

          {/* Premium Segmented Control Tabs */}
          <div className="chat-segmented-control">
            <button 
              onClick={() => setChatMode("tester")}
              className={`chat-segmented-tab ${chatMode === "tester" ? "active" : ""}`}
            >
              Agent Tester
            </button>
            <button 
              onClick={() => setChatMode("copilot")}
              className={`chat-segmented-tab ${chatMode === "copilot" ? "active" : ""}`}
            >
              AI Copilot
            </button>
          </div>

          <div className="chat-messages" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px", marginBottom: "14px", paddingRight: "4px" }}>
            {chatMessages.length <= 1 && chatMode === "copilot" && (
              <div className="empty-chat-welcome">
                <Sparkles size={24} />
                <h4>Welcome to AI Copilot</h4>
                <p>Type a request below to build your canvas pipeline or select a quick starter pattern:</p>
                <div className="empty-chat-pills">
                  <button className="empty-chat-pill" onClick={() => sendCopilotInput("Build a pipeline that takes user input, passes it to a prompt instructions node, then an LLM model, and output.")}>🚀 Simple LLM Chain</button>
                  <button className="empty-chat-pill" onClick={() => sendCopilotInput("Create a MongoDB Atlas search pipeline connected with OpenAI model.")}>🔍 RAG Search Flow</button>
                  <button className="empty-chat-pill" onClick={() => sendCopilotInput("Build a news article retriever storing summarized data in a MongoDB collection.")}>📰 News Summarizer</button>
                </div>
              </div>
            )}

            {chatMessages.map((msg) => {
              const isUser = msg.role === "user";
              const workflow = parseJsonWorkflow(msg.text);

              return (
                <div key={msg.id} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "88%", display: "flex", flexDirection: "column", gap: "4px" }}>
                  {isUser ? (
                    <span className="chat-avatar-badge user" style={{ alignSelf: "flex-end" }}>
                      <User size={10} /> You
                    </span>
                  ) : chatMode === "tester" ? (
                    <span className="chat-avatar-badge tester">
                      <Activity size={10} /> Runtime
                    </span>
                  ) : (
                    <span className="chat-avatar-badge copilot">
                      <Sparkles size={10} /> Copilot
                    </span>
                  )}
                  <div 
                    className={isUser ? "chat-bubble-user" : "chat-bubble-assistant"}
                  >
                    <FormattedMessage text={stripJsonBlocks(msg.text)} />

                    {workflow && (
                      <button 
                        className="primary"
                        style={{ marginTop: "10px", width: "100%", height: "32px", fontSize: "11px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "var(--blue)", color: "white", borderRadius: "6px", cursor: "pointer" }}
                        onClick={() => {
                          loadWorkflowIntoCanvas(workflow, "Workflow imported from Copilot!");
                        }}
                      >
                        <GitBranch size={13} /> Load Workflow into Canvas
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {chatLoading && (
              <div style={{ alignSelf: "flex-start", color: "var(--muted)", fontSize: "11px", fontStyle: "italic", display: "flex", alignItems: "center", gap: "6px", padding: "10px" }}>
                <span className="spinner-mini" style={{ display: "inline-block" }} />
                {chatMode === "tester" ? "Executing workflow pipeline..." : "Thinking..."}
              </div>
            )}
          </div>

          {/* Quick context action suggestions in active Copilot chat */}
          {chatMode === "copilot" && chatMessages.length > 1 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "8px" }}>
              <button 
                onClick={() => setChatInput("Add a Data Store node to store results")}
                style={{ fontSize: "11px", padding: "4px 8px", background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", color: "var(--muted)" }}
              >
                💾 Add Data Store
              </button>
              <button 
                onClick={() => setChatInput("Add a Code Transform node to format the output")}
                style={{ fontSize: "11px", padding: "4px 8px", background: "#f8fafc", border: "1px solid var(--border)", borderRadius: "6px", cursor: "pointer", color: "var(--muted)" }}
              >
                ⚙️ Add Code Transform
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: "8px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatMode === "tester") sendChatInput(chatInput);
                  else sendCopilotInput(chatInput);
                }
              }}
              placeholder={chatMode === "tester" ? "Send a test input to the workflow..." : "Ask Copilot to build a workflow..."}
              style={{ flex: 1, minHeight: "44px", maxHeight: "100px", padding: "8px 12px", fontSize: "13px", border: "1px solid var(--border)", borderRadius: "8px", outline: "none", resize: "none", fontFamily: "Inter, sans-serif" }}
            />
            <button 
              className="primary" 
              style={{ width: "44px", height: "44px", padding: "0", display: "grid", placeItems: "center", borderRadius: "8px", cursor: "pointer" }}
              onClick={() => {
                if (chatMode === "tester") sendChatInput(chatInput);
                else sendCopilotInput(chatInput);
              }}
            >
              <Sparkles size={16} />
            </button>
          </div>
        </aside>
      )}

      <aside className="inspector">
        <div className="panel-heading">
          <span>Inspector</span>
          <h2>{selectedLink ? "Connection" : selectedNode?.label || "Workspace"}</h2>
        </div>

        {lastExecutionIssue && (
          <div style={{ marginBottom: "16px", padding: "12px", border: "1px solid #fecaca", borderRadius: "12px", background: "#fff7f7" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "start", marginBottom: "10px" }}>
              <div>
                <strong style={{ display: "block", fontSize: "13px" }}>{fixGuide ? fixGuide.title : "Execution Error"}</strong>
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{lastExecutionIssue.label || "Workflow"}</span>
              </div>
              {fixGuide && (
                <button
                  className="primary"
                  onClick={() => {
                    setActiveView("settings");
                    setSettingsFocus({ category: fixGuide.focus || "providers", ts: Date.now() });
                  }}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Quick Fix
                </button>
              )}
            </div>
            <p style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: "1.5", color: "var(--text)" }}>{lastExecutionIssue.message || "Run failed."}</p>
            {fixGuide && (
              <>
                <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: "12px", lineHeight: "1.6", color: "var(--text)" }}>
                  {fixGuide.steps.map((step) => <li key={step}>{step}</li>)}
                </ol>
                {fixGuide.command && (
                  <div style={{ marginTop: "10px", padding: "10px 12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--border)", fontSize: "12px", lineHeight: "1.5", color: "var(--text)" }}>
                    <strong style={{ display: "block", marginBottom: "4px" }}>Command</strong>
                    {fixGuide.command}
                  </div>
                )}
                <div style={{ marginTop: "10px", fontSize: "11px", color: "var(--muted)" }}>{fixGuide.action}</div>
              </>
            )}
          </div>
        )}

        <section className="workflow-health-panel">
          <div className="panel-heading" style={{ marginBottom: "10px" }}>
            <span>Diagnostics</span>
            <h2>Workflow Health</h2>
          </div>
          <div className="workflow-health-score">
            <strong>{workflowHealth.score}</strong>
            <span>out of 100</span>
          </div>
          <p style={{ margin: "10px 0 12px", color: "var(--muted)", fontSize: "12px", lineHeight: "1.5" }}>
            {workflowHealth.issues.length === 0
              ? "No obvious blockers found. You are ready to run."
              : `${workflowHealth.errors} error(s), ${workflowHealth.warnings} warning(s), ${workflowHealth.info} note(s) found.`}
          </p>
          <div className="workflow-health-list">
            {workflowHealth.issues.slice(0, uiPreferences.simplifyEverything ? 3 : 5).map((issue, index) => (
              <button
                key={`${issue.title}-${index}`}
                className={`workflow-health-item ${issue.severity}`}
                onClick={() => {
                  if (issue.focus === "settings") {
                    const targetCategory = /database|vector|connection/i.test(`${issue.title} ${issue.message}`) ? "databases" : "providers";
                    setActiveView("settings");
                    setSettingsFocus({ category: targetCategory, ts: Date.now() });
                    return;
                  }
                  if (issue.nodeId) {
                    setSelectedId(issue.nodeId);
                    setSelectedLinkId(null);
                  }
                }}
              >
                <span className={`workflow-health-pill ${issue.severity}`}>{issue.severity}</span>
                <div>
                  <strong>{issue.title}</strong>
                  <p>{issue.message}</p>
                </div>
                <em>{issue.action}</em>
              </button>
            ))}
            {workflowHealth.issues.length === 0 && (
              <div className="workflow-health-clean">
                <Check size={16} />
                <span>Flow structure looks healthy.</span>
              </div>
            )}
          </div>
        </section>

        <section className="replay-panel">
          <div className="panel-heading" style={{ marginBottom: "10px" }}>
            <span>Replay</span>
            <h2>Last Run</h2>
          </div>
          {lastExecutionReplay ? (
            <>
              <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "12px", lineHeight: "1.5" }}>
                {lastExecutionReplay.summary}
              </p>
              <div className="replay-list">
                {lastExecutionReplay.events.slice(-10).map((event, index) => (
                  <div className={`replay-item ${event.event?.replace(/[:]/g, "-") || "event"}`} key={`${event.event}-${event.node || index}-${index}`}>
                    <strong>{event.event}</strong>
                    <span>{event.label || event.node || "workflow"}</span>
                    <p>{event.message || event.chunk || event.output || event.condition?.toString?.() || ""}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "12px", lineHeight: "1.5" }}>
              Run a workflow once to capture a step-by-step replay here.
            </p>
          )}
        </section>

        <section className="test-harness-panel">
          <div className="panel-heading" style={{ marginBottom: "10px" }}>
            <span>Testing</span>
            <h2>Sample Cases</h2>
          </div>
          <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: "12px", lineHeight: "1.5" }}>
            Batch-check the current flow against a few sample inputs.
          </p>
          <div className="test-case-list">
            {testCases.map((testCase, index) => (
              <div className="test-case" key={testCase.id || index}>
                <div className="test-case-row">
                  <input
                    value={testCase.name}
                    onChange={(event) => {
                      const next = [...testCases];
                      next[index] = { ...next[index], name: event.target.value };
                      setTestCases(next);
                    }}
                    placeholder="Test name"
                  />
                  <button
                    className="danger-button"
                    onClick={() => setTestCases((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    title="Remove test case"
                    style={{ height: "32px" }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <textarea
                  value={testCase.input}
                  onChange={(event) => {
                    const next = [...testCases];
                    next[index] = { ...next[index], input: event.target.value };
                    setTestCases(next);
                  }}
                  placeholder="Sample input"
                />
                <input
                  value={testCase.expected}
                  onChange={(event) => {
                    const next = [...testCases];
                    next[index] = { ...next[index], expected: event.target.value };
                    setTestCases(next);
                  }}
                  placeholder="Optional expected substring"
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button
              className="ghost"
              onClick={() => setTestCases((current) => [...current, { id: `test-${Date.now()}`, name: `Case ${current.length + 1}`, input: "", expected: "" }])}
              style={{ flex: 1 }}
            >
              <Plus size={14} /> Add case
            </button>
            <button className="primary" onClick={runTestHarness} disabled={testRunning} style={{ flex: 1 }}>
              {testRunning ? "Running..." : "Run tests"}
            </button>
          </div>
          {testResults.length > 0 && (
            <div className="test-result-list">
              {testResults.map((result) => (
                <div className={`test-result ${result.passed ? "pass" : "fail"}`} key={result.id}>
                  <strong>{result.name}</strong>
                  <span>{result.passed ? "Pass" : "Fail"}</span>
                  <p>{result.summary}</p>
                  <pre>{result.output ? result.output.slice(0, 140) : result.error || "(no output)"}</pre>
                </div>
              ))}
            </div>
          )}
        </section>
        
        {selectedLink && (
          <div className="connection-inspector">
            <div>
              <span>{selectedLink.sourceNode}.{selectedLink.sourcePort}</span>
              <strong>to</strong>
              <span>{selectedLink.targetNode}.{selectedLink.targetPort}</span>
            </div>
            <button className="danger-button" onClick={deleteSelectedLink}><Trash2 size={15} /> Delete connection</button>
          </div>
        )}

        {selectedNode && (
          <div className="form-stack">
            <label>Label<input value={selectedNode.label} onChange={(event) => setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, label: event.target.value } : node))} /></label>
            
            {selectedNode.type === "prompt" && (
              <>
                <label>Template<textarea value={selectedNode.data.template || ""} placeholder="Enter your prompt here. Blank is okay." onChange={(event) => updateSelectedData("template", event.target.value)} /></label>
                {!selectedNode.data.template?.trim() && (
                  <div style={{ marginTop: "8px", padding: "10px 12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid var(--border)", fontSize: "12px", lineHeight: "1.5", color: "var(--muted)" }}>
                    Prompt empty now. That is okay. LLM will use input text and you can type anything here later.
                  </div>
                )}
                <div className="chips">{scanTemplateVariables(selectedNode.data.template).map((item) => <span key={item}>{`{{${item}}}`}</span>)}</div>
              </>
            )}
            
            {selectedNode.type === "llm" && (
              <>
                <label>Provider
                  {runtime.providers?.length === 0 ? (
                    <div style={{ marginTop: "4px", padding: "10px", background: "#fff1f2", border: "1px solid #ffe4e6", borderRadius: "8px", color: "var(--red)", fontSize: "12px", lineHeight: "1.4" }}>
                      ⚠️ No AI providers configured!
                      <button 
                        onClick={() => setActiveView("settings")} 
                        style={{ display: "block", marginTop: "8px", background: "var(--red)", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", width: "100%", textAlign: "center" }}
                      >
                        Configure Providers in Settings
                      </button>
                    </div>
                  ) : (
                    <select value={selectedNode.data.provider || ""} onChange={(event) => updateSelectedData("provider", event.target.value)}>
                      <option value="">Select a Provider</option>
                      {runtime.providers?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </label>
                {runtime.providers?.length > 0 && (
                  <>
                    <label>Model
                      {nodeLoadingModels ? (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}><span className="spinner-mini" style={{ display: "inline-block", marginRight: "4px" }} /> Loading models...</div>
                      ) : (
                        <select 
                          value={selectedNode.data.model || ""} 
                          onChange={(event) => updateSelectedData("model", event.target.value)}
                        >
                          <option value="">Select a Model</option>
                          {nodeModelCatalog.models?.map(m => (
                            <option key={m} value={m}>
                              {m} {m === nodeModelCatalog.recommendation ? "⭐ (Recommended)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    {nodeModelCatalog.recommendation && !nodeLoadingModels && (
                      <div style={{ fontSize: "11px", color: "var(--blue)", fontWeight: "600", marginTop: "2px" }}>
                        💡 Recommendation: Use '{nodeModelCatalog.recommendation}'
                      </div>
                    )}
                    <label style={{ marginTop: "12px" }}>Temperature ({selectedNode.data.temperature !== undefined ? selectedNode.data.temperature : 0.2})
                      <input 
                        type="range" 
                        min="0.0" 
                        max="1.0" 
                        step="0.1" 
                        value={selectedNode.data.temperature !== undefined ? selectedNode.data.temperature : 0.2} 
                        onChange={(event) => updateSelectedData("temperature", parseFloat(event.target.value))} 
                        style={{ width: "100%", accentColor: "var(--blue)", height: "6px", background: "var(--border)", outline: "none", cursor: "pointer" }}
                      />
                    </label>
                  </>
                )}
              </>
            )}
            
            {selectedNode.type === "vector" && (
              <>
                <label>Vector DB
                  {runtime.databases?.length === 0 ? (
                    <div style={{ marginTop: "4px", padding: "10px", background: "#fff1f2", border: "1px solid #ffe4e6", borderRadius: "8px", color: "var(--red)", fontSize: "12px", lineHeight: "1.4" }}>
                      ⚠️ No databases configured!
                      <button 
                        onClick={() => setActiveView("settings")} 
                        style={{ display: "block", marginTop: "8px", background: "var(--red)", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", width: "100%", textAlign: "center" }}
                      >
                        Configure Databases in Settings
                      </button>
                    </div>
                  ) : (
                    <select value={selectedNode.data.vectorDatabase || ""} onChange={(event) => updateSelectedData("vectorDatabase", event.target.value)}>
                      <option value="">Select a Database Connection</option>
                      {runtime.databases?.map((db) => (
                        <option key={db.id} value={db.id}>{db.name} ({db.kind})</option>
                      ))}
                    </select>
                  )}
                </label>
                
                <label>Embedding Provider
                  {runtime.providers?.length === 0 ? (
                    <div style={{ marginTop: "4px", padding: "10px", background: "#fff1f2", border: "1px solid #ffe4e6", borderRadius: "8px", color: "var(--red)", fontSize: "12px", lineHeight: "1.4" }}>
                      ⚠️ No AI providers configured!
                      <button 
                        onClick={() => setActiveView("settings")} 
                        style={{ display: "block", marginTop: "8px", background: "var(--red)", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", width: "100%", textAlign: "center" }}
                      >
                        Configure Providers in Settings
                      </button>
                    </div>
                  ) : (
                    <select value={selectedNode.data.provider || ""} onChange={(event) => updateSelectedData("provider", event.target.value)}>
                      <option value="">Select an Embedding Provider</option>
                      <option value="mongodb">MongoDB Embeddings</option>
                      {runtime.providers?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </label>

                {(selectedNode.data.provider === "mongodb" || runtime.providers?.length > 0) && (
                  <>
                    <label>Embedding Model
                      {nodeLoadingModels ? (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}><span className="spinner-mini" style={{ display: "inline-block", marginRight: "4px" }} /> Loading embedding models...</div>
                      ) : (
                        <select 
                          value={selectedNode.data.model || ""} 
                          onChange={(event) => updateSelectedData("model", event.target.value)}
                        >
                          <option value="">Select an Embedding Model</option>
                          {nodeModelCatalog.models?.map(m => (
                            <option key={m} value={m}>
                              {m} {m === nodeModelCatalog.recommendation ? "⭐ (Recommended)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    {nodeModelCatalog.recommendation && !nodeLoadingModels && (
                      <div style={{ fontSize: "11px", color: "var(--blue)", fontWeight: "600", marginTop: "2px" }}>
                        💡 Recommendation: Use '{nodeModelCatalog.recommendation}'
                      </div>
                    )}
                  </>
                )}

                <label>Collection<input value={selectedNode.data.collection || ""} onChange={(event) => updateSelectedData("collection", event.target.value)} /></label>
                <label>Atlas Index<input value={selectedNode.data.index || ""} onChange={(event) => updateSelectedData("index", event.target.value)} /></label>
                <label>Result Limit<input type="number" min="1" max="50" value={selectedNode.data.limit !== undefined ? selectedNode.data.limit : 4} onChange={(event) => updateSelectedData("limit", parseInt(event.target.value) || 4)} /></label>
                <label>Search Field Path<input value={selectedNode.data.path !== undefined ? selectedNode.data.path : "embedding"} placeholder="e.g. embedding, vector" onChange={(event) => updateSelectedData("path", event.target.value)} /></label>
                
                {nodeDbInfo.suggested_setup && (
                  <div style={{ marginTop: "8px", padding: "10px", background: "#eff6ff", borderRadius: "6px", border: "1px solid #dbeafe", color: "var(--blue)", fontSize: "11px", lineHeight: "1.4" }}>
                    <strong>💡 Database Advice:</strong>
                    <p style={{ margin: "2px 0 0" }}>{nodeDbInfo.suggested_setup}</p>
                  </div>
                )}
              </>
            )}

            {selectedNode.type === "datastore" && (
              <>
                <label>Database Connection
                  {runtime.databases?.length === 0 ? (
                    <div style={{ marginTop: "4px", padding: "10px", background: "#fff1f2", border: "1px solid #ffe4e6", borderRadius: "8px", color: "var(--red)", fontSize: "12px", lineHeight: "1.4" }}>
                      ⚠️ No databases configured!
                      <button 
                        onClick={() => setActiveView("settings")} 
                        style={{ display: "block", marginTop: "8px", background: "var(--red)", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", width: "100%", textAlign: "center" }}
                      >
                        Configure Databases in Settings
                      </button>
                    </div>
                  ) : (
                    <select value={selectedNode.data.vectorDatabase || selectedNode.data.database || ""} onChange={(event) => updateSelectedData("vectorDatabase", event.target.value)}>
                      <option value="">Select a Database Connection</option>
                      {runtime.databases?.map((db) => (
                        <option key={db.id} value={db.id}>{db.name} ({db.kind})</option>
                      ))}
                    </select>
                  )}
                </label>
                
                <label>Operation
                  <select value={selectedNode.data.operation || "save"} onChange={(event) => updateSelectedData("operation", event.target.value)}>
                    <option value="save">Save Data (Insert/Write)</option>
                    <option value="load">Load Data (Read/Query Latest)</option>
                  </select>
                </label>
                
                <label>Collection / Table<input value={selectedNode.data.collection || "data_store"} onChange={(event) => updateSelectedData("collection", event.target.value)} /></label>
                <label>Payload Key / Field Key<input value={selectedNode.data.key || "text"} onChange={(event) => updateSelectedData("key", event.target.value)} /></label>
              </>
            )}

            {selectedNode.type === "document_loader" && (
              <>
                <label>Source Type
                  <select value={selectedNode.data.source_type || "url"} onChange={(event) => updateSelectedData("source_type", event.target.value)}>
                    <option value="url">Fetch from URL (HTTP GET)</option>
                    <option value="text">Static Document Text</option>
                  </select>
                </label>
                
                {selectedNode.data.source_type === "text" ? (
                  <label>Static Document Content
                    <textarea 
                      style={{ fontSize: "12px", minHeight: "120px" }}
                      value={selectedNode.data.text || ""} 
                      onChange={(event) => updateSelectedData("text", event.target.value)} 
                      placeholder="Enter raw text to load..."
                    />
                  </label>
                ) : (
                  <label>Document URL
                    <input 
                      value={selectedNode.data.url || ""} 
                      onChange={(event) => updateSelectedData("url", event.target.value)} 
                      placeholder="e.g. https://example.com/data.txt"
                    />
                  </label>
                )}
              </>
            )}
            
            {selectedNode.type === "subagent" && (
              <>
                <label>Role<input value={selectedNode.data.role || ""} onChange={(event) => updateSelectedData("role", event.target.value)} placeholder="e.g. Specialist, Researcher" /></label>
                <label>Handoff / Instructions<textarea value={selectedNode.data.handoff || ""} onChange={(event) => updateSelectedData("handoff", event.target.value)} placeholder="Instructions for this agent" /></label>
                <label>Provider
                  {runtime.providers?.length === 0 ? (
                    <div style={{ marginTop: "4px", padding: "10px", background: "#fff1f2", border: "1px solid #ffe4e6", borderRadius: "8px", color: "var(--red)", fontSize: "12px", lineHeight: "1.4" }}>
                      ⚠️ No AI providers configured!
                      <button 
                        onClick={() => setActiveView("settings")} 
                        style={{ display: "block", marginTop: "8px", background: "var(--red)", color: "white", padding: "6px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "600", width: "100%", textAlign: "center" }}
                      >
                        Configure Providers in Settings
                      </button>
                    </div>
                  ) : (
                    <select value={selectedNode.data.provider || ""} onChange={(event) => updateSelectedData("provider", event.target.value)}>
                      <option value="">Select a Provider</option>
                      {runtime.providers?.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </label>
                {runtime.providers?.length > 0 && (
                  <>
                    <label>Model
                      {nodeLoadingModels ? (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}><span className="spinner-mini" style={{ display: "inline-block", marginRight: "4px" }} /> Loading models...</div>
                      ) : (
                        <select 
                          value={selectedNode.data.model || ""} 
                          onChange={(event) => updateSelectedData("model", event.target.value)}
                        >
                          <option value="">Select a Model</option>
                          {nodeModelCatalog.models?.map(m => (
                            <option key={m} value={m}>
                              {m} {m === nodeModelCatalog.recommendation ? "⭐ (Recommended)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    {nodeModelCatalog.recommendation && !nodeLoadingModels && (
                      <div style={{ fontSize: "11px", color: "var(--blue)", fontWeight: "600", marginTop: "2px" }}>
                        💡 Recommendation: Use '{nodeModelCatalog.recommendation}'
                      </div>
                    )}
                    <label style={{ marginTop: "12px" }}>Temperature ({selectedNode.data.temperature !== undefined ? selectedNode.data.temperature : 0.2})
                      <input 
                        type="range" 
                        min="0.0" 
                        max="1.0" 
                        step="0.1" 
                        value={selectedNode.data.temperature !== undefined ? selectedNode.data.temperature : 0.2} 
                        onChange={(event) => updateSelectedData("temperature", parseFloat(event.target.value))} 
                        style={{ width: "100%", accentColor: "var(--blue)", height: "6px", background: "var(--border)", outline: "none", cursor: "pointer" }}
                      />
                    </label>
                  </>
                )}
              </>
            )}

            {selectedNode.type === "router" && (
              <>
                <label>Condition (Python expression)
                  <textarea 
                    value={selectedNode.data.condition || ""} 
                    onChange={(event) => updateSelectedData("condition", event.target.value)} 
                    placeholder="e.g. 'help' in input.lower() or len(input) > 50"
                  />
                </label>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  Available context variables: <code>input</code>. Evaluates to True or False.
                </div>
              </>
            )}

            {selectedNode.type === "code" && (
              <>
                <label>Python Transform Code
                  <textarea 
                    style={{ fontFamily: "Geist Mono", fontSize: "12px", minHeight: "150px" }}
                    value={selectedNode.data.code || ""} 
                    onChange={(event) => updateSelectedData("code", event.target.value)} 
                    placeholder="output = input.upper()"
                  />
                </label>
                <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                  Assign the result to the <code>output</code> variable.
                </div>
              </>
            )}

            {selectedNode.type === "input" && (
              <>
                <label>Input Variable Key
                  <input 
                    value={selectedNode.data.key || ""} 
                    onChange={(event) => updateSelectedData("key", event.target.value)} 
                    placeholder="e.g. brief, task, query"
                  />
                </label>
                <label>Default Test Value
                  <textarea 
                    value={selectedNode.data.value || ""} 
                    onChange={(event) => updateSelectedData("value", event.target.value)} 
                    placeholder="Enter default pipeline input value..."
                  />
                </label>
              </>
            )}

            {selectedNode.type === "custom" && (
              <>
                <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "8px" }}>Dynamic Inputs</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                    {selectedNode.inputs.map((inp, idx) => (
                      <div key={inp.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input 
                          value={inp.label} 
                          onChange={(e) => {
                            const newInps = [...selectedNode.inputs];
                            const cleanVal = e.target.value;
                            newInps[idx] = { id: cleanVal.toLowerCase().replace(/[^a-z0-9]/g, "_"), label: cleanVal };
                            setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, inputs: newInps } : node));
                          }} 
                          style={{ padding: "6px 8px", fontSize: "12px" }}
                        />
                        <button 
                          onClick={() => {
                            const newInps = selectedNode.inputs.filter((_, i) => i !== idx);
                            setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, inputs: newInps } : node));
                          }}
                          style={{ color: "var(--red)", padding: "4px" }}
                          title="Remove input port"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="ghost" 
                    style={{ height: "28px", padding: "0 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      const portId = `input_${selectedNode.inputs.length + 1}`;
                      const newInps = [...selectedNode.inputs, { id: portId, label: portId }];
                      setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, inputs: newInps } : node));
                    }}
                  >
                    <Plus size={12} /> Add Input Port
                  </button>
                </div>

                <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "12px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "8px" }}>Dynamic Outputs</span>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "8px" }}>
                    {selectedNode.outputs.map((out, idx) => (
                      <div key={out.id} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input 
                          value={out.label} 
                          onChange={(e) => {
                            const newOuts = [...selectedNode.outputs];
                            const cleanVal = e.target.value;
                            newOuts[idx] = { id: cleanVal.toLowerCase().replace(/[^a-z0-9]/g, "_"), label: cleanVal };
                            setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, outputs: newOuts } : node));
                          }} 
                          style={{ padding: "6px 8px", fontSize: "12px" }}
                        />
                        <button 
                          onClick={() => {
                            const newOuts = selectedNode.outputs.filter((_, i) => i !== idx);
                            setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, outputs: newOuts } : node));
                          }}
                          style={{ color: "var(--red)", padding: "4px" }}
                          title="Remove output port"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button 
                    className="ghost" 
                    style={{ height: "28px", padding: "0 10px", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "4px" }}
                    onClick={() => {
                      const portId = `output_${selectedNode.outputs.length + 1}`;
                      const newOuts = [...selectedNode.outputs, { id: portId, label: portId }];
                      setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, outputs: newOuts } : node));
                    }}
                  >
                    <Plus size={12} /> Add Output Port
                  </button>
                </div>

                <label>Python execution code
                  <textarea 
                    style={{ fontFamily: "Geist Mono", fontSize: "12px", minHeight: "180px" }}
                    value={selectedNode.data.code || ""} 
                    onChange={(event) => updateSelectedData("code", event.target.value)} 
                    placeholder="# Access inputs using local variables matching port IDs"
                  />
                </label>
              </>
            )}

            {selectedNode.type === "output" && (
              <div style={{ padding: "12px", background: "rgba(0,0,0,0.02)", borderRadius: "6px", border: "1px dashed var(--border)" }}>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)", lineHeight: "1.6" }}>
                  The <strong>Output node</strong> acts as the final terminal endpoint in the pipeline. It receives values and showcases the final processed response.
                </p>
              </div>
            )}

            {/* Output Drawer for selected completed/error node */}
            {(nodeStates[selectedNode.id] === "completed" || nodeStates[selectedNode.id] === "error") && (
              <div className="output-drawer">
                <div className="output-drawer-header">
                  <h3>Execution Result</h3>
                  <button 
                    className="copy-btn" 
                    onClick={() => {
                      const text = nodeOutputs[selectedNode.id]?.result || nodeOutputs[selectedNode.id]?.error || "";
                      navigator.clipboard.writeText(text);
                      alert("Output copied to clipboard!");
                    }}
                  >
                    <Clipboard size={12} /> Copy
                  </button>
                </div>
                <div className="output-drawer-meta">
                  {nodeStates[selectedNode.id] === "completed" && (
                    <span style={{ color: "#047857", background: "#ecfdf5" }}>✓ Success</span>
                  )}
                  {nodeStates[selectedNode.id] === "error" && (
                    <span style={{ color: "#e11d48", background: "#fff1f2" }}>✗ Failed</span>
                  )}
                  {nodeOutputs[selectedNode.id]?.duration !== undefined && (
                    <span><Clock size={10} style={{ display: "inline", marginRight: "2px" }} /> {nodeOutputs[selectedNode.id].duration}ms</span>
                  )}
                  {selectedNode.type === "router" && nodeOutputs[selectedNode.id]?.routerResult !== undefined && (
                    <span style={{ color: "#b45309", background: "#fef3c7" }}>Branch: {nodeOutputs[selectedNode.id].routerResult ? "True" : "False"}</span>
                  )}
                </div>
                <div className="output-drawer-content" style={{ maxHeight: "300px", overflowY: "auto", background: "var(--surface-soft)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", fontFamily: "inherit" }}>
                  <FormattedMessage 
                    text={nodeStates[selectedNode.id] === "completed" 
                      ? formatExecutionResult(nodeOutputs[selectedNode.id]?.result)
                      : (nodeOutputs[selectedNode.id]?.error || "Unknown Error occurred during node execution.")
                    } 
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!selectedNode && !selectedLink && (
          <div className="form-stack">
            <label>Flow Name
              <input value={graphName} onChange={(event) => setGraphName(event.target.value)} placeholder="Enter flow name" />
            </label>
          </div>
        )}

        {/* Execution Timeline showing pipeline execution step-by-step */}
        <div style={{ marginTop: "24px", borderTop: "1px solid var(--border)", paddingTop: "18px" }}>
          <span className="panel-heading" style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "12px" }}>
            Pipeline Steps
          </span>
          <div className="timeline">
            {sortedGraphNodes.map((node) => {
              const meta = nodeTypes.find((item) => item.type === node.type) || nodeTypes[0];
              const state = nodeStates[node.id];
              const output = nodeOutputs[node.id];
              return (
                <div 
                  key={node.id} 
                  className={`timeline-step ${selectedId === node.id ? "active" : ""}`}
                  onClick={() => setSelectedId(node.id)}
                >
                  <div className="timeline-step-icon" style={{ color: meta.color, background: `color-mix(in srgb, ${meta.color} 12%, white)` }}>
                    <meta.icon size={14} />
                  </div>
                  <div className="timeline-step-info">
                    <strong>{node.label}</strong>
                    <span>{node.type}</span>
                  </div>
                  {state && (
                    <span className={`timeline-step-badge ${state}`}>
                      {state === "running" ? "Running" : state === "completed" ? (output?.duration ? `${(output.duration / 1000).toFixed(1)}s` : "Done") : "Error"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {!uiPreferences.hideAdvancedPanels && compiledCode && (
          <div style={{ marginTop: "20px" }}>
            <span className="panel-heading" style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "8px" }}>SDK Preview</span>
            <pre className="code-preview">{compiledCode.slice(0, 1200)}</pre>
          </div>
        )}

        {!uiPreferences.hideAdvancedPanels && (
          <details className="logs" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            <summary style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", cursor: "pointer", userSelect: "none" }}>Raw Execution Stream</summary>
            <div style={{ marginTop: "8px", maxHeight: "150px", overflow: "auto" }}>
              {executionLog.map((entry, index) => <p key={`${entry}-${index}`} style={{ margin: "4px 0", padding: "6px", background: "var(--surface-soft)", borderRadius: "4px", fontSize: "11px", fontFamily: "Geist Mono" }}>{entry}</p>)}
            </div>
          </details>
        )}
      </aside>
      </>
      ) : (
        <WorkspaceScreen
          view={activeView}
          nodes={graphNodes}
          links={links}
          logs={executionLog}
          runtime={runtime}
          setRuntime={setRuntime}
          uiPreferences={uiPreferences}
          setUiPreferences={setUiPreferences}
          applySimplifyPreset={applySimplifyPreset}
          onSaveRuntime={saveRuntimeNow}
          onResetRuntime={resetRuntime}
          runtimeSaveStatus={runtimeSaveStatus}
          settingsFocus={settingsFocus}
          onOpenIde={() => setActiveView("ide")}
          onCreateNewAgent={createNewAgent}
          onApplyTemplate={applyTemplate}
          savedFlows={savedFlows}
          loadGraphById={loadGraphById}
          deleteGraphById={deleteGraphById}
        />
      )}
    </div>
  );
}

function WorkspaceScreen({ view, nodes, links, logs, runtime, setRuntime, uiPreferences, setUiPreferences, applySimplifyPreset, onSaveRuntime, onResetRuntime, runtimeSaveStatus, settingsFocus, onOpenIde, onCreateNewAgent, onApplyTemplate, savedFlows, loadGraphById, deleteGraphById }) {
  const [selectedItem, setSelectedItem] = useState({ category: "providers", id: "openai" });
  const [modelCatalog, setModelCatalog] = useState({ models: [], recommendation: "" });
  const [loadingModels, setLoadingModels] = useState(false);
  const [dbInfo, setDbInfo] = useState({ suggested_setup: "" });
  const [showExperiencePopup, setShowExperiencePopup] = useState(false);

  useEffect(() => {
    if (!settingsFocus?.category) return;
    const list = runtime[settingsFocus.category] || [];
    if (list.length > 0) {
      setSelectedItem({ category: settingsFocus.category, id: list[0].id });
    } else {
      setSelectedItem({ category: settingsFocus.category, id: settingsFocus.category === "providers" ? "openai" : "mongodb_atlas" });
    }
  }, [settingsFocus?.ts, settingsFocus?.category, runtime.providers, runtime.databases, runtime.caches]);

  const categoryList = runtime[selectedItem.category] || [];
  const activeResource = categoryList.find(item => item.id === selectedItem.id) || categoryList[0] || null;

  useEffect(() => {
    if (selectedItem.category === "providers" && activeResource) {
      setLoadingModels(true);
      fetch(`${API_BASE}/runtime/models`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerType: activeResource.providerType,
          baseUrl: activeResource.baseUrl,
          apiKey: activeResource.apiKey
        })
      })
      .then(res => res.json())
      .then(data => {
        setModelCatalog(data);
        setLoadingModels(false);
      })
      .catch(() => {
        setLoadingModels(false);
      });
    }
  }, [selectedItem.category, activeResource?.id, activeResource?.providerType, activeResource?.baseUrl, activeResource?.apiKey]);

  useEffect(() => {
    if (selectedItem.category === "databases" && activeResource) {
      fetch(`${API_BASE}/runtime/databases/info`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: activeResource.kind })
      })
      .then(res => res.json())
      .then(data => {
        setDbInfo(data);
      })
      .catch(() => {});
    }
  }, [selectedItem.category, activeResource?.id, activeResource?.kind]);

  function handleAddItem(category) {
    const id = `${category}-${Date.now()}`;
    let newItem = { id };
    
    if (category === "providers") {
      newItem = {
        ...newItem,
        name: "New Provider",
        providerType: "openai",
        apiKey: "",
        baseUrl: "https://api.openai.com/v1"
      };
    } else if (category === "databases") {
      newItem = {
        ...newItem,
        name: "New Database",
        kind: "mongodb_atlas",
        connectionString: "",
        database: "promptflow_studio",
        collection: "knowledge_base",
        index: "vector_index",
        apiKey: ""
      };
    } else if (category === "caches") {
      newItem = {
        ...newItem,
        name: "New Cache Store",
        kind: "in_memory",
        maxLimit: 1000,
        ttl: 300,
        connectionString: ""
      };
    }
    
    setRuntime(current => ({
      ...current,
      [category]: [...(current[category] || []), newItem]
    }));
    
    setSelectedItem({ category, id });
  }

  function handleUpdateItem(category, id, key, value) {
    setRuntime(current => ({
      ...current,
      [category]: current[category].map(item => 
        item.id === id ? { ...item, [key]: value } : item
      )
    }));
  }

  function handleDeleteItem(category, id, event) {
    if (event) event.stopPropagation();
    
    setRuntime(current => {
      const updatedList = (current[category] || []).filter(item => item.id !== id);
      return {
        ...current,
        [category]: updatedList
      };
    });
    
    if (selectedItem.category === category && selectedItem.id === id) {
      setSelectedItem({ category: "providers", id: "openai" });
    }
  }

  if (view === "flows") {
    return (
      <main className="screen-main">
        <div className="screen-header">
          <div><span>Agents</span><h1>Agent Workflows</h1></div>
          <button className="primary" onClick={onCreateNewAgent}><Plus size={15} /> Create new agent</button>
        </div>
        
        {savedFlows && savedFlows.length > 0 ? (
          <div>
            <h3 style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px", fontWeight: 700 }}>Saved Workflows</h3>
            <div className="flow-grid">
              {savedFlows.map((flow) => (
                <article className="flow-card" key={flow.id}>
                  <div><Bot size={18} /><strong>{flow.name}</strong></div>
                  <p style={{ fontFamily: "Geist Mono", fontSize: "11px", color: "var(--muted)" }}>ID: {flow.id}</p>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={() => loadGraphById(flow.id)}>Open Flow</button>
                    <button style={{ background: "#fff5f5", color: "var(--red)", borderColor: "#fee2e2" }} onClick={(e) => deleteGraphById(flow.id, e)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textalign: "center", padding: "64px 32px", border: "2px dashed var(--border)", borderRadius: "12px", background: "var(--surface)", minHeight: "280px" }}>
            <Bot size={36} style={{ color: "var(--border)", marginBottom: "12px" }} />
            <h3 style={{ margin: "0 0 6px 0", fontSize: "16px", fontWeight: "650" }}>No Workflows Saved</h3>
            <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "13px", maxWidth: "320px", lineHeight: "1.5" }}>Create a new agent from scratch, or choose one of our starter patterns in the Templates tab.</p>
            <button className="primary" onClick={onCreateNewAgent} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <Plus size={15} /> Create your first agent
            </button>
          </div>
        )}
      </main>
    );
  }


  if (view === "templates") {
    return (
      <main className="screen-main">
        <div className="screen-header">
          <div><span>Templates</span><h1>Start From a Pattern</h1></div>
          <button className="ghost" onClick={onCreateNewAgent}><Plus size={15} /> Blank canvas</button>
        </div>
        <div className="flow-grid">
          {workflowTemplates.map((template) => (
            <article className="template-card" key={template.name}>
              <span><FileText size={18} /></span>
              <strong>{template.name}</strong>
              <p>{template.description}</p>
              <button onClick={() => onApplyTemplate(template)}>Use template</button>
            </article>
          ))}
        </div>
      </main>
    );
  }

  if (view === "logs") {
    return (
      <main className="screen-main">
        <div className="screen-header">
          <div><span>Logs</span><h1>Execution History</h1></div>
          <button className="ghost" onClick={onOpenIde}><CirclePlay size={15} /> Run current graph</button>
        </div>
        <div className="table-shell">
          {logs.map((entry, index) => (
            <div className="log-row" key={`${entry}-${index}`}>
              <Activity size={16} />
              <span>{new Date().toLocaleTimeString()}</span>
              <p>{entry}</p>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="screen-main">
      <div className="screen-header">
        <div><span>Settings</span><h1>BYO Runtime</h1></div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", color: "var(--muted)" }}>{runtimeSaveStatus}</span>
          <button 
            className="ghost" 
            onClick={() => setShowExperiencePopup(true)} 
            style={{ 
              display: "inline-flex", 
              alignItems: "center", 
              gap: "6px", 
              color: "var(--blue)", 
              borderColor: "color-mix(in srgb, var(--blue) 25%, var(--border))" 
            }}
          >
            <Sliders size={15} /> Experience Options
          </button>
          <button className="ghost" onClick={onSaveRuntime}><Save size={15} /> Save</button>
          <button className="ghost" onClick={onResetRuntime}>Reset</button>
          <button className="ghost" onClick={onOpenIde}><Bot size={15} /> Back to IDE</button>
        </div>
      </div>

      <div className="settings-split">
        <aside className="settings-sidebar">
          <div className="settings-section">
            <header>
              <h3>AI Providers</h3>
              <button className="add-btn" onClick={() => handleAddItem("providers")} title="Add AI Provider">
                <Plus size={14} /> Add
              </button>
            </header>
            <div className="list">
              {(runtime.providers || []).map(p => (
                <div 
                  key={p.id} 
                  className={`item ${selectedItem.category === "providers" && selectedItem.id === p.id ? "active" : ""}`}
                  onClick={() => setSelectedItem({ category: "providers", id: p.id })}
                >
                  <div className="info">
                    <strong>{p.name}</strong>
                    <span>{p.providerType}</span>
                  </div>
                  <button className="delete-btn" onClick={(e) => handleDeleteItem("providers", p.id, e)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <header>
              <h3>Databases</h3>
              <button className="add-btn" onClick={() => handleAddItem("databases")} title="Add Database">
                <Plus size={14} /> Add
              </button>
            </header>
            <div className="list">
              {(runtime.databases || []).map(db => (
                <div 
                  key={db.id} 
                  className={`item ${selectedItem.category === "databases" && selectedItem.id === db.id ? "active" : ""}`}
                  onClick={() => setSelectedItem({ category: "databases", id: db.id })}
                >
                  <div className="info">
                    <strong>{db.name}</strong>
                    <span>{db.kind}</span>
                  </div>
                  <button className="delete-btn" onClick={(e) => handleDeleteItem("databases", db.id, e)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="settings-section">
            <header>
              <h3>Cache Storage</h3>
              <button className="add-btn" onClick={() => handleAddItem("caches")} title="Add Cache Storage">
                <Plus size={14} /> Add
              </button>
            </header>
            <div className="list">
              {(runtime.caches || []).map(c => (
                <div 
                  key={c.id} 
                  className={`item ${selectedItem.category === "caches" && selectedItem.id === c.id ? "active" : ""}`}
                  onClick={() => setSelectedItem({ category: "caches", id: c.id })}
                >
                  <div className="info">
                    <strong>{c.name}</strong>
                    <span>{c.kind}</span>
                  </div>
                  <button className="delete-btn" onClick={(e) => handleDeleteItem("caches", c.id, e)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="settings-detail-panel">
          {activeResource ? (
            <div className="settings-panel">
              <div className="panel-heading">
                <span>Configure Resource</span>
                <h2>{activeResource.name || "Unnamed Resource"}</h2>
              </div>
              
              <div className="form-stack">
                <label>Resource Name
                  <input 
                    value={activeResource.name || ""} 
                    onChange={e => handleUpdateItem(selectedItem.category, activeResource.id, "name", e.target.value)} 
                    placeholder="Enter name"
                  />
                </label>

                {selectedItem.category === "providers" && (
                  <>
                    <label>Provider Preset
                      <select 
                        value={activeResource.providerType || ""} 
                        onChange={e => {
                          const pType = e.target.value;
                          const PROVIDER_PRESETS = {
                            openai: { name: "OpenAI Connection", baseUrl: "https://api.openai.com/v1" },
                            nvidia: { name: "NVIDIA NIM Connection", baseUrl: "https://integrate.api.nvidia.com/v1" },
                            gemini: { name: "Google Gemini Connection", baseUrl: "" },
                            openrouter: { name: "OpenRouter Connection", baseUrl: "https://openrouter.ai/api/v1" },
                            ollama: { name: "Ollama Local Connection", baseUrl: "http://localhost:11434/v1" },
                            lmstudio: { name: "LM Studio Connection", baseUrl: "http://localhost:1234/v1" },
                            custom: { name: "Custom Provider Connection", baseUrl: "" }
                          };
                          const preset = PROVIDER_PRESETS[pType] || {};
                          handleUpdateItem("providers", activeResource.id, "providerType", pType);
                          handleUpdateItem("providers", activeResource.id, "name", preset.name || "");
                          handleUpdateItem("providers", activeResource.id, "baseUrl", preset.baseUrl || "");
                          handleUpdateItem("providers", activeResource.id, "apiKey", "");
                        }}
                      >
                        <option value="">Select a Provider to Auto-fill</option>
                        <option value="openai">OpenAI</option>
                        <option value="nvidia">NVIDIA NIM</option>
                        <option value="gemini">Google Gemini</option>
                        <option value="openrouter">OpenRouter</option>
                        <option value="ollama">Ollama</option>
                        <option value="lmstudio">LM Studio</option>
                        <option value="custom">Custom AI Provider</option>
                      </select>
                    </label>

                    <label>API Key
                      <input 
                        type="password" 
                        value={activeResource.apiKey || ""} 
                        onChange={e => handleUpdateItem("providers", activeResource.id, "apiKey", e.target.value)} 
                        placeholder="Paste API Key"
                      />
                    </label>

                    <label>Base URL
                      <input 
                        value={activeResource.baseUrl || ""} 
                        onChange={e => handleUpdateItem("providers", activeResource.id, "baseUrl", e.target.value)} 
                        placeholder="API Endpoint URL"
                      />
                    </label>
                  </>
                )}

                {selectedItem.category === "databases" && (
                  <>
                    <label>Database Preset
                      <select 
                        value={activeResource.kind || ""} 
                        onChange={e => {
                          const kind = e.target.value;
                          const DATABASE_PRESETS = {
                            mongodb_atlas: { name: "MongoDB Vector Search", connectionString: "mongodb+srv://...", database: "promptflow_studio", collection: "knowledge_base", index: "vector_index" },
                            qdrant: { name: "Qdrant REST Connection", connectionString: "http://localhost:6333", database: "qdrant_db", collection: "knowledge_base", index: "" },
                            pinecone: { name: "Pinecone REST Connection", connectionString: "https://...", database: "", collection: "", index: "news_index" },
                            postgres: { name: "PostgreSQL pgvector Connection", connectionString: "postgresql://localhost:5432/...", database: "postgres", collection: "embeddings", index: "vector_idx" },
                            sqlite: { name: "SQLite Vector Connection", connectionString: "sqlite:///vector.db", database: "main", collection: "embeddings", index: "vector_idx" },
                            custom: { name: "Custom Database Connection", connectionString: "", database: "", collection: "", index: "" }
                          };
                          const preset = DATABASE_PRESETS[kind] || {};
                          handleUpdateItem("databases", activeResource.id, "kind", kind);
                          handleUpdateItem("databases", activeResource.id, "name", preset.name || "");
                          handleUpdateItem("databases", activeResource.id, "connectionString", preset.connectionString || "");
                          handleUpdateItem("databases", activeResource.id, "database", preset.database || "");
                          handleUpdateItem("databases", activeResource.id, "collection", preset.collection || "");
                          handleUpdateItem("databases", activeResource.id, "index", preset.index || "");
                          handleUpdateItem("databases", activeResource.id, "apiKey", "");
                        }}
                      >
                        <option value="">Select a Database to Auto-fill</option>
                        <option value="mongodb_atlas">MongoDB Atlas Vector Search</option>
                        <option value="qdrant">Qdrant REST</option>
                        <option value="pinecone">Pinecone REST</option>
                        <option value="postgres">PostgreSQL pgvector</option>
                        <option value="sqlite">SQLite Vector</option>
                        <option value="custom">Custom Database (BYO)</option>
                      </select>
                    </label>

                    <label>Connection String
                      <input 
                        value={activeResource.connectionString || ""} 
                        onChange={e => handleUpdateItem("databases", activeResource.id, "connectionString", e.target.value)} 
                        placeholder="e.g. mongodb+srv://... or connection URL"
                      />
                    </label>

                    <label>API Key (Optional)
                      <input 
                        type="password" 
                        value={activeResource.apiKey || ""} 
                        onChange={e => handleUpdateItem("databases", activeResource.id, "apiKey", e.target.value)} 
                        placeholder="Database access key/token"
                      />
                    </label>

                    <label>Database Name / Namespace
                      <input 
                        value={activeResource.database || ""} 
                        onChange={e => handleUpdateItem("databases", activeResource.id, "database", e.target.value)} 
                        placeholder="e.g. promptflow_studio"
                      />
                    </label>

                    <label>Collection / Table Name
                      <input 
                        value={activeResource.collection || ""} 
                        onChange={e => handleUpdateItem("databases", activeResource.id, "collection", e.target.value)} 
                        placeholder="e.g. knowledge_base"
                      />
                    </label>

                    <label>Index Name
                      <input 
                        value={activeResource.index || ""} 
                        onChange={e => handleUpdateItem("databases", activeResource.id, "index", e.target.value)} 
                        placeholder="e.g. vector_index"
                      />
                    </label>
                  </>
                )}

                {selectedItem.category === "caches" && (
                  <>
                    <label>Cache Storage Kind
                      <select 
                        value={activeResource.kind || "in_memory"} 
                        onChange={e => handleUpdateItem("caches", activeResource.id, "kind", e.target.value)}
                      >
                        <option value="in_memory">In-Memory (LRU Cache)</option>
                        <option value="redis">Redis Cache Store</option>
                        <option value="sqlite">SQLite Cache Database</option>
                        <option value="custom">Custom Cache Adapter</option>
                      </select>
                    </label>

                    {(activeResource.kind === "redis" || activeResource.kind === "sqlite" || activeResource.kind === "custom") && (
                      <label>Connection String / Path / Endpoint
                        <input 
                          value={activeResource.connectionString || ""} 
                          onChange={e => handleUpdateItem("caches", activeResource.id, "connectionString", e.target.value)} 
                          placeholder={activeResource.kind === "redis" ? "redis://127.0.0.1:6379" : activeResource.kind === "sqlite" ? "path/to/cache.db" : "Enter custom cache connection details"}
                        />
                      </label>
                    )}

                    {(activeResource.kind === "redis" || activeResource.kind === "custom") && (
                      <label>Auth Password / Token (Optional)
                        <input 
                          type="password" 
                          value={activeResource.apiKey || ""} 
                          onChange={e => handleUpdateItem("caches", activeResource.id, "apiKey", e.target.value)} 
                          placeholder="Authentication credentials"
                        />
                      </label>
                    )}

                    <label>Cache TTL (Seconds)
                      <input 
                        type="number" 
                        value={activeResource.ttl || 300} 
                        onChange={e => handleUpdateItem("caches", activeResource.id, "ttl", parseInt(e.target.value) || 0)} 
                        placeholder="e.g. 300"
                      />
                    </label>

                    <label>Max Items Limit
                      <input 
                        type="number" 
                        value={activeResource.maxLimit || 1000} 
                        onChange={e => handleUpdateItem("caches", activeResource.id, "maxLimit", parseInt(e.target.value) || 0)} 
                        placeholder="e.g. 1000"
                      />
                    </label>
                  </>
                )}

                {selectedItem.category === "providers" && (
                  loadingModels ? (
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "12px" }}>
                      <span className="spinner-mini" style={{ display: "inline-block", marginRight: "6px" }} /> Loading models catalog...
                    </div>
                  ) : (
                    modelCatalog.models && modelCatalog.models.length > 0 && (
                      <div style={{ marginTop: "14px", padding: "12px", background: "var(--surface-soft)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <span style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "6px" }}>Available Models ({modelCatalog.models.length})</span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {modelCatalog.models.map(m => (
                            <span key={m} style={{ padding: "3px 8px", background: "#ffffff", border: "1px solid var(--border)", borderRadius: "4px", fontSize: "11px", fontFamily: "Geist Mono" }}>
                              {m} {m === modelCatalog.recommendation && "⭐"}
                            </span>
                          ))}
                        </div>
                        {modelCatalog.recommendation && (
                          <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--blue)", fontWeight: "600" }}>
                            💡 Recommended best model: <strong>{modelCatalog.recommendation}</strong>
                          </p>
                        )}
                      </div>
                    )
                  )
                )}

                {selectedItem.category === "databases" && dbInfo.suggested_setup && (
                  <div style={{ marginTop: "14px", padding: "12px", background: "#eff6ff", borderRadius: "8px", border: "1px solid #dbeafe", color: "var(--blue)", fontSize: "12px", lineHeight: "1.5" }}>
                    <strong>💡 Configuration Recommendation:</strong>
                    <p style={{ margin: "4px 0 0" }}>{dbInfo.suggested_setup}</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-settings-detail" style={{ padding: "40px 30px", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
              <div style={{ background: "color-mix(in srgb, var(--blue) 8%, white)", color: "var(--blue)", width: "64px", height: "64px", borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 20px" }}>
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "10px", color: "var(--text)" }}>Welcome to PromptFlow Studio</h3>
              <p style={{ color: "var(--muted)", fontSize: "14px", lineHeight: "1.6", marginBottom: "28px" }}>
                Configure your active connections to start building, running, and testing agent pipelines. Select a preset below to auto-fill details, leaving only your credentials to input:
              </p>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "18px", textAlign: "left", marginBottom: "28px" }}>
                <div style={{ background: "var(--surface-soft)", padding: "18px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)" }}>AI Provider Preset</span>
                  <select 
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const pType = e.target.value;
                      const PROVIDER_PRESETS = {
                        openai: { name: "OpenAI Connection", baseUrl: "https://api.openai.com/v1" },
                        nvidia: { name: "NVIDIA NIM Connection", baseUrl: "https://integrate.api.nvidia.com/v1" },
                        gemini: { name: "Google Gemini Connection", baseUrl: "" },
                        openrouter: { name: "OpenRouter Connection", baseUrl: "https://openrouter.ai/api/v1" },
                        ollama: { name: "Ollama Local Connection", baseUrl: "http://localhost:11434/v1" },
                        lmstudio: { name: "LM Studio Connection", baseUrl: "http://localhost:1234/v1" }
                      };
                      const preset = PROVIDER_PRESETS[pType] || {};
                      const id = `providers-${Date.now()}`;
                      setRuntime(current => ({
                        ...current,
                        providers: [...(current.providers || []), {
                          id,
                          name: preset.name || "New Provider",
                          providerType: pType,
                          baseUrl: preset.baseUrl || "",
                          apiKey: ""
                        }]
                      }));
                      setSelectedItem({ category: "providers", id });
                    }}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "12px", outline: "none" }}
                  >
                    <option value="">Select AI Provider...</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="nvidia">NVIDIA NIM</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="lmstudio">LM Studio (Local)</option>
                  </select>
                </div>
                
                <div style={{ background: "var(--surface-soft)", padding: "18px", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <span style={{ display: "block", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)" }}>Vector Database Preset</span>
                  <select 
                    defaultValue=""
                    onChange={(e) => {
                      if (!e.target.value) return;
                      const dbKind = e.target.value;
                      const DATABASE_PRESETS = {
                        mongodb_atlas: { name: "MongoDB Vector Search", connectionString: "mongodb+srv://...", database: "promptflow_studio", collection: "knowledge_base", index: "vector_index" },
                        qdrant: { name: "Qdrant REST Connection", connectionString: "http://localhost:6333", database: "qdrant_db", collection: "knowledge_base", index: "" },
                        pinecone: { name: "Pinecone REST Connection", connectionString: "https://...", database: "", collection: "", index: "news_index" },
                        postgres: { name: "PostgreSQL pgvector Connection", connectionString: "postgresql://localhost:5432/...", database: "postgres", collection: "embeddings", index: "vector_idx" },
                        sqlite: { name: "SQLite Vector Connection", connectionString: "sqlite:///vector.db", database: "main", collection: "embeddings", index: "vector_idx" }
                      };
                      const preset = DATABASE_PRESETS[dbKind] || {};
                      const id = `databases-${Date.now()}`;
                      setRuntime(current => ({
                        ...current,
                        databases: [...(current.databases || []), {
                          id,
                          name: preset.name || "New Database",
                          kind: dbKind,
                          connectionString: preset.connectionString || "",
                          database: preset.database || "",
                          collection: preset.collection || "",
                          index: preset.index || "",
                          apiKey: ""
                        }]
                      }));
                      setSelectedItem({ category: "databases", id });
                    }}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "12px", outline: "none" }}
                  >
                    <option value="">Select Database...</option>
                    <option value="mongodb_atlas">MongoDB Atlas Vector Search</option>
                    <option value="qdrant">Qdrant REST</option>
                    <option value="pinecone">Pinecone REST</option>
                    <option value="postgres">PostgreSQL pgvector</option>
                    <option value="sqlite">SQLite Vector</option>
                  </select>
                </div>
              </div>
              
              <div style={{ color: "var(--muted)", fontSize: "12px" }}>
                Select an existing category in the sidebar and click <strong>"+ Add"</strong> to configure manually.
              </div>
            </div>
          )}

          {!uiPreferences.hideAdvancedPanels && (
            <div className="settings-panel notes-panel">
              <div className="panel-heading"><span>Assistant</span><h2>Implementation Notes</h2></div>
              <div className="note-list">
                <p><FileText size={16} /> Configurations are stored locally in the frontend state. Secrets like API Keys are transmitted securely during execution requests.</p>
                <p><Database size={16} /> Dynamic vector nodes and model references in your flow workspace will automatically adapt to configurations added here.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {showExperiencePopup && (
        <div 
          className="experience-popup-overlay"
          onClick={() => setShowExperiencePopup(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "grid",
            placeItems: "center",
            zIndex: 9999
          }}
        >
          <div 
            className="experience-popup-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 92vw)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px",
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.22)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "20px"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Sliders size={18} style={{ color: "var(--blue)" }} />
                <h2 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>Focus & Experience Options</h2>
              </div>
              <button 
                onClick={() => setShowExperiencePopup(false)}
                style={{ color: "var(--muted)", padding: "6px", borderRadius: "50%", background: "var(--surface-soft)", display: "grid", placeItems: "center" }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="experience-grid" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "10px" }}>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={uiPreferences.simplifyEverything}
                  onChange={(event) => applySimplifyPreset(event.target.checked)}
                />
                <div>
                  <strong>Simplify everything</strong>
                  <span>Turns on a cleaner layout, calmer motion, and less visual noise.</span>
                </div>
              </label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={uiPreferences.readableText}
                  onChange={(event) => setUiPreferences((current) => ({ ...current, readableText: event.target.checked }))}
                />
                <div>
                  <strong>Readable text</strong>
                  <span>Gives the UI more breathing room for longer reading sessions.</span>
                </div>
              </label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={uiPreferences.compactLayout}
                  onChange={(event) => setUiPreferences((current) => ({ ...current, compactLayout: event.target.checked }))}
                />
                <div>
                  <strong>Compact layout</strong>
                  <span>Tightens spacing so the important bits stay in view.</span>
                </div>
              </label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={uiPreferences.reduceMotion}
                  onChange={(event) => setUiPreferences((current) => ({ ...current, reduceMotion: event.target.checked }))}
                />
                <div>
                  <strong>Reduce motion</strong>
                  <span>Softens animations for a steadier, less distracting feel.</span>
                </div>
              </label>
              <label className="toggle-card">
                <input
                  type="checkbox"
                  checked={uiPreferences.hideAdvancedPanels}
                  onChange={(event) => setUiPreferences((current) => ({ ...current, hideAdvancedPanels: event.target.checked }))}
                />
                <div>
                  <strong>Hide advanced panels</strong>
                  <span>Hides the raw stream, SDK preview, and other deep-dive sections.</span>
                </div>
              </label>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: "12px", border: "1px solid var(--border)", background: "#f8fafc", fontSize: "12px", lineHeight: "1.6", color: "var(--muted)" }}>
              Your workspace is attached to browser storage, so the current graph, layout, and settings come back after refresh without requiring a login.
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <button 
                className="primary" 
                onClick={() => setShowExperiencePopup(false)}
                style={{ height: "36px", padding: "0 18px", borderRadius: "8px" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
  }

function FlowNode({ node, selected, hoverPort, onPointerDown, onSelect, onBeginLink, onDelete, nodeState, nodeOutput }) {
  const meta = nodeTypes.find((item) => item.type === node.type) || nodeTypes[0];
  return (
    <article
      data-node
      className={`flow-node ${selected ? "selected" : ""} ${nodeState || "idle"}`}
      onPointerDown={onPointerDown}
      onClick={onSelect}
      style={{
        transform: `translate3d(${node.position.x}px, ${node.position.y}px, 0)`,
        "--node-color": meta.color
      }}
    >
      <button
        className="node-delete-btn"
        onClick={(event) => {
          event.stopPropagation();
          onDelete(node.id);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        title="Delete node"
      >
        <X size={14} />
      </button>
      <header>
        <span className="node-app-icon"><meta.icon size={17} /></span>
        <div>
          <strong>{node.label}</strong>
          <small>{node.type}</small>
        </div>
        <span className={`node-status-badge ${nodeState || "idle"}`}>
          {nodeState === "running" && <span className="spinner-mini" />}
          {nodeState === "completed" && <Check size={12} />}
          {nodeState === "error" && <AlertTriangle size={12} />}
          <span>
            {nodeState === "running" && "Running"}
            {nodeState === "completed" && `${nodeOutput?.duration ? (nodeOutput.duration / 1000).toFixed(1) + 's' : 'Done'}`}
            {nodeState === "error" && "Error"}
            {!nodeState && "Ready"}
          </span>
        </span>
      </header>
      <div className="ports">
        <div>
          {node.inputs.map((port) => (
            <div key={port.id} className="port-row input-row">
              <span className={hoverPort?.nodeId === node.id && hoverPort?.portId === port.id ? "port attracted" : "port"} />
              <em>{port.label}</em>
            </div>
          ))}
        </div>
        <div>
          {node.outputs.map((port) => (
            <button key={port.id} className="port-row output-row" onPointerDown={(event) => { event.stopPropagation(); onBeginLink(port.id); }}>
              <em>{port.label}</em>
              <span className="port output" />
            </button>
          ))}
        </div>
      </div>
      
      {node.type === "prompt" && <p className="node-copy">{node.data.template}</p>}
      {node.type === "llm" && <p className="node-copy">{node.data.provider} / {node.data.model}</p>}
      {node.type === "vector" && <p className="node-copy">{node.data.collection} / Vector Search</p>}
      {node.type === "subagent" && <p className="node-copy">{node.data.role} ({node.data.provider || "openai"} / {node.data.model || "gpt-4o-mini"})</p>}
      {node.type === "router" && <p className="node-copy">Condition: {node.data.condition}</p>}
      {node.type === "code" && <pre className="node-copy-code">{node.data.code}</pre>}
      {node.type === "output" && <p className="node-copy">Terminal Display</p>}

      {/* Output Preview */}
      {nodeOutput?.result && (
        <div className="node-output-preview">
          <span>Output Preview:</span>
          <pre>{nodeOutput.result.length > 100 ? nodeOutput.result.slice(0, 100) + "..." : nodeOutput.result}</pre>
        </div>
      )}
      {nodeOutput?.error && (
        <div className="node-output-preview error-preview">
          <span>Error Details:</span>
          <pre>{nodeOutput.error}</pre>
        </div>
      )}
    </article>
  );
}
