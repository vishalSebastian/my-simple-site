import { useState } from 'react';
import { Alert, Anchor, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { DEMO_MODE } from '../lib/config.js';
import { useAuth } from './AuthProvider.jsx';
import { EMAIL_PATTERN } from './passwordRules.js';

export default function LoginPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const sessionExpired = location.state?.reason === 'expired';

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (!v.trim() ? 'Email is required' : EMAIL_PATTERN.test(v.trim()) ? null : 'Enter a valid email'),
      password: (v) => (v ? null : 'Password is required'),
    },
  });

  if (user && profile) {
    return <Navigate to={location.state?.from || (profile.role === 'hr' ? '/hr' : '/onboarding')} replace />;
  }

  const submit = async ({ email, password }) => {
    setError('');
    setSubmitting(true);
    try {
      await api.signIn({ email: email.trim().toLowerCase(), password });
      navigate(location.state?.from || '/app', { replace: true });
    } catch (e) {
      if (/invalid login credentials/i.test(e.message)) setError('Invalid email or password');
      else if (/email not confirmed/i.test(e.message)) setError('Please confirm your email before logging in');
      else setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Paper withBorder radius="md" p="xl" maw={420} mx="auto" mt="lg" data-testid="login-page">
      <Title order={2} mb={4}>Log in</Title>
      <Text c="dimmed" size="sm" mb="lg">Employee onboarding portal</Text>

      <form onSubmit={form.onSubmit(submit)} noValidate data-testid="login-form">
        <Stack>
          {sessionExpired && !error && (
            <Alert color="yellow" variant="light" data-testid="login-session-expired">
              Your session has expired. Please log in again.
            </Alert>
          )}
          {error && <Alert color="red" variant="light" data-testid="login-error">{error}</Alert>}
          <TextInput
            label="Email"
            withAsterisk
            placeholder="you@company.com"
            autoComplete="email"
            data-testid="login-email-input"
            {...form.getInputProps('email')}
          />
          <PasswordInput
            label="Password"
            withAsterisk
            autoComplete="current-password"
            data-testid="login-password-input"
            visibilityToggleButtonProps={{ 'data-testid': 'login-password-toggle', 'aria-label': 'Show password' }}
            {...form.getInputProps('password')}
          />
          <Button type="submit" loading={submitting} data-testid="login-submit-button">Log in</Button>
        </Stack>
      </form>

      <Text size="sm" mt="md">
        New employee? <Anchor component={Link} to="/signup" data-testid="login-signup-link">Create an account</Anchor>
      </Text>
      {DEMO_MODE && (
        <Text size="xs" c="dimmed" mt="sm" data-testid="login-demo-hint">
          Demo mode: HR login is hr@demo.test / Password@123
        </Text>
      )}
    </Paper>
  );
}
