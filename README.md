# VoiceCareer AI

An AI-powered **voice career coach** built for the AssemblyAI Voice Agent Hackathon. Speak
naturally to discover the right career path, practice adaptive mock interviews, receive instant
evaluation, and get a personalized skill-gap analysis and 30-day career roadmap — the agent
listens, thinks, and talks back.

## Features

- **Live Voice Agent interview** — the signature flow. Browser mic → AudioWorklet (24 kHz mono PCM16) → `wss://agents.assemblyai.com/v1/ws` → a career-aware AI interviewer that speaks back. Built with the AssemblyAI Voice Agent API.
- **Real microphone + real transcript** — continuous capture, server-side VAD turn detection, barge-in, and live interim transcripts. No push-to-talk required.
- **AI voice response** — the agent answers out loud (`voice: alba`), interruptible.
- **Career intelligence** — 10 structured job roles (Frontend, Backend, Full-Stack, Data Analyst, AI/ML, Cybersecurity, DevOps, QA, …), each with critical/important/nice-to-have requirements. Gaps are computed per candidate; roadmaps are role- *and* gap-specific, never a fixed 4-week template.
- **Interview evaluation** — weighted scoring across 6 criteria with per-criterion feedback, strengths and improvements.
- **Personalized 30-day roadmap** — 4 weeks of focus, skills, tasks, a project and an expected outcome, generated from the role + the candidate's actual gaps.
- **Voice career coach** — push-to-talk and live-streaming text/voice chat against the LLM.
- **Text fallback** — type when you can't speak.

## Repository Layout

```
├── docs/PRD.md         # Product requirements
├── ai/                 # Agents, prompts, evaluation, career engine (no deps)
│   ├── agents/         # careerAgent, interviewAgent, coachAgent, voiceInterviewAgentConfig
│   ├── prompts/        # interview, coach, careerDiscovery
│   ├── evaluation/     # evaluator + weighted criteria
│   └── career-engine/  # roleCatalog, skillGap, roadmap
├── backend/            # Express API (port 3000)
└── frontend/           # React + Vite + Tailwind (port 5173)
```

See `backend/routes` for the API and `frontend/src` for the UI. Full details in `docs/PRD.md`.

## Getting Started

### Requirements

- Node.js 18+ (developed and verified on Node 24)
- API keys: AssemblyAI (Voice Agent + STT), Groq (LLM)

### 1. Backend

```bash
cd backend
npm install
```

Copy the env template and fill in the keys:

```bash
copy .env.example .env        # PowerShell
cp .env.example .env          # macOS / Linux
```

```
ASSEMBLYAI_API_KEY=...
LLM_API_KEY=...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
TTS_MODEL=canopylabs/orpheus-v1-english
TTS_VOICE=hannah
TTS_ENABLED=true
PORT=3000
```

```bash
npm run dev       # http://localhost:3000  (GET /api lists all endpoints)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173  (proxies /api and /health to :3000)
```

### Lint & build

```bash
cd frontend
npm run lint
npm run build
```

### Career engine regression check

```bash
cd backend
npm run test:roadmap
```

Proves the roadmap is role-specific and gap-specific: no already-owned skill is ever
scheduled, and two candidates with different gaps on the same role get different plans.

## Data Flow

```
Browser mic
  → AudioWorklet (resample to 24 kHz mono PCM16, 1200-sample chunks)
  → wss://agents.assemblyai.com/v1/ws   (short-lived token from the backend)
  → AssemblyAI STT + VAD + TTS
  → agent tool call  →  POST /api/voice-agent/tools  →  ai/career-engine + ai/evaluation
  → spoken reply     →  browser Web Audio playback
  → finish           →  POST /api/evaluate/complete  →  scored dashboard
```

The `ASSEMBLYAI_API_KEY` and `LLM_API_KEY` never reach the browser. The frontend only
ever receives a short-lived (300 s) AssemblyAI token minted server-side.

## API at a Glance

| Group | Endpoint |
| --- | --- |
| Voice Agent | `GET /api/voice-token`, `GET /api/voice-agent/token`, `GET /api/voice-agent/config`, `POST /api/voice-agent/tools`, `GET/DELETE /api/voice-agent/session/:id` |
| Voice | `POST /api/voice/process`, `POST /api/voice/process-text`, `GET /api/voice/token` |
| Career | `POST /api/career/start`, `POST /api/career/chat`, `GET /api/career/profile/:id` |
| Interview | `POST /api/interview/start`, `POST /api/interview/respond`, `POST /api/interview/voice` |
| Evaluation | `POST /api/evaluate/interview`, `/skill-gaps`, `/roadmap`, `/complete`, `/dashboard`, `GET /api/evaluate/roles`, `GET /api/evaluate/:sessionId` |
| Health | `GET /health` |

## Known Constraints

- **Server-side TTS is currently unavailable.** `canopylabs/orpheus-v1-english` requires
  terms acceptance at `https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english`.
  Until that is done, `/api/voice/*`, `/api/career/*` and `/api/interview/*` return
  `audio: null` and the browser falls back to `speechSynthesis`. **The Voice Agent
  interview is unaffected** — it speaks with AssemblyAI's own voice.
- **Groq free tier rate limit.** `openai/gpt-oss-120b` on the free tier is capped at
  8 000 tokens/min, and one `/api/evaluate/complete` makes three sequential LLM calls.
  A 429 surfaces as a 500 with the provider message.
- **Sessions are in-memory.** Career, interview, voice-agent and evaluation stores are
  `Map`s in process memory — they reset on restart and are not shared across instances.
  Wire up Postgres/Supabase before deploying more than one instance.
- **Microphone capture needs a real browser.** Verified headlessly by streaming real
  speech in the worklet's exact wire format; `getUserMedia` + AudioWorklet + speaker
  playback need manual testing (see below).

## Security

- **No secrets in the frontend.** Verified: no API key appears anywhere in the built
  `frontend/dist/`. Only short-lived AssemblyAI tokens cross the wire.
- **Commit never contains secrets:** `.env` is git-ignored. Use `.env.example` as the
  template (both at the repo root and in `backend/`).

## Team

- **Amna** — AI Agents & Voice Lead
- **Abiha** — Frontend
- **Momna** — Backend
- **Irtiqa** — Evaluation