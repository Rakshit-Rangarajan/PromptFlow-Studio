import React, { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Bot,
  BrainCircuit,
  Database,
  Braces,
  Check,
  CirclePlay,
  Cpu,
  ExternalLink,
  Github,
  Layers,
  Linkedin,
  Play,
  RotateCcw,
  Sparkles,
  Video
} from "lucide-react";

export function Home({ onLaunchIde, onOpenTemplates }) {
  // Hardcoded 1080p Walkthrough Video embed link (no config panel shown)
  const embedUrl = "https://drive.google.com/file/d/15Ec6bOf10d5qD48JdaKLwjaeo9tIhqdG/preview";

  // Contact form state and submit logic
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });
  const [contactSuccess, setContactSuccess] = useState(false);

  const handleContactSubmit = (e) => {
    e.preventDefault();
    
    const recipient = "rakshitr2000@gmail.com";
    const subject = encodeURIComponent(`Visitor Notification: ${contactForm.name} visited PromptFlow Studio`);
    const body = encodeURIComponent(
      `Hello Rakshit,\n\nThis person has visited your website and wanted to get in touch!\n\nName: ${contactForm.name}\nEmail: ${contactForm.email}\n\nMessage:\n${contactForm.message}\n\nSent from: PromptFlow Studio Portfolio`
    );
    
    // Open standard mailto system handler
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
    
    // Trigger animated UI success feedback
    setContactSuccess(true);
    setTimeout(() => {
      setContactSuccess(false);
      setContactForm({ name: "", email: "", message: "" });
    }, 4000);
  };

  // Simulated node state machine for visual interactive canvas
  const [activeSimNode, setActiveSimNode] = useState("input");
  const [simPlaying, setSimPlaying] = useState(true);
  const [simOutput, setSimOutput] = useState("");
  const simTimerRef = useRef(null);

  // References and layout measuring state for precise SVG coordinates
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

    // Node 1 (Input) right center port
    const p1X = n1Rect.right - canvasRect.left;
    const p1Y = n1Rect.top + n1Rect.height / 2 - canvasRect.top;

    // Node 2 (Prompt/Instructions) left center port
    const p2X = n2Rect.left - canvasRect.left;
    const p2Y = n2Rect.top + n2Rect.height / 2 - canvasRect.top;

    // Node 2 bottom center port
    const p3X = n2Rect.left + n2Rect.width / 2 - canvasRect.left;
    const p3Y = n2Rect.bottom - canvasRect.top;

    // Node 3 (LLM) top center port
    const p4X = n3Rect.left + n3Rect.width / 2 - canvasRect.left;
    const p4Y = n3Rect.top - canvasRect.top;

    // Node 3 left center port
    const p5X = n3Rect.left - canvasRect.left;
    const p5Y = n3Rect.top + n3Rect.height / 2 - canvasRect.top;

    // Node 4 (Output) right center port
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
    
    // Multiple layout passes to settle relative spacing accurately
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

  // Node simulator state loop
  useEffect(() => {
    if (!simPlaying) {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
      return;
    }

    const simNodesSequence = ["input", "prompt", "llm", "output", "complete"];
    
    simTimerRef.current = setInterval(() => {
      setActiveSimNode((current) => {
        const nextIndex = (simNodesSequence.indexOf(current) + 1) % simNodesSequence.length;
        const nextNode = simNodesSequence[nextIndex];
        
        // Dynamic simulated results based on current stage
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
        
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="hero-text">
            <div className="hero-badge">
              <Sparkles size={14} /> Next-Gen Visual AI IDE
            </div>
            <h1>Visualize. Connect. Orchestrate.</h1>
            <p>
              PromptFlow Studio is the ultimate visual playground for building, debugging, and compiling complex agentic AI pipelines. Drag nodes, draw connections, wire up vector indexes, and compile raw graphs into production-ready Python SDK code.
            </p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={onLaunchIde}>
                Launch Studio <ArrowRight size={16} />
              </button>
              <a href="#video-demo" className="btn-secondary">
                <Video size={16} /> Watch Demo
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="interactive-simulator">
              <div className="simulator-header">
                <h3>
                  <Bot size={16} style={{ color: "var(--blue)" }} /> 
                  Simulated Pipeline
                </h3>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button 
                    onClick={handleRestartSim} 
                    title="Restart flow animation"
                    style={{ color: "var(--muted)", cursor: "pointer", display: "grid", placeItems: "center" }}
                  >
                    <RotateCcw size={13} />
                  </button>
                  <div className="simulator-pulse-dot" />
                </div>
              </div>

              <div className="simulator-canvas" ref={canvasRef}>
                {/* SVG connection pipelines */}
                <svg className="simulator-svg">
                  {/* Input to Prompt */}
                  <path 
                    d={coords.inputToPrompt} 
                    className={["prompt", "llm", "output", "complete"].includes(activeSimNode) ? "active-path" : ""} 
                  />
                  {/* Prompt to LLM */}
                  <path 
                    d={coords.promptToLlm} 
                    className={["llm", "output", "complete"].includes(activeSimNode) ? "active-path" : ""} 
                  />
                  {/* LLM to Output */}
                  <path 
                    d={coords.llmToOutput} 
                    className={["output", "complete"].includes(activeSimNode) ? "active-path" : ""} 
                  />
                </svg>

                {/* Input node */}
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

                {/* Prompt node */}
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

                {/* LLM node */}
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

                {/* Output node */}
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
                <div 
                  style={{
                    position: "absolute",
                    inset: "auto 24px 24px 24px",
                    background: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "10px",
                    padding: "10px 14px",
                    color: "#f1f5f9",
                    fontSize: "11px",
                    lineHeight: "1.4",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                    animation: "slideUp 200ms ease",
                    zIndex: 4
                  }}
                >
                  <strong style={{ color: "#38bdf8", display: "block", marginBottom: "2px" }}>Pipeline Stream Output</strong>
                  {simOutput}
                </div>
              )}

              <button 
                className="simulator-trigger"
                onClick={() => {
                  if (simPlaying) {
                    setSimPlaying(false);
                  } else {
                    handleRestartSim();
                  }
                }}
              >
                {simPlaying ? "Pause Simulator" : "Play Simulation"}
              </button>
            </div>
          </div>
        </section>

        {/* CORE CAPABILITIES GRID */}
        <section style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
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
              <p>Inject raw API keys and model parameters. Support for OpenAI, Google Gemini, NVIDIA NIM, OpenRouter, and local Ollama frameworks.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Database size={20} /></div>
              <h3>Vector Search RAG Integration</h3>
              <p>Plug MongoDB Atlas or custom vector databases directly into your graph to fetch contextual chunks and build fully grounded prompts.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Braces size={20} /></div>
              <h3>One-Click SDK Compilation</h3>
              <p>Convert your complex visual pipeline graph into standard, production-ready Python SDK code. Run natively in any Python application.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Bot size={20} /></div>
              <h3>Collaborating Sub-Agents</h3>
              <p>Branch work down into nested sub-agents, configuring system prompts and instructions for specialized pipeline orchestration.</p>
            </article>

            <article className="feature-card">
              <div className="feature-icon-wrapper"><Sparkles size={20} /></div>
              <h3>Real-Time Prompt Testing</h3>
              <p>Stream execution state step-by-step. Pinpoint errors, review precise node durations, and view raw tokens as they stream back live.</p>
            </article>
          </div>
        </section>

        {/* GOOGLE DRIVE VIDEO SHOWCASE */}
        <section id="video-demo" className="video-section">
          <div className="section-title">
            <span>Feature Demonstration</span>
            <h2>Watch PromptFlow Studio in Action</h2>
          </div>

          <div className="video-container-card" style={{ padding: "0", border: "none", background: "transparent" }}>
            {/* Video frame with aspect ratio - Defaults to 1080p layout */}
            <div className="video-frame-outer">
              <iframe 
                src={embedUrl}
                className="video-iframe"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title="PromptFlow Studio Demo Video"
              />
            </div>
          </div>
        </section>

        {/* MEET THE AUTHOR - RAKSHIT RANGARAJAN */}
        <section className="author-section">
          <div className="section-title">
            <span>The Architect</span>
            <h2>Meet the Author</h2>
          </div>

          <div className="author-card-container">
            {/* Left Visual Banner */}
            <div className="author-visual-panel">
              <div className="author-avatar-frame">
                <div className="author-avatar-inner">
                  <img 
                    src="/DP.jpeg" 
                    alt="Rakshit Rangarajan" 
                    style={{ 
                      width: "100%", 
                      height: "100%", 
                      objectFit: "cover", 
                      borderRadius: "50%" 
                    }} 
                  />
                </div>
              </div>
              <h3>Rakshit Rangarajan</h3>
              <span>AI Engineer & Architect</span>
            </div>

            {/* Right Biography Panel */}
            <div className="author-bio-panel">
              <h2>Rakshit Rangarajan</h2>
              <p>
                A passionate software developer dedicated to crafting beautiful, high-fidelity engineering toolsets and visual prompt orchestrations. Rakshit built PromptFlow Studio to solve the complexity of constructing, validating, and compiling production-ready, model-agnostic AI agent graphs.
              </p>
              
              <div className="author-skills">
                <span>React.js</span>
                <span>Vite</span>
                <span>FastAPI</span>
                <span>Python</span>
                <span>Agentic AI Architectures</span>
                <span>MongoDB Atlas Vector Search</span>
                <span>RAG Pipelines</span>
                <span>User Experience Engineering</span>
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

                <a 
                  href="https://rakshitr.co.in" 
                  className="social-btn btn-website"
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <Cpu size={15} /> Website <ExternalLink size={11} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT ME FORM */}
        <section className="contact-section">
          <div className="section-title">
            <span>Collaborate</span>
            <h2>Get In Touch</h2>
          </div>

          <div className="contact-card-container">
            <form onSubmit={handleContactSubmit} className="contact-form">
              <div className="contact-row">
                <div className="contact-field">
                  <label htmlFor="contact-name">Your Name</label>
                  <input 
                    type="text" 
                    id="contact-name"
                    value={contactForm.name}
                    onChange={(e) => setContactForm(curr => ({ ...curr, name: e.target.value }))}
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-email">Your Email</label>
                  <input 
                    type="email" 
                    id="contact-email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm(curr => ({ ...curr, email: e.target.value }))}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>
                <textarea 
                  id="contact-message"
                  value={contactForm.message}
                  onChange={(e) => setContactForm(curr => ({ ...curr, message: e.target.value }))}
                  placeholder="Type your message here..."
                  required
                />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "max-content", alignSelf: "flex-start" }}>
                Send Message <ArrowRight size={16} />
              </button>

              {contactSuccess && (
                <div className="contact-success-msg">
                  <Check size={14} /> <strong>Thank you, {contactForm.name}!</strong> Your default mail client has been opened to transmit your message.
                </div>
              )}
            </form>
          </div>
        </section>

      </div>
    </div>
  );
}
