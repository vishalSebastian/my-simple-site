import { Badge, SimpleGrid, Stack, Text } from '@mantine/core';

export const FIELD_LABELS = {
  first_name: 'First name',
  last_name: 'Last name',
  phone: 'Phone',
  date_of_birth: 'Date of birth',
  address: 'Address',
  emergency_contact_name: 'Emergency contact',
  emergency_contact_phone: 'Emergency phone',
  department: 'Department',
  job_title: 'Job title',
  start_date: 'Start date',
  employment_type: 'Employment type',
  work_location: 'Work location',
};

const STATUS_COLORS = { draft: 'gray', submitted: 'blue', approved: 'green', rejected: 'red' };
const STATUS_LABELS = { draft: 'Draft', submitted: 'Submitted', approved: 'Approved', rejected: 'Rejected' };

export function StatusBadge({ status, testId = 'status-badge' }) {
  const s = status || 'not_started';
  return (
    <Badge color={STATUS_COLORS[s] || 'gray'} variant="light" data-testid={testId} data-status={s}>
      {STATUS_LABELS[s] || 'Not started'}
    </Badge>
  );
}

// Read-only list of onboarding details. testPrefix makes ids like "review-first-name".
export function DetailsSummary({ values, testPrefix }) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm" verticalSpacing="xs">
      {Object.entries(FIELD_LABELS).map(([key, label]) => (
        <Stack gap={0} key={key}>
          <Text size="xs" c="dimmed">{label}</Text>
          <Text size="sm" data-testid={`${testPrefix}-${key.replace(/_/g, '-')}`}>{values?.[key] || '—'}</Text>
        </Stack>
      ))}
    </SimpleGrid>
  );
}
