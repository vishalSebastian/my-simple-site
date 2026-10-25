/*
  Employee Onboarding API (Express). Runs on Vercel (api/index.js) and locally (server/dev.js).
  All routes are under /api. Protected routes need:  Authorization: Bearer <access_token>
*/
import express from 'express';
import { query, one } from './db.js';
import { HttpError, canAccess, checkPassword, createSession, hashPassword, publicUser, requireAuth, requireHr } from './auth.js';
import { EMAIL_PATTERN, validatePassword } from '../src/auth/passwordRules.js';

const app = express();
app.use(express.json({ limit: '4.5mb' }));

const FORM_FIELDS = [
  'first_name', 'last_name', 'phone', 'date_of_birth', 'address', 'emergency_contact_name',
  'emergency_contact_phone', 'department', 'job_title', 'start_date', 'employment_type', 'work_location',
];
const DOC_TYPES = ['photo', 'id_proof', 'resume'];
const MIME_TYPES = [
  'image/png', 'image/jpeg', 'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_BYTES = 3 * 1024 * 1024; // Vercel allows ~4.5 MB per request
const DOC_COLUMNS = 'id, user_id, doc_type, file_name, mime_type, size_bytes, created_at';

const getStatus = async (userId) => (await one('select status from app.onboarding where user_id = $1', [userId]))?.status;
const assertEditable = async (userId) => {
  if (['submitted', 'approved'].includes(await getStatus(userId))) throw new HttpError(409, 'Onboarding is already submitted');
};

// ---------- Health ----------
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---------- Auth ----------
// Sign up: just adds the user. No email. The user then logs in.
app.post('/api/auth/signup', async (req, res) => {
  const fullName = String(req.body?.fullName ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (fullName.length < 2) throw new HttpError(400, 'Full name must be at least 2 characters');
  if (!EMAIL_PATTERN.test(email)) throw new HttpError(400, 'Enter a valid email');
  const pwError = validatePassword(password);
  if (pwError) throw new HttpError(400, pwError);

  if (await one('select 1 from app.users where email = $1', [email])) {
    throw new HttpError(409, 'An account with this email already exists');
  }
  const user = await one(
    'insert into app.users (full_name, email, password_hash) values ($1, $2, $3) returning *',
    [fullName, email, await hashPassword(password)],
  );
  res.status(201).json({ user: publicUser(user) });
});

// Log in: returns a JWT valid for 1 hour
app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const user = await one('select * from app.users where email = $1', [email]);
  if (!user || !(await checkPassword(password, user.password_hash))) {
    throw new HttpError(401, 'Invalid login credentials');
  }
  res.json(createSession(user));
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json(publicUser(req.user)));

// ---------- Onboarding (employee) ----------
app.get('/api/onboarding', requireAuth, async (req, res) => {
  const userId = req.query.userId || req.user.id;
  canAccess(req.user, userId);
  res.json(await one('select * from app.onboarding where user_id = $1', [userId]));
});

// Save the form as a draft
app.put('/api/onboarding', requireAuth, async (req, res) => {
  await assertEditable(req.user.id);
  const values = FORM_FIELDS.map((f) => {
    const v = req.body?.[f];
    return v === undefined || v === '' ? null : String(v);
  });
  const cols = FORM_FIELDS.join(', ');
  const params = FORM_FIELDS.map((_, i) => `$${i + 2}`).join(', ');
  const updates = FORM_FIELDS.map((f) => `${f} = excluded.${f}`).join(', ');
  const row = await one(
    `insert into app.onboarding (user_id, status, ${cols}, updated_at)
     values ($1, 'draft', ${params}, now())
     on conflict (user_id) do update set status = 'draft', ${updates}, updated_at = now()
     returning *`,
    [req.user.id, ...values],
  );
  res.json(row);
});

app.post('/api/onboarding/submit', requireAuth, async (req, res) => {
  const o = await one('select * from app.onboarding where user_id = $1', [req.user.id]);
  if (!o || !['draft', 'rejected'].includes(o.status)) throw new HttpError(409, 'Nothing to submit');
  if (!o.first_name || !o.last_name || !o.department) throw new HttpError(400, 'Please complete the form before submitting');
  res.json(await one(
    `update app.onboarding set status = 'submitted', submitted_at = now(), updated_at = now()
     where user_id = $1 returning *`,
    [req.user.id],
  ));
});

// ---------- Documents (optional uploads, stored in the database) ----------
app.get('/api/documents', requireAuth, async (req, res) => {
  const userId = req.query.userId || req.user.id;
  canAccess(req.user, userId);
  const { rows } = await query(`select ${DOC_COLUMNS} from app.documents where user_id = $1 order by created_at`, [userId]);
  res.json(rows);
});

// Body: { docType, fileName, mimeType, contentBase64 }. Uploading the same type again replaces it.
app.post('/api/documents', requireAuth, async (req, res) => {
  await assertEditable(req.user.id);
  const { docType, fileName, mimeType, contentBase64 } = req.body || {};
  if (!DOC_TYPES.includes(docType)) throw new HttpError(400, 'Unknown document type');
  if (!MIME_TYPES.includes(mimeType)) throw new HttpError(400, 'This file type is not allowed');
  const bytes = Buffer.from(String(contentBase64 || ''), 'base64');
  if (!bytes.length) throw new HttpError(400, 'File is empty');
  if (bytes.length > MAX_FILE_BYTES) throw new HttpError(413, 'File is too large (max 3 MB)');

  await query('delete from app.documents where user_id = $1 and doc_type = $2', [req.user.id, docType]);
  const doc = await one(
    `insert into app.documents (user_id, doc_type, file_name, mime_type, size_bytes, content)
     values ($1, $2, $3, $4, $5, $6) returning ${DOC_COLUMNS}`,
    [req.user.id, docType, String(fileName || 'file').slice(0, 200), mimeType, bytes.length, bytes],
  );
  res.status(201).json(doc);
});

app.delete('/api/documents/:id', requireAuth, async (req, res) => {
  await assertEditable(req.user.id);
  const { rowCount } = await query('delete from app.documents where id = $1 and user_id = $2', [req.params.id, req.user.id]);
  if (!rowCount) throw new HttpError(404, 'Document not found');
  res.status(204).end();
});

// Returns the file itself (for preview / download)
app.get('/api/documents/:id/file', requireAuth, async (req, res) => {
  const doc = await one('select * from app.documents where id = $1', [req.params.id]);
  if (!doc) throw new HttpError(404, 'Document not found');
  canAccess(req.user, doc.user_id);
  res.set('Content-Type', doc.mime_type);
  res.set('Content-Disposition', `inline; filename="${doc.file_name.replace(/"/g, '')}"`);
  res.send(doc.content);
});

// ---------- HR ----------
app.get('/api/hr/employees', requireAuth, requireHr, async (_req, res) => {
  const { rows } = await query(
    `select u.id, u.email, u.full_name, u.role, u.created_at,
            case when o.user_id is null then null else json_build_object(
              'status', o.status, 'submitted_at', o.submitted_at, 'department', o.department, 'job_title', o.job_title)
            end as onboarding
     from app.users u left join app.onboarding o on o.user_id = u.id
     where u.role = 'employee'
     order by u.created_at desc`,
  );
  res.json(rows);
});

// Body: { decision: 'approved' | 'rejected', comment }
app.post('/api/hr/employees/:id/review', requireAuth, requireHr, async (req, res) => {
  const { decision, comment } = req.body || {};
  const note = String(comment ?? '').trim();
  if (!['approved', 'rejected'].includes(decision)) throw new HttpError(400, 'Decision must be approved or rejected');
  if (decision === 'rejected' && !note) throw new HttpError(400, 'A comment is required when rejecting');
  const row = await one(
    `update app.onboarding
     set status = $2, hr_comment = $3, reviewed_at = now(), reviewed_by = $4, updated_at = now()
     where user_id = $1 and status = 'submitted' returning *`,
    [req.params.id, decision, note || null, req.user.id],
  );
  if (!row) throw new HttpError(409, 'This onboarding is not waiting for review');
  res.json(row);
});

// ---------- Errors ----------
app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found')));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'File is too large (max 3 MB)' });
  if (err.code === '22P02') return res.status(400).json({ message: 'Invalid id or value' }); // bad uuid/date
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Something went wrong' : err.message });
});

export default app;
