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
  GitBranch,
  KeyRound,
  Link2Off,
  Plus,
  Save,
  Search,
  Sparkles,
  Split,
  Trash2,
  Waypoints,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  bezierPath,
  buildGraphPayload,
  normalizeNodes,
  portPosition,
  scanTemplateVariables,
  wouldCreateCycle
} from "./lib/graph";
import { compileGraphToSdk } from "./lib/compiler";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const initialNodes = normalizeNodes([
  {
    id: "input-1",
    type: "input",
    label: "User brief",
    position: { x: 60, y: 140 },
    inputs: [],
    outputs: [{ id: "value", label: "value" }],
    data: { key: "brief", value: "Summarize the latest support ticket." }
  },
  {
    id: "vector-1",
    type: "vector",
    label: "Semantic context",
    position: { x: 320, y: 320 },
    inputs: [{ id: "query", label: "query" }],
    outputs: [{ id: "documents", label: "documents" }],
    data: { collection: "knowledge_base", index: "vector_index", limit: 4 }
  },
  {
    id: "prompt-1",
    type: "prompt",
    label: "Prompt template",
    position: { x: 320, y: 122 },
    inputs: [],
    outputs: [{ id: "prompt", label: "prompt" }],
    data: {
      template: "You are a precise support copilot. Use {{brief}} and {{documents}} to draft a concise response."
    }
  },
  {
    id: "llm-1",
    type: "llm",
    label: "Model response",
    position: { x: 575, y: 164 },
    inputs: [{ id: "prompt", label: "prompt" }],
    outputs: [{ id: "completion", label: "completion" }],
    data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.3 }
  }
]);

const initialLinks = [
  { id: "l1", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "brief", active: true },
  { id: "l2", sourceNode: "input-1", sourcePort: "value", targetNode: "vector-1", targetPort: "query", active: true },
  { id: "l3", sourceNode: "vector-1", sourcePort: "documents", targetNode: "prompt-1", targetPort: "documents", active: true },
  { id: "l4", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true }
];

const nodeTypes = [
  { type: "input", label: "Input", icon: Braces, color: "#20a4f3", category: "Core" },
  { type: "prompt", label: "Prompt", icon: Sparkles, color: "#9b5cff", category: "AI" },
  { type: "llm", label: "LLM", icon: BrainCircuit, color: "#10b981", category: "AI" },
  { type: "subagent", label: "Sub-agent", icon: Bot, color: "#6366f1", category: "Agents" },
  { type: "vector", label: "Vector Search", icon: Database, color: "#f97316", category: "Data" },
  { type: "output", label: "Output", icon: ArrowDownToLine, color: "#ec4899", category: "Core" },
  { type: "router", label: "Conditional", icon: Split, color: "#eab308", category: "Core" },
  { type: "code", label: "Code Transform", icon: Code, color: "#8b5cf6", category: "Core" },
  { type: "custom", label: "Custom Node", icon: Boxes, color: "#f43f5e", category: "Core" }
];

const navItems = [
  { id: "ide", label: "IDE" },
  { id: "flows", label: "Flows" },
  { id: "templates", label: "Templates" },
  { id: "logs", label: "Logs" },
  { id: "settings", label: "Settings" }
];

const workflowTemplates = [
  {
    name: "Simple Chatbot",
    description: "A simple linear chatbot flow from input, prompt, model, and final terminal display.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "User input", position: { x: 80, y: 150 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "input", value: "Describe quantum physics in one sentence." } },
      { id: "prompt-1", type: "prompt", label: "Prompt template", position: { x: 380, y: 150 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "Explain this topic simply: {{input}}" } },
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
    name: "RAG Support Pipeline",
    description: "Input search query, perform semantic retrieval from vector database, enrich context, and synthesize response.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Support ticket", position: { x: 60, y: 160 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "query", value: "What is the refund policy?" } },
      { id: "vector-1", type: "vector", label: "Semantic Search", position: { x: 340, y: 300 }, inputs: [{ id: "query", label: "query" }], outputs: [{ id: "documents", label: "documents" }], data: { collection: "support_kb", index: "vector_index", limit: 3 } },
      { id: "prompt-1", type: "prompt", label: "Enrichment", position: { x: 620, y: 120 }, inputs: [], outputs: [{ id: "prompt", label: "prompt" }], data: { template: "You are a customer assistant. Answer the user query: {{query}} using the retrieval context:\n\n{{documents}}" } },
      { id: "llm-1", type: "llm", label: "Synthesizer", position: { x: 900, y: 150 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 } },
      { id: "output-1", type: "output", label: "Response", position: { x: 1180, y: 150 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "rag-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "vector-1", targetPort: "query", active: true },
      { id: "rag-l2", sourceNode: "input-1", sourcePort: "value", targetNode: "prompt-1", targetPort: "query", active: true },
      { id: "rag-l3", sourceNode: "vector-1", sourcePort: "documents", targetNode: "prompt-1", targetPort: "documents", active: true },
      { id: "rag-l4", sourceNode: "prompt-1", sourcePort: "prompt", targetNode: "llm-1", targetPort: "prompt", active: true },
      { id: "rag-l5", sourceNode: "llm-1", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  },
  {
    name: "Multi-Agent Research Flow",
    description: "A multi-agent chain where a researcher agent compiles raw data, a writer agent drafts an article, and a coordinator model aggregates details.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Research briefing", position: { x: 50, y: 180 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "task", value: "Generative AI agents in healthcare" } },
      { id: "subagent-researcher", type: "subagent", label: "Researcher agent", position: { x: 340, y: 180 }, inputs: [{ id: "task", label: "task" }, { id: "context", label: "context" }], outputs: [{ id: "result", label: "result" }], data: { role: "Deep Researcher", handoff: "Research this topic thoroughly. List major innovations, challenges, and statistics.", provider: "openai", model: "gpt-4o-mini" } },
      { id: "subagent-writer", type: "subagent", label: "Writer agent", position: { x: 640, y: 180 }, inputs: [{ id: "task", label: "task" }, { id: "context", label: "context" }], outputs: [{ id: "result", label: "result" }], data: { role: "Technical Copywriter", handoff: "Draft a beautifully organized summary based on the research findings provided in the context.", provider: "openai", model: "gpt-4o-mini" } },
      { id: "llm-coordinator", type: "llm", label: "Executive Coordinator", position: { x: 940, y: 180 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.1 } },
      { id: "output-1", type: "output", label: "Final summary", position: { x: 1220, y: 180 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "ma-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "subagent-researcher", targetPort: "task", active: true },
      { id: "ma-l2", sourceNode: "subagent-researcher", sourcePort: "result", targetNode: "subagent-writer", targetPort: "context", active: true },
      { id: "ma-l3", sourceNode: "input-1", sourcePort: "value", targetNode: "subagent-writer", targetPort: "task", active: true },
      { id: "ma-l4", sourceNode: "subagent-writer", sourcePort: "result", targetNode: "llm-coordinator", targetPort: "prompt", active: true },
      { id: "ma-l5", sourceNode: "llm-coordinator", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true }
    ]
  },
  {
    name: "Conditional Router",
    description: "Routes user message dynamically. Help-needed or urgent messages route to a high-priority model, otherwise route to a standard assistant agent.",
    nodes: normalizeNodes([
      { id: "input-1", type: "input", label: "Incoming request", position: { x: 60, y: 180 }, inputs: [], outputs: [{ id: "value", label: "value" }], data: { key: "input", value: "HELP: The system is completely offline and throwing error 500." } },
      { id: "router-1", type: "router", label: "Priority check", position: { x: 340, y: 180 }, inputs: [{ id: "input", label: "input" }], outputs: [{ id: "true", label: "True" }, { id: "false", label: "False" }], data: { condition: "'help' in input.lower() or 'offline' in input.lower() or 'urgent' in input.lower()" } },
      { id: "llm-priority", type: "llm", label: "Urgent response model", position: { x: 660, y: 80 }, inputs: [{ id: "prompt", label: "prompt" }], outputs: [{ id: "completion", label: "completion" }], data: { provider: "openai", model: "gpt-4o-mini", temperature: 0.1 } },
      { id: "subagent-standard", type: "subagent", label: "General agent", position: { x: 660, y: 280 }, inputs: [{ id: "task", label: "task" }, { id: "context", label: "context" }], outputs: [{ id: "result", label: "result" }], data: { role: "Standard Assistant", handoff: "Answer this request in a polite, helpful tone.", provider: "openai", model: "gpt-4o-mini" } },
      { id: "output-1", type: "output", label: "System output", position: { x: 960, y: 180 }, inputs: [{ id: "input", label: "input" }], outputs: [], data: {} }
    ]),
    links: [
      { id: "route-l1", sourceNode: "input-1", sourcePort: "value", targetNode: "router-1", targetPort: "input", active: true },
      { id: "route-l2", sourceNode: "router-1", sourcePort: "true", targetNode: "llm-priority", targetPort: "prompt", active: true },
      { id: "route-l3", sourceNode: "router-1", sourcePort: "false", targetNode: "subagent-standard", targetPort: "task", active: true },
      { id: "route-l4", sourceNode: "llm-priority", sourcePort: "completion", targetNode: "output-1", targetPort: "input", active: true },
      { id: "route-l5", sourceNode: "subagent-standard", sourcePort: "result", targetNode: "output-1", targetPort: "input", active: true }
    ]
  }
];

const defaultRuntime = {
  providers: [
    { id: "openai", name: "OpenAI", providerType: "openai", apiKey: "", baseUrl: "https://api.openai.com/v1" },
    { id: "nvidia", name: "NVIDIA NIM", providerType: "nvidia", apiKey: "", baseUrl: "https://integrate.api.nvidia.com/v1" },
    { id: "gemini", name: "Google Gemini", providerType: "gemini", apiKey: "", baseUrl: "" },
    { id: "openrouter", name: "OpenRouter", providerType: "openrouter", apiKey: "", baseUrl: "https://openrouter.ai/api/v1" },
    { id: "ollama", name: "Ollama", providerType: "ollama", apiKey: "", baseUrl: "http://localhost:11434/v1" },
    { id: "lmstudio", name: "LM Studio", providerType: "lmstudio", apiKey: "", baseUrl: "http://localhost:1234/v1" }
  ],
  databases: [
    { id: "mongodb_atlas", name: "MongoDB Vector Search", kind: "mongodb_atlas", connectionString: "", database: "promptflow_studio", collection: "knowledge_base", index: "vector_index", apiKey: "" }
  ],
  caches: [
    { id: "in_memory", name: "Local LRU Cache", kind: "in_memory", maxLimit: 1000, ttl: 300 }
  ]
};

function parseJsonWorkflow(text) {
  try {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      const parsed = JSON.parse(match[1].trim());
      if (parsed.nodes && parsed.links) {
        return parsed;
      }
    }
  } catch (err) {}
  return null;
}

export function App() {
  const [activeView, setActiveView] = useState("ide");
  const [nodes, setNodes] = useState(initialNodes);
  const [links, setLinks] = useState(initialLinks);
  const [graphId, setGraphId] = useState(null);
  const [graphName, setGraphName] = useState("Support Copilot Flow");
  const [savedFlows, setSavedFlows] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMode, setChatMode] = useState("tester");
  const [chatMessages, setChatMessages] = useState([
    { id: "msg-1", role: "assistant", text: "Hello! I'm your PromptFlow assistant.\n\n* **AI Copilot mode**: Ask me to build or modify workflows.\n* **Agent Tester mode**: Interact and test your live active flow directly here!" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

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

  async function loadGraphById(id) {
    setStatus(`Loading flow ${id}...`);
    try {
      const response = await fetch(`${API_BASE}/graphs/${id}`);
      if (response.ok) {
        const data = await response.json();
        setGraphId(data.id);
        setGraphName(data.name || "Untitled Flow");
        setNodes(normalizeNodes(data.nodes || []));
        setLinks(data.links || []);
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

  const [viewport, setViewport] = useState({ x: 16, y: 30, scale: 0.52 });
  const [selectedId, setSelectedId] = useState("prompt-1");
  const [selectedLinkId, setSelectedLinkId] = useState(null);
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
  const [runtime, setRuntime] = useState(defaultRuntime);
  const canvasRef = useRef(null);
  const panRef = useRef(null);

  const graphNodes = useMemo(() => normalizeNodes(nodes), [nodes]);
  const nodeMap = useMemo(() => new Map(graphNodes.map((node) => [node.id, node])), [graphNodes]);
  const selectedNode = nodeMap.get(selectedId);
  const selectedLink = links.find((link) => link.id === selectedLinkId);
  const hasCycle = useMemo(() => wouldCreateCycle(graphNodes, links), [graphNodes, links]);

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
      if (wouldCreateCycle(graphNodes, links, candidate)) {
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
    if (type === "prompt") base.data.template = "Write about {{input}} with clarity.";
    if (type === "llm") base.data = { provider: "openai", model: "gpt-4o-mini", temperature: 0.2 };
    if (type === "subagent") {
      base.label = "Sub-agent";
      base.inputs = [{ id: "task", label: "task" }, { id: "context", label: "context" }];
      base.outputs = [{ id: "result", label: "result" }];
      base.data = { role: "Specialist", handoff: "Return a concise result to the parent agent." };
    }
    if (type === "vector") base.data = { collection: "knowledge_base", index: "vector_index", limit: 4 };
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
    setNodes([]);
    setLinks([]);
    setSelectedId(null);
    setSelectedLinkId(null);
    setViewport({ x: 16, y: 30, scale: 0.8 });
    setActiveView("ide");
    setStatus("Blank agent ready.");
  }

  function applyTemplate(template) {
    setNodes(normalizeNodes(template.nodes));
    setLinks(template.links);
    setSelectedId(template.nodes[0]?.id || null);
    setSelectedLinkId(null);
    setViewport({ x: 16, y: 30, scale: 0.52 });
    setActiveView("ide");
    setStatus(`${template.name} template loaded.`);
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
      return;
    }
    
    // Reset execution and node states
    setNodeStates({});
    setNodeOutputs({});
    setExecutionActive(true);
    setCurrentExecutionNode(null);
    setExecutionProgress({ current: 0, total: 0 });
    setExecutionLog(["Starting SSE execution..."]);
    setStatus("Executing graph...");

    const response = await fetch(`${API_BASE}/execute/stream`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        graph: buildGraphPayload(graphName, graphNodes, links),
        runtime: {
          providers: Object.fromEntries(runtime.providers.map((p) => [p.id, p])),
          vectorDatabase: runtime.databases[0] || {}
        }
      })
    });
    if (!response.body) {
      setStatus("Streaming unavailable.");
      setExecutionActive(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    const parseAndProcessEvent = (line) => {
      const payloadStr = line.replace("data:", "").trim();
      try {
        const data = JSON.parse(payloadStr);
        const { event, node, label, step, total, chunk: tokenChunk, durationMs, message, condition } = data;

        setExecutionLog((current) => [
          ...current.slice(-15),
          `[${event}] ${node || ''} ${message || label || tokenChunk || ''}`
        ]);

        if (event === "node:start") {
          setNodeStates((prev) => ({ ...prev, [node]: "running" }));
          setExecutionProgress({ current: step + 1, total });
          setCurrentExecutionNode(node);
          setStatus(`Running node: ${label || node}`);
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
              result: data.output // Store the output content
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
          setStatus("Execution complete.");
        }
      } catch (e) {
        console.error("Failed to parse SSE payload:", payloadStr, e);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop();
      for (const chunk of chunks) {
        const line = chunk.split("\n").find((entry) => entry.startsWith("data:"));
        if (line) {
          parseAndProcessEvent(line);
        }
      }
    }

    if (buffer.trim()) {
      const line = buffer.split("\n").find((entry) => entry.startsWith("data:"));
      if (line) {
        parseAndProcessEvent(line);
      }
    }

    setExecutionActive(false);
    setCurrentExecutionNode(null);
  }

  async function sendChatInput(queryText) {
    if (!queryText.trim()) return;
    
    // Add user message
    const userMsg = { id: `user-${Date.now()}`, role: "user", text: queryText };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);
    
    // Find canvas input node
    const inputNode = nodes.find(n => n.type === "input");
    if (!inputNode) {
      setChatMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "⚠️ **No Input Node found on the Canvas**: Please add an 'Input' node to your canvas so I can wire your message into the pipeline execution."
      }]);
      setChatLoading(false);
      return;
    }

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
    setExecutionActive(true);
    setCurrentExecutionNode(null);
    setExecutionProgress({ current: 0, total: 0 });

    try {
      const response = await fetch(`${API_BASE}/execute/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          graph: buildGraphPayload(graphName, normalizeNodes(updatedNodes), links),
          runtime: {
            providers: Object.fromEntries(runtime.providers.map((p) => [p.id, p])),
            vectorDatabase: runtime.databases[0] || {}
          }
        })
      });

      if (!response.body) {
        setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: "Error: execution stream unavailable.", isStreaming: false } : m));
        setChatLoading(false);
        setExecutionActive(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processEvent = (line) => {
        const payloadStr = line.replace("data:", "").trim();
        try {
          const data = JSON.parse(payloadStr);
          const { event, node, label, step, total, chunk: tokenChunk, durationMs, message, condition } = data;

          if (event === "node:start") {
            setNodeStates((prev) => ({ ...prev, [node]: "running" }));
            setExecutionProgress({ current: step + 1, total });
            setCurrentExecutionNode(node);
          } else if (event === "node:skipped") {
            setNodeStates((prev) => ({ ...prev, [node]: "skipped" }));
          } else if (event === "token" && tokenChunk) {
            currentText += tokenChunk;
            setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: currentText } : m));
            setNodeOutputs((prev) => {
              const nodeOut = prev[node] || { chunks: [], result: "" };
              const updatedChunks = [...nodeOut.chunks, tokenChunk];
              return {
                ...prev,
                [node]: { ...nodeOut, chunks: updatedChunks, result: updatedChunks.join("") }
              };
            });
          } else if (event === "node:output" && data.output) {
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
            currentText += `\n\n❌ **Error in step "${label || node}"**: ${message}`;
            setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: currentText } : m));
          } else if (event === "complete") {
            setExecutionActive(false);
            setCurrentExecutionNode(null);
            
            // Fallback: If no streaming text was captured, try to read the last output node's value
            if (!currentText) {
              const outputNodes = updatedNodes.filter(n => n.type === "output");
              if (outputNodes.length > 0) {
                currentText = "Workflow executed successfully! Terminal output generated.";
                setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: currentText } : m));
              } else {
                currentText = "Workflow execution complete.";
                setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: currentText } : m));
              }
            }
          }
        } catch (e) {
          console.error(e);
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();
        for (const chunk of chunks) {
          const line = chunk.split("\n").find((entry) => entry.startsWith("data:"));
          if (line) processEvent(line);
        }
      }

      if (buffer.trim()) {
        const line = buffer.split("\n").find((entry) => entry.startsWith("data:"));
        if (line) processEvent(line);
      }

    } catch (err) {
      console.error(err);
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: "❌ Connection error during workflow execution.", isStreaming: false } : m));
    } finally {
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, isStreaming: false } : m));
      setChatLoading(false);
      setExecutionActive(false);
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
You can generate nodes and connections. To create or modify a workflow, output a single JSON codeblock wrapped in \`\`\`json ... \`\`\` with this exact structure:
{
  "nodes": [
    { "id": "input-1", "type": "input", "label": "User Brief", "position": {"x": 60, "y": 140}, "inputs": [], "outputs": [{"id": "value", "label": "value"}], "data": {"key": "brief", "value": "Write a support ticket description."} },
    { "id": "prompt-1", "type": "prompt", "label": "Prompt Template", "position": {"x": 320, "y": 140}, "inputs": [{"id": "input", "label": "input"}], "outputs": [{"id": "prompt", "label": "prompt"}], "data": {"template": "Summarize: {{brief}}"} },
    { "id": "llm-1", "type": "llm", "label": "Model Response", "position": {"x": 580, "y": 140}, "inputs": [{"id": "prompt", "label": "prompt"}], "outputs": [{"id": "completion", "label": "completion"}], "data": {"provider": "openai", "model": "gpt-4o-mini"} }
  ],
  "links": [
    { "id": "l1", "sourceNode": "input-1", "sourcePort": "value", "targetNode": "prompt-1", "targetPort": "input" },
    { "id": "l2", "sourceNode": "prompt-1", "sourcePort": "prompt", "targetNode": "llm-1", "targetPort": "prompt" }
  ]
}
Be helpful, professional, and explain what the generated workflow does.`;

    try {
      const activeProvider = runtime.providers[0];
      const response = await fetch(`${API_BASE}/llm/stream`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider?.id || "openai",
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: queryText }
          ],
          runtime: {
            providers: Object.fromEntries(runtime.providers.map((p) => [p.id, p])),
            vectorDatabase: runtime.databases[0] || {}
          }
        })
      });

      if (!response.body) {
        setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: "Error: Copilot stream is not available.", isStreaming: false } : m));
        setChatLoading(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processLine = (line) => {
        const payloadStr = line.replace("data:", "").trim();
        if (!payloadStr) return;
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
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, text: "❌ Connection error while contacting Copilot. Ensure an active provider is added in Settings.", isStreaming: false } : m));
    } finally {
      setChatMessages(prev => prev.map(m => m.id === responseId ? { ...m, isStreaming: false } : m));
      setChatLoading(false);
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

  return (
    <div className={`app-shell ${chatOpen ? "chat-open" : ""}`}>
      <header className="topbar">
        <div className="brand">
          <Waypoints size={22} />
          <strong>PromptFlow Studio</strong>
          <span className="workflow-chip">{graphName}</span>
        </div>
        <div className="top-actions">
          <label className="search"><Search size={15} /><input placeholder="Search prompts..." /></label>
          <button className="ghost" onClick={createNewAgent}><Plus size={15} /> New agent</button>
          <button className="ghost" onClick={compileSdk}><ArrowDownToLine size={15} /> Compile</button>
          <button className={`ghost ${chatOpen ? "active" : ""}`} style={{ color: chatOpen ? "var(--blue)" : "inherit", borderColor: chatOpen ? "var(--blue)" : "var(--border)" }} onClick={() => setChatOpen(!chatOpen)}>
            <Bot size={15} /> Agent Chat
          </button>
          <button className="primary" onClick={runGraph}><CirclePlay size={15} /> Execute workflow</button>
        </div>
      </header>

      <aside className="rail">
        {navItems.map((item) => {
          const Icon = item.id === "ide" ? Boxes : item.id === "flows" ? GitBranch : item.id === "templates" ? FileText : item.id === "settings" ? Database : Activity;
          return (
            <button key={item.id} className={activeView === item.id ? "rail-active" : ""} onClick={() => { setActiveView(item.id); if (item.id === "flows") fetchFlows(); }} title={item.label}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </aside>


      {activeView === "ide" ? (
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
        className="canvas"
        onPointerDown={beginPan}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
        onWheel={onWheel}
      >
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
          <button title="Reset zoom" onClick={() => setViewport({ x: 16, y: 30, scale: 0.52 })}>Fit</button>
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
                    event.stopPropagation();
                    setSelectedLinkId(link.id);
                    setSelectedId(null);
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
              <button onClick={addStarterNode}><Plus size={24} /></button>
              <strong>Start your agent</strong>
              <p>Add a first step, then drag from a node handle to connect agents, tools, and sub-agents.</p>
              <div>
                <button onClick={() => applyTemplate(workflowTemplates[1])}>Use sub-agent template</button>
                <button onClick={() => setActiveView("templates")}>Browse templates</button>
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
              onSelect={() => setSelectedId(node.id)}
              onBeginLink={(portId) => setLinkDraft({ sourceNode: node.id, sourcePort: portId })}
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

          <div style={{ display: "flex", gap: "4px", background: "var(--surface-soft)", padding: "4px", borderRadius: "8px", marginBottom: "14px" }}>
            <button 
              onClick={() => setChatMode("tester")}
              style={{ flex: 1, height: "30px", fontSize: "12px", borderRadius: "6px", fontWeight: "600", transition: "all 200ms ease", background: chatMode === "tester" ? "#ffffff" : "transparent", color: chatMode === "tester" ? "var(--blue)" : "var(--muted)", boxShadow: chatMode === "tester" ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}
            >
              Agent Tester
            </button>
            <button 
              onClick={() => setChatMode("copilot")}
              style={{ flex: 1, height: "30px", fontSize: "12px", borderRadius: "6px", fontWeight: "600", transition: "all 200ms ease", background: chatMode === "copilot" ? "#ffffff" : "transparent", color: chatMode === "copilot" ? "var(--blue)" : "var(--muted)", boxShadow: chatMode === "copilot" ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}
            >
              AI Copilot
            </button>
          </div>

          <div className="chat-messages" style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "14px", paddingRight: "4px" }}>
            {chatMessages.map((msg) => {
              const isUser = msg.role === "user";
              const workflow = parseJsonWorkflow(msg.text);

              return (
                <div key={msg.id} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "85%", display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "10px", color: "var(--muted)", alignSelf: isUser ? "flex-end" : "flex-start", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.03em" }}>
                    {isUser ? "You" : chatMode === "tester" ? "Workflow output" : "Flow assistant"}
                  </span>
                  <div style={{ background: isUser ? "var(--blue)" : "var(--surface-soft)", color: isUser ? "#ffffff" : "var(--text)", padding: "10px 14px", borderRadius: "12px", borderTopRightRadius: isUser ? "0" : "12px", borderTopLeftRadius: isUser ? "12px" : "0", fontSize: "13px", lineHeight: "1.5", whiteSpace: "pre-wrap", border: isUser ? "none" : "1px solid var(--border)" }}>
                    {msg.text}

                    {workflow && (
                      <button 
                        className="primary"
                        style={{ marginTop: "10px", width: "100%", height: "32px", fontSize: "11px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "var(--blue)", color: "white", borderRadius: "6px" }}
                        onClick={() => {
                          setNodes(normalizeNodes(workflow.nodes));
                          setLinks(workflow.links);
                          setStatus("Workflow imported from Copilot!");
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
              style={{ width: "44px", height: "44px", padding: "0", display: "grid", placeItems: "center", borderRadius: "8px" }}
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
                <label>Template<textarea value={selectedNode.data.template || ""} onChange={(event) => updateSelectedData("template", event.target.value)} /></label>
                <div className="chips">{scanTemplateVariables(selectedNode.data.template).map((item) => <span key={item}>{`{{${item}}}`}</span>)}</div>
              </>
            )}
            
            {selectedNode.type === "llm" && (
              <>
                <label>Provider
                  <select value={selectedNode.data.provider} onChange={(event) => updateSelectedData("provider", event.target.value)}>
                    {runtime.providers?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label>Model<input value={selectedNode.data.model} onChange={(event) => updateSelectedData("model", event.target.value)} /></label>
              </>
            )}
            
            {selectedNode.type === "vector" && (
              <>
                <label>Vector DB
                  <select value={selectedNode.data.vectorDatabase || ""} onChange={(event) => updateSelectedData("vectorDatabase", event.target.value)}>
                    <option value="">Select a Database Connection</option>
                    {runtime.databases?.map((db) => (
                      <option key={db.id} value={db.id}>{db.name} ({db.kind})</option>
                    ))}
                  </select>
                </label>
                <label>Collection<input value={selectedNode.data.collection} onChange={(event) => updateSelectedData("collection", event.target.value)} /></label>
                <label>Atlas Index<input value={selectedNode.data.index} onChange={(event) => updateSelectedData("index", event.target.value)} /></label>
              </>
            )}
            
            {selectedNode.type === "subagent" && (
              <>
                <label>Role<input value={selectedNode.data.role || ""} onChange={(event) => updateSelectedData("role", event.target.value)} placeholder="e.g. Specialist, Researcher" /></label>
                <label>Handoff / Instructions<textarea value={selectedNode.data.handoff || ""} onChange={(event) => updateSelectedData("handoff", event.target.value)} placeholder="Instructions for this agent" /></label>
                <label>Provider
                  <select value={selectedNode.data.provider || "openai"} onChange={(event) => updateSelectedData("provider", event.target.value)}>
                    {runtime.providers?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
                <label>Model<input value={selectedNode.data.model || "gpt-4o-mini"} onChange={(event) => updateSelectedData("model", event.target.value)} /></label>
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
                <div className="output-drawer-content">
                  {nodeStates[selectedNode.id] === "completed" 
                    ? (nodeOutputs[selectedNode.id]?.result || "(Empty Output)")
                    : (nodeOutputs[selectedNode.id]?.error || "Unknown Error occurred during node execution.")
                  }
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
            {graphNodes.map((node) => {
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

        {compiledCode && (
          <div style={{ marginTop: "20px" }}>
            <span className="panel-heading" style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", display: "block", marginBottom: "8px" }}>SDK Preview</span>
            <pre className="code-preview">{compiledCode.slice(0, 1200)}</pre>
          </div>
        )}

        <details className="logs" style={{ marginTop: "16px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
          <summary style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "var(--muted)", cursor: "pointer", userSelect: "none" }}>Raw Execution Stream</summary>
          <div style={{ marginTop: "8px", maxHeight: "150px", overflow: "auto" }}>
            {executionLog.map((entry, index) => <p key={`${entry}-${index}`} style={{ margin: "4px 0", padding: "6px", background: "var(--surface-soft)", borderRadius: "4px", fontSize: "11px", fontFamily: "Geist Mono" }}>{entry}</p>)}
          </div>
        </details>
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

function WorkspaceScreen({ view, nodes, links, logs, runtime, setRuntime, onOpenIde, onCreateNewAgent, onApplyTemplate, savedFlows, loadGraphById, deleteGraphById }) {
  const [selectedItem, setSelectedItem] = useState({ category: "providers", id: "openai" });

  const categoryList = runtime[selectedItem.category] || [];
  const activeResource = categoryList.find(item => item.id === selectedItem.id) || categoryList[0] || null;

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
        
        {savedFlows && savedFlows.length > 0 && (
          <div style={{ marginBottom: "32px" }}>
            <h3 style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px", fontWeight: 700 }}>Saved Workflows</h3>
            <div className="flow-grid" style={{ marginBottom: "20px" }}>
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
        )}

        <div>
          <h3 style={{ fontSize: "12px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px", fontWeight: 700 }}>Available Templates</h3>
          <div className="flow-grid">
            {workflowTemplates.map((template) => (
              <article className="flow-card" key={template.name}>
                <div><FileText size={18} /><strong>{template.name}</strong></div>
                <p>{template.description}</p>
                <button onClick={() => onApplyTemplate(template)}>Use template</button>
              </article>
            ))}
          </div>
        </div>
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
        <button className="ghost" onClick={onOpenIde}><Bot size={15} /> Back to IDE</button>
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
                    <label>Provider Type
                      <select 
                        value={activeResource.providerType || "openai"} 
                        onChange={e => handleUpdateItem("providers", activeResource.id, "providerType", e.target.value)}
                      >
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
                    <label>Database Type
                      <select 
                        value={activeResource.kind || "mongodb_atlas"} 
                        onChange={e => handleUpdateItem("databases", activeResource.id, "kind", e.target.value)}
                      >
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
              </div>
            </div>
          ) : (
            <div className="empty-settings-detail">
              <Boxes size={48} className="muted-icon" />
              <h3>No Resource Selected</h3>
              <p>Select a provider, database, or cache storage from the sidebar catalog to configure it, or click "+ Add" to create a new one.</p>
            </div>
          )}

          <div className="settings-panel notes-panel">
            <div className="panel-heading"><span>Assistant</span><h2>Implementation Notes</h2></div>
            <div className="note-list">
              <p><FileText size={16} /> Configurations are stored locally in the frontend state. Secrets like API Keys are transmitted securely during execution requests.</p>
              <p><Database size={16} /> Dynamic vector nodes and model references in your flow workspace will automatically adapt to configurations added here.</p>
            </div>
          </div>
        </section>
      </div>
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
