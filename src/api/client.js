/**
 * api/client.js — CloudDeck API client
 *
 * All requests go to /api/* which netlify.toml redirects to
 * /.netlify/functions/api/:splat in production.
 * In dev (netlify dev), the Netlify CLI proxy handles this transparently.
 */

const BASE = '/api';

export function setToken(token) {
  if (token) localStorage.setItem('cd_token', token);
  else        localStorage.removeItem('cd_token');
}

function getToken() { return localStorage.getItem('cd_token'); }

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res  = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ ok: false, error: 'Invalid server response.' }));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const get    = (path)        => request('GET',    path);
const post   = (path, body)  => request('POST',   path, body);
const patch  = (path, body)  => request('PATCH',  path, body);
const del    = (path)        => request('DELETE', path);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register:          (u, p)    => post('/auth/register', { username: u, password: p }),
  login:             (u, p)    => post('/auth/login',    { username: u, password: p }),
  me:                ()        => get('/auth/me'),
  users:             ()        => get('/auth/users'),
  updatePermissions: (id, perms) => patch(`/auth/users/${id}`, { permissions: perms }),
  deleteUser:        (id)      => del(`/auth/users/${id}`),
};

// ── Exams ─────────────────────────────────────────────────────────────────────
export const examApi = {
  list:        ()            => get('/exams'),
  get:         (id)          => get(`/exams/${id}`),
  delete:      (id)          => del(`/exams/${id}`),
  import:      (payload)     => post('/exams/import', payload),
  saveSession: (id, session) => post(`/exams/${id}/sessions`, session),
  mySessions:  ()            => get('/exams/sessions/mine'),
};

// ── Import (server-side parse) ────────────────────────────────────────────────
export const importApi = {
  parse: (rawText, metaText) => post('/import-questions', { rawText, metaText }),
};

// ── Audit logs ────────────────────────────────────────────────────────────────
export const logsApi = {
  list: () => get('/logs'),
};
