import pg from 'pg';

// DATABASE_URL = the Supabase Postgres connection string (set in Vercel → Settings → Environment Variables).
// Use the "Transaction pooler" string (port 6543) for Vercel.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 3,
});

export const query = (text, params) => pool.query(text, params);

// Returns the first row or null
export async function one(text, params) {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
}
