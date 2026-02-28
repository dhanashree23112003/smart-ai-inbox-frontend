import { useState, useEffect } from "react";

const API = "https://dhanashree2311-smart-ai-inbox.hf.space";

const MOCK_EMAILS = [
  { id: 1, subject: "Q4 Budget Review - Action Required", sender: "Sarah Chen", priority: "HIGH", summary: "Please review and approve the Q4 allocation before end of week. Finance needs sign-off on the revised projections.", importance_score: 92, deadline: new Date(Date.now() + 3 * 36e5).toISOString(), reason: "Urgency signal detected. Action required. Deadline present." },
  { id: 2, subject: "Partnership Proposal — Nexus Labs", sender: "Marcus Webb", priority: "HIGH", summary: "Following our call last Tuesday, I've attached the revised terms. Looking forward to moving this forward.", importance_score: 85, deadline: new Date(Date.now() + 26 * 36e5).toISOString(), reason: "High urgency. Financial content. Action required." },
  { id: 3, subject: "Design System v2.0 Handoff", sender: "Priya Nair", priority: "MEDIUM", summary: "The Figma files are ready. Component library is fully documented. Handoff tokens are exported.", importance_score: 58, deadline: new Date(Date.now() + 50 * 36e5).toISOString(), reason: "Moderate relevance. Deadline present." },
  { id: 4, subject: "Team Offsite Planning — Vote Required", sender: "Jordan Okafor", priority: "MEDIUM", summary: "We need 3 more votes to finalize the location. Current top picks are Lisbon and Medellin.", importance_score: 49, deadline: null, reason: "Action required. Internal sender." },
  { id: 5, subject: "Monthly Digest: Product Updates", sender: "Product Team", priority: "LOW", summary: "This month we shipped dark mode, AI summaries, and the new onboarding flow. Here's what's coming.", importance_score: 18, deadline: null, reason: "Newsletter/digest pattern." },
  { id: 6, subject: "Invoice #4821 — Overdue Notice", sender: "Billing Dept", priority: "HIGH", summary: "Invoice #4821 for $2,400 remains unpaid. Please action immediately to avoid service interruption.", importance_score: 88, deadline: new Date(Date.now() + 8 * 36e5).toISOString(), reason: "Financial content. Urgency signal. Deadline present." },
];

const MOCK_AI = {
  default:   "I found **3 upcoming deadlines** in your inbox:\n\n• **Today 5:00 PM** — Q4 Budget Review (Sarah Chen)\n• **Tomorrow 12:00 PM** — Partnership Proposal (Marcus Webb)\n• **Today EOD** — Invoice #4821 (Billing Dept)\n\nWould you like me to draft replies?",
  deadlines: "Your upcoming deadlines:\n\n🔴 **Today 5:00 PM** — Q4 Budget Review\n🔴 **Today EOD** — Invoice #4821\n🟡 **Tomorrow 12:00 PM** — Partnership Proposal\n\n3 deadlines in the next 48 hours.",
  summary:   "Inbox summary:\n\n📬 **6 emails** — 3 High, 2 Medium, 1 Low\n\n🔴 **Urgent**: Budget approval + overdue invoice\n🟡 **This week**: Partnership proposal + design handoff\n\nRecommend starting with the budget review.",
  urgent:    "**3 HIGH priority** emails need your attention:\n\n1. Q4 Budget Review — due today\n2. Invoice #4821 — overdue\n3. Partnership Proposal — due tomorrow\n\nAll require immediate action.",
};

const getInitials = (s) => { const w = (s||"").trim().split(/\s+/); return ((w[0]?.[0]||"")+(w[1]?.[0]||w[0]?.[1]||"")).toUpperCase(); };
const COLORS = ["#f87171","#a78bfa","#34d399","#fbbf24","#60a5fa","#fb923c","#e879f9","#2dd4bf"];
const getColor = (s) => COLORS[(s?.charCodeAt(0)||0) % COLORS.length];
const formatDL = (dl) => {
  if (!dl) return null;
  try {
    const d = new Date(dl); if (isNaN(d)||d.getFullYear()>2030) return null;
    const h = (d-Date.now())/36e5;
    if (h<0) return "Overdue";
    if (h<24) return `Today ${d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;
    if (h<48) return `Tomorrow ${d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`;
    return d.toLocaleDateString([],{month:"short",day:"numeric"});
  } catch { return null; }
};

const PriorityBadge = ({ p }) => {
  const s = { HIGH:"bg-red-500/20 text-red-400 border-red-500/30", MEDIUM:"bg-yellow-500/20 text-yellow-400 border-yellow-500/30", LOW:"bg-slate-500/20 text-slate-400 border-slate-500/30" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wider border ${(s[p]||s.LOW)}`}>{p||"LOW"}</span>;
};

// ── Trash Confirm Modal ───────────────────────────────────────────────────────
const TrashConfirmModal = ({ lowCount, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}>
    <div className="glass-card rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 w-full sm:max-w-sm border border-red-500/20 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center">✕</button>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-xl mb-4">🗑</div>
      <h2 className="text-xl font-bold mb-2" style={{fontFamily:"Syne,sans-serif"}}>Trash {lowCount} LOW Priority?</h2>
      <p className="text-slate-400 text-sm mb-6 leading-relaxed">
        Emails will be moved to <strong className="text-white">Gmail Trash</strong>. Recoverable within 30 days.
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 text-sm text-slate-300 border border-white/10 px-4 py-3 rounded-xl transition-all active:scale-95">Cancel</button>
        <button onClick={onConfirm} className="flex-1 text-sm text-white font-semibold px-4 py-3 rounded-xl transition-all active:scale-95" style={{background:"linear-gradient(135deg,#ef4444,#dc2626)",boxShadow:"0 0 20px rgba(239,68,68,.3)"}}>Move to Trash</button>
      </div>
    </div>
  </div>
);

// ── Demo Modal ────────────────────────────────────────────────────────────────
const DemoModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}>
    <div className="glass-card rounded-t-3xl sm:rounded-2xl p-6 sm:p-8 w-full sm:max-w-md border border-violet-500/20 relative">
      <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white text-xl w-8 h-8 flex items-center justify-center">✕</button>
      {/* Mobile drag handle */}
      <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden"></div>
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xl mb-4">📬</div>
      <h2 className="text-xl font-bold mb-2" style={{fontFamily:"Syne,sans-serif"}}>Request Live Demo</h2>
      <p className="text-slate-400 text-sm mb-4 leading-relaxed">Want to see Smart AI Inbox with your real Gmail? I'll add you as a tester.</p>
      <div className="space-y-2 mb-5">
        {[["🧠","4-model ML pipeline"],["🔍","Semantic search with pgvector"],["⏰","AI deadline extraction"],["📊","K-Means topic clustering"]].map(([icon,text],i) => (
          <div key={i} className="flex items-center gap-3 text-sm text-slate-300"><span>{icon}</span><span>{text}</span></div>
        ))}
      </div>
      <button onClick={() => { navigator.clipboard.writeText("dhanashreebansode70@gmail.com"); alert("Email copied!"); }} className="glow-btn w-full text-white text-sm font-semibold px-4 py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-95">
        📋 Copy Email Address
      </button>
      <p className="text-center text-slate-400 text-xs mt-2">dhanashreebansode70@gmail.com</p>
      <p className="text-center text-slate-600 text-xs mt-2">Or <a href="https://linkedin.com/in/dhanashree2311" target="_blank" rel="noreferrer" className="text-violet-400">LinkedIn ↗</a></p>
    </div>
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function SmartInbox() {
  const [sessionToken, setSessionToken]         = useState(null);
  const [userEmail, setUserEmail]               = useState(null);
  const [emails, setEmails]                     = useState(MOCK_EMAILS);
  const [selected, setSelected]                 = useState(null);
  const [query, setQuery]                       = useState("");
  const [aiOut, setAiOut]                       = useState(MOCK_AI.default);
  const [loading, setLoading]                   = useState(false);
  const [syncing, setSyncing]                   = useState(false);
  const [trashing, setTrashing]                 = useState(false);
  const [trashResult, setTrashResult]           = useState(null);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [status, setStatus]                     = useState("DEMO");
  const [filter, setFilter]                     = useState("ALL");
  const [showDemo, setShowDemo]                 = useState(false);
  const [stats, setStats]                       = useState({total:6,high:3,medium:2,deadlines:3});
  // Mobile tab: "inbox" | "ai" | "actions"
  const [mobileTab, setMobileTab]               = useState("inbox");

  const loggedIn = !!sessionToken;

  const calcStats = (list) => setStats({
    total:     list.length,
    high:      list.filter(e=>e.priority==="HIGH").length,
    medium:    list.filter(e=>e.priority==="MEDIUM").length,
    deadlines: list.filter(e=>e.deadline).length,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("session");
    const email  = params.get("email");
    const error  = params.get("error");
    if (error) { alert("Sign in failed. Make sure you're an approved tester."); window.history.replaceState({}, "", "/"); return; }
    if (token && email) {
      setSessionToken(token); setUserEmail(email); setStatus("SIGNED IN");
      window.history.replaceState({}, "", "/");
      loadAndSync(token);
    }
  }, []);

  const authHeaders = (token) => ({ "Content-Type":"application/json", "x-session-token": token || sessionToken });

  const loadAndSync = async (token) => {
    setSyncing(true); setStatus("SYNCING...");
    try {
      await fetch(`${API}/gmail-sync`, { headers: authHeaders(token) });
      const r    = await fetch(`${API}/important-emails`, { headers: authHeaders(token) });
      const d    = await r.json();
      const list = Array.isArray(d) ? d : (d.emails || []);
      if (list.length > 0) { setEmails(list); calcStats(list); }
      setStatus("SYNCED");
    } catch (e) { console.error(e); setStatus("ERROR"); }
    finally { setSyncing(false); }
  };

  const handleSignIn  = () => { window.open(`${API}/auth/login`, "_self"); };
  const handleSignOut = async () => {
    if (sessionToken) await fetch(`${API}/auth/logout?session_token=${sessionToken}`).catch(()=>{});
    setSessionToken(null); setUserEmail(null);
    setEmails(MOCK_EMAILS); calcStats(MOCK_EMAILS);
    setStatus("DEMO"); setAiOut(MOCK_AI.default);
  };

  const handleSync = async () => {
    if (!loggedIn) { handleSignIn(); return; }
    setSyncing(true); setStatus("SYNCING...");
    try {
      await fetch(`${API}/gmail-sync`, { headers: authHeaders() });
      const r = await fetch(`${API}/important-emails`, { headers: authHeaders() });
      const d = await r.json();
      const list = Array.isArray(d) ? d : (d.emails || []);
      if (list.length > 0) { setEmails(list); calcStats(list); }
      setStatus("SYNCED");
    } catch { setStatus("ERROR"); }
    finally { setSyncing(false); }
  };

  const handleTrashLowPriority = async () => {
    setShowTrashConfirm(false); setTrashing(true);
    try {
      const r = await fetch(`${API}/trash-low-priority`, { method:"POST", headers: authHeaders() });
      const d = await r.json();
      setTrashResult(d);
      const remaining = emails.filter(e => e.priority !== "LOW");
      setEmails(remaining); calcStats(remaining);
      setTimeout(() => setTrashResult(null), 4000);
    } catch (e) { console.error(e); setTrashResult({ error: "Failed to reach backend." }); }
    finally { setTrashing(false); }
  };

  const handleTrashSingle = async (email, ev) => {
    ev.stopPropagation();
    if (!email.gmail_message_id) return;
    try {
      await fetch(`${API}/trash-email/${email.gmail_message_id}`, { method:"POST", headers: authHeaders() });
      const remaining = emails.filter(e => e.gmail_message_id !== email.gmail_message_id);
      setEmails(remaining); calcStats(remaining);
    } catch (e) { console.error("Failed to trash:", e); }
  };

  const handleAsk = async (q) => {
    const question = q || query;
    if (!question.trim()) return;
    setLoading(true); setQuery("");
    setMobileTab("ai"); // switch to AI tab on mobile when asking
    if (!loggedIn) {
      await new Promise(r => setTimeout(r, 900));
      const ql = question.toLowerCase();
      if (ql.includes("deadline"))                              setAiOut(MOCK_AI.deadlines);
      else if (ql.includes("summary")||ql.includes("overview")) setAiOut(MOCK_AI.summary);
      else if (ql.includes("urgent")||ql.includes("high"))      setAiOut(MOCK_AI.urgent);
      else                                                       setAiOut(MOCK_AI.default);
      setLoading(false); return;
    }
    try {
      const r = await fetch(`${API}/ask?question=${encodeURIComponent(question)}`, { headers: authHeaders() });
      const d = await r.json();
      setAiOut(d.answer || "No answer found.");
    } catch { setAiOut("Failed to reach backend."); }
    finally { setLoading(false); }
  };

  const filtered     = filter==="ALL" ? emails : emails.filter(e=>e.priority===filter);
  const lowCount     = emails.filter(e=>e.priority==="LOW").length;
  const statusColor  = status==="SYNCED"?"emerald":status==="DEMO"||status.includes("...")?"yellow":"red";
  const avatarLetters = userEmail ? userEmail.slice(0,2).toUpperCase() : "DB";

  const statCards = [
    { label:"Total",     value:stats.total,     icon:"✉",  color:"from-violet-500/20 to-purple-500/10",  border:"border-violet-500/20" },
    { label:"High",      value:stats.high,      icon:"🔴", color:"from-red-500/20 to-rose-500/10",        border:"border-red-500/20"   },
    { label:"Medium",    value:stats.medium,    icon:"🟡", color:"from-amber-500/20 to-yellow-500/10",    border:"border-amber-500/20" },
    { label:"Deadlines", value:stats.deadlines, icon:"⏰", color:"from-sky-500/20 to-cyan-500/10",        border:"border-sky-500/20"   },
  ];

  const renderAI = (text) => text.split("\n").map((line,i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return <p key={i} className={`${line===""?"mt-2":"leading-relaxed"} text-slate-300 text-sm`}>{parts.map((p,j) => j%2===1 ? <span key={j} className="text-white font-semibold">{p}</span> : p)}</p>;
  });

  return (
    <div className="min-h-screen bg-[#080b14] text-white" style={{fontFamily:"'DM Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box}
        .bg-mesh{background-image:radial-gradient(ellipse 80% 50% at 20% 10%,rgba(139,92,246,.12) 0%,transparent 60%),radial-gradient(ellipse 60% 40% at 80% 80%,rgba(59,130,246,.10) 0%,transparent 60%)}
        .glass{background:rgba(255,255,255,.03);backdrop-filter:blur(20px)}
        .glass-card{background:rgba(255,255,255,.035);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.07);transition:all .22s ease}
        .email-card{background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);transition:all .2s ease;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .email-card:hover{background:rgba(139,92,246,.08);border-color:rgba(139,92,246,.25)}
        @media(min-width:640px){.email-card:hover{transform:translateX(3px)}}
        .email-card.sel{background:rgba(139,92,246,.12);border-color:rgba(139,92,246,.4)}
        .email-card:active{background:rgba(139,92,246,.1)}
        .glow-btn{background:linear-gradient(135deg,#7c3aed,#4f46e5);box-shadow:0 0 20px rgba(124,58,237,.4),0 0 40px rgba(124,58,237,.15);transition:all .25s ease;border:none;cursor:pointer;-webkit-tap-highlight-color:transparent}
        .glow-btn:hover{box-shadow:0 0 30px rgba(124,58,237,.6),0 0 60px rgba(124,58,237,.25)}
        .glow-btn:active{transform:scale(0.97);opacity:.9}
        .glow-btn:disabled{opacity:.6;cursor:not-allowed}
        .stat-card{position:relative;overflow:hidden;border-radius:16px;transition:transform .2s ease}
        .stat-card:active{transform:scale(0.97)}
        @media(min-width:640px){.stat-card:hover{transform:translateY(-3px)}}
        .ai-input{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);color:white;outline:none;transition:all .2s;-webkit-appearance:none;font-size:16px}
        .ai-input:focus{border-color:rgba(139,92,246,.5);background:rgba(139,92,246,.06);box-shadow:0 0 0 3px rgba(139,92,246,.1)}
        .ai-input::placeholder{color:rgba(148,163,184,.5)}
        .f-btn{font-size:11px;padding:5px 12px;border-radius:20px;border:1px solid rgba(255,255,255,.08);color:rgba(148,163,184,.7);background:transparent;cursor:pointer;transition:all .18s;font-weight:500;-webkit-tap-highlight-color:transparent}
        .f-btn:active{background:rgba(139,92,246,.15)}
        .f-btn.act{background:rgba(139,92,246,.2);border-color:rgba(139,92,246,.5);color:#c4b5fd}
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none}
        .dp{display:inline-block;width:6px;height:6px;border-radius:50%}
        .dp-green{background:#4ade80;box-shadow:0 0 6px #4ade80;animation:pulse 2s infinite}
        .dp-yellow{background:#fbbf24;box-shadow:0 0 6px #fbbf24;animation:pulse .8s infinite}
        .dp-red{background:#f87171;box-shadow:0 0 6px #f87171}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .shimmer{background:linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.03) 100%);background-size:200% 100%;animation:shimmer 1.5s infinite}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .spin{animation:spin 1s linear infinite}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        .trash-btn{font-size:10px;color:rgba(248,113,113,.6);border:1px solid rgba(239,68,68,.1);border-radius:20px;padding:4px 10px;background:transparent;cursor:pointer;transition:all .18s;margin-top:6px;-webkit-tap-highlight-color:transparent}
        .trash-btn:active{color:#f87171;border-color:rgba(239,68,68,.3);background:rgba(239,68,68,.08)}
        .bottom-nav{position:fixed;bottom:0;left:0;right:0;z-index:40;background:rgba(8,11,20,.95);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.07);padding-bottom:env(safe-area-inset-bottom)}
        .bottom-nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;padding:10px 4px;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .18s;border:none;background:transparent;color:rgba(148,163,184,.6)}
        .bottom-nav-btn.active{color:#a78bfa}
        .bottom-nav-btn:active{opacity:.7}
        .mobile-panel{display:none}
        @media(max-width:1279px){.mobile-panel{display:block}.desktop-only{display:none}}
        @media(min-width:1280px){.mobile-panel{display:none}.desktop-only{display:block}.bottom-nav{display:none}}
        .safe-bottom{padding-bottom:calc(70px + env(safe-area-inset-bottom))}
        @media(min-width:1280px){.safe-bottom{padding-bottom:2rem}}
      `}</style>

      {showDemo         && <DemoModal onClose={()=>setShowDemo(false)} />}
      {showTrashConfirm && <TrashConfirmModal lowCount={lowCount} onConfirm={handleTrashLowPriority} onClose={()=>setShowTrashConfirm(false)} />}

      {/* Toast */}
      {trashResult && (
        <div className="fixed bottom-20 xl:bottom-6 right-4 xl:right-6 z-50 glass-card rounded-xl px-4 py-3 border border-green-500/20 flex items-center gap-3 shadow-xl max-w-[calc(100vw-2rem)]">
          <span className="text-green-400 text-lg">{trashResult.error ? "⚠" : "✓"}</span>
          <span className="text-sm text-slate-200">{trashResult.error ? trashResult.error : `Moved ${trashResult.trashed} emails to Trash`}</span>
        </div>
      )}

      <div className="bg-mesh min-h-screen">
        {/* Demo banner */}
        {!loggedIn && (
          <div className="border-b border-yellow-500/20 bg-yellow-500/5 px-4 py-2 flex items-center justify-between gap-2">
            <span className="text-xs text-yellow-400/80 hidden sm:block">✨ <strong>Demo mode</strong> — sample data</span>
            <span className="text-xs text-yellow-400/80 sm:hidden">✨ Demo mode</span>
            <div className="flex items-center gap-2">
              <button onClick={handleSignIn} className="text-xs text-yellow-400 border border-yellow-500/30 rounded-full px-3 py-1.5 active:bg-yellow-500/10 transition-all">Sign in</button>
              <button onClick={()=>setShowDemo(true)} className="text-xs text-white bg-yellow-500/20 border border-yellow-500/30 rounded-full px-3 py-1.5 active:bg-yellow-500/30 transition-all font-medium">Request Demo →</button>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="glass border-b border-white/[0.06] sticky top-0 z-40">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs sm:text-sm shadow-lg shadow-violet-500/30">✦</div>
              <span className="text-base sm:text-lg font-bold tracking-tight" style={{fontFamily:"Syne,sans-serif"}}>Smart AI Inbox</span>
              <div className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 border bg-${statusColor}-500/10 border-${statusColor}-500/20`}>
                <span className={`dp dp-${statusColor==="emerald"?"green":statusColor}`}></span>
                <span className={`text-[10px] font-medium text-${statusColor}-400 hidden sm:block`}>{status}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!loggedIn ? (
                <>
                  <button onClick={()=>setShowDemo(true)} className="text-xs sm:text-sm text-slate-300 border border-white/10 px-3 sm:px-4 py-2 rounded-xl transition-all hidden sm:block">Request Demo</button>
                  <button onClick={handleSignIn} className="glow-btn text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-slate-400 hidden md:block truncate max-w-[140px]">{userEmail}</span>
                  <button onClick={handleSync} disabled={syncing} className="glow-btn text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl flex items-center gap-1.5">
                    {syncing ? <svg className="spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                             : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    <span className="hidden sm:inline">{syncing?"Syncing...":"Gmail Sync"}</span>
                    <span className="sm:hidden">{syncing?"...":"Sync"}</span>
                  </button>
                  <button onClick={handleSignOut} className="text-xs text-slate-400 border border-white/10 px-2.5 py-2 rounded-xl transition-all hidden sm:block">Out</button>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center text-xs font-bold ring-2 ring-violet-500/20">{avatarLetters}</div>
                </>
              )}
            </div>
          </div>
        </nav>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5 sm:py-8 safe-bottom">
          {/* Header */}
          <div className="mb-5 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
              {loggedIn ? `Morning, ${userEmail?.split("@")[0]} ☀️` : "Smart AI Inbox ✦"}
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              {loggedIn
                ? <><span className="text-red-400 font-medium">{stats.high} high priority</span>{` emails need attention`}</>
                : <>AI-powered inbox. <span className="text-violet-400 cursor-pointer" onClick={()=>setShowDemo(true)}>Request live access →</span></>}
            </p>
          </div>

          {/* Stats — 2x2 on mobile, 4x1 on desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-8">
            {statCards.map((s,i) => (
              <div key={i} className={`stat-card p-4 sm:p-5 bg-gradient-to-br ${s.color} border ${s.border}`}>
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <span className="text-lg sm:text-xl">{s.icon}</span>
                </div>
                <div className="text-2xl sm:text-3xl font-bold tracking-tight mb-0.5" style={{fontFamily:"Syne,sans-serif"}}>{s.value}</div>
                <div className="text-[11px] sm:text-xs text-slate-400 font-medium">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── DESKTOP LAYOUT (xl+) ── */}
          <div className="desktop-only grid xl:grid-cols-[1fr_420px] gap-6">
            {/* Email list */}
            <EmailList
              filtered={filtered} filter={filter} setFilter={setFilter}
              loggedIn={loggedIn} lowCount={lowCount} trashing={trashing}
              setShowTrashConfirm={setShowTrashConfirm} selected={selected}
              setSelected={setSelected} handleTrashSingle={handleTrashSingle}
            />
            {/* Right panel */}
            <div className="flex flex-col gap-4">
              <AIPanel
                loggedIn={loggedIn} loading={loading} aiOut={aiOut}
                query={query} setQuery={setQuery} handleAsk={handleAsk}
                handleSignIn={handleSignIn}
              />
              <QuickActions
                loggedIn={loggedIn} syncing={syncing}
                handleSync={handleSync} setFilter={setFilter}
                handleAsk={handleAsk} setShowTrashConfirm={setShowTrashConfirm}
                handleSignIn={handleSignIn} setShowDemo={setShowDemo}
                handleSignOut={handleSignOut}
              />
            </div>
          </div>

          {/* ── MOBILE LAYOUT (<xl) — tab based ── */}
          <div className="mobile-panel">
            {mobileTab === "inbox" && (
              <EmailList
                filtered={filtered} filter={filter} setFilter={setFilter}
                loggedIn={loggedIn} lowCount={lowCount} trashing={trashing}
                setShowTrashConfirm={setShowTrashConfirm} selected={selected}
                setSelected={setSelected} handleTrashSingle={handleTrashSingle}
                mobile
              />
            )}
            {mobileTab === "ai" && (
              <AIPanel
                loggedIn={loggedIn} loading={loading} aiOut={aiOut}
                query={query} setQuery={setQuery} handleAsk={handleAsk}
                handleSignIn={handleSignIn} mobile
              />
            )}
            {mobileTab === "actions" && (
              <div className="space-y-4">
                <QuickActions
                  loggedIn={loggedIn} syncing={syncing}
                  handleSync={handleSync} setFilter={setFilter}
                  handleAsk={handleAsk} setShowTrashConfirm={setShowTrashConfirm}
                  handleSignIn={handleSignIn} setShowDemo={setShowDemo}
                  handleSignOut={handleSignOut} mobile
                  setMobileTab={setMobileTab}
                />
                {/* Account info on mobile */}
                {loggedIn && (
                  <div className="glass-card rounded-2xl p-4">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Account</h3>
                    <p className="text-sm text-slate-300 mb-3 truncate">{userEmail}</p>
                    <button onClick={handleSignOut} className="w-full text-sm text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-2.5 rounded-xl transition-all active:scale-95">
                      Sign Out
                    </button>
                  </div>
                )}
                {!loggedIn && (
                  <div className="glass-card rounded-2xl p-4">
                    <button onClick={handleSignIn} className="glow-btn w-full text-white text-sm font-semibold px-4 py-3 rounded-xl flex items-center justify-center gap-2">
                      Sign In with Google
                    </button>
                    <button onClick={()=>setShowDemo(true)} className="w-full mt-2 text-sm text-slate-300 border border-white/10 px-4 py-2.5 rounded-xl transition-all active:scale-95">
                      Request Demo
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="bottom-nav xl:hidden">
        <div className="flex">
          {[
            { id:"inbox",   icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>, label:"Inbox",   badge: stats.high > 0 ? stats.high : null },
            { id:"ai",      icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>, label:"Ask AI",  badge: null },
            { id:"actions", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>, label:"Actions", badge: null },
          ].map(tab => (
            <button key={tab.id} onClick={()=>setMobileTab(tab.id)} className={`bottom-nav-btn ${mobileTab===tab.id?"active":""}`}>
              <div className="relative">
                {tab.icon}
                {tab.badge && <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{tab.badge}</span>}
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ── Email List Component ──────────────────────────────────────────────────────
function EmailList({ filtered, filter, setFilter, loggedIn, lowCount, trashing, setShowTrashConfirm, selected, setSelected, handleTrashSingle, mobile }) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2 sm:mb-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm">Inbox</h2>
            {!loggedIn && <span className="text-[10px] text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-full px-2 py-0.5">Sample</span>}
            <span className="text-[10px] text-slate-500">{filtered.length} msgs</span>
          </div>
          {loggedIn && lowCount > 0 && (
            <button onClick={()=>setShowTrashConfirm(true)} disabled={trashing}
              className="flex items-center gap-1 text-[11px] font-medium text-red-400 border border-red-500/20 bg-red-500/10 rounded-full px-2.5 py-1 transition-all active:bg-red-500/20">
              {trashing ? <svg className="spin" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg> : "🗑"}
              {trashing ? "..." : `LOW (${lowCount})`}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-2 sm:mt-2 overflow-x-auto scrollbar-hide">
          {["ALL","HIGH","MEDIUM","LOW"].map(f => (
            <button key={f} onClick={()=>setFilter(f)} className={`f-btn flex-shrink-0 ${filter===f?"act":""}`}>{f}</button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/[0.04] overflow-y-auto scrollbar-hide" style={{maxHeight: mobile ? "calc(100vh - 320px)" : "560px"}}>
        {filtered.map((email,idx) => {
          const initials = ((s) => { const w=(s||"").trim().split(/\s+/); return ((w[0]?.[0]||"")+(w[1]?.[0]||w[0]?.[1]||"")).toUpperCase(); })(email.sender);
          const color    = ["#f87171","#a78bfa","#34d399","#fbbf24","#60a5fa","#fb923c","#e879f9","#2dd4bf"][(email.sender?.charCodeAt(0)||0)%8];
          const dl       = (() => {
            if (!email.deadline) return null;
            try { const d=new Date(email.deadline); if(isNaN(d)||d.getFullYear()>2030)return null; const h=(d-Date.now())/36e5; if(h<0)return"Overdue"; if(h<24)return`Today ${d.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`; if(h<48)return`Tomorrow`; return d.toLocaleDateString([],{month:"short",day:"numeric"}); } catch{return null;}
          })();
          const isSel    = selected?.id===email.id;
          return (
            <div key={email.id||idx} onClick={()=>setSelected(isSel?null:email)} className={`email-card px-4 sm:px-5 py-3.5 sm:py-4 ${isSel?"sel":""}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5" style={{backgroundColor:color+"22",color,border:`1px solid ${color}33`}}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <span className="font-semibold text-sm leading-snug line-clamp-1">{email.subject}</span>
                    <div className="flex-shrink-0 mt-0.5">
                      {(() => { const s={HIGH:"bg-red-500/20 text-red-400 border-red-500/30",MEDIUM:"bg-yellow-500/20 text-yellow-400 border-yellow-500/30",LOW:"bg-slate-500/20 text-slate-400 border-slate-500/30"}; return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wider border ${s[email.priority]||s.LOW}`}>{email.priority||"LOW"}</span>; })()}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-0.5">{email.sender}</p>
                  <p className="text-xs text-slate-500 line-clamp-1">{email.summary}</p>
                  {email.importance_score != null && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${email.importance_score}%`,background:email.importance_score>=70?"#f87171":email.importance_score>=45?"#fbbf24":"#94a3b8"}}/>
                      </div>
                      <span className="text-[10px] text-slate-600">{Math.round(email.importance_score)}</span>
                    </div>
                  )}
                  {dl && <div className="mt-1.5"><span className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5 font-medium">⏰ {dl}</span></div>}
                  {loggedIn && (email.priority === "LOW" || email.priority === "MEDIUM") && (
                    <button className="trash-btn" onClick={(ev)=>handleTrashSingle(email,ev)}>🗑 Trash</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── AI Panel Component ────────────────────────────────────────────────────────
function AIPanel({ loggedIn, loading, aiOut, query, setQuery, handleAsk, handleSignIn, mobile }) {
  const renderAI = (text) => text.split("\n").map((line,i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return <p key={i} className={`${line===""?"mt-2":"leading-relaxed"} text-slate-300 text-sm`}>{parts.map((p,j) => j%2===1 ? <span key={j} className="text-white font-semibold">{p}</span> : p)}</p>;
  });
  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col" style={{minHeight: mobile ? "calc(100vh - 260px)" : "400px"}}>
      <div className="px-4 sm:px-5 py-3 sm:py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-xs">✦</div>
          <div>
            <h2 className="font-semibold text-sm">Ask Your Inbox</h2>
            <p className="text-[10px] text-slate-500">{loggedIn?"Connected to Gmail":"Demo responses"}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <span className={`dp ${loggedIn?"dp-green":"dp-yellow"}`}></span>
            <span className="text-[10px] text-slate-500">{loggedIn?"Live":"Demo"}</span>
          </div>
        </div>
      </div>
      <div className="flex-1 p-4 sm:p-5 overflow-y-auto scrollbar-hide">
        {loading ? (
          <div className="space-y-2.5">
            {[100,80,90].map((w,i)=><div key={i} className="h-3 rounded-full shimmer" style={{width:`${w}%`}}></div>)}
            <div className="flex items-center gap-2 mt-4">
              {[0,150,300].map(d=><div key={d} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}></div>)}
              <span className="text-xs text-slate-500 ml-1">Thinking...</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-[9px]">✦</div>
              <span className="text-xs text-violet-400 font-medium">AI Response</span>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-3 sm:p-4 border border-white/[0.06]">{renderAI(aiOut)}</div>
            {!loggedIn && <p className="text-[10px] text-slate-600 mt-3 text-center"><button onClick={handleSignIn} className="text-violet-400">Sign in</button> to query your real inbox</p>}
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            className="ai-input flex-1 text-sm px-3 sm:px-4 py-2.5 rounded-xl"
            placeholder="What deadlines do I have?"
            value={query}
            onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&handleAsk()}
          />
          <button onClick={()=>handleAsk()} disabled={loading} className="glow-btn px-3 sm:px-4 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center gap-1.5 flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span className="hidden sm:inline">Ask</span>
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {["Deadlines?","Urgent emails?","Summarize inbox"].map(s=>(
            <button key={s} onClick={()=>handleAsk(s)} className="text-[10px] text-slate-500 bg-white/[0.03] border border-white/[0.06] rounded-full px-2.5 py-1.5 transition-all active:bg-white/[0.06]">{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick Actions Component ───────────────────────────────────────────────────
function QuickActions({ loggedIn, syncing, handleSync, setFilter, handleAsk, setShowTrashConfirm, handleSignIn, setShowDemo, handleSignOut, mobile, setMobileTab }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: loggedIn?"Sync Gmail":"Request Demo", icon:"⚡", action: loggedIn ? handleSync : ()=>setShowDemo(true) },
          { label: "High Priority",  icon:"🔴", action: () => { setFilter("HIGH"); if(mobile && setMobileTab) setMobileTab("inbox"); } },
          { label: "Ask Deadlines",  icon:"⏰", action: () => handleAsk("What deadlines do I have?") },
          { label: loggedIn?"Trash LOW":"Sign In", icon: loggedIn?"🗑":"🔑", action: loggedIn ? ()=>setShowTrashConfirm(true) : handleSignIn },
        ].map(a=>(
          <button key={a.label} onClick={a.action}
            className="text-xs text-slate-300 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] rounded-xl px-3 py-3 flex items-center gap-2 transition-all font-medium active:scale-95">
            <span>{a.icon}</span>{a.label}
          </button>
        ))}
      </div>
    </div>
  );
}