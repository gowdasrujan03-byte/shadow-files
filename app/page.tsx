"use client";

import { useMemo, useState } from "react";
import {
  ArrowDown, ArrowRight, ArrowUpRight, AudioLines, ChevronDown, CircleHelp,
  Compass, Crosshair, Flag, Footprints, Gamepad2, MapPin, Menu, Plus,
  QrCode, Radio, Search, Shield, ShieldAlert, Sparkles, Target, Users, X,
  Zap, Copy, Check, Clock3, Trophy, ScanLine
} from "lucide-react";

type Mode = {
  id: string; number: string; title: string; category: string; description: string;
  players: string; duration: string; icon: typeof Crosshair; accent: string;
  tag: string; details: string[];
};

const modes: Mode[] = [
  {
    id: "hunt", number: "01", title: "Hunt the Shadow", category: "CHASE · STRATEGY",
    description: "One player disappears into the crowd. Track the clues, read the moves and find the Shadow before time runs out.",
    players: "6–20 PLAYERS", duration: "20–30 MIN", icon: Crosshair, accent: "red",
    tag: "MOST PLAYED", details: ["One secret Shadow is assigned", "Follow clue drops across the play zone", "Tag safely inside the marked game area"]
  },
  {
    id: "mystery", number: "02", title: "Mystery Hunters", category: "INVESTIGATION · TEAMWORK",
    description: "Split into crews, search checkpoints and piece together a case that nobody can solve alone.",
    players: "4–20 PLAYERS", duration: "25–40 MIN", icon: Search, accent: "gold",
    tag: "TEAM MODE", details: ["Scan or discover physical checkpoints", "Collect different pieces of evidence", "Submit your team's final theory"]
  },
  {
    id: "tag", number: "03", title: "Shadow Tag", category: "MOVEMENT · QUICK PLAY",
    description: "A tactical outdoor chase with secret roles, changing objectives and a shrinking safe zone.",
    players: "6–20 PLAYERS", duration: "15–25 MIN", icon: Footprints, accent: "blue",
    tag: "HIGH ENERGY", details: ["Choose a clearly marked safe play area", "Complete objectives while avoiding tags", "No tackling, pushing or entering roads"]
  },
  {
    id: "double", number: "04", title: "Double Agent", category: "DECEPTION · SOCIAL",
    description: "Work together in public. Keep your private mission hidden. Discover who is quietly changing the plan.",
    players: "6–16 PLAYERS", duration: "20–30 MIN", icon: ShieldAlert, accent: "purple",
    tag: "MIND GAME", details: ["Every player gets a private objective", "Trade information and test trust", "Expose contradictions before the final vote"]
  },
  {
    id: "escape", number: "05", title: "Escape the Zone", category: "PUZZLES · RACE",
    description: "A team race against the clock. Find the markers, solve the chain of puzzles and unlock the exit.",
    players: "4–24 PLAYERS", duration: "20–35 MIN", icon: Flag, accent: "green",
    tag: "CO-OP", details: ["Follow a trail of location-based puzzles", "Each solved clue unlocks the next", "Finish together before the countdown ends"]
  },
];

const features = [
  { icon: QrCode, title: "SCAN TO JOIN", text: "Get your crew into the same match with a room code or QR invite." },
  { icon: MapPin, title: "PLAY OUTSIDE", text: "Use parks, campuses and sports grounds as your real-world game map." },
  { icon: Radio, title: "LIVE MISSIONS", text: "Receive objectives and updates on your phone as the match unfolds." },
];

function makeCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.floor(10 + Math.random() * 90);
}

export default function Home() {
  const [activeMode, setActiveMode] = useState<Mode>(modes[0]);
  const [modal, setModal] = useState<"create" | "join" | "details" | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joined, setJoined] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");

  const selectedCount = useMemo(() => activeMode.players, [activeMode]);

  function openCreate(mode = activeMode) {
    setActiveMode(mode); setCreatedCode(makeCode()); setJoined(false); setModal("create");
  }
  function handleJoin() {
    if (roomCode.trim().length < 4 || !playerName.trim()) {
      setNotice("Enter your player name and a valid room code to continue.");
      return;
    }
    setJoined(true); setNotice("");
  }
  async function copyCode() {
    try { await navigator.clipboard.writeText(createdCode); setCopied(true); }
    catch { setCopied(false); setNotice("Copy isn't available here. Share the code manually."); }
  }

  return (
    <main>
      <div className="topline"><span className="live-dot" /> REAL-WORLD MULTIPLAYER · EARLY ACCESS CONCEPT <span className="topline-right">BUILT FOR YOUR CREW <ArrowUpRight size={12}/></span></div>
      <header className="nav shell">
        <a className="brand" href="#" aria-label="Shadow Files home">
          <span className="brand-mark"><Crosshair size={23} strokeWidth={1.8}/></span>
          <span>SHADOW<span className="brand-red">FILES</span><small>THE REAL WORLD IS YOUR GAME</small></span>
        </a>
        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <a href="#games" onClick={() => setMobileMenu(false)}>EXPLORE GAMES</a>
          <a href="#how" onClick={() => setMobileMenu(false)}>HOW TO PLAY</a>
          <a href="#safety" onClick={() => setMobileMenu(false)}>PLAY SAFE</a>
        </nav>
        <div className="nav-actions">
          <button className="btn btn-quiet nav-join" onClick={() => setModal("join")}>JOIN A GAME</button>
          <button className="btn btn-red nav-create" onClick={() => openCreate()}><Plus size={15}/> CREATE ROOM</button>
        </div>
        <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button>
      </header>

      <section className="hero shell">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line"/> YOUR CITY. YOUR CREW. YOUR MISSION.</div>
          <h1>THE REAL<br/>WORLD IS<br/><em>YOUR GAME.</em></h1>
          <p className="hero-lead">Forget the screen. Bring your friends together, step outside and turn the places you know into missions, mysteries and memories.</p>
          <div className="hero-buttons">
            <button className="btn btn-red btn-large" onClick={() => openCreate()}><Zap size={17} fill="currentColor"/> START A GAME <ArrowRight size={17}/></button>
            <a className="btn btn-outline btn-large" href="#games">EXPLORE MODES <ArrowDown size={16}/></a>
          </div>
          <div className="hero-proof"><div className="avatar-stack"><i>J</i><i>A</i><i>K</i><i>+</i></div><span>MADE FOR FRIEND GROUPS</span><b>·</b><span>NO CONSOLE NEEDED</span></div>
        </div>
        <div className="hero-art">
          <div className="art-grid"></div>
          <div className="art-glow"></div>
          <div className="hero-image">
            <div className="image-label"><span className="live-dot"/> FIELD REPORT 001 <span>·</span> BLACKWOOD PARK</div>
            <div className="image-bottom"><span>MISSION AREA</span><strong>UNKNOWN TERRITORY</strong></div>
          </div>
          <div className="floating-card card-top"><span className="mini-icon"><Target size={15}/></span><div><small>OBJECTIVE UNLOCKED</small><b>Find the signal</b></div><span className="card-check">✓</span></div>
          <div className="floating-card card-bottom"><span className="signal-icon"><AudioLines size={18}/></span><div><small>YOUR CREW IS READY</small><b>Waiting for players...</b></div><span className="signal-bars"><i/><i/><i/><i/></span></div>
          <div className="art-coordinate">12°58' N &nbsp; 77°35' E <span> // </span> FIELD SIMULATION</div>
        </div>
        <div className="hero-index"><span>01</span><i></i><span>05</span></div>
      </section>

      <section className="ticker" aria-label="Game features">
        <div className="ticker-track"><span><Crosshair/> REAL-WORLD MISSIONS</span><b>✳</b><span><Users/> FRIENDS & CREWS</span><b>✳</b><span><MapPin/> OUTDOOR PLAY</span><b>✳</b><span><Shield/> SECRET OBJECTIVES</span><b>✳</b><span><Crosshair/> REAL-WORLD MISSIONS</span><b>✳</b><span><Users/> FRIENDS & CREWS</span></div>
      </section>

      <section className="games-section shell" id="games">
        <div className="section-head">
          <div><div className="eyebrow"><span className="eyebrow-line"/> CHOOSE YOUR MISSION</div><h2>WHAT'S THE<br/><em>PLAY TODAY?</em></h2></div>
          <p>Every mode turns your real-world surroundings into a different kind of challenge. Pick a mission, gather your crew and make it happen.</p>
        </div>
        <div className="mode-grid">
          {modes.map((mode) => {
            const Icon = mode.icon;
            return <article className={`mode-card ${mode.accent}`} key={mode.id}>
              <div className="mode-top"><span className="mode-number">SF / {mode.number}</span><span className="mode-tag">{mode.tag}</span></div>
              <div className="mode-icon"><Icon size={25} strokeWidth={1.6}/></div>
              <div className="mode-info"><span className="mode-category">{mode.category}</span><h3>{mode.title}</h3><p>{mode.description}</p></div>
              <div className="mode-meta"><span><Users size={13}/>{mode.players}</span><span><Clock3 size={13}/>{mode.duration}</span></div>
              <div className="mode-actions"><button onClick={() => {setActiveMode(mode); setModal("details");}}>MISSION BRIEF <ArrowUpRight size={15}/></button><button className="mode-play" aria-label={`Start ${mode.title}`} onClick={() => openCreate(mode)}><ArrowRight size={18}/></button></div>
            </article>;
          })}
        </div>
      </section>

      <section className="how-section" id="how">
        <div className="shell how-inner">
          <div className="how-heading"><div className="eyebrow"><span className="eyebrow-line"/> SIMPLE TO START</div><h2>THREE STEPS.<br/><em>ONE BIG STORY.</em></h2><p>No special gear. No complicated setup. Just your phone, your people and a place to play.</p></div>
          <div className="steps">
            {features.map((f, i) => { const Icon = f.icon; return <div className="step" key={f.title}><div className="step-count">0{i+1}</div><div className="step-icon"><Icon size={23}/></div><div><h3>{f.title}</h3><p>{f.text}</p></div><ArrowUpRight className="step-arrow" size={18}/></div>; })}
          </div>
        </div>
      </section>

      <section className="field-section shell" id="safety">
        <div className="field-card">
          <div className="field-copy"><div className="eyebrow"><span className="eyebrow-line"/> BEFORE YOU DEPLOY</div><h2>PLAY BIG.<br/><em>PLAY SAFE.</em></h2><p>Choose a permitted play area, set clear boundaries and keep the game away from roads, water and restricted spaces. The best mission is one everyone gets home from.</p><a href="#safety-notes" className="text-link">FIELD SAFETY RULES <ArrowUpRight size={15}/></a></div>
          <div className="field-stats"><div><Shield size={22}/><b>SAFE ZONES</b><span>Mark your play boundary</span></div><div><Users size={22}/><b>CREW FIRST</b><span>Respect every player</span></div><div><MapPin size={22}/><b>PERMITTED PLACES</b><span>Get permission to play</span></div></div>
        </div>
        <div className="safety-note" id="safety-notes"><ShieldAlert size={16}/> SHADOW FILES is designed for supervised, consent-based outdoor play. No trespassing, dangerous chasing, physical contact or road crossings.</div>
      </section>

      <section className="final-cta shell">
        <div className="eyebrow"><span className="eyebrow-line"/> THE FIELD IS WAITING</div>
        <h2>YOUR CREW.<br/><em>YOUR RULES.</em></h2>
        <button className="btn btn-red btn-large" onClick={() => openCreate()}><Plus size={17}/> CREATE YOUR FIRST ROOM <ArrowRight size={17}/></button>
        <span className="cta-note">FREE TO START · NO DOWNLOAD REQUIRED FOR THE WEB PROTOTYPE</span>
      </section>

      <footer className="footer shell"><a className="brand footer-brand" href="#"><span className="brand-mark"><Crosshair size={20}/></span><span>SHADOW<span className="brand-red">FILES</span><small>THE REAL WORLD IS YOUR GAME</small></span></a><span>© 2026 SHADOW FILES · CONCEPT PROTOTYPE</span><a href="#top" onClick={(e) => {e.preventDefault(); window.scrollTo({top:0,behavior:"smooth"});}}>BACK TO TOP ↑</a></footer>

      {modal && <div className="modal-backdrop" onMouseDown={(e) => {if (e.target === e.currentTarget) setModal(null);}}>
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <button className="modal-close" onClick={() => setModal(null)} aria-label="Close"><X size={20}/></button>
          {modal === "create" && <>
            <div className="modal-kicker"><span className="live-dot"/> NEW FIELD SESSION</div>
            <h2 id="modal-title">CREATE A<br/><em>GAME ROOM.</em></h2>
            <p className="modal-desc">Your room is ready to set up. Choose a mission and share the invite code with your crew.</p>
            <label className="field-label">SELECT MISSION</label>
            <select value={activeMode.id} onChange={(e) => setActiveMode(modes.find(m => m.id === e.target.value) || modes[0])}>
              {modes.map(m => <option value={m.id} key={m.id}>{m.title}</option>)}
            </select>
            <div className="room-code-box"><span>YOUR ROOM CODE</span><strong>{createdCode}</strong><button onClick={copyCode} aria-label="Copy room code">{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? "COPIED" : "COPY"}</button></div>
            <div className="modal-info"><Users size={16}/> {activeMode.players} <span>·</span><Clock3 size={16}/> {activeMode.duration}</div>
            <button className="btn btn-red btn-full" onClick={() => {setModal(null); setNotice("Demo room created. Live multiplayer hosting will be connected in the next build.");}}>CREATE DEMO ROOM <ArrowRight size={17}/></button>
            <small className="prototype-note">Prototype only: this creates a local demo state, not a live online room yet.</small>
          </>}
          {modal === "join" && <>
            <div className="modal-kicker"><span className="live-dot"/> CREW INVITATION</div>
            <h2 id="modal-title">JOIN THE<br/><em>MISSION.</em></h2>
            {!joined ? <>
              <p className="modal-desc">Got a code from your crew? Enter it below to get ready to play.</p>
              <label className="field-label">YOUR PLAYER NAME</label>
              <input value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Enter your name" maxLength={18}/>
              <label className="field-label">ROOM CODE</label>
              <input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} placeholder="e.g. K7PD-42" maxLength={12}/>
              {notice && <p className="form-notice">{notice}</p>}
              <button className="btn btn-red btn-full" onClick={handleJoin}>CONTINUE <ArrowRight size={17}/></button>
              <small className="prototype-note">Room-code validation will connect to the live game server in a later milestone.</small>
            </> : <div className="join-success"><div className="success-icon"><Check size={27}/></div><h3>YOU'RE ON THE LIST, {playerName.toUpperCase()}.</h3><p>Room code <b>{roomCode}</b> is entered. Live room lookup is coming in the multiplayer build.</p><button className="btn btn-outline btn-full" onClick={() => {setJoined(false); setModal(null);}}>BACK TO HOMEPAGE</button></div>}
          </>}
          {modal === "details" && <>
            <div className="modal-kicker"><span className="live-dot"/> MISSION BRIEF · SF / {activeMode.number}</div>
            <h2 id="modal-title">{activeMode.title.split(" ").slice(0,-1).join(" ")}<br/><em>{activeMode.title.split(" ").slice(-1)}</em></h2>
            <p className="modal-desc">{activeMode.description}</p>
            <div className="brief-meta"><span><Users size={15}/>{activeMode.players}</span><span><Clock3 size={15}/>{activeMode.duration}</span></div>
            <label className="field-label">MISSION OBJECTIVES</label>
            <ul className="objective-list">{activeMode.details.map(d => <li key={d}><Check size={15}/>{d}</li>)}</ul>
            <button className="btn btn-red btn-full" onClick={() => openCreate(activeMode)}>CREATE THIS GAME <ArrowRight size={17}/></button>
          </>}
        </div>
      </div>}
      {notice && !modal && <div className="toast"><Sparkles size={16}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
    </main>
  );
}
