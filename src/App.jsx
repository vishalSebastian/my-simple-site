import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { Button, Stack, Text, Title } from '@mantine/core';
import AppLayout from './layout/AppLayout.jsx';
import { RequireAuth, PageLoader, useAuth } from './auth/AuthProvider.jsx';
import LoginPage from './auth/LoginPage.jsx';
import SignupPage from './auth/SignupPage.jsx';
import OnboardingPage from './onboarding/OnboardingPage.jsx';
import HrDashboard from './hr/HrDashboard.jsx';
import Home from './pages/Home.jsx';
import DelayedMessage from './pages/DelayedMessage.jsx';
import DynamicControls from './pages/DynamicControls.jsx';
import ProgressBar from './pages/ProgressBar.jsx';
import PracticeLogin from './pages/Login.jsx';
import Challenges from './pages/Challenges.jsx';
import ChallengePage from './pages/ChallengePage.jsx';

// Older practice pages keep their own simple styles (see styles.css)
const Legacy = ({ children }) => <div className="legacy">{children}</div>;

// After login: send HR to the dashboard, employees to onboarding
function AppHome() {
  const { profile, loading } = useAuth();
  if (loading || !profile) return <PageLoader />;
  return <Navigate to={profile.role === 'hr' ? '/hr' : '/onboarding'} replace />;
}

function NotFound() {
  return (
    <Stack align="center" mt="xl" data-testid="not-found-page">
      <Title order={2}>Page not found</Title>
      <Text c="dimmed">The page you are looking for doesn&apos;t exist.</Text>
      <Button component={Link} to="/" data-testid="not-found-home-button">Go home</Button>
    </Stack>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/app" element={<RequireAuth><AppHome /></RequireAuth>} />
        <Route path="/onboarding" element={<RequireAuth role="employee"><OnboardingPage /></RequireAuth>} />
        <Route path="/hr" element={<RequireAuth role="hr"><HrDashboard /></RequireAuth>} />

        <Route path="/challenges" element={<Legacy><Challenges /></Legacy>} />
        <Route path="/challenges/:id" element={<Legacy><ChallengePage /></Legacy>} />
        <Route path="/learn-locators" element={<Navigate to="/challenges" replace />} />
        <Route path="/delay" element={<Legacy><DelayedMessage /></Legacy>} />
        <Route path="/dynamic-controls" element={<Legacy><DynamicControls /></Legacy>} />
        <Route path="/progress-bar" element={<Legacy><ProgressBar /></Legacy>} />
        <Route path="/practice-login" element={<Legacy><PracticeLogin /></Legacy>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}
