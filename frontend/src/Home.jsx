import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Braces,
  Check,
  CirclePlay,
  Cpu,
  ExternalLink,
  Github,
  Layers,
  Linkedin,
  RotateCcw,
  Sparkles,
  Video
} from "lucide-react";
import "./home.css";

const embedUrl = "https://drive.google.com/file/d/15Ec6bOf10d5qD48JdaKLwjaeo9tIhqdG/preview";

export function Home({ onLaunchIde, onOpenTemplates }) {
  const [activeSimNode, setActiveSimNode] = useState("input");
  const [simPlaying, setSimPlaying] = useState(true);
  const [simOutput, setSimOutput] = useState("");
  const simTimerRef = useRef(null);

  const canvasRef = useRef(null);
  const n1Ref = useRef(null);
  const n2Ref = useRef(null);
  const n3Ref = useRef(null);
  const n4Ref = useRef(null);

  const [coords, setCoords] = useState({
    inputToPrompt: "M 0 0 L 0 0",
    promptToLlm: "M 0 0 L 0 0",
    llmToOutput: "M 0 0 L 0 0"
  });

  const updateCoordinates = () => {
    if (!canvasRef.current || !n1Ref.current || !n2Ref.current || !n3Ref.current || !n4Ref.current) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const n1Rect = n1Ref.current.getBoundingClientRect();
    const n2Rect = n2Ref.current.getBoundingClientRect();
    const n3Rect = n3Ref.current.getBoundingClientRect();
    const n4Rect = n4Ref.current.getBoundingClientRect();

    const p1X = n1Rect.right - canvasRect.left;
    const p1Y = n1Rect.top + n1Rect.height / 2 - canvasRect.top;

    const p2X = n2Rect.left - canvasRect.left;
    const p2Y = n2Rect.top + n2Rect.height / 2 - canvasRect.top;

    const p3X = n2Rect.left + n2Rect.width / 2 - canvasRect.left;
    const p3Y = n2Rect.bottom - canvasRect.top;

    const p4X = n3Rect.left + n3Rect.width / 2 - canvasRect.left;
    const p4Y = n3Rect.top - canvasRect.top;

    const p5X = n3Rect.left - canvasRect.left;
    const p5Y = n3Rect.top + n3Rect.height / 2 - canvasRect.top;

    const p6X = n4Rect.right - canvasRect.left;
    const p6Y = n4Rect.top + n4Rect.height / 2 - canvasRect.top;

    setCoords({
      inputToPrompt: `M ${p1X} ${p1Y} L ${p2X} ${p2Y}`,
      promptToLlm: `M ${p3X} ${p3Y} L ${p4X} ${p4Y}`,
      llmToOutput: `M ${p5X} ${p5Y} L ${p6X} ${p6Y}`
    });
  };

  useEffect(() => {
    updateCoordinates();
    window.addEventListener("resize", updateCoordinates);

    const timer1 = setTimeout(updateCoordinates, 100);
    const timer2 = setTimeout(updateCoordinates, 400);
    const timer3 = setTimeout(updateCoordinates, 800);
    const timer4 = setTimeout(updateCoordinates, 1500);

    return () => {
      window.removeEventListener("resize", updateCoordinates);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [activeSimNode, simPlaying]);

  useEffect(() => {
    if (!simPlaying) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      return;
    }

    const sequence = ["input", "prompt", "llm", "output", "complete"];

    simTimerRef.current = setInterval(() => {
      setActiveSimNode((current) => {
        const nextIndex = (sequence.indexOf(current) + 1) % sequence.length;
        const nextNode = sequence[nextIndex];

        if (nextNode === "input") {
          setSimOutput("");
        } else if (nextNode === "complete") {
          setSimOutput("✨ Quantum physics is the study of how incredibly tiny particles act like waves! ⚛️");
        }

        return nextNode;
      });
    }, 2800);

    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, [simPlaying]);

  const handleRestartSim = () => {
    setActiveSimNode("input");
    setSimOutput("");
    setSimPlaying(true);
  };

  const handleSelectSimNode = (nodeId) => {
    setSimPlaying(false);
    setActiveSimNode(nodeId);
    if (nodeId === "complete" || nodeId === "output") {
      setSimOutput("✨ Quantum physics is the study of how incredibly tiny particles act like waves! ⚛️");
    } else {
      setSimOutput("");
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        <section className="hero-section">
          <div className="hero-text">
            <div className="hero-badge">
              <Sparkles size={14} /> Next-Gen Visual AI IDE
            </div>
            <h1>Visualize. Connect. Orchestrate.</h1>
            <p>
              PromptFlow Studio is a visual playground for designing, debugging, and compiling agentic AI pipelines.
              Drag nodes, draw connections, and turn complex graphs into production-ready Python SDK code.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={onLaunchIde}>
                Launch Studio <ArrowRight size={16} />
              </button>
              <a href="#video-demo" className="btn-secondary">
                <Video size={16} /> Watch Demo
              </a>
              {onOpenTemplates && (
                <button className="btn-ghost" onClick={onOpenTemplates}>
                  <CirclePlay size={16} /> Browse Templates
                </button>
              )}
            </div>
            <div className="hero-stats">
              <div>
                <strong>11</strong>
                <span>Node types</span>
              </div>
              <div>
                <strong>1-click</strong>
                <span>SDK compile</span>
              </div>
              <div>
                <strong>Live</strong>
                <span>Pipeline preview</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="interactive-simulator">
              <div className="simulator-header">
                <h3>
                  <Bot size={16} style={{ color: "var(--blue)" }} />
                  Simulated Pipeline
                </h3>
                <div className="simulator-header-actions">
                  <button onClick={handleRestartSim} title="Restart flow animation" className="icon-button">
                    <RotateCcw size={13} />
                  </button>
                  <div className="simulator-pulse-dot" />
                </div>
              </div>

              <div className="simulator-canvas" ref={canvasRef}>
                <svg className="simulator-svg">
                  <path
                    d={coords.inputToPrompt}
                    className={["prompt", "llm", "output", "complete"].includes(activeSimNode) ? "active-path" : ""}
                  />
                  <path
                    d={coords.promptToLlm}
                    className={["llm", "output", "complete"].includes(activeSimNode) ? "active-path" : ""}
                  />
                  <path
                    d={coords.llmToOutput}
                    className={["output", "complete"].includes(activeSimNode) ? "active-path" : ""}
                  />
                </svg>

                <div
                  ref={n1Ref}
                  className={`sim-node sim-node-input ${activeSimNode === "input" ? "active-node" : ""}`}
                  onClick={() => handleSelectSimNode("input")}
                >
                  <header>
                    <div className="sim-node-icon"><Braces size={10} /></div>
                    <strong>User Input</strong>
                  </header>
                  <p>key: "query"</p>
                  <p>val: "Explain quantum..."</p>
                  <div className="sim-node-tooltip">
                    <strong>Input Node</strong>: Passes runtime string variables into prompt templates.
                  </div>
                </div>

                <div
                  ref={n2Ref}
                  className={`sim-node sim-node-prompt ${activeSimNode === "prompt" ? "active-node" : ""}`}
                  onClick={() => handleSelectSimNode("prompt")}
                >
                  <header>
                    <div className="sim-node-icon"><Sparkles size={10} /></div>
                    <strong>Instructions</strong>
                  </header>
                  <p>template: "Explain..."</p>
                  <p>vars: {"{query}"}</p>
                  <div className="sim-node-tooltip">
                    <strong>Prompt Node</strong>: Structures raw input into robust system instructions.
                  </div>
                </div>

                <div
                  ref={n3Ref}
                  className={`sim-node sim-node-llm ${activeSimNode === "llm" ? "active-node" : ""}`}
                  onClick={() => handleSelectSimNode("llm")}
                >
                  <header>
                    <div className="sim-node-icon"><BrainCircuit size={10} /></div>
                    <strong>OpenAI LLM</strong>
                  </header>
                  <p>model: gpt-4o-mini</p>
                  <p>temp: 0.3</p>
                  <div className="sim-node-tooltip">
                    <strong>LLM Node</strong>: Sends prompts to API endpoints and captures outputs.
                  </div>
                </div>

                <div
                  ref={n4Ref}
                  className={`sim-node sim-node-output ${activeSimNode === "output" || activeSimNode === "complete" ? "active-node" : ""}`}
                  onClick={() => handleSelectSimNode("output")}
                >
                  <header>
                    <div className="sim-node-icon"><Check size={10} /></div>
                    <strong>Final Output</strong>
                  </header>
                  <p>status: {activeSimNode === "complete" ? "success" : "waiting"}</p>
                  <div className="sim-node-tooltip">
                    <strong>Output Node</strong>: Final terminal step showing your compiled result.
                  </div>
                </div>
              </div>

              {simOutput && (
                <div className="sim-output-panel">
                  <strong>Pipeline Stream Output</strong>
                  {simOutput}
                </div>
              )}

              <button className="simulator-trigger" onClick={() => (simPlaying ? setSimPlaying(false) : handleRestartSim())}>
                {simPlaying ? "Pause Simulator" : "Play Simulation"}
              </button>
            </div>
          </div>
        </section>

        <section className="section-block">
          <div className="section-title">
            <span>Visual Pipeline Creator</span>
            <h2>Supercharge AI Architectures</h2>
          </div>

          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-icon-wrapper"><Layers size={20} /></div>
              <h3>Drag-and-Drop Canvas</h3>
              <p>Easily construct and customize pipeline logic by physically routing nodes together. Graph loop protection blocks circular dependencies.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Cpu size={20} /></div>
              <h3>Multi-Provider AI Runtime</h3>
              <p>Inject API keys and model parameters. Support for OpenAI, Google Gemini, NVIDIA NIM, OpenRouter, and local Ollama frameworks.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Braces size={20} /></div>
              <h3>One-Click SDK Compilation</h3>
              <p>Convert your visual pipeline graph into standard, production-ready Python SDK code. Run natively in any Python application.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Bot size={20} /></div>
              <h3>Collaborating Sub-Agents</h3>
              <p>Branch work down into nested sub-agents, configuring system prompts and instructions for specialized orchestration.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><BrainCircuit size={20} /></div>
              <h3>Live Prompt Testing</h3>
              <p>Stream execution state step-by-step. Pinpoint errors, review node timing, and watch output stream back in real time.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Sparkles size={20} /></div>
              <h3>Beautiful Built-in Home</h3>
              <p>A polished landing page welcomes users before they enter the studio, with a clear demo video and strong visual hierarchy.</p>
            </article>
          </div>
        </section>

        <section id="video-demo" className="video-section">
          <div className="section-title">
            <span>Feature Demonstration</span>
            <h2>Watch PromptFlow Studio in Action</h2>
          </div>

          <div className="video-container-card">
            <div className="video-frame-outer">
              <iframe
                src={embedUrl}
                className="video-iframe"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title="PromptFlow Studio Demo Video"
              />
            </div>
          </div>
        </section>

        <section className="author-section">
          <div className="section-title">
            <span>The Architect</span>
            <h2>Meet the Author</h2>
          </div>

          <div className="author-card-container">
            <div className="author-visual-panel">
              <div className="author-avatar-frame">
                <div className="author-avatar-inner">
                  <img
                    src="/DP.jpeg"
                    alt="Rakshit Rangarajan"
                    className="author-avatar-image"
                  />
                </div>
              </div>
              <h3>Rakshit Rangarajan</h3>
              <span>AI Engineer & Architect</span>
            </div>

            <div className="author-bio-panel">
              <h2>Rakshit Rangarajan</h2>
              <p>
                A passionate software developer dedicated to crafting beautiful, high-fidelity engineering toolsets and
                visual prompt orchestrations. PromptFlow Studio was built to make it easier to construct, validate, and
                compile production-ready, model-agnostic AI agent graphs.
              </p>

              <div className="author-skills">
                <span>React.js</span>
                <span>Vite</span>
                <span>FastAPI</span>
                <span>Python</span>
                <span>Agentic AI</span>
                <span>MongoDB Atlas Vector Search</span>
                <span>RAG Pipelines</span>
                <span>UX Engineering</span>
              </div>

              <div className="author-social-row">
                <a
                  href="https://www.linkedin.com/in/rakshit-rangarajan/"
                  className="social-btn btn-linkedin"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Linkedin size={15} /> LinkedIn <ExternalLink size={11} />
                </a>

                <a
                  href="https://github.com/Rakshit-Rangarajan"
                  className="social-btn btn-github"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github size={15} /> GitHub <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
