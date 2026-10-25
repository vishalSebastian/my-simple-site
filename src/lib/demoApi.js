/*
  Demo backend: same functions as supabaseApi, but everything lives in localStorage.
  Used by `npm run dev:demo` so the app (and Playwright tests) work without Supabase.
  Seeded users:  hr@demo.test / Password@123 (HR)   rahul@demo.test / Password@123 (employee, submitted)

  Login is JWT based, like Supabase: signing in creates an HS256-signed access token
  (1 hour expiry) stored in localStorage under "demo-session". Every data call verifies it.
*/
const DB_KEY = 'demo-db';
const SESSION_KEY = 'demo-session';
const listeners = new Set();
const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const now = () => new Date().toISOString();
const uid = () => crypto.randomUUID();

const PHOTO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="#c7d2fe"/><text x="60" y="72" font-size="40" text-anchor="middle" fill="#3730a3">RN</text></svg>',
)}`;

function seed() {
  const hrId = uid();
  const rahulId = uid();
  return {
    users: [
      { id: hrId, email: 'hr@demo.test', password: 'Password@123', full_name: 'Priya HR', role: 'hr', created_at: now() },
      { id: rahulId, email: 'rahul@demo.test', password: 'Password@123', full_name: 'Rahul Nair', role: 'employee', created_at: now() },
    ],
    onboarding: [{
      user_id: rahulId, status: 'submitted', first_name: 'Rahul', last_name: 'Nair', phone: '9876543210',
      date_of_birth: '1996-04-12', address: '12 MG Road, Kochi', department: 'Engineering', job_title: 'QA Engineer',
      start_date: '2026-11-02', employment_type: 'Full-time', work_location: 'Kochi',
      emergency_contact_name: 'Anu Nair', emergency_contact_phone: '9123456780',
      hr_comment: null, submitted_at: now(), reviewed_at: null, reviewed_by: null, updated_at: now(),
    }],
    documents: [
      { id: uid(), user_id: rahulId, doc_type: 'photo', file_name: 'rahul.svg', mime_type: 'image/svg+xml', size_bytes: 300, url: PHOTO_SVG, created_at: now() },
      { id: uid(), user_id: rahulId, doc_type: 'id_proof', file_name: 'aadhaar.svg', mime_type: 'image/svg+xml', size_bytes: 300, url: PHOTO_SVG, created_at: now() },
    ],
  };
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through */ }
  const db = seed();
  save(db);
  return db;
}

function save(db) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ }
}

// ---------- JWT (HS256) ----------
const DEMO_SECRET = 'demo-mode-secret-not-for-production';
const TOKEN_TTL_SECONDS = 60 * 60;
const enc = new TextEncoder();
const b64url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (obj) => b64url(enc.encode(JSON.stringify(obj)));
const fromB64url = (str) => JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))));
let keyPromise;
const hmacKey = () => (keyPromise ||= crypto.subtle.importKey('raw', enc.encode(DEMO_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']));
const sign = async (data) => b64url(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(data)));

async function createToken(user) {
  const iat = Math.floor(Date.now() / 1000);
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const payload = b64urlJson({ sub: user.id, email: user.email, user_role: user.role, role: 'authenticated', iat, exp: iat + TOKEN_TTL_SECONDS });
  return `${header}.${payload}.${await sign(`${header}.${payload}`)}`;
}

// Returns the token payload, or throws if the token is missing, tampered with or expired
async function verifyToken(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Not authenticated');
  if ((await sign(`${parts[0]}.${parts[1]}`)) !== parts[2]) throw new Error('Invalid JWT signature');
  const payload = fromB64url(parts[1]);
  if (payload.exp * 1000 <= Date.now()) throw new Error('JWT expired');
  return payload;
}

function storedSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

let expiryTimer;
function setSession(session, reason) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
  clearTimeout(expiryTimer);
  if (session) {
    expiryTimer = setTimeout(() => setSession(null, 'expired'), Math.max(0, session.expires_at * 1000 - Date.now()));
  }
  listeners.forEach((cb) => cb(session ? { user: session.user, access_token: session.access_token, expires_at: session.expires_at } : null, reason));
}

async function startSession(user) {
  const access_token = await createToken(user);
  const { exp } = fromB64url(access_token.split('.')[1]);
  setSession({ access_token, token_type: 'bearer', expires_at: exp, user: { id: user.id, email: user.email } });
}

// The logged-in user for a data call (like Supabase checking the JWT on every request)
async function authUser({ hrOnly = false } = {}) {
  const payload = await verifyToken(storedSession()?.access_token);
  if (hrOnly && payload.user_role !== 'hr') throw new Error('Permission denied');
  return payload;
}

async function assertOwnerOrHr(userId) {
  const me = await authUser();
  if (me.sub !== userId && me.user_role !== 'hr') throw new Error('Permission denied');
  return me;
}

const publicProfile = (u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_at: u.created_at });

const readFile = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error('Could not read file'));
  reader.readAsDataURL(file);
});

export const demoApi = {
  async getSession() {
    const session = storedSession();
    if (!session) return null;
    try {
      await verifyToken(session.access_token);
      setSession(session); // restarts the expiry timer
      return { user: session.user, access_token: session.access_token, expires_at: session.expires_at };
    } catch {
      setSession(null, 'expired');
      return null;
    }
  },

  onAuthChange(callback) {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },

  async signUp({ fullName, email, password }) {
    await delay();
    const db = load();
    if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User already registered');
    }
    const user = { id: uid(), email, password, full_name: fullName, role: 'employee', created_at: now() };
    db.users.push(user);
    save(db);
    // Sign-up only creates the account. The user logs in separately to get a token.
    return { needsConfirmation: false };
  },

  async signIn({ email, password }) {
    await delay();
    const user = load().users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) throw new Error('Invalid login credentials');
    await startSession(user);
  },

  async signOut() {
    setSession(null);
  },

  async getProfile(userId) {
    await assertOwnerOrHr(userId);
    const user = load().users.find((u) => u.id === userId);
    if (!user) throw new Error('Profile not found');
    return publicProfile(user);
  },

  async getOnboarding(userId) {
    await assertOwnerOrHr(userId);
    await delay(150);
    return load().onboarding.find((o) => o.user_id === userId) || null;
  },

  async saveOnboarding(userId, fields) {
    if ((await authUser()).sub !== userId) throw new Error('Permission denied');
    await delay();
    const db = load();
    const existing = db.onboarding.find((o) => o.user_id === userId);
    const row = { ...(existing || {}), ...fields, user_id: userId, status: 'draft', updated_at: now() };
    db.onboarding = db.onboarding.filter((o) => o.user_id !== userId).concat(row);
    save(db);
    return row;
  },

  async submitOnboarding(userId) {
    await delay(600);
    const db = load();
    if ((await authUser()).sub !== userId) throw new Error('Permission denied');
    const row = db.onboarding.find((o) => o.user_id === userId);
    Object.assign(row, { status: 'submitted', submitted_at: now(), updated_at: now() });
    save(db);
    return row;
  },

  async listDocuments(userId) {
    await assertOwnerOrHr(userId);
    return load().documents.filter((d) => d.user_id === userId);
  },

  async uploadDocument(userId, docType, file) {
    if ((await authUser()).sub !== userId) throw new Error('Permission denied');
    await delay(800); // feels like a real upload
    const db = load();
    const doc = {
      id: uid(), user_id: userId, doc_type: docType, file_name: file.name,
      mime_type: file.type, size_bytes: file.size, url: await readFile(file), created_at: now(),
    };
    db.documents.push(doc);
    save(db);
    return doc;
  },

  async deleteDocument(doc) {
    if ((await authUser()).sub !== doc.user_id) throw new Error('Permission denied');
    const db = load();
    db.documents = db.documents.filter((d) => d.id !== doc.id);
    save(db);
  },

  async getDocumentUrl(doc) {
    return doc.url;
  },

  async listEmployees() {
    await authUser({ hrOnly: true });
    await delay();
    const db = load();
    return db.users
      .filter((u) => u.role === 'employee')
      .map((u) => {
        const o = db.onboarding.find((x) => x.user_id === u.id);
        return {
          ...publicProfile(u),
          onboarding: o ? { status: o.status, submitted_at: o.submitted_at, department: o.department, job_title: o.job_title } : null,
        };
      });
  },

  async getEmployee(userId) {
    return {
      profile: await this.getProfile(userId),
      onboarding: await this.getOnboarding(userId),
      documents: await this.listDocuments(userId),
    };
  },

  async reviewOnboarding(userId, reviewerId, decision, comment) {
    await authUser({ hrOnly: true });
    await delay(500);
    const db = load();
    const row = db.onboarding.find((o) => o.user_id === userId);
    Object.assign(row, { status: decision, hr_comment: comment || null, reviewed_at: now(), reviewed_by: reviewerId, updated_at: now() });
    save(db);
    return row;
  },
};
