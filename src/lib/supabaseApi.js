import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY, STORAGE_BUCKET } from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}

const toSession = (s) => (s
  ? { user: { id: s.user.id, email: s.user.email }, access_token: s.access_token, expires_at: s.expires_at }
  : null);
const one = (x) => (Array.isArray(x) ? x[0] ?? null : x ?? null);
const safeName = (name) => name.replace(/[^\w.-]+/g, '_').slice(-80);

export const supabaseApi = {
  // ---------- Auth ----------
  // Supabase Auth is JWT based: the access token (JWT) is sent with every request and
  // refreshed automatically. It is stored in localStorage as "sb-<project>-auth-token".
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return toSession(data.session);
  },

  onAuthChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(toSession(session)));
    return () => data.subscription.unsubscribe();
  },

  async signUp({ fullName, email, password }) {
    const data = check(await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    }));
    return { needsConfirmation: !data.session };
  },

  async signIn({ email, password }) {
    check(await supabase.auth.signInWithPassword({ email, password }));
  },

  async signOut() {
    check(await supabase.auth.signOut());
  },

  // ---------- Profile ----------
  async getProfile(userId) {
    return check(await supabase.from('profiles').select('*').eq('id', userId).single());
  },

  // ---------- Onboarding (employee) ----------
  async getOnboarding(userId) {
    return check(await supabase.from('onboarding').select('*').eq('user_id', userId).maybeSingle());
  },

  async saveOnboarding(userId, fields) {
    return check(await supabase
      .from('onboarding')
      .upsert({ ...fields, user_id: userId, status: 'draft', updated_at: new Date().toISOString() })
      .select()
      .single());
  },

  async submitOnboarding(userId) {
    return check(await supabase
      .from('onboarding')
      .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .select()
      .single());
  },

  // ---------- Documents ----------
  async listDocuments(userId) {
    return check(await supabase.from('documents').select('*').eq('user_id', userId).order('created_at'));
  },

  async uploadDocument(userId, docType, file) {
    const path = `${userId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    check(await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type }));
    const { data, error } = await supabase
      .from('documents')
      .insert({ user_id: userId, doc_type: docType, file_name: file.name, storage_path: path, mime_type: file.type, size_bytes: file.size })
      .select()
      .single();
    if (error) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path]);
      throw new Error(error.message);
    }
    return data;
  },

  async deleteDocument(doc) {
    check(await supabase.storage.from(STORAGE_BUCKET).remove([doc.storage_path]));
    check(await supabase.from('documents').delete().eq('id', doc.id));
  },

  async getDocumentUrl(doc) {
    const data = check(await supabase.storage.from(STORAGE_BUCKET).createSignedUrl(doc.storage_path, 3600));
    return data.signedUrl;
  },

  // ---------- HR ----------
  async listEmployees() {
    const rows = check(await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at, onboarding(status, submitted_at, department, job_title)')
      .eq('role', 'employee')
      .order('created_at', { ascending: false }));
    return rows.map((r) => ({ ...r, onboarding: one(r.onboarding) }));
  },

  async getEmployee(userId) {
    const [profile, onboarding, documents] = await Promise.all([
      this.getProfile(userId),
      this.getOnboarding(userId),
      this.listDocuments(userId),
    ]);
    return { profile, onboarding, documents };
  },

  async reviewOnboarding(userId, reviewerId, decision, comment) {
    return check(await supabase
      .from('onboarding')
      .update({
        status: decision,
        hr_comment: comment || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single());
  },
};
