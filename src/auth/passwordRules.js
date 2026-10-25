// Password policy used by the sign-up form (keep in sync with Supabase Auth settings).
export const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { id: 'uppercase', label: 'One uppercase letter (A-Z)', test: (v) => /[A-Z]/.test(v) },
  { id: 'lowercase', label: 'One lowercase letter (a-z)', test: (v) => /[a-z]/.test(v) },
  { id: 'number', label: 'One number (0-9)', test: (v) => /\d/.test(v) },
  { id: 'special', label: 'One special character (!@#$%^&*)', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordStrength = (v) => PASSWORD_RULES.filter((r) => r.test(v)).length;

export function validatePassword(v) {
  if (!v) return 'Password is required';
  const failed = PASSWORD_RULES.find((r) => !r.test(v));
  return failed ? `Password needs: ${failed.label.toLowerCase()}` : null;
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
