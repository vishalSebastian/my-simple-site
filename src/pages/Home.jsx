import { Badge, Button, Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';

const practice = [
  { to: '/challenges', title: 'Playwright Challenges', desc: '13 challenges in 3 levels: basics, waiting, and tricky locators. Solve them with Playwright scripts.' },
  { to: '/delay', title: 'Delayed Message', desc: 'Click Start; the message appears after a delay. Practise waiting with expect().' },
  { to: '/dynamic-controls', title: 'Dynamic Controls', desc: 'Remove/add a checkbox and enable/disable an input.' },
  { to: '/progress-bar', title: 'Progress Bar', desc: 'Start and stop a progress bar at the right value.' },
  { to: '/practice-login', title: 'Practice Login', desc: 'A fake login form with validation messages.' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <Stack gap="xl" data-testid="home-page">
      <div>
        <Title order={1}>Welcome to Vishal&apos;s QA Automation Practice</Title>
        <Text c="dimmed" mt="xs">
          A practice project to learn Playwright. Nothing here is real; use dummy data only.
        </Text>
      </div>

      <Card withBorder radius="md" p="lg" data-testid="home-onboarding-card">
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <Title order={3}>Employee Onboarding</Title>
              <Badge variant="light">App</Badge>
            </Group>
            <Text size="sm" c="dimmed" mt={4} maw={560}>
              A full app to automate: sign up, a 4-step onboarding form with file uploads, and an HR dashboard to approve or reject.
            </Text>
          </div>
          {user ? (
            <Button component={Link} to="/app" data-testid="home-open-app-button">Open app</Button>
          ) : (
            <Group gap="xs">
              <Button component={Link} to="/login" variant="default" data-testid="home-login-button">Log in</Button>
              <Button component={Link} to="/signup" data-testid="home-signup-button">Sign up</Button>
            </Group>
          )}
        </Group>
      </Card>

      <div>
        <Title order={3} mb="sm">Practice pages</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {practice.map((p) => (
            <Card key={p.to} withBorder radius="md" component={Link} to={p.to} data-testid={`home-practice-${p.to.slice(1)}`}>
              <Text fw={600} c="indigo">{p.title}</Text>
              <Text size="sm" c="dimmed" mt={4}>{p.desc}</Text>
            </Card>
          ))}
        </SimpleGrid>
      </div>
    </Stack>
  );
}
