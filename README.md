<div align="center">

```
 _____ ____   ___  _   _ _____ _____ _   _ ____  
|  ___|  _ \ / _ \| \ | |_   _| ____| \ | |  _ \ 
| |_  | |_) | | | |  \| | | | |  _| |  \| | | | |
|  _| |  _ <| |_| | |\  | | | | |___| |\  | |_| |
|_|   |_| \_\\___/|_| \_| |_| |_____|_| \_|____/ 
```

### The dashboard that makes your inbox make sense.
### Dark. Fast. Mobile-first. No fluff.

[![Live Demo](https://img.shields.io/badge/LIVE-smart--ai--inbox.vercel.app-7c3aed?style=for-the-badge&logo=vercel)](https://smart-ai-inbox.vercel.app)
[![Backend](https://img.shields.io/badge/API-FastAPI_on_HF_Spaces-ff9d00?style=for-the-badge&logo=huggingface)](https://dhanashree2311-smart-ai-inbox.hf.space)
[![React](https://img.shields.io/badge/React-18-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06b6d4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com)

</div>

---

## What this is

The frontend for Smart AI Inbox — a production-deployed React dashboard that connects to a real Gmail account via Google OAuth, displays ML-classified emails, and lets you clean your inbox with one click.

Not a design mockup. Not a Figma prototype. A real deployed app with real user data.

**Backend repo:** [smart-ai-inbox-backend](https://github.com/dhanashree23112003/smart-ai-inbox-backend)

---

## What it looks like

```
┌─────────────────────────────────────────────────────────────────┐
│  ✦ Smart AI Inbox                              [Gmail Sync] [DB] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Total   │  │   High   │  │  Medium  │  │Deadlines │        │
│  │    50    │  │    12    │  │    18    │  │    7     │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                                                                  │
│  ┌──────────────────────────────┐  ┌──────────────────────────┐ │
│  │ Inbox          [ALL][HIGH].. │  │ ✦ Ask Your Inbox         │ │
│  │ ─────────────────────────── │  │ ─────────────────────── │ │
│  │ SC  Q4 Budget Review   HIGH │  │ You have 3 deadlines:   │ │
│  │     ████████████░░░  92     │  │                         │ │
│  │     ⏰ Today 5:00 PM        │  │ [HIGH] Q4 Budget Review  │ │
│  │                             │  │ Today 5:00 PM            │ │
│  │ MW  Partnership Proposal    │  │                         │ │
│  │     ███████░░░░░░░  85 HIGH │  │ [HIGH] Invoice #4821     │ │
│  │     ⏰ Tomorrow             │  │ Today EOD                │ │
│  │                             │  │ ─────────────────────── │ │
│  │ PN  Design Handoff  MEDIUM  │  │ [Ask anything...]   Ask │ │
│  │     ████░░░░░░░░░░  58      │  │                         │ │
│  │                             │  │ Deadlines? Urgent? Sum. │ │
│  └──────────────────────────── │  └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

Dark glassmorphism. Gradient borders. Priority color coding. Importance score bars. Deadline chips. All in one view.

---

## Features

### Multi-user Google OAuth
Every user signs in with their own Google account. Sessions stored in Supabase — survive server restarts. Your emails never touch another user's view.

### AI-powered email cards
Each email card shows:
- Priority badge (HIGH / MEDIUM / LOW) — set by ML ensemble
- Importance score bar (0–100) — XGBoost output, color coded
- Deadline chip — extracted by NLP from email body
- AI reasoning — why the model flagged this email
- Per-email trash button (LOW priority only)

### Ask Your Inbox
Semantic search powered by pgvector. Type a question, get an answer from your real emails:

```
"What deadlines do I have?"     → lists emails with deadlines
"Summarize my inbox"            → stats + most urgent email
"Any urgent emails?"            → HIGH priority list
"How many emails do I have?"    → full breakdown by priority
"Emails from Google?"           → semantic match on sender
```

### One-click inbox cleanup
- **Trash LOW** button — moves all LOW priority emails to Gmail Trash in one click
- **Per-email trash** — individual trash button on each LOW email
- Confirmation modal before bulk action
- Emails disappear from dashboard instantly
- Recoverable from Gmail Trash within 30 days

### Demo mode
Public visitors see a realistic demo with sample emails — no real data exposed. Yellow banner makes it clear. "Request Demo" modal for people who want live access.

### Mobile-first
Built for phones, not just desktops:
- Bottom tab navigation (Inbox / Ask AI / Actions)
- Modals slide up from bottom as sheets
- 16px font on inputs (prevents iOS zoom)
- `active:scale-95` tap feedback on all buttons
- `-webkit-tap-highlight-color: transparent`
- Touch targets minimum 44px

---

## Component structure

```
src/
├── App.jsx                  ← entire app (single file, intentional)
│   ├── SmartInbox()         ← main component, all state lives here
│   ├── EmailList()          ← email cards, filter buttons, trash
│   ├── AIPanel()            ← ask your inbox, semantic search UI
│   ├── QuickActions()       ← action grid, shared desktop + mobile
│   ├── TrashConfirmModal()  ← confirmation sheet before bulk trash
│   └── DemoModal()          ← request live access modal
```

Single file by design. This is a portfolio project — not a monorepo. Reviewers can read the entire frontend in one file without jumping between folders.

---

## State management

No Redux. No Zustand. Just React useState — because that's all this needs.

```javascript
const [sessionToken, setSessionToken]         // Google OAuth session
const [emails, setEmails]                     // email list from API
const [filter, setFilter]                     // ALL / HIGH / MEDIUM / LOW
const [aiOut, setAiOut]                       // AI panel response text
const [trashing, setTrashing]                 // bulk trash loading state
const [showTrashConfirm, setShowTrashConfirm] // confirmation modal
const [mobileTab, setMobileTab]               // inbox / ai / actions
const [stats, setStats]                       // total, high, medium, deadlines
```

Everything flows down from SmartInbox(). No prop drilling issues at this scale.

---

## Auth flow in the frontend

```javascript
// On mount — check if Google OAuth just redirected back
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const token  = params.get("session");  // UUID from backend
  const email  = params.get("email");    // user's Gmail address

  if (token && email) {
    setSessionToken(token);
    setUserEmail(email);
    window.history.replaceState({}, "", "/"); // clean URL
    loadAndSync(token); // auto-sync Gmail immediately
  }
}, []);

// Every API call sends the session token
const authHeaders = () => ({
  "Content-Type":    "application/json",
  "x-session-token": sessionToken,
});
```

---

## Design system

All styles are inline CSS-in-JS and Tailwind utilities. No external component library.

```css
/* Glassmorphism cards */
background: rgba(255, 255, 255, 0.035);
backdrop-filter: blur(16px);
border: 1px solid rgba(255, 255, 255, 0.07);

/* Glow button */
background: linear-gradient(135deg, #7c3aed, #4f46e5);
box-shadow: 0 0 20px rgba(124, 58, 237, 0.4),
            0 0 40px rgba(124, 58, 237, 0.15);

/* Priority colors */
HIGH   → red-400    #f87171
MEDIUM → yellow-400 #fbbf24
LOW    → slate-400  #94a3b8

/* Base */
Background → #080b14  (near-black with blue tint)
Accent     → violet-500 #7c3aed
```

---

## Running locally

```bash
git clone https://github.com/dhanashree23112003/smart-ai-inbox-frontend
cd smart-ai-inbox-frontend

npm install
npm run dev
```

The app runs in demo mode by default (no real Gmail needed). To connect to the live backend, the API constant at the top of App.jsx points to the deployed HF Spaces URL — no changes needed.

To run against a local backend:
```javascript
// App.jsx line 3
const API = "http://localhost:8000"; // change this
```

---

## Deployment

Deployed on Vercel. Zero config.

```bash
npm install -g vercel
vercel --prod
```

Environment variables: none needed on the frontend. The API URL is hardcoded to the HF Spaces backend. CORS is handled server-side.

---

## What I'd improve at scale

**Code splitting** — the single App.jsx works fine at this size but would need to be split at 1000+ lines. React.lazy() for the modals and panels.

**Error boundaries** — currently a crashed component takes down the whole app. Wrap panels in ErrorBoundary components.

**Optimistic updates** — trash operations update the UI instantly, but if the API call fails, the email disappears anyway. Need rollback on failure.

**Skeleton loading** — currently shows shimmer only in the AI panel. Email list should also have skeleton cards on first load.

**PWA** — add a service worker and manifest.json. This UI is already mobile-first — it should be installable as a home screen app.

---

<div align="center">

Built by **Dhanashree Bansode**

[LinkedIn](https://linkedin.com/in/dhanashree2311) · [Live Demo](https://smart-ai-inbox.vercel.app) · [Backend Repo](https://github.com/dhanashree23112003/smart-ai-inbox-backend)

*The backend does the hard work. This is the part people actually see.*

</div>
