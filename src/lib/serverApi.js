/*
  Talks to our own database functions on Supabase (no Supabase Auth, no Storage).
  Every call is:  POST {API_URL}/rest/v1/rpc/<function>   with header  apikey: <publishable key>
  Login returns a JWT. It is kept in localStorage ("app-session") and sent as p_token on every call.
*/
import { API_URL, SUPABASE_KEY } from './config.js';

const SESSION_KEY = 'app-session';
const listeners = new Set();
const docUrlCache = new Map();
let expiryTimer;

async function rpc(fn, args = {}) {
  const res = await fetch(`${API_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const error = new Error(body?.message || `Request failed (${res.status})`);
    error.status = res.status;
    // Token expired or invalid: log out
    if (res.status === 401 && fn !== 'login') setSession(null, 'expired');
    throw error;
  }
  return body;
}

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
const token = () => storedSession()?.access_token;

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
    await rpc('signup', { p_full_name: fullName, p_email: email, p_password: password });
    return { needsConfirmation: false };
  },

  async signIn({ email, password }) {
    const s = await rpc('login', { p_email: email, p_password: password });
    setSession(s);
  },

  async signOut() {
    docUrlCache.forEach((url) => URL.revokeObjectURL(url));
    docUrlCache.clear();
    setSession(null);
  },

  // ---------- Profile ----------
  async getProfile() {
    return rpc('me', { p_token: token() });
  },

  // ---------- Onboarding ----------
  async getOnboarding(userId) {
    return rpc('get_onboarding', { p_token: token(), p_user_id: userId });
  },

  async saveOnboarding(_userId, fields) {
    return rpc('save_onboarding', { p_token: token(), p_fields: fields });
  },

  async submitOnboarding() {
    return rpc('submit_onboarding', { p_token: token() });
  },

  // ---------- Documents ----------
  async listDocuments(userId) {
    return rpc('list_documents', { p_token: token(), p_user_id: userId });
  },

  async uploadDocument(_userId, docType, file) {
    return rpc('upload_document', {
      p_token: token(),
      p_doc_type: docType,
      p_file_name: file.name,
      p_mime_type: file.type,
      p_content_base64: await fileToBase64(file),
    });
  },

  async deleteDocument(doc) {
    await rpc('delete_document', { p_token: token(), p_document_id: doc.id });
    if (docUrlCache.has(doc.id)) {
      URL.revokeObjectURL(docUrlCache.get(doc.id));
      docUrlCache.delete(doc.id);
    }
  },

  // Downloads the file and returns a temporary browser URL for preview / open
  async getDocumentUrl(doc) {
    if (docUrlCache.has(doc.id)) return docUrlCache.get(doc.id);
    const { mime_type: mime, content_base64: b64 } = await rpc('get_document', { p_token: token(), p_document_id: doc.id });
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    docUrlCache.set(doc.id, url);
    return url;
  },

  // ---------- HR ----------
  async listEmployees() {
    return rpc('list_employees', { p_token: token() });
  },

  async getEmployee(userId) {
    const [employees, onboarding, documents] = await Promise.all([
      this.listEmployees(),
      this.getOnboarding(userId),
      this.listDocuments(userId),
    ]);
    const profile = employees.find((e) => e.id === userId);
    return { profile, onboarding, documents };
  },

  async reviewOnboarding(userId, _reviewerId, decision, comment) {
    return rpc('review_onboarding', { p_token: token(), p_user_id: userId, p_decision: decision, p_comment: comment || null });
  },
};
