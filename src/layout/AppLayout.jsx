import { AppShell, Avatar, Badge, Burger, Button, Group, Menu, NavLink as MNavLink, Stack, Text, UnstyledButton } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconChevronDown, IconLogout } from '@tabler/icons-react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider.jsx';
import { DEMO_MODE } from '../lib/config.js';

const PRACTICE = [
  { to: '/delay', label: 'Delayed Message' },
  { to: '/dynamic-controls', label: 'Dynamic Controls' },
  { to: '/progress-bar', label: 'Progress Bar' },
  { to: '/practice-login', label: 'Practice Login' },
];

function useNavItems() {
  const { profile } = useAuth();
  const items = [{ to: '/', label: 'Home', id: 'home' }];
  if (profile?.role === 'employee') items.push({ to: '/onboarding', label: 'My onboarding', id: 'onboarding' });
  if (profile?.role === 'hr') items.push({ to: '/hr', label: 'HR dashboard', id: 'hr' });
  items.push({ to: '/challenges', label: 'Challenges', id: 'challenges' });
  return items;
}

function UserArea() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <Group gap="xs">
        <Button component={Link} to="/login" variant="default" size="xs" data-testid="header-login-button">Log in</Button>
        <Button component={Link} to="/signup" size="xs" data-testid="header-signup-button">Sign up</Button>
      </Group>
    );
  }

  const logout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <UnstyledButton data-testid="header-user-menu">
          <Group gap={6}>
            <Avatar size="sm" radius="xl" color="indigo">{profile?.full_name?.[0] || '?'}</Avatar>
            <Text size="sm" visibleFrom="xs" data-testid="header-user-name">{profile?.full_name || user.email}</Text>
            <IconChevronDown size={14} />
          </Group>
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label data-testid="header-user-email">{user.email}</Menu.Label>
        <Menu.Item disabled>
          Role: <Badge size="xs" variant="light" data-testid="header-user-role">{profile?.role}</Badge>
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={logout} data-testid="header-logout-button">
          Log out
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}

export default function AppLayout({ children }) {
  const [opened, { toggle, close }] = useDisclosure(false);
  const items = useNavItems();
  const location = useLocation();

  return (
    <AppShell header={{ height: 60 }} navbar={{ width: 240, breakpoint: 'sm', collapsed: { desktop: true, mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="lg" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" aria-label="Open menu" data-testid="header-burger" />
            <Text component={Link} to="/" fw={700} data-testid="brand" style={{ textDecoration: 'none', color: 'inherit' }}>
              VP&apos;s QA Practice
            </Text>
            {DEMO_MODE && <Badge color="orange" variant="light" data-testid="demo-badge">Demo mode</Badge>}
            <Group gap={4} visibleFrom="sm" component="nav" data-testid="header-nav">
              {items.map((i) => (
                <Button
                  key={i.to}
                  component={NavLink}
                  to={i.to}
                  end={i.to === '/'}
                  variant={location.pathname === i.to || (i.to !== '/' && location.pathname.startsWith(i.to)) ? 'light' : 'subtle'}
                  size="xs"
                  data-testid={`nav-${i.id}`}
                >
                  {i.label}
                </Button>
              ))}
              <Menu position="bottom-start" withinPortal>
                <Menu.Target>
                  <Button variant="subtle" size="xs" rightSection={<IconChevronDown size={14} />} data-testid="nav-practice">Practice</Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {PRACTICE.map((p) => (
                    <Menu.Item key={p.to} component={Link} to={p.to} data-testid={`nav-practice-${p.to.slice(1)}`}>{p.label}</Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>
          <UserArea />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm" data-testid="mobile-nav">
        <Stack gap={2}>
          {items.map((i) => (
            <MNavLink key={i.to} component={Link} to={i.to} label={i.label} onClick={close} active={location.pathname === i.to} />
          ))}
          <Text size="xs" c="dimmed" mt="sm" mb={2}>Practice</Text>
          {PRACTICE.map((p) => (
            <MNavLink key={p.to} component={Link} to={p.to} label={p.label} onClick={close} active={location.pathname === p.to} />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>{children}</div>
      </AppShell.Main>
    </AppShell>
  );
}
