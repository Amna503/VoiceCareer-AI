# VoiceCareer AI

An AI-powered voice career coach. Speak naturally to discover the right career path, practice adaptive mock interviews, receive instant evaluation, and leave with a personalized skill-gap analysis and career roadmap.

## Features

- **Voice interaction** — speak to the coach; speech is transcribed with **AssemblyAI** and the AI agent reads responses back with **Groq TTS** (browser speech synthesis fallback).
- **Live conversation** — "Live Voice" mode streams the microphone to AssemblyAI Universal-Streaming (`src/lib/realtimeTranscriber.js`), shows words live as you speak, and auto-submits each turn on end-of-turn so the AI replies hands-free and keeps listening.
- **Career Discovery** — an agent-driven Q&A that builds your career profile across 8 categories.
- **Adaptive Mock Interviews** — technical and behavioral interview modes that adapt follow-up questions to your answers.
- **Interview Evaluation** — structured feedback across clarity, depth, enthusiasm, and confidence.
- **Skill Gap Analysis & Career Roadmap** — actionable, prioritized learning plans for your target role.
- **Text fallback** — type your messages if you prefer not to speak.

## Tech Stack

| Layer     | Tech                                                       |
| --------- | ---------------------------------------------------------- |
| Frontend  | React 19, Vite, Tailwind CSS 4 (hashing for no-dependency routing) |
| Backend   | Node.js, Express                                           |
| Speech    | AssemblyAI (STT + Universal-Streaming live), Groq Orpheus (TTS) |
| AI Agents | OpenAI-compatible LLM via Groq (agent prompts in `ai/prompts`) |

## Project Structure

```
├── ai/                    # AI agents, evaluation, career engine, prompts
│   ├── agents/            # CareerAgent, InterviewAgent, CoachAgent
│   ├── career-engine/     # Skill gap + roadmap generators
│   ├── evaluation/        # Interview scoring criteria
│   └── prompts/           # Agent system prompts
├── backend/               # Express API server (port 3000)
│   ├── routes/            # voice, career, interview, evaluation APIs
│   └── services/          # AssemblyAI STT + Groq TTS services
└── frontend/              # React + Vite app (port 5173)
    └── src/
        ├── components/    # Navbar, Footer, Toast, recording, messages
        ├── lib/           # Hash router, page-meta hook, realtimeTranscriber
        └── pages/         # Landing, Voice Coach, Dashboard, Interview, 404
```

## Getting Started

### 1. Backend

```bash
cd backend
npm install
```

Create `backend/.env` (see `backend/.env.example`):

```
ASSEMBLYAI_API_KEY=...
LLM_API_KEY=...
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b
PORT=3000
TTS_MODEL=canopylabs/orpheus-v1-english
TTS_VOICE=hannah
TTS_ENABLED=true
```

> **TTS note:** server-side TTS requires accepting the Groq model terms once at
> `https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english`.
> Until then, the app gracefully falls back to the browser speech synthesis.

Run:

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` to `http://localhost:3000`.

## API Overview

- `POST /api/voice/process` — base64 audio → transcript → AI response → optional TTS audio
- `POST /api/voice/process-text` — text → AI response → optional TTS audio
- `GET /api/voice/token` — short-lived AssemblyAI streaming token for live mode
- `POST /api/career/start`, `/api/career/chat` — career discovery
- `POST /api/interview/start`, `/api/interview/respond`, `/api/interview/voice` — mock interviews
- `POST /api/evaluate/interview` — interview evaluation, skill gaps, roadmap
- `GET /health` — health check

All agent responses include `audio` (base64 WAV) and `audioContentType` when TTS is available.

## Lint & Build

```bash
cd frontend
npm run lint
npm run build
```

## Built With

- **AssemblyAI** — speech-to-text
- **Groq** — LLM agents and TTS (Orpheus)
- **React + Vite + Tailwind CSS** — frontend