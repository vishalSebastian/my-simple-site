import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Divider, Drawer, Group, Modal, SegmentedControl, SimpleGrid, Stack,
  Table, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconSearch } from '@tabler/icons-react';
import { api } from '../lib/api.js';
import { PageLoader, useAuth } from '../auth/AuthProvider.jsx';
import { DocumentCard } from '../onboarding/DocumentUpload.jsx';
import { DetailsSummary, StatusBadge } from '../onboarding/Summary.jsx';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'submitted', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'draft', label: 'In progress' },
];

const statusOf = (e) => e.onboarding?.status || 'not_started';
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function HrDashboard() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const load = useCallback(async () => {
    try {
      setEmployees(await api.listEmployees());
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c = { total: employees.length, submitted: 0, approved: 0, rejected: 0 };
    employees.forEach((e) => { if (c[statusOf(e)] !== undefined) c[statusOf(e)] += 1; });
    return c;
  }, [employees]);

  const rows = employees
    .filter((e) => filter === 'all' || statusOf(e) === filter)
    .filter((e) => `${e.full_name} ${e.email}`.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) return <PageLoader />;

  return (
    <Stack data-testid="hr-dashboard">
      <Title order={2}>HR dashboard</Title>
      {error && <Alert color="red" data-testid="hr-error">{error}</Alert>}

      <SimpleGrid cols={{ base: 2, sm: 4 }}>
        {[
          ['total', 'Employees'],
          ['submitted', 'Pending review'],
          ['approved', 'Approved'],
          ['rejected', 'Rejected'],
        ].map(([key, label]) => (
          <Card withBorder radius="md" key={key} data-testid={`hr-stat-${key}`}>
            <Text size="xs" c="dimmed">{label}</Text>
            <Text fw={700} size="xl" data-testid={`hr-stat-${key}-value`}>{counts[key]}</Text>
          </Card>
        ))}
      </SimpleGrid>

      <Group justify="space-between" wrap="wrap">
        <SegmentedControl data={FILTERS} value={filter} onChange={setFilter} data-testid="hr-status-filter" />
        <TextInput
          placeholder="Search name or email"
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          data-testid="hr-search-input"
          w={{ base: '100%', sm: 260 }}
        />
      </Group>

      <Table.ScrollContainer minWidth={640}>
        <Table striped highlightOnHover withTableBorder data-testid="hr-employee-table">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Department</Table.Th>
              <Table.Th>Submitted</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.map((e) => (
              <Table.Tr key={e.id} data-testid="hr-employee-row" data-email={e.email}>
                <Table.Td data-testid="hr-employee-name">{e.full_name}</Table.Td>
                <Table.Td data-testid="hr-employee-email">{e.email}</Table.Td>
                <Table.Td>{e.onboarding?.department || '—'}</Table.Td>
                <Table.Td>{fmtDate(e.onboarding?.submitted_at)}</Table.Td>
                <Table.Td><StatusBadge status={e.onboarding?.status} testId="hr-employee-status" /></Table.Td>
                <Table.Td>
                  <Button size="xs" variant="light" onClick={() => setSelectedId(e.id)} data-testid="hr-review-button">
                    Review
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {rows.length === 0 && <Text c="dimmed" ta="center" data-testid="hr-empty-state">No employees match.</Text>}

      <ReviewDrawer
        userId={selectedId}
        reviewerId={user.id}
        onClose={() => setSelectedId(null)}
        onReviewed={() => { setSelectedId(null); load(); }}
      />
    </Stack>
  );
}

function ReviewDrawer({ userId, reviewerId, onClose, onReviewed }) {
  const [data, setData] = useState(null);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [confirm, setConfirm] = useState(null); // 'approved' | 'rejected'
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setData(null); setComment(''); setCommentError(''); setConfirm(null);
    if (userId) api.getEmployee(userId).then(setData).catch((e) => setData({ error: e.message }));
  }, [userId]);

  const ask = (decision) => {
    if (decision === 'rejected' && !comment.trim()) {
      setCommentError('Add a comment so the employee knows what to fix');
      return;
    }
    setCommentError('');
    setConfirm(decision);
  };

  const decide = async () => {
    setSaving(true);
    try {
      await api.reviewOnboarding(userId, reviewerId, confirm, comment.trim());
      notifications.show({
        color: confirm === 'approved' ? 'green' : 'orange',
        message: `Onboarding ${confirm}`,
        'data-testid': `toast-${confirm}`,
      });
      onReviewed();
    } catch (e) {
      notifications.show({ color: 'red', message: `Could not save: ${e.message}` });
    } finally {
      setSaving(false);
      setConfirm(null);
    }
  };

  const o = data?.onboarding;
  const canReview = o?.status === 'submitted';

  return (
    <Drawer opened={!!userId} onClose={onClose} position="right" size="lg" title="Review onboarding">
      <div data-testid="hr-review-drawer">
      {!data && <PageLoader />}
      {data?.error && <Alert color="red">{data.error}</Alert>}
      {data?.profile && (
        <Stack>
          <Group justify="space-between">
            <div>
              <Text fw={600} data-testid="hr-drawer-name">{data.profile.full_name}</Text>
              <Text size="sm" c="dimmed" data-testid="hr-drawer-email">{data.profile.email}</Text>
            </div>
            <StatusBadge status={o?.status} testId="hr-drawer-status" />
          </Group>

          {!o ? (
            <Text c="dimmed" data-testid="hr-drawer-not-started">This employee hasn&apos;t started onboarding yet.</Text>
          ) : (
            <>
              <DetailsSummary values={o} testPrefix="hr-detail" />
              <Divider label="Documents" labelPosition="left" />
              <Stack gap="xs" data-testid="hr-drawer-documents">
                {data.documents.length === 0
                  ? <Text size="sm" c="dimmed" data-testid="hr-drawer-no-documents">No documents uploaded.</Text>
                  : data.documents.map((d) => <DocumentCard key={d.id} doc={d} />)}
              </Stack>
              {o.hr_comment && !canReview && (
                <Alert variant="light" title="HR comment" data-testid="hr-drawer-previous-comment">{o.hr_comment}</Alert>
              )}
            </>
          )}

          {canReview && (
            <>
              <Divider label="Decision" labelPosition="left" />
              <Textarea
                label="Comment"
                description="Required when rejecting"
                autosize
                minRows={2}
                value={comment}
                onChange={(e) => setComment(e.currentTarget.value)}
                error={commentError}
                data-testid="hr-comment-input"
              />
              <Group justify="flex-end">
                <Button color="red" variant="light" onClick={() => ask('rejected')} data-testid="hr-reject-button">Reject</Button>
                <Button color="green" onClick={() => ask('approved')} data-testid="hr-approve-button">Approve</Button>
              </Group>
            </>
          )}
        </Stack>
      )}

      </div>

      <Modal opened={!!confirm} onClose={() => setConfirm(null)} title="Please confirm" centered>
        <div data-testid="hr-confirm-modal">
        <Text size="sm" mb="lg" data-testid="hr-confirm-message">
          {confirm === 'approved' ? 'Approve' : 'Reject'} onboarding for <b>{data?.profile?.full_name}</b>?
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={() => setConfirm(null)} data-testid="hr-confirm-cancel-button">Cancel</Button>
          <Button color={confirm === 'approved' ? 'green' : 'red'} loading={saving} onClick={decide} data-testid="hr-confirm-yes-button">
            Yes, {confirm === 'approved' ? 'approve' : 'reject'}
          </Button>
        </Group>
        </div>
      </Modal>
    </Drawer>
  );
}
