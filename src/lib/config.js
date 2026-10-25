// Supabase project settings (used as a plain database: no Supabase Auth, no Storage).
// The publishable key is meant to be public; the database functions check the user's token.
export const SUPABASE_URL = 'https://omuylnudrojhsashhvfj.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_bvrU5hLcKhj6g0l88nHSfw_LF0JIFCT';

// Where the database API lives. VITE_API_URL can point to another server (e.g. for local testing).
export const API_URL = import.meta.env.VITE_API_URL || SUPABASE_URL;

// Demo mode: runs the whole app in the browser (localStorage), no Supabase needed.
// Start it with: npm run dev:demo
export const DEMO_MODE = import.meta.env.VITE_DEMO === 'true';

// All uploads are optional; an employee can submit without any documents.
export const DOC_TYPES = {
  photo: {
    label: 'Profile photo',
    required: false,
    hint: 'JPG or PNG, up to 2 MB',
    accept: ['image/png', 'image/jpeg'],
    maxSize: 2 * 1024 ** 2,
  },
  id_proof: {
    label: 'ID proof (Aadhaar / PAN / Passport)',
    required: false,
    hint: 'PDF, JPG or PNG, up to 5 MB',
    accept: ['application/pdf', 'image/png', 'image/jpeg'],
    maxSize: 5 * 1024 ** 2,
  },
  resume: {
    label: 'Resume',
    required: false,
    hint: 'PDF or Word, up to 5 MB',
    accept: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 5 * 1024 ** 2,
  },
};

export const DEPARTMENTS = ['Engineering', 'Quality Assurance', 'Human Resources', 'Finance', 'Sales'];
export const LOCATIONS = ['Kochi', 'Bengaluru', 'Chennai', 'Remote'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract'];
