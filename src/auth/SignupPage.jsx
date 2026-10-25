import { useState } from 'react';
import {
  Alert, Anchor, Box, Button, Checkbox, List, Paper, PasswordInput, Progress, Stack, Text, TextInput, ThemeIcon, Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconX } from '@tabler/icons-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from './AuthProvider.jsx';
import { EMAIL_PATTERN, PASSWORD_RULES, passwordStrength, validatePassword } from './passwordRules.js';

const STRENGTH = [
  { min: 0, label: 'Too weak', color: 'red' },
  { min: 3, label: 'Fair', color: 'orange' },
  { min: 4, label: 'Good', color: 'yellow' },
  { min: 5, label: 'Strong', color: 'green' },
];

function PasswordChecklist({ value }) {
  const score = passwordStrength(value);
  const level = [...STRENGTH].reverse().find((s) => score >= s.min);
  return (
    <Box data-testid="signup-password-rules">
      <Progress value={(score / PASSWORD_RULES.length) * 100} color={level.color} size="sm" mb={4} data-testid="signup-password-strength-bar" />
      <Text size="xs" c={level.color} mb={6} data-testid="signup-password-strength" data-score={score}>
        Strength: {level.label}
      </Text>
      <List spacing={2} size="xs" center>
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <List.Item
              key={r.id}
              data-testid={`signup-password-rule-${r.id}`}
              data-valid={ok}
              icon={(
                <ThemeIcon color={ok ? 'green' : 'gray'} size={16} radius="xl">
                  {ok ? <IconCheck size={12} /> : <IconX size={12} />}
                </ThemeIcon>
              )}
            >
              <Text size="xs" c={ok ? 'green' : 'dimmed'}>{r.label}</Text>
            </List.Item>
          );
        })}
      </List>
    </Box>
  );
}

export default function SignupPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [checkEmail, setCheckEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: { fullName: '', email: '', password: '', confirmPassword: '', terms: false },
    validate: {
      fullName: (v) => {
        const t = v.trim();
        if (!t) return 'Full name is required';
        if (t.length < 2) return 'Full name must be at least 2 characters';
        if (!/^[A-Za-z][A-Za-z .'-]*$/.test(t)) return 'Use letters only';
        return null;
      },
      email: (v) => (!v.trim() ? 'Email is required' : EMAIL_PATTERN.test(v.trim()) ? null : 'Enter a valid email'),
      password: validatePassword,
      confirmPassword: (v, values) => (!v ? 'Confirm your password' : v === values.password ? null : 'Passwords do not match'),
      terms: (v) => (v ? null : 'You must accept the terms'),
    },
  });

  if (user && !checkEmail) return <Navigate to="/app" replace />;

  const submit = async ({ fullName, email, password }) => {
    setError('');
    setSubmitting(true);
    try {
      const { needsConfirmation } = await api.signUp({ fullName: fullName.trim(), email: email.trim().toLowerCase(), password });
      if (needsConfirmation) setCheckEmail(true);
      else navigate('/onboarding', { replace: true });
    } catch (e) {
      setError(/already registered|already exists/i.test(e.message) ? 'An account with this email already exists' : e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (checkEmail) {
    return (
      <Paper withBorder radius="md" p="xl" maw={440} mx="auto" mt="lg" data-testid="signup-check-email">
        <Title order={3} mb="sm">Check your email</Title>
        <Text>We sent a confirmation link. Confirm your email, then log in.</Text>
        <Button component={Link} to="/login" mt="md" data-testid="signup-go-login-button">Go to login</Button>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md" p="xl" maw={440} mx="auto" mt="lg" data-testid="signup-page">
      <Title order={2} mb={4}>Create your account</Title>
      <Text c="dimmed" size="sm" mb="lg">Start your onboarding</Text>

      <form onSubmit={form.onSubmit(submit)} noValidate data-testid="signup-form">
        <Stack>
          {error && <Alert color="red" variant="light" data-testid="signup-error">{error}</Alert>}
          <TextInput label="Full name" withAsterisk data-testid="signup-fullname-input" {...form.getInputProps('fullName')} />
          <TextInput label="Work email" withAsterisk placeholder="you@company.com" data-testid="signup-email-input" {...form.getInputProps('email')} />
          <PasswordInput
            label="Password"
            withAsterisk
            data-testid="signup-password-input"
            visibilityToggleButtonProps={{ 'data-testid': 'signup-password-toggle', 'aria-label': 'Show password' }}
            {...form.getInputProps('password')}
          />
          <PasswordChecklist value={form.getValues().password} />
          <PasswordInput
            label="Confirm password"
            withAsterisk
            data-testid="signup-confirm-password-input"
            {...form.getInputProps('confirmPassword')}
          />
          <Checkbox
            label="I agree to the terms and privacy policy"
            data-testid="signup-terms-checkbox"
            {...form.getInputProps('terms', { type: 'checkbox' })}
          />
          <Button type="submit" loading={submitting} data-testid="signup-submit-button">Create account</Button>
        </Stack>
      </form>

      <Text size="sm" mt="md">
        Already have an account? <Anchor component={Link} to="/login" data-testid="signup-login-link">Log in</Anchor>
      </Text>
    </Paper>
  );
}
