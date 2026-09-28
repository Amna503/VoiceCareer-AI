# VoiceCareer AI — Product Requirements Document (PRD)

> **Project:** VoiceCareer AI
> **Event:** AssemblyAI Voice Agent Hackathon
> **Owner:** Team Lead — Amna
> **Status:** In Development

---

## 1. Overview

VoiceCareer AI is an AI-powered **voice career coach** that lets users discover the right career
path, practice adaptive mock interviews, and build a personalized action plan — entirely through
natural spoken conversation.

Users speak to the agent instead of typing through forms. The agent listens (speech-to-text),
thinks (LLM agent), responds conversationally, and reads answers back (text-to-speech). The result
is a complete career coaching loop: **discover → practice → evaluate → plan**.

### 1.1 Problem Statement

Job seekers and students struggle to translate vague career ambitions into concrete, actionable
steps. Existing career tools are form-based, rigid, and impersonal:

- Career guidance is generic, not tailored to the individual's skills and goals.
- Mock interviews are rare, scripted, and offer no constructive feedback.
- Users don't know which skills to learn, in what order, or why.

Voice removes the friction of typing long answers — a user can simply **talk** about their goals
the way they would with a real career counselor.

### 1.2 Goals

1. Deliver a natural, conversational voice experience for career coaching (Discover → Interview → Evaluate → Plan).
2. Build a **Career Discovery Agent** that constructs a user profile across 8 categories through dialogue.
3. Build an **Adaptive Interview Agent** that conducts realistic technical and behavioral interviews, adjusting follow-up questions to each answer.
4. Build a **Career Coach Agent** that scores interviews, identifies skill gaps, and generates a 30-day career roadmap.
5. Make the agent **speak responses back**, completing a hands-free voice loop with a text fallback.

### 1.3 Non-Goals (v1)

- No persistent user accounts or saved history across sessions.
- No hosted Voice Agent (managed full-duplex phone-style agent with built-in barge-in); voice is
  turn-oriented: live streaming transcription with automatic end-of-turn detection is implemented,
  but a server-managed agent session remains future work.
- No mobile app — responsive web app only.
- No production auth/billing.

---

## 2. Team & Roles

| Member | Role | Scope |
| --- | --- | --- |
| **Amna** | AI Agents & Voice/AssemblyAI Lead | Voice pipeline, STT, TTS, agent architecture, prompts, API contract *(DONE)* |
| **Abiha** | Frontend Developer | React UI, pages, responsive design, toasts/404, SEO |
| **Momna** | Backend Developer | Express API, routing, session store, integrations |
| **Irtiqa** | Evaluation Lead | Interview scoring, skill-gap analysis, roadmap engine |

---

## 3. Target Users

- **Students & fresh graduates** unsure of their career direction.
- **Career switchers** exploring a new field (frontend, backend, data).
- **Job seekers** preparing for technical and behavioral interviews.

---

## 4. Features

### F1 — Career Discovery
A friendly, conversational agent that builds a user profile by asking **one question at a time**
across 8 categories:

1. Interests
2. Skills
3. Education
4. Experience
5. Career Goals
6. Preferences (remote vs office, team vs solo, values)
7. Strengths
8. Weaknesses

When at least 5 of 8 categories have substantive data, the agent emits a
`PROFILE_COMPLETE` marker followed by a JSON profile.

### F2 — Voice Interaction (speak + listen + talk back)
- Speech-to-text via **AssemblyAI** (transcribes the user's voice).
- The agent parses the transcript, thinks, and replies conversationally.
- **Text-to-speech**: the response is synthesized and spoken back to the user
  (Groq Orpheus server-side, with browser `speechSynthesis` fallback).
- A voice on/off toggle and a text input fallback are provided.
- **Real-time (live) mode**: the browser streams the microphone to AssemblyAI
  Universal-Streaming via a short-lived server-side token; words appear live as the user speaks,
  and each turn is auto-submitted on end-of-turn (`end_of_turn`) so the conversation continues
  hands-free. The mic is gated while the AI thinks/speaks to avoid echo.

### F3 — Adaptive Mock Interviews
- Two modes: **TECHNICAL** (frontend / backend / data question banks) and **HR/BEHAVIORAL**.
- The interviewer does **not** follow a fixed script — it generates follow-up questions based on
  the candidate's actual answers (digging into mentioned technologies, projects, or vague answers).
- 6–10 adaptive questions; the agent tracks covered topics to avoid repetition and signals
  completion with `INTERVIEW_COMPLETE`.

### F4 — Interview Evaluation
After an interview, the Coach Agent scores performance on 6 weighted criteria and returns
structured, actionable feedback.

### F5 — Skill Gap Analysis
Compares the candidate's current skills against the requirements of their target role
(critical / important / nice-to-have), listing matched skills and prioritized gaps.

### F6 — Career Roadmap
Generates a personalized **30-day (4-week) roadmap**: weekly focus areas, goals, activities
(learn / practice / project / review), milestones, and key learning resources.

---

## 5. Tech Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Speech-to-Text | **AssemblyAI** | Audio transcription of user voice (+ live Universal-Streaming in live mode) |
| LLM / Agents | **Groq** (OpenAI-compatible) | Agent reasoning & generation |
| Text-to-Speech | **Groq Orpheus** | Speak AI responses (browser fallback) |
| Backend | **Node.js + Express** | API, session stores, integrations |
| Frontend | **React 19 + Vite + Tailwind CSS 4** | UI, routing, responsive design |
| Sessions | In-memory Maps | Per-session state (dev/NC scope) |

---

## 6. System Architecture

```
User speaks ──► Browser (MediaRecorder)
                   │ base64 audio
                   ▼
            /api/voice/process ──► AssemblyAI (STT) ──► transcript
                                                           │
                                                           ▼
                                        Conversation state (per session)
                                                           │
                                                           ▼
                                        LLM Agent (CareerDiscovery / Interview / Coach)
                                                           │
                                                           ▼
                                        AI response (text) ──► TTS (Groq Orpheus) ──► audio
                                                           │
                                                           ▼
                                        Browser plays audio back to user
```

The frontend also supports `/api/voice/process-text` for the typed fallback and live mode
(same loop minus STT), and `/api/voice/token` mints a short-lived streaming token so the browser
can authenticate live WebSocket transcription without exposing the API key.

---

## 7. API Contract

Base: `http://localhost:3000` (frontend proxies `/api` → backend).

### 7.1 Voice
| Method | Endpoint | Body | Response |
| --- | --- | --- | --- |
| POST | `/api/voice/process` | `{ audio: string(base64), history: [...] }` | `{ transcript, aiResponse, audio?, audioContentType? }` |
| POST | `/api/voice/process-text` | `{ text: string, history: [...] }` | `{ transcript, aiResponse, audio?, audioContentType? }` |
| GET | `/api/voice/token` | — | `{ token, expiresIn }` (AssemblyAI streaming token) |

### 7.2 Career Discovery
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/career/start` | Start discovery, returns opening message |
| POST | `/api/career/chat` | Continue discovery with user message |
| GET | `/api/career/profile/:sessionId` | Get built profile |
| DELETE | `/api/career/session/:sessionId` | Clear session |

### 7.3 Interview
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/interview/start` | Start adaptive interview |
| POST | `/api/interview/respond` | Submit a text answer |
| POST | `/api/interview/voice` | Submit a voice answer |
| GET | `/api/interview/history/:sessionId` | Get interview history |
| DELETE | `/api/interview/session/:sessionId` | Clear session |

### 7.4 Evaluation
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/evaluate/interview` | Evaluate interview performance |
| POST | `/api/evaluate/skill-gaps` | Analyze skill gaps |
| POST | `/api/evaluate/roadmap` | Generate career roadmap |
| POST | `/api/evaluate/complete` | Full analysis (evaluation + gaps + roadmap) |
| GET | `/api/evaluate/:sessionId` | Get stored evaluation |

All agent responses include `audio` (base64 WAV) + `audioContentType` when TTS is enabled and the
Groq Orpheus model terms have been accepted for the API key.

---

## 8. AI Agent Design

### 8.1 Career Discovery Agent (`ai/agents/careerAgent.js`)
- Warm, mentor-like System prompt — never form-like.
- One question per turn; keeps messages ≤ 2–3 sentences.
- Emits `PROFILE_COMPLETE\n{json}` once ≥ 5 categories are substantive.

Profile JSON shape:
```json
{
  "name": "string|null",
  "interests": ["string"],
  "skills": ["string"],
  "education": "string|null",
  "experience": ["string"],
  "careerGoal": "string|null",
  "preferences": "string|null",
  "strengths": ["string"],
  "weaknesses": ["string"]
}
```

### 8.2 Adaptive Interview Agent (`ai/agents/interviewAgent.js`)
- System prompt enforces **adaptive questioning** (no fixed next-question list).
- Modes: `general`, `technical` (auto-set when a target role like `frontend`/`backend`/`data` is
  provided), and `hr/behavioral`.
- 6–10 questions; topic-covers tracking avoids repetition; ends with `INTERVIEW_COMPLETE`.

### 8.3 Career Coach Agent (`ai/agents/coachAgent.js`)
- **Evaluation** → JSON with `overallScore` (1–10) + per-criteria `{score, feedback}`, strengths,
  improvements, detailed feedback.
- **Skill gaps** → JSON with `currentSkills`, `requiredSkills` (critical/important/nice-to-have),
  `gaps` (prioritized), `matchedSkills`, summary.
- **Roadmap** → 30-day JSON with weekly focus/goals/activities/milestones + total hours + resources.
- All outputs are JSON-parsed defensively; graceful defaults if parsing fails.

### 8.4 Deterministic Career Engine (`ai/career-engine/`)
- `skillGap.js` — static role requirements for frontend/backend/data/general + matching logic.
- `roadmap.js` — 4-week templates per role, customized with gap-specific practice activities and
  computed total hours.

---

## 9. Evaluation Methodology

| Criterion | Weight |
| --- | --- |
| Technical Knowledge | 0.25 |
| Answer Relevance | 0.20 |
| Communication Clarity | 0.15 |
| Problem Solving | 0.15 |
| Follow-up Handling | 0.15 |
| Confidence | 0.10 |

- **Overall score** = weighted mean (0–10).
- **Labels**: ≥9 Excellent · ≥7 Good · ≥5 Average · ≥3 Below Average · else Needs Improvement.

---

## 10. Session & State

- Session IDs generated per flow; conversation history kept as in-memory Maps in the backend.
- History is required so agents stay coherent across turns (career discovery across categories,
  interviews across questions).
- Clear-session endpoints exist for reset.

---

## 11. Error Handling & Edge Cases

- **Short recordings** (< ~1s of audio) → rejected with a friendly message.
- **Mic permission denied** → clear guidance to allow microphone access.
- **TTS unavailable** (terms not accepted / model error) → graceful fallback to browser `speechSynthesis`.
- **Ambiguous / vague voice answers** → agents prompt for specifics, never guess.
- **Payload limits** → Express JSON limit raised to 10 MB for long recordings.

---

## 12. Timeline (Hackathon)

| Phase | Milestone | Owner |
| --- | --- | --- |
| 1 | Voice pipeline: STT + agent loop + TTS | Amna ✅ |
| 1b | Real-time live voice (streaming STT, end-of-turn detection, hands-free loop) | Amna ✅ |
| 2 | Career Discovery + Interview + Coach agents | Amna ✅ |
| 3 | Express API + session store + evaluation endpoints | Momna |
| 4 | React UI: pages, components, routing, toasts | Abiha |
| 5 | Scoring, skill-gap & roadmap engine | Irtiqa |
| 6 | Polish: responsive, SEO, 404, empty states, README | All |

---

## 13. Acceptance Criteria

1. A user can start a session and the agent greets them warmly.
2. Speaking a career question returns a relevant, spoken response (text fallback works).
3. Career Discovery completes with a structured profile JSON.
4. An interview runs 6–10 adaptive questions and completes cleanly.
5. Evaluation returns scores + feedback; skill gaps and a 30-day roadmap are generated.
6. The experience works on mobile (no horizontal scroll, usable nav).
7. API keys never appear in the repository (`.env` ignored, `.env.example` committed).

---

## 14. Future Work

- Hosted **AssemblyAI Voice Agent** session (managed full-duplex audio, built-in barge-in).
- Persistent profiles & session history (database-backed).
- Resume-directed interviews and more role-specific question banks.
- Saved evaluation history and progress over time.

---

## Appendix A — Glossary

| Term | Meaning |
| --- | --- |
| STT | Speech-to-Text |
| TTS | Text-to-Speech |
| Agent | An LLM system prompt + memory driving one coaching flow |
| Session | One end-to-end conversation with a user |

---

## Appendix B — Design System

Source of truth for the UI. *(The current frontend uses an emerald/slate palette; the brand
palette below is the designed direction.)*

### Colors

| Token | Hex |
| --- | --- |
| Midnight Navy (background) | `#1A1A2E` |
| Dark Navy (cards) | `#2D2D44` |
| Electric Violet (primary) | `#6C5CE7` |
| Soft Violet (accent) | `#A29BFE` |
| Voice Teal (voice/action) | `#00CEC9` |
| Coral Pulse (error/alert) | `#FF7675` |
| Mist (text on dark) | `#F4F3FF` |

### Voice-first UI principles

- A single prominent "Start Recording" action on the coach screen.
- The AI's spoken state is always visible (animated indicator).
- One question per turn; minimal text, maximum whitespace.
- Clear success/error feedback for every user action (toasts).

---

## Appendix C — Repository Structure

```
├── docs/
│   └── PRD.md          # this document
├── ai/
│   ├── agents/         # Career, Interview, Coach agents
│   ├── prompts/        # prompt modules
│   ├── evaluation/     # scoring criteria
│   └── career-engine/  # skill gaps + roadmap
├── backend/            # Express API (port 3000)
│   ├── routes/         # voice, career, interview, evaluation
│   ├── services/       # AssemblyAI STT, Groq TTS
│   └── .env.example    # env template (commit this, never .env)
├── frontend/           # React + Vite (port 5173)
└── README.md
```