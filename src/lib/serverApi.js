/*
  Talks to our Node.js API (server/app.js), hosted on Vercel at /api.
  Login returns a JWT. It is kept in localStorage ("app-session") and sent as
  "Authorization: Bearer <token>" on every request.
*/
import { API_URL } from './config.js';

const SESSION_KEY = 'app-session';
const listeners = new Set();
const docUrlCache = new Map();
let expiryTimer;

// ---------- session (JWT) ----------
function storedSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

function setSession(session, reason) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage blocked */ }
  clearTimeout(expiryTimer);
  if (session) {
    expiryTimer = setTimeout(() => setSession(null, 'expired'), Math.max(0, session.expires_at * 1000 - Date.now()));
  }
  listeners.forEach((cb) => cb(session ? publicSession(session) : null, reason));
}

const publicSession = (s) => ({ user: { id: s.user.id, email: s.user.email }, access_token: s.access_token, expires_at: s.expires_at });

// ---------- HTTP ----------
async function request(method, path, body, { raw = false } = {}) {
  const token = storedSession()?.access_token;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const error = new Error(data.message || `Request failed (${res.status})`);
    error.status = res.status;
    if (res.status === 401 && path !== '/auth/login') setSession(null, 'expired');
    throw error;
  }
  if (raw) return res;
  return res.status === 204 ? null : res.json();
}

const get = (path) => request('GET', path);
const qs = (userId) => (userId ? `?userId=${encodeURIComponent(userId)}` : '');

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
  reader.onerror = () => reject(new Error('Could not read file'));
  reader.readAsDataURL(file);
});

export const serverApi = {
  // ---------- Auth ----------
  async getSession() {
    const s = storedSession();
    if (!s) return null;
    if (s.expires_at * 1000 <= Date.now()) {
      setSession(null, 'expired');
      return null;
    }
    setSession(s); // restart the expiry timer
    return publicSession(s);
  },

  onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  // Sign up only adds the user. The user then logs in to get a token.
  async signUp({ fullName, email, password }) {
    await request('POST', '/auth/signup', { fullName, email, password });
    return { needsConfirmation: false };
  },

  async signIn({ email, password }) {
    setSession(await request('POST', '/auth/login', { email, password }));
  },

  async signOut() {
    docUrlCache.forEach((url) => URL.revokeObjectURL(url));
    docUrlCache.clear();
    setSession(null);
  },

  getProfile: () => get('/auth/me'),

  // ---------- Onboarding ----------
  getOnboarding: (userId) => get(`/onboarding${qs(userId)}`),
  saveOnboarding: (_userId, fields) => request('PUT', '/onboarding', fields),
  submitOnboarding: () => request('POST', '/onboarding/submit', {}),

  // ---------- Documents ----------
  listDocuments: (userId) => get(`/documents${qs(userId)}`),

  async uploadDocument(_userId, docType, file) {
    return request('POST', '/documents', {
      docType,
      fileName: file.name,
      mimeType: file.type,
      contentBase64: await fileToBase64(file),
    });
  },

  async deleteDocument(doc) {
    await request('DELETE', `/documents/${doc.id}`);
    if (docUrlCache.has(doc.id)) {
      URL.revokeObjectURL(docUrlCache.get(doc.id));
      docUrlCache.delete(doc.id);
    }
  },

  // Downloads the file (with the token) and returns a temporary browser URL
  async getDocumentUrl(doc) {
    if (docUrlCache.has(doc.id)) return docUrlCache.get(doc.id);
    const res = await request('GET', `/documents/${doc.id}/file`, undefined, { raw: true });
    const url = URL.createObjectURL(await res.blob());
    docUrlCache.set(doc.id, url);
    return url;
  },

  // ---------- HR ----------
  listEmployees: () => get('/hr/employees'),

  async getEmployee(userId) {
    const [employees, onboarding, documents] = await Promise.all([
      this.listEmployees(),
      this.getOnboarding(userId),
      this.listDocuments(userId),
    ]);
    return { profile: employees.find((e) => e.id === userId), onboarding, documents };
  },

  reviewOnboarding: (userId, _reviewerId, decision, comment) =>
    request('POST', `/hr/employees/${userId}/review`, { decision, comment: comment || '' }),
};
