# VoiceCareer AI — Production Deployment

Two services, one GitHub repository, private keys never leave the backend:

```
GitHub (voicecareer-ai)
 ├── frontend/ ─────────► Vercel          (static build, Vite)
 └── backend/ + ai/ ────► Railway         (Express API, holds all secrets)
                          └── live URL ───> VITE_API_BASE_URL on Vercel
```

## Why the API pays for itself

- The browser never sees an API key. Rails-on-Vercel call paths like
  `/api/voice/token` are rewritten to the Railway origin, and the Railway API
  mints short-lived AssemblyAI tokens server-side.
- The backend imports from the `ai/` module folder at the repository root
  (`../../ai/...`), so Railway must build from the **repo root**, not `backend/`.
- CORS defaults to allowing any origin so the Vercel domain can be unknown at
  first deploy; lock it down once you know the final domain
  (`ALLOWED_ORIGINS=https://your-app.vercel.app`).

## 1. Deploy the backend to Railway

There is **no `railway.json`**. Railway's *Config as Code* (`railway.json` /
`railway.toml`) is deprecated: new services cannot opt into it at all, and
existing services stop reading it on **2026-12-01**. Build and start commands
are therefore configured in the Railway dashboard, and the repository is
self-sufficient so Railway's own auto-detection already resolves them.

Because `backend/` imports from the module folder `ai/` at the repository root
(`../../ai/...`), the service **must** deploy from the repository root. The root
`package.json` declares `backend` as a workspace and its `start` script runs
`node backend/server.js`, so the defaults are already correct.

1. Push the repository to GitHub (`main` is current and clean).
2. In Railway: **New → From a GitHub repo** → select the repo.
3. Settings → confirm the root directory is empty (`/`, the repository root).
   Leave **Build Command** and **Start Command** blank to use the auto-detected
   `npm ci` and `npm start`, or set them explicitly:
   - Build: `npm ci --omit=dev`
   - Start: `npm start`
   - Health check path: `/health` (Settings → Deploy → Healthcheck Path)
4. **Variables** (Railway sets `PORT` and `NODE_ENV` itself; add these):

   | Variable | Example | Required |
   |---|---|---|
   | `ASSEMBLYAI_API_KEY` | `as_...` | Yes — Voice Agent + v3 tokens |
   | `LLM_API_KEY` | `gsk_...` | Yes — discovery/interview/eval/roadmap |
   | `LLM_BASE_URL` | `https://api.groq.com/openai/v1` | Yes |
   | `LLM_MODEL` | `openai/gpt-oss-120b` | Yes |
   | `TTS_MODEL` | `canopylabs/orpheus-v1-english` | Optional |
   | `TTS_VOICE` | `hannah` | Optional |
   | `TTS_ENABLED` | `true` | Optional |
   | `ALLOWED_ORIGINS` | `https://your-app.vercel.app` | Optional, comma-separated |
   | `VOICE_AGENT_VOICE` | `alba` | Optional |
   | `VOICE_AGENT_TOKEN_TTL` | `300` | Optional |
   | `VOICE_AGENT_MAX_SESSION_SECONDS` | `1800` | Optional |

5. Deploy. When the service is healthy, copy the live URL, e.g.
   `https://voicecareer-ai-backend-production.up.railway.app`.

   Deploy previews (Pull Request Deployments) are fine here — the variables and
   `railway.json` travel with the branch.

## 2. Wire the frontend to the backend on Vercel

The frontend never bakes in a URL — it reads `VITE_API_BASE_URL` at build time
(`frontend/src/lib/api.js`). In local dev the variable is empty and requests
stay relative, so the Vite proxy keeps working unchanged.

1. On Vercel: **New Project → Import** the same repo, root directory `frontend`.
   `frontend/vercel.json` already sets framework/build/output and a SPA
   rewrite.
2. Project → Settings → Environment variables:
   - `VITE_API_BASE_URL` = `https://....up.railway.app` (no trailing slash)
3. Redeploy.
4. Verify the browser console shows no failed `/api/...` requests and the voice
   agent connects.

## 3. Update ALLOWED_ORIGINS (after everything works)

Once the Vercel domain is final, edit the Railway variable:

- `ALLOWED_ORIGINS=https://your-app.vercel.app`

This narrows CORS from “any origin” to just your app.

## Troubleshooting

- **Build fails with `npm error code EUSAGE` / "Missing: … from lock file"**:
  the root `package-lock.json` is out of sync with the workspaces. Run
  `npm install --package-lock-only` at the repository root and commit the
  regenerated lockfile. This is the failure Railway reports when a stale or
  merge-conflicted lockfile is committed — `npm ci` refuses to install.
- **Build fails with a JSON parse error**: a `<<<<<<<` marker is still sitting
  in a committed `package-lock.json`. Regenerate it as above; never merge-resolve
  a lockfile by hand.
- **Wrong server running** (mock JSON replies, 404 on `/health`): the root
  `package.json` `start` script must be `node backend/server.js`. There is no
  root-level `server.js`; the real entrypoint lives in `backend/`.
- **Health check fails**: confirm the service deploys from the repo root (the
  log must show `VoiceCareer AI backend listening on 0.0.0.0:<port>`), verify
  `PORT` is set by Railway, and that `backend/` has no compile errors.
- **401/403 on `/api/voice/...`**: `ASSEMBLYAI_API_KEY` is missing or invalid.
- **LLM calls fail**: check `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`.
- **CORS block in the browser (dev)**: run `npm --prefix backend run dev` and
  make sure the Vite dev proxy is active; production builds should carry the
  `Access-Control-Allow-Origin` header for your domain.
- **404 on `/api/...` from Vercel**: `VITE_API_BASE_URL` is empty for that
  build, or the rewrite destination isn’t the Railway domain.

## Security rules (do not break)

- Never commit `.env`, real keys, or `*.log` (`.gitignore` already excludes
  them).
- The frontend stays key-free; only short-lived AssemblyAI tokens pass through it.
- The `/health` endpoint never reports key validity.