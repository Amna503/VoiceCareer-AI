/**
 * API base URL.
 *
 * Every backend call goes through `apiUrl()` so one variable decides where the
 * app talks to:
 *
 *   local dev   VITE_API_BASE_URL is unset -> '' -> the request stays relative
 *               and Vite's dev proxy (vite.config.js) forwards /api to :3000.
 *   production  VITE_API_BASE_URL = https://<railway-domain>.up.railway.app
 *               set once as a Vercel environment variable. Cross-origin is
 *               fine: the backend enables CORS for all origins.
 *
 * Set it to the bare origin — no trailing slash, no /api suffix. Paths are
 * appended here, so VITE_API_BASE_URL=https://host.up.railway.app yields
 * https://host.up.railway.app/api/evaluate/roles.
 */

const RAW_BASE = (import.meta.env?.VITE_API_BASE_URL || '').trim()

/** Strip a trailing slash so joining never produces a double slash. */
export const API_BASE = RAW_BASE.replace(/\/+$/, '')

/** Absolute backend URL for `path` (e.g. '/api/evaluate/roles'). */
export function apiUrl(path) {
  const suffix = String(path || '')
  return API_BASE ? `${API_BASE}${suffix}` : suffix
}

/** True when the app is talking to a deployed backend rather than the dev proxy. */
export const IS_REMOTE_API = Boolean(API_BASE)
