import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL || "https://dhanashree2311-smart-ai-inbox.hf.space";

const MOCK_EMAILS = [
  { id: 1, subject: "Q4 Budget Review - Action Required", sender: "Sarah Chen", priority: "HIGH", summary: "Please review and approve the Q4 allocation before end of week. Finance needs sign-off on the revised projections.", importance_score: 92, deadline: new Date(Date.now() + 3 * 36e5).toISOString(), reason: "Urgency signal detected. Action required. Deadline present." },
  { id: 2, subject: "Partnership Proposal — Nexus Labs", sender: "Marcus Webb", priority: "HIGH", summary: "Following our call last Tuesday, I've attached the revised terms. Looking forward to moving this forward.", importance_score: 85, deadline: new Date(Date.now() + 26 * 36e5).toISOString(), reason: "High urgency. Financial content. Action required." },
  { id: 3, subject: "Design System v2.0 Handoff", sender: "Priya Nair", priority: "MEDIUM", summary: "The Figma files are ready. Component library is fully documented. Handoff tokens are exported.", importance_score: 58, deadline: new Date(Date.now() + 50 * 36e5).toISOString(), reason: "Moderate relevance. Deadline present." },
  { id: 4, subject: "Team Offsite Planning — Vote Required", sender: "Jordan Okafor", priority: "MEDIUM", summary: "We need 3 more votes to finalize the location. Current top picks are Lisbon and Medellin.", importance_score: 49, deadline: null, reason: "Action required. Internal sender." },
  { id: 5, subject: "Monthly Digest: Product Updates", sender: "Product Team", priority: "LOW", summary: "This month we shipped dark mode, AI summaries, and the new onboarding flow. Here's what's coming next.", importance_score: 18, deadline: null, reason: "Newsletter/digest pattern." },
  { id: 6, subject: "Invoice #4821 — Overdue Notice", sender: "Billing Dept", priority: "HIGH", summary: "Invoice #4821 for $2,400 remains unpaid. Please action immediately to avoid service interruption.", importance_score: 88, deadline: new Date(Date.now() + 8 * 36e5).toISOString(), reason: "Financial content. Urgency signal. Deadline present." },
];

const MOCK_AI = {
  default:   "I found **3 upcoming deadlines** in your inbox:\n\n• **Today 5:00 PM** — Q4 Budget Review (Sarah Chen)\n• **Tomorrow 12:00 PM** — Partnership Proposal (Marcus Webb)\n• **Today EOD** — Invoice #4821 (Billing Dept)\n\nWant me to help prioritize these?",
  deadlines: "Your upcoming deadlines:\n\n🔴 **Today 5:00 PM** — Q4 Budget Review\n🔴 **Today EOD** — Invoice #4821\n🟡 **Tomorrow 12:00 PM** — Partnership Proposal\n\n3 deadlines in the next 48 hours.",
  summary:   "Inbox summary:\n\n📬 **6 emails** — 3 Urgent, 2 Medium, 1 Low\n\n🔴 **Needs now**: Budget approval + overdue invoice\n🟡 **This week**: Partnership proposal + design handoff\n\nStart with the budget review.",
  urgent:    "**3 URGENT** emails need your attention:\n\n1. Q4 Budget Review — due today\n2. Invoice #4821 — overdue\n3. Partnership Proposal — due tomorrow\n\nAll require immediate action.",
};

// ── Utilities ─────────────────────────────────────────────────────────────────

const AVATAR_BG   = ["#ede9fe","#fce7f3","#d1fae5","#fef3c7","#dbeafe","#ffe4e6","#e0f2fe","#ccfbf1"];
const AVATAR_TEXT = ["#5b21b6","#9d174d","#065f46","#78350f","#1e3a8a","#9f1239","#0c4a6e","#134e4a"];
const getAvatarStyle = (s) => { const i = (s?.charCodeAt(0) || 0) % 8; return { bg: AVATAR_BG[i], text: AVATAR_TEXT[i] }; };
const getInitials   = (s) => { const w = (s || "").trim().split(/\s+/); return ((w[0]?.[0] || "") + (w[1]?.[0] || w[0]?.[1] || "")).toUpperCase(); };

const formatDL = (dl) => {
  if (!dl) return null;
  try {
    const d = new Date(dl);
    if (isNaN(d) || d.getFullYear() > 2030) return null;
    const h = (d - Date.now()) / 36e5;
    if (h < 0)  return "Overdue";
    if (h < 24) return `Today ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    if (h < 48) return `Tomorrow`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  } catch { return null; }
};

// ── Modals ────────────────────────────────────────────────────────────────────

const TrashConfirmModal = ({ lowCount, onConfirm, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)" }}>
    <div className="modal-sheet" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 20, maxWidth: 400, width: "100%", padding: "24px 24px 28px", boxShadow: "0 20px 60px rgba(0,0,0,.2)", position: "relative" }}>
      <div className="modal-handle" />
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 16, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>✕</button>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>🗑️</div>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Trash {lowCount} low priority?</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 22, lineHeight: 1.6 }}>These will move to Gmail Trash — recoverable for 30 days.</p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onClose} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "white", fontSize: 14, fontWeight: 600, color: "#475569", cursor: "pointer", touchAction: "manipulation" }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#ef4444,#dc2626)", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", touchAction: "manipulation" }}>Move to Trash</button>
      </div>
    </div>
  </div>
);

const DemoModal = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(15,23,42,.5)", backdropFilter: "blur(4px)" }}>
    <div className="modal-sheet" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 20, maxWidth: 440, width: "100%", padding: "24px 24px 28px", boxShadow: "0 20px 60px rgba(0,0,0,.2)", position: "relative" }}>
      <div className="modal-handle" />
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, width: 36, height: 36, borderRadius: 8, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: 16, color: "#94a3b8", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>✕</button>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: "#f5f3ff", border: "1px solid #ddd6fe", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>📬</div>
      <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Request Live Demo</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 16, lineHeight: 1.6 }}>Want to try with your real Gmail? I'll add you as an approved tester.</p>
      <div style={{ background: "#f8f7ff", borderRadius: 12, padding: "14px 16px", marginBottom: 18, border: "1px solid #ede9fe" }}>
        {[["🧠","4-model ML pipeline scores every email"],["🔍","Semantic search powered by pgvector"],["⏰","AI extracts deadlines from email text"],["📊","K-Means clusters emails by topic"]].map(([icon, text], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#374151", marginBottom: i < 3 ? 10 : 0 }}><span>{icon}</span><span>{text}</span></div>
        ))}
      </div>
      <button onClick={() => { navigator.clipboard.writeText("dhanashreebansode70@gmail.com"); alert("Copied! Send a message to get access."); }} style={{ width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, touchAction: "manipulation" }}>
        📋 Copy Contact Email
      </button>
      <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", marginTop: 14 }}>
        Or <a href="https://linkedin.com/in/dhanashree2311" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 600 }}>DM on LinkedIn ↗</a>
      </p>
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
  const [stats, setStats]                       = useState({ total: 6, high: 3, medium: 2, deadlines: 3 });
  const [mobileTab, setMobileTab]               = useState("inbox");

  const loggedIn = !!sessionToken;

  const calcStats = (list) => setStats({
    total:     list.length,
    high:      list.filter(e => e.priority === "HIGH").length,
    medium:    list.filter(e => e.priority === "MEDIUM").length,
    deadlines: list.filter(e => e.deadline).length,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token  = params.get("session");
    const email  = params.get("email");
    const error  = params.get("error");

    if (error) {
      alert("Sign in failed — make sure you're an approved tester.");
      window.history.replaceState({}, "", "/");
      return;
    }

    if (token) {
      // Fresh login — save to localStorage so page refreshes keep the session
      localStorage.setItem("sai_token", token);
      if (email) localStorage.setItem("sai_email", email);
      setSessionToken(token);
      setStatus("SIGNED IN");
      if (email) setUserEmail(email);
      window.history.replaceState({}, "", "/");
      loadAndSync(token);
      return;
    }

    // No URL params — check localStorage for a persisted session
    const saved      = localStorage.getItem("sai_token");
    const savedEmail = localStorage.getItem("sai_email");
    if (saved) {
      setSessionToken(saved);
      setStatus("SIGNED IN");
      if (savedEmail) setUserEmail(savedEmail);
      loadAndSync(saved);
    }
  }, []);

  const authHeaders = (token) => ({ "Content-Type": "application/json", "x-session-token": token || sessionToken });

  const loadAndSync = async (token) => {
    setSyncing(true); setStatus("SYNCING...");
    try {
      await fetch(`${API}/gmail-sync`, { headers: authHeaders(token) });
      const r = await fetch(`${API}/important-emails`, { headers: authHeaders(token) });
      if (!r.ok) throw new Error("Failed to load emails");
      const d = await r.json();
      const list = Array.isArray(d) ? d : (d.emails || []);
      // Always replace mock data with real data (even if empty — logged in user has no mock)
      setEmails(list);
      calcStats(list);
      setStatus("SYNCED ✓");
    } catch (e) { console.error(e); setStatus("ERROR"); }
    finally { setSyncing(false); }
  };

  const [feedbackToast, setFeedbackToast] = useState(null);

  const handleFeedback = async (email, newPriority) => {
    if (!loggedIn || !email.gmail_message_id) return;
    try {
      const r = await fetch(
        `${API}/feedback?gmail_message_id=${email.gmail_message_id}&correct_priority=${newPriority}`,
        { method: "POST", headers: authHeaders() }
      );
      const d = await r.json();
      if (!r.ok) throw new Error(d?.detail || `Server error ${r.status}`);

      const updated = emails.map(e =>
        e.gmail_message_id === email.gmail_message_id
          ? { ...e, priority: d.new_priority, importance_score: d.new_score, reason: "User feedback" }
          : e
      );
      setEmails(updated);
      calcStats(updated);
      setSelected(null);
      setFilter(d.new_priority);
      setFeedbackToast({ msg: d.message, count: d.feedback_total });
      setTimeout(() => setFeedbackToast(null), 3500);
    } catch (e) {
      console.error("Feedback error:", e.message);
      setFeedbackToast({ msg: `Couldn't save: ${e.message}`, error: true });
      setTimeout(() => setFeedbackToast(null), 4000);
    }
  };

  const handleSignIn  = () => { window.open(`${API}/auth/login`, "_self"); };
  const handleSignOut = async () => {
    if (sessionToken) await fetch(`${API}/auth/logout?session_token=${sessionToken}`).catch(() => {});
    localStorage.removeItem("sai_token");
    localStorage.removeItem("sai_email");
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
      setEmails(list);
      calcStats(list);
      setStatus("SYNCED ✓");
    } catch { setStatus("ERROR"); }
    finally { setSyncing(false); }
  };

  const handleTrashLowPriority = async () => {
    setShowTrashConfirm(false); setTrashing(true);
    const prevEmails = emails;
    try {
      const r = await fetch(`${API}/trash-low-priority`, { method: "POST", headers: authHeaders() });
      if (!r.ok) throw new Error("Server error");
      const d = await r.json();
      setTrashResult(d);
      const remaining = emails.filter(e => e.priority !== "LOW");
      setEmails(remaining); calcStats(remaining);
      setTimeout(() => setTrashResult(null), 4000);
    } catch (e) {
      console.error(e);
      setEmails(prevEmails);
      setTrashResult({ error: "Failed to reach backend." });
      setTimeout(() => setTrashResult(null), 4000);
    } finally { setTrashing(false); }
  };

  const handleTrashSingle = async (email, ev) => {
    ev.stopPropagation();
    if (!email.gmail_message_id) return;
    const prevEmails = emails;
    try {
      const r = await fetch(`${API}/trash-email/${email.gmail_message_id}`, { method: "POST", headers: authHeaders() });
      if (!r.ok) throw new Error("Failed");
      const remaining = emails.filter(e => e.gmail_message_id !== email.gmail_message_id);
      setEmails(remaining); calcStats(remaining);
    } catch (e) {
      console.error("Failed to trash:", e);
      setEmails(prevEmails);
    }
  };

  const handleAsk = async (q) => {
    const question = (q || query).trim();
    if (!question) return;
    if (question.length > 500) { alert("Question too long (max 500 characters)"); return; }
    setLoading(true); setQuery(""); setMobileTab("ai");
    if (!loggedIn) {
      await new Promise(r => setTimeout(r, 800));
      const ql = question.toLowerCase();
      if (ql.includes("deadline"))                               setAiOut(MOCK_AI.deadlines);
      else if (ql.includes("summary") || ql.includes("overview")) setAiOut(MOCK_AI.summary);
      else if (ql.includes("urgent") || ql.includes("high"))      setAiOut(MOCK_AI.urgent);
      else                                                         setAiOut(MOCK_AI.default);
      setLoading(false); return;
    }
    try {
      const r = await fetch(`${API}/ask?question=${encodeURIComponent(question)}`, { headers: authHeaders() });
      const d = await r.json();
      setAiOut(d.answer || "No answer found.");
    } catch { setAiOut("Couldn't reach the backend. Try again in a moment."); }
    finally { setLoading(false); }
  };

  const filtered    = filter === "ALL" ? emails : emails.filter(e => e.priority === filter);
  const lowCount    = emails.filter(e => e.priority === "LOW").length;
  const statusGood  = status.includes("SYNCED");
  const avatarLetters = userEmail ? userEmail.slice(0, 2).toUpperCase() : "DB";

  const renderAI = (text) => text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} style={{ marginBottom: line === "" ? 0 : 2, lineHeight: 1.65, fontSize: 14, color: "#374151", marginTop: line === "" ? 8 : 0 }}>
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} style={{ color: "#0f172a", fontWeight: 700 }}>{p}</strong> : p)}
      </p>
    );
  });

  const S = styles; // shorthand

  return (
    <div style={{ minHeight: "100vh", background: "#f8f7ff", fontFamily: "'Inter','DM Sans',sans-serif" }}>
      <style>{CSS}</style>

      {showDemo         && <DemoModal         onClose={() => setShowDemo(false)} />}
      {showTrashConfirm && <TrashConfirmModal lowCount={lowCount} onConfirm={handleTrashLowPriority} onClose={() => setShowTrashConfirm(false)} />}

      {/* Feedback toast */}
      {feedbackToast && (
        <div className="toast" style={{ borderColor: feedbackToast.error ? "#fca5a5" : "#a5f3c6", bottom: trashResult ? 120 : undefined }}>
          <span style={{ fontSize: 18 }}>{feedbackToast.error ? "⚠️" : "🧠"}</span>
          <div>
            <p style={{ fontSize: 13, color: "#0f172a", fontWeight: 600 }}>{feedbackToast.error ? feedbackToast.msg : "Model updated!"}</p>
            {!feedbackToast.error && <p style={{ fontSize: 11, color: "#64748b" }}>{feedbackToast.msg}</p>}
          </div>
        </div>
      )}

      {/* Toast */}
      {trashResult && (
        <div className="toast" style={{ borderColor: trashResult.error ? "#fca5a5" : "#86efac" }}>
          <span style={{ fontSize: 18 }}>{trashResult.error ? "⚠️" : "✅"}</span>
          <span style={{ fontSize: 14, color: "#1e293b" }}>{trashResult.error ? trashResult.error : `Moved ${trashResult.trashed} emails to Trash`}</span>
        </div>
      )}

      {/* Demo banner */}
      {!loggedIn && (
        <div style={{ background: "#fffbeb", borderBottom: "1px solid #fde68a", padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "nowrap" }}>
          <span style={{ fontSize: 12, color: "#92400e", fontWeight: 500, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>✨ Demo mode — viewing sample emails.</span>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={handleSignIn} className="btn-ghost-sm">Sign In</button>
            <button onClick={() => setShowDemo(true)} className="btn-amber-sm">Request Access →</button>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ background: "white", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
        <div className="container" style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>✦</div>
            <span style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: "#0f172a", whiteSpace: "nowrap" }}>Smart AI Inbox</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 100, padding: "4px 10px" }} className="hide-sm">
              <span className={`dot ${statusGood ? "dot-green" : status === "DEMO" ? "dot-yellow" : "dot-red"}`}></span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b" }}>{status}</span>
            </div>
          </div>

          {/* Right */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!loggedIn ? (
              <>
                <button onClick={() => setShowDemo(true)} className="btn-ghost hide-sm">Request Demo</button>
                <button onClick={handleSignIn} className="btn-primary">
                  <GoogleIcon />
                  <span className="hide-xs">Sign In with Google</span>
                  <span style={{ display: "inline" }} className="show-xs-only">Sign In</span>
                </button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 12, color: "#94a3b8", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} className="hide-sm">{userEmail}</span>
                <button onClick={handleSync} disabled={syncing} className="btn-primary">
                  {syncing ? <SpinIcon /> : <SyncIcon />}
                  <span className="hide-xs">{syncing ? "Syncing..." : "Sync Gmail"}</span>
                  <span style={{ display: "inline" }} className="show-xs-only">{syncing ? "..." : "Sync"}</span>
                </button>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0, border: "2px solid #ede9fe", cursor: "pointer" }} title={userEmail} onClick={handleSignOut}>
                  {avatarLetters}
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Page */}
      <div className="container safe-pb" style={{ paddingTop: 24 }}>

        {/* ── HERO — demo mode only ── */}
        {!loggedIn && (
          <div className="card" style={{ padding: "32px 24px", textAlign: "center", marginBottom: 24, background: "linear-gradient(160deg,#faf9ff 0%,#f0ebff 100%)" }}>
            <span style={{ display: "inline-block", background: "#ede9fe", color: "#6d28d9", fontSize: 12, fontWeight: 700, padding: "5px 14px", borderRadius: 100, border: "1px solid #ddd6fe", marginBottom: 16 }}>
              ✦ AI-Powered Gmail Management
            </span>
            <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: "clamp(22px,5vw,32px)", color: "#0f172a", marginBottom: 12, lineHeight: 1.25 }}>
              Your inbox,<br />finally under control.
            </h1>
            <p style={{ fontSize: 15, color: "#64748b", maxWidth: 480, margin: "0 auto 24px", lineHeight: 1.7 }}>
              4 ML models read your Gmail, score every email 0–100, extract deadlines automatically, and surface exactly what needs your attention.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
              {[["🧠","XGBoost Scoring"],["🌲","Random Forest Classifier"],["⏰","Deadline Extraction"],["🔵","K-Means Clustering"]].map(([icon, label]) => (
                <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "white", border: "1px solid #e2e8f0", borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 600, color: "#475569", boxShadow: "0 1px 2px rgba(0,0,0,.04)" }}>{icon} {label}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Greeting — logged in only ── */}
        {loggedIn && (
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 20, color: "#0f172a", marginBottom: 4 }}>
                Hey, {userEmail?.split("@")[0]} 👋
              </h1>
              <p style={{ fontSize: 14, color: "#64748b" }}>
                <span style={{ color: "#ef4444", fontWeight: 700 }}>{stats.high} urgent</span> emails are waiting for you
              </p>
            </div>
            <button onClick={handleSignOut} className="btn-ghost hide-sm" style={{ fontSize: 13 }}>Sign Out</button>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: "Total Emails",  value: stats.total,     icon: "📬", accent: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
            { label: "Urgent",        value: stats.high,      icon: "🔴", accent: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
            { label: "Medium",        value: stats.medium,    icon: "🟡", accent: "#d97706", bg: "#fffbeb", border: "#fde68a" },
            { label: "Deadlines",     value: stats.deadlines, icon: "⏰", accent: "#0284c7", bg: "#f0f9ff", border: "#bae6fd" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", borderRadius: 16, padding: "18px 20px", border: `1px solid ${s.border}` }}>
              <div style={{ fontSize: 22, marginBottom: 10 }}>{s.icon}</div>
              <div className="stat-num" style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, color: s.accent, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Pipeline explainer — demo mode only ── */}
        {!loggedIn && (
          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>The AI Pipeline</p>
            <div className="pipeline-grid">
              {[
                { n: "01", icon: "📊", title: "XGBoost scores urgency", desc: "15 hand-engineered features rate every email 0–100. Sender reputation, urgency keywords, financial signals." },
                { n: "02", icon: "🌲", title: "Random Forest classifies", desc: "384-dimensional embeddings feed into a trained classifier. Labels every email HIGH, MEDIUM, or LOW." },
                { n: "03", icon: "⏰", title: "Deadline extracted", desc: "'By Friday' or '5pm today' becomes a real date. Regex + dateutil with confidence scoring — no hallucinations." },
                { n: "04", icon: "🔵", title: "K-Means clusters topics", desc: "Auto-groups Finance, Job Apps, Newsletters, Team comms. Silhouette score picks the optimal number of clusters." },
              ].map(item => (
                <div key={item.n} style={{ background: "#faf9ff", border: "1px solid #ede9fe", borderRadius: 12, padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{item.icon}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#a78bfa", letterSpacing: "0.05em" }}>{item.n}</span>
                  </div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b", marginBottom: 4 }}>{item.title}</p>
                  <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Desktop layout ── */}
        <div className="desktop-grid desktop-only">
          <EmailList
            filtered={filtered} filter={filter} setFilter={setFilter}
            loggedIn={loggedIn} lowCount={lowCount} trashing={trashing}
            setShowTrashConfirm={setShowTrashConfirm} selected={selected}
            setSelected={setSelected} handleTrashSingle={handleTrashSingle}
            handleFeedback={handleFeedback}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <AIPanel loggedIn={loggedIn} loading={loading} aiOut={aiOut} query={query} setQuery={setQuery} handleAsk={handleAsk} renderAI={renderAI} handleSignIn={handleSignIn} />
            <QuickActions loggedIn={loggedIn} syncing={syncing} handleSync={handleSync} setFilter={setFilter} handleAsk={handleAsk} setShowTrashConfirm={setShowTrashConfirm} handleSignIn={handleSignIn} setShowDemo={setShowDemo} handleSignOut={handleSignOut} />
          </div>
        </div>

        {/* ── Mobile layout ── */}
        <div className="mobile-panel">
          {mobileTab === "inbox"   && <EmailList filtered={filtered} filter={filter} setFilter={setFilter} loggedIn={loggedIn} lowCount={lowCount} trashing={trashing} setShowTrashConfirm={setShowTrashConfirm} selected={selected} setSelected={setSelected} handleTrashSingle={handleTrashSingle} handleFeedback={handleFeedback} mobile />}
          {mobileTab === "ai"      && <AIPanel loggedIn={loggedIn} loading={loading} aiOut={aiOut} query={query} setQuery={setQuery} handleAsk={handleAsk} renderAI={renderAI} handleSignIn={handleSignIn} mobile />}
          {mobileTab === "actions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <QuickActions loggedIn={loggedIn} syncing={syncing} handleSync={handleSync} setFilter={setFilter} handleAsk={handleAsk} setShowTrashConfirm={setShowTrashConfirm} handleSignIn={handleSignIn} setShowDemo={setShowDemo} handleSignOut={handleSignOut} mobile setMobileTab={setMobileTab} />
              {loggedIn ? (
                <div className="card" style={{ padding: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Account</p>
                  <p style={{ fontSize: 13, color: "#334155", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</p>
                  <button onClick={handleSignOut} style={{ width: "100%", padding: "10px 0", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#ef4444", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Sign Out</button>
                </div>
              ) : (
                <div className="card" style={{ padding: 16 }}>
                  <button onClick={handleSignIn} className="btn-primary" style={{ width: "100%", justifyContent: "center", marginBottom: 8 }}>Sign In with Google</button>
                  <button onClick={() => setShowDemo(true)} className="btn-ghost" style={{ width: "100%", justifyContent: "center" }}>Request Demo</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="bottom-nav xl:hidden">
        <div style={{ display: "flex" }}>
          {[
            { id: "inbox",   label: "Inbox",   badge: stats.high || null, icon: <InboxIcon /> },
            { id: "ai",      label: "Ask AI",  badge: null,               icon: <ChatIcon /> },
            { id: "actions", label: "Actions", badge: null,               icon: <CogIcon /> },
          ].map(tab => (
            <button key={tab.id} onClick={() => setMobileTab(tab.id)} className={`bnav-btn ${mobileTab === tab.id ? "on" : ""}`}>
              <div style={{ position: "relative" }}>
                {tab.icon}
                {tab.badge && <span style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, background: "#ef4444", borderRadius: "50%", fontSize: 9, fontWeight: 700, color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>{tab.badge}</span>}
              </div>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

// ── Email List ────────────────────────────────────────────────────────────────

function EmailList({ filtered, filter, setFilter, loggedIn, lowCount, trashing, setShowTrashConfirm, selected, setSelected, handleTrashSingle, handleFeedback, mobile }) {
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 14, color: "#0f172a", margin: 0 }}>Inbox</h2>
            {!loggedIn && <span style={{ fontSize: 10, fontWeight: 700, color: "#c2410c", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 100, padding: "2px 8px" }}>DEMO</span>}
            <span style={{ fontSize: 12, color: "#94a3b8" }}>{filtered.length} emails</span>
          </div>
          {loggedIn && lowCount > 0 && (
            <button onClick={() => setShowTrashConfirm(true)} disabled={trashing} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "5px 12px", cursor: "pointer" }}>
              {trashing ? <SpinIcon size={10} /> : "🗑️"} {trashing ? "Trashing..." : `Trash LOW (${lowCount})`}
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }} className="scrollbar-hide">
          {[["ALL","All"],["HIGH","🔴 Urgent"],["MEDIUM","🟡 Medium"],["LOW","⚪ Low"]].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} className={`filter-pill ${filter === val ? "on" : ""}`} style={{ flexShrink: 0 }}>{label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", maxHeight: mobile ? "calc(100svh - 340px)" : "580px" }} className="scrollbar-hide">
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 16px" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
            <p style={{ fontWeight: 700, color: "#334155", marginBottom: 4 }}>All clear!</p>
            <p style={{ fontSize: 13, color: "#94a3b8" }}>No emails in this category.</p>
          </div>
        ) : filtered.map((email, idx) => {
          const av     = getAvatarStyle(email.sender);
          const dl     = formatDL(email.deadline);
          // Use gmail_message_id for real emails, numeric id for mock emails
          const emailKey = email.gmail_message_id || String(email.id ?? idx);
          const selKey   = selected?.gmail_message_id || (selected?.id != null ? String(selected.id) : null);
          const isSel    = !!(selKey && emailKey === selKey);
          const p        = email.priority || "LOW";
          const lborder = p === "HIGH" ? "#ef4444" : p === "MEDIUM" ? "#f59e0b" : "#e2e8f0";
          const scoreColor = email.importance_score >= 70 ? "#ef4444" : email.importance_score >= 45 ? "#f59e0b" : "#94a3b8";
          const pbadge = p === "HIGH"
            ? { bg: "#fef2f2", text: "#ef4444", ring: "#fecaca", label: "🔴 Urgent" }
            : p === "MEDIUM"
            ? { bg: "#fffbeb", text: "#d97706", ring: "#fde68a", label: "🟡 Medium" }
            : { bg: "#f8fafc", text: "#64748b", ring: "#e2e8f0", label: "⚪ Low" };

          return (
            <div key={emailKey} onClick={() => setSelected(isSel ? null : email)}
              style={{ borderLeft: `3px solid ${isSel ? "#7c3aed" : lborder}`, padding: "16px", cursor: "pointer", background: isSel ? "#faf9ff" : "white", borderBottom: "1px solid #f8fafc", transition: "background .15s ease", WebkitUserSelect: "none", userSelect: "none", touchAction: "manipulation" }}
              onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = "#faf9ff"; }}
              onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "white"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                {/* Avatar */}
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: av.bg, color: av.text, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {getInitials(email.sender)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Subject + badge row */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                      {email.subject || email.summary?.slice(0, 80) || "(no subject)"}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 100, background: pbadge.bg, color: pbadge.text, border: `1px solid ${pbadge.ring}`, flexShrink: 0, whiteSpace: "nowrap" }}>{pbadge.label}</span>
                  </div>
                  <p style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>{email.sender}</p>
                  <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{email.summary}</p>

                  {/* Score bar */}
                  {email.importance_score != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: dl ? 6 : 0 }}>
                      <div style={{ flex: 1, height: 4, background: "#f1f5f9", borderRadius: 100, overflow: "hidden" }}>
                        <div style={{ width: `${Math.min(email.importance_score, 100)}%`, height: "100%", background: scoreColor, borderRadius: 100, transition: "width .3s ease" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, minWidth: 36 }}>{Math.round(email.importance_score)}/100</span>
                    </div>
                  )}

                  {/* Deadline chip */}
                  {dl && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: "#ef4444", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 100, padding: "2px 8px", marginBottom: loggedIn ? 4 : 0 }}>⏰ {dl}</span>
                  )}

                  {/* Trash button */}
                  {loggedIn && p !== "HIGH" && (
                    <button onClick={ev => handleTrashSingle(email, ev)} style={{ display: "block", marginTop: 6, fontSize: 11, fontWeight: 600, color: "#f87171", background: "transparent", border: "1px solid #fecaca", borderRadius: 100, padding: "3px 10px", cursor: "pointer", transition: "all .15s" }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >🗑️ Trash</button>
                  )}

                  {/* Feedback buttons — shown when card is selected */}
                  {isSel && loggedIn && email.gmail_message_id && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Correct this priority →</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[
                          { val: "HIGH",   label: "🔴 Urgent",  bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
                          { val: "MEDIUM", label: "🟡 Medium",  bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
                          { val: "LOW",    label: "⚪ Low",      bg: "#f8fafc", color: "#64748b", border: "#e2e8f0" },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            onClick={ev => { ev.stopPropagation(); handleFeedback(email, opt.val); }}
                            style={{
                              fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 100,
                              background: p === opt.val ? opt.bg : "white",
                              color: p === opt.val ? opt.color : "#94a3b8",
                              border: `1.5px solid ${p === opt.val ? opt.border : "#e2e8f0"}`,
                              cursor: p === opt.val ? "default" : "pointer",
                              opacity: p === opt.val ? 1 : 0.7,
                              transition: "all .15s",
                            }}
                            onMouseEnter={e => { if (p !== opt.val) { e.currentTarget.style.background = opt.bg; e.currentTarget.style.color = opt.color; e.currentTarget.style.borderColor = opt.border; e.currentTarget.style.opacity = "1"; } }}
                            onMouseLeave={e => { if (p !== opt.val) { e.currentTarget.style.background = "white"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.opacity = "0.7"; } }}
                            disabled={p === opt.val}
                            title={p === opt.val ? "Current priority" : `Mark as ${opt.val}`}
                          >
                            {opt.label} {p === opt.val && "✓"}
                          </button>
                        ))}
                      </div>
                    </div>
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

// ── AI Panel ──────────────────────────────────────────────────────────────────

function AIPanel({ loggedIn, loading, aiOut, query, setQuery, handleAsk, renderAI, handleSignIn, mobile }) {
  return (
    <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column", minHeight: mobile ? "calc(100vh - 290px)" : 360 }}>
      {/* Header */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c3aed,#4f46e5)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, flexShrink: 0 }}>✦</div>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 14, color: "#0f172a", margin: 0 }}>Ask your inbox</h2>
          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>{loggedIn ? "Connected to your Gmail" : "Demo — sign in for real answers"}</p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`dot ${loggedIn ? "dot-green" : "dot-yellow"}`}></span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8" }}>{loggedIn ? "Live" : "Demo"}</span>
        </div>
      </div>

      {/* Answer area */}
      <div style={{ flex: 1, padding: "16px 18px", overflowY: "auto" }} className="scrollbar-hide">
        {loading ? (
          <div>
            {[100, 80, 90].map((w, i) => <div key={i} style={{ height: 12, background: "#f1f5f9", borderRadius: 100, width: `${w}%`, marginBottom: 10, animation: "shimmer 1.5s infinite" }} />)}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 16 }}>
              {[0, 150, 300].map(d => <div key={d} style={{ width: 8, height: 8, background: "#a78bfa", borderRadius: "50%", animation: `bounce .7s ${d}ms infinite alternate` }} />)}
              <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>Thinking...</span>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>AI Response</p>
            <div style={{ background: "#f8f7ff", borderRadius: 12, padding: "14px 16px", border: "1px solid #ede9fe" }}>
              {renderAI(aiOut)}
            </div>
            {!loggedIn && (
              <p style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", marginTop: 12 }}>
                <button onClick={handleSignIn} style={{ color: "#7c3aed", fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>Sign in with Google</button> to search your real inbox
              </p>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            className="ai-input"
            placeholder="What deadlines do I have?"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAsk()}
            style={{ flex: 1 }}
          />
          <button onClick={() => handleAsk()} disabled={loading} className="btn-primary" style={{ flexShrink: 0, paddingLeft: 16, paddingRight: 16 }}>
            <SendIcon />
            <span className="hide-xs">Ask</span>
          </button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto" }} className="scrollbar-hide">
          {["What deadlines?", "Show urgent", "Summarize inbox"].map(s => (
            <button key={s} onClick={() => handleAsk(s)} style={{ flexShrink: 0, background: "#f5f3ff", color: "#7c3aed", border: "1px solid #ddd6fe", borderRadius: 100, fontSize: 11, fontWeight: 600, padding: "5px 12px", cursor: "pointer", whiteSpace: "nowrap" }}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions({ loggedIn, syncing, handleSync, setFilter, handleAsk, setShowTrashConfirm, handleSignIn, setShowDemo, handleSignOut, mobile, setMobileTab }) {
  const actions = [
    { icon: loggedIn ? "⚡" : "📬", label: loggedIn ? "Sync Gmail" : "Request Demo", sub: loggedIn ? "Pull latest emails" : "Get live access",        action: loggedIn ? handleSync : () => setShowDemo(true) },
    { icon: "🔴",                    label: "View Urgent",                             sub: "Filter to HIGH priority",                                    action: () => { setFilter("HIGH"); if (mobile && setMobileTab) setMobileTab("inbox"); } },
    { icon: "⏰",                    label: "My Deadlines",                            sub: "Ask AI for upcoming due dates",                               action: () => handleAsk("What deadlines do I have?") },
    { icon: loggedIn ? "🗑️" : "🔑", label: loggedIn ? "Trash LOW emails" : "Sign In", sub: loggedIn ? "One-click inbox cleanup" : "Connect your Gmail", action: loggedIn ? () => setShowTrashConfirm(true) : handleSignIn },
  ];
  return (
    <div className="card" style={{ padding: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Quick Actions</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {actions.map(a => (
          <button key={a.label} onClick={a.action} style={{ textAlign: "left", display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", borderRadius: 12, border: "1.5px solid #e2e8f0", background: "white", cursor: "pointer", transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#c4b5fd"; e.currentTarget.style.background = "#faf9ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.background = "white"; }}
          >
            <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{a.label}</p>
              <p style={{ fontSize: 11, color: "#94a3b8" }}>{a.sub}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
  </svg>
);
const SyncIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const SpinIcon = ({ size = 13 }) => (
  <svg className="spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 12a9 9 0 11-6.219-8.56"/>
  </svg>
);
const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const InboxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const CogIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>
  </svg>
);

// ── CSS ───────────────────────────────────────────────────────────────────────

const styles = {};

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800&family=Inter:wght@400;500;600;700&display=swap');

  /* ── Reset ── */
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: #f8f7ff; -webkit-text-size-adjust: 100%; }

  /* ── Layout ── */
  .container { max-width: 1400px; margin: 0 auto; padding-left: 16px; padding-right: 16px; }
  @media(min-width:640px){ .container { padding-left: 24px; padding-right: 24px; } }

  .card { background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 1px 4px rgba(0,0,0,.05); }

  /* ── Grids ── */
  .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media(min-width:640px){ .stats-grid { gap: 12px; } }
  @media(min-width:768px){ .stats-grid { grid-template-columns: repeat(4,1fr); } }

  .pipeline-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  @media(min-width:640px){ .pipeline-grid { grid-template-columns: repeat(4,1fr); } }

  .desktop-grid { display: grid; grid-template-columns: 1fr 380px; gap: 20px; }

  /* ── Desktop vs mobile panels ── */
  .desktop-only { display: none; }
  .mobile-panel { display: block; }
  @media(min-width:1280px){
    .desktop-only { display: grid; }
    .mobile-panel { display: none; }
    .bottom-nav { display: none !important; }
  }

  /* ── Safe area padding ── */
  .safe-pb { padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px)); }
  @media(min-width:1280px){ .safe-pb { padding-bottom: 32px; } }

  /* ── Show/hide helpers ── */
  .hide-xs { display: none; }
  @media(min-width:420px){ .hide-xs { display: inline; } }
  .show-xs-only { display: inline; }
  @media(min-width:420px){ .show-xs-only { display: none; } }
  .hide-sm { display: none; }
  @media(min-width:640px){ .hide-sm { display: inline-flex; } }

  /* ── Scrolling ── */
  .scrollbar-hide::-webkit-scrollbar { display: none; }
  .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; -webkit-overflow-scrolling: touch; }

  /* ── Status dots ── */
  .dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; }
  .dot-green { background: #22c55e; box-shadow: 0 0 6px rgba(34,197,94,.5); animation: pulse 2s infinite; }
  .dot-yellow { background: #f59e0b; }
  .dot-red { background: #ef4444; }

  .spin { animation: spin 1s linear infinite; }

  /* ── Filter pills ── */
  .filter-pill {
    font-size: 12px; padding: 7px 14px; border-radius: 100px;
    border: 1.5px solid #e2e8f0; background: white; cursor: pointer;
    color: #64748b; font-weight: 600; transition: all .15s;
    min-height: 36px; display: inline-flex; align-items: center;
    white-space: nowrap; -webkit-user-select: none; user-select: none;
  }
  .filter-pill:active { background: #f5f3ff; }
  .filter-pill.on { background: #7c3aed; color: white; border-color: #7c3aed; }

  /* ── AI input — 16px prevents iOS auto-zoom ── */
  .ai-input {
    background: #f8f7ff; border: 1.5px solid #e2e8f0; border-radius: 12px;
    padding: 12px 14px; font-size: 16px; font-family: inherit;
    outline: none; transition: all .2s; color: #0f172a; width: 100%;
  }
  @media(min-width:640px){ .ai-input { font-size: 14px; } }
  .ai-input:focus { border-color: #7c3aed; background: white; box-shadow: 0 0 0 3px rgba(124,58,237,.08); }
  .ai-input::placeholder { color: #94a3b8; }

  /* ── Buttons ── */
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 16px; min-height: 44px; border-radius: 10px; border: none;
    background: linear-gradient(135deg,#7c3aed,#4f46e5); color: white;
    font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: all .2s; white-space: nowrap; touch-action: manipulation;
  }
  @media(min-width:640px){ .btn-primary { font-size: 13px; padding: 9px 16px; min-height: unset; } }
  .btn-primary:active { transform: scale(.97); opacity: .9; }
  .btn-primary:disabled { opacity: .55; cursor: not-allowed; }

  .btn-ghost {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 10px 14px; min-height: 44px; border-radius: 10px;
    border: 1.5px solid #e2e8f0; background: white; color: #475569;
    font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: all .15s; touch-action: manipulation;
  }
  @media(min-width:640px){ .btn-ghost { min-height: unset; padding: 9px 14px; } }
  .btn-ghost:active { background: #f5f3ff; border-color: #c4b5fd; color: #7c3aed; }

  .btn-ghost-sm { display: inline-flex; align-items: center; padding: 8px 14px; min-height: 36px; border-radius: 8px; border: 1px solid #fbbf24; background: white; color: #92400e; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .btn-amber-sm { display: inline-flex; align-items: center; padding: 8px 14px; min-height: 36px; border-radius: 8px; border: none; background: #f59e0b; color: white; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }

  /* ── Bottom nav ── */
  .bottom-nav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
    background: white; border-top: 1px solid #e2e8f0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .bnav-btn {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 4px; padding: 10px 4px; min-height: 56px; cursor: pointer;
    border: none; background: transparent; color: #94a3b8;
    font-size: 10px; font-weight: 600; transition: color .15s;
    font-family: inherit; touch-action: manipulation;
  }
  .bnav-btn.on { color: #7c3aed; }
  .bnav-btn:active { opacity: .7; }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
    z-index: 50; background: white; border-radius: 12px; padding: 12px 16px;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 30px rgba(0,0,0,.15); border: 1.5px solid;
    width: calc(100vw - 32px); max-width: 380px;
  }
  @media(min-width:1280px){ .toast { bottom: 24px; left: unset; right: 24px; transform: none; width: auto; } }

  /* ── Mobile modal bottom sheet handle ── */
  .modal-handle {
    width: 40px; height: 4px; background: #e2e8f0;
    border-radius: 100px; margin: 0 auto 16px;
  }
  @media(min-width:640px){ .modal-handle { display: none; } }

  /* ── Mobile modal — slides from bottom ── */
  @media(max-width:639px){
    .modal-sheet {
      border-radius: 20px 20px 0 0 !important;
      max-height: 92vh; overflow-y: auto; -webkit-overflow-scrolling: touch;
      padding-top: 16px !important;
    }
  }

  /* ── Stat card numbers — scale down on tiny screens ── */
  .stat-num { font-size: 28px; }
  @media(min-width:360px){ .stat-num { font-size: 30px; } }

  /* ── Suggest chips ── */
  .suggest-chip {
    background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;
    border-radius: 100px; font-size: 12px; font-weight: 600;
    padding: 7px 14px; cursor: pointer; transition: all .15s;
    white-space: nowrap; min-height: 36px; display: inline-flex;
    align-items: center; touch-action: manipulation;
  }
  .suggest-chip:active { background: #ede9fe; }

  /* ── Action buttons ── */
  .action-btn {
    width: 100%; text-align: left; display: flex; align-items: flex-start;
    gap: 10px; padding: 14px; min-height: 60px; border-radius: 12px;
    border: 1.5px solid #e2e8f0; background: white; cursor: pointer;
    font-size: 13px; font-weight: 500; color: #374151;
    transition: all .15s; touch-action: manipulation;
  }
  .action-btn:active { border-color: #c4b5fd; background: #faf9ff; color: #7c3aed; }

  @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .3; } }
  @keyframes bounce { from { transform: translateY(0); } to { transform: translateY(-5px); } }
  @keyframes shimmer { 0% { opacity: .4; } 50% { opacity: .8; } 100% { opacity: .4; } }
`;
