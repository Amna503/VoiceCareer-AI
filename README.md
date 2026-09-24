# VoiceCareer AI

An AI-powered **voice career coach** built for the AssemblyAI Voice Agent Hackathon. Speak
naturally to discover the right career path, practice adaptive mock interviews, receive instant
evaluation, and get a personalized skill-gap analysis and 30-day career roadmap — the agent
listens, thinks, and talks back.

## Features

- **Voice-first** — speak to the coach; transcribed with AssemblyAI, responses read back with Groq TTS (browser speech fallback).
- **Career Discovery** — conversational agent builds your profile across 8 categories.
- **Adaptive Mock Interviews** — technical + behavioral modes; follow-up questions adapt to your answers (6–10 questions).
- **Interview Evaluation** — scoring across 6 weighted criteria with structured feedback.
- **Skill Gap Analysis & Career Roadmap** — prioritized gaps + a 4-week learning plan.
- **Text fallback** — type when you can't speak, with AI voice on/off toggle.

## Repository Layout

```
├── docs/PRD.md         # Product requirements
├── ai/                 # Agents, prompts, evaluation, career engine
├── backend/            # Express API (port 3000)
└── frontend/           # React + Vite + Tailwind (port 5173)
```

See `backend/routes` for the API and `frontend/src` for the UI. Full details in `docs/PRD.md`.

## Getting Started

### Requirements

- Node.js 18+
- API keys: AssemblyAI (STT), Groq (LLM + TTS)

### 1. Backend

```bash
cd backend
npm install
```

Copy `backend/.env.example` to `backend/.env` and fill in the keys:

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

> **TTS note:** accept the Groq Orpheus model terms once at
> `https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english`
> for server-side audio. Until then the app uses the browser's `speechSynthesis` fallback.

```bash
npm run dev       # http://localhost:3000  (GET /api lists all endpoints)
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173  (proxies /api to :3000)
```

### Lint & build

```bash
cd frontend
npm run lint
npm run build
```

## API at a Glance

| Group | Endpoint |
| --- | --- |
| Voice | `POST /api/voice/process`, `POST /api/voice/process-text` |
| Career | `POST /api/career/start`, `POST /api/career/chat` |
| Interview | `POST /api/interview/start`, `POST /api/interview/respond`, `POST /api/interview/voice` |
| Evaluation | `POST /api/evaluate/interview`, `POST /api/evaluate/skill-gaps`, `POST /api/evaluate/roadmap`, `POST /api/evaluate/complete` |

## Security

- Commit **never** contains secrets: `.env` is git-ignored. Use `.env.example` as the template.

## Team

- **Amna** — AI Agents & Voice Lead
- **Abiha** — Frontend
- **Momna** — Backend
- **Irtiqa** — Evaluation