import { useEffect, useState } from 'react';
import {
  Alert, Button, Checkbox, Divider, Group, NativeSelect, Paper, Radio, Select, SimpleGrid,
  Stack, Stepper, Text, Textarea, TextInput, Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { api } from '../lib/api.js';
import { DEPARTMENTS, DOC_TYPES, EMPLOYMENT_TYPES, LOCATIONS } from '../lib/config.js';
import { PageLoader, useAuth } from '../auth/AuthProvider.jsx';
import DocumentUpload, { DocumentCard } from './DocumentUpload.jsx';
import { DetailsSummary, StatusBadge } from './Summary.jsx';

const STEP_FIELDS = [
  ['first_name', 'last_name', 'phone', 'date_of_birth', 'address', 'emergency_contact_name', 'emergency_contact_phone'],
  ['department', 'job_title', 'start_date', 'employment_type', 'work_location'],
];
const ALL_FIELDS = STEP_FIELDS.flat();
const EMPTY = Object.fromEntries(ALL_FIELDS.map((f) => [f, '']));

const required = (msg) => (v) => (String(v ?? '').trim() ? null : msg);
const phone = (v) => (/^\d{10}$/.test(v) ? null : 'Enter a 10-digit phone number');

function ageFrom(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  return diff / (365.25 * 24 * 3600 * 1000);
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState(null);
  const [docs, setDocs] = useState({});
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loadError, setLoadError] = useState('');

  const form = useForm({
    initialValues: EMPTY,
    validate: {
      first_name: required('First name is required'),
      last_name: required('Last name is required'),
      phone,
      date_of_birth: (v) => (!v ? 'Date of birth is required' : ageFrom(v) < 18 ? 'You must be at least 18' : null),
      address: required('Address is required'),
      emergency_contact_name: required('Emergency contact name is required'),
      emergency_contact_phone: phone,
      department: required('Choose a department'),
      job_title: required('Job title is required'),
      start_date: required('Start date is required'),
      employment_type: required('Choose an employment type'),
      work_location: required('Choose a work location'),
    },
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [row, list] = await Promise.all([api.getOnboarding(user.id), api.listDocuments(user.id)]);
        if (!alive) return;
        setRecord(row);
        setDocs(Object.fromEntries(list.map((d) => [d.doc_type, d])));
        if (row) form.setValues(Object.fromEntries(ALL_FIELDS.map((f) => [f, row[f] ?? ''])));
      } catch (e) {
        if (alive) setLoadError(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const stepIsValid = (step) => {
    const fields = STEP_FIELDS[step] || [];
    const results = fields.map((f) => form.validateField(f).hasError);
    return !results.some(Boolean);
  };

  const saveDraft = async () => {
    const row = await api.saveOnboarding(user.id, form.getValues());
    setRecord(row);
    return row;
  };

  const next = async () => {
    if (!stepIsValid(active)) return;
    if (active < 2) {
      setSaving(true);
      try {
        await saveDraft();
        notifications.show({ color: 'green', message: 'Progress saved', 'data-testid': 'toast-draft-saved' });
        setActive(active + 1);
      } catch (e) {
        notifications.show({ color: 'red', message: `Could not save: ${e.message}` });
      } finally {
        setSaving(false);
      }
    } else {
      setActive(active + 1);
    }
  };

  const submit = async () => {
    if (!stepIsValid(0)) return setActive(0);
    if (!stepIsValid(1)) return setActive(1);
    setSaving(true);
    try {
      await saveDraft();
      const row = await api.submitOnboarding(user.id);
      setRecord(row);
      notifications.show({ color: 'green', message: 'Onboarding submitted to HR', 'data-testid': 'toast-submitted' });
    } catch (e) {
      notifications.show({ color: 'red', message: `Could not submit: ${e.message}` });
    } finally {
      setSaving(false);
    }
  };

  const onDocChange = (type, doc) => setDocs((d) => ({ ...d, [type]: doc }));

  if (loading) return <PageLoader />;
  if (loadError) return <Alert color="red" data-testid="onboarding-load-error">{loadError}</Alert>;

  // Submitted or approved: read-only status view
  if (record && ['submitted', 'approved'].includes(record.status)) {
    return (
      <Paper withBorder p="xl" radius="md" data-testid="onboarding-status-page">
        <Group justify="space-between" mb="md">
          <Title order={2}>Your onboarding</Title>
          <StatusBadge status={record.status} testId="onboarding-status-badge" />
        </Group>
        {record.status === 'submitted' ? (
          <Alert color="blue" variant="light" mb="lg" data-testid="onboarding-submitted-message">
            Thanks! HR is reviewing your details. You&apos;ll see the result here.
          </Alert>
        ) : (
          <Alert color="green" variant="light" mb="lg" data-testid="onboarding-approved-message">
            Welcome aboard! HR has approved your onboarding.
            {record.hr_comment && <Text size="sm" mt={4}>HR note: {record.hr_comment}</Text>}
          </Alert>
        )}
        <DetailsSummary values={record} testPrefix="status" />
        <Divider my="lg" label="Documents" labelPosition="left" />
        <Stack gap="xs" data-testid="status-documents">
          {Object.values(docs).filter(Boolean).length === 0
            ? <Text size="sm" c="dimmed" data-testid="status-no-documents">No documents uploaded.</Text>
            : Object.values(docs).filter(Boolean).map((d) => <DocumentCard key={d.id} doc={d} />)}
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper withBorder p={{ base: 'md', sm: 'xl' }} radius="md" data-testid="onboarding-page">
      <Group justify="space-between" mb="xs">
        <Title order={2}>Employee onboarding</Title>
        <StatusBadge status={record?.status} testId="onboarding-status-badge" />
      </Group>
      <Text c="dimmed" size="sm" mb="lg">Fill in your details. Your progress is saved at every step.</Text>

      {record?.status === 'rejected' && (
        <Alert color="red" variant="light" mb="lg" title="HR asked for changes" data-testid="onboarding-rejected-alert">
          <span data-testid="onboarding-hr-comment">{record.hr_comment || 'Please review your details and submit again.'}</span>
        </Alert>
      )}

      <Stepper active={active} onStepClick={setActive} allowNextStepsSelect={false} size="sm" data-testid="onboarding-stepper">
        <Stepper.Step label="Personal" description="About you" data-testid="onboarding-step-personal">
          <Stack mt="lg" data-testid="onboarding-personal-section">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="First name" withAsterisk data-testid="onboarding-first-name-input" {...form.getInputProps('first_name')} />
              <TextInput label="Last name" withAsterisk data-testid="onboarding-last-name-input" {...form.getInputProps('last_name')} />
              <TextInput label="Phone" withAsterisk placeholder="10 digits" data-testid="onboarding-phone-input" {...form.getInputProps('phone')} />
              <TextInput label="Date of birth" type="date" withAsterisk data-testid="onboarding-dob-input" {...form.getInputProps('date_of_birth')} />
            </SimpleGrid>
            <Textarea label="Address" withAsterisk autosize minRows={2} data-testid="onboarding-address-input" {...form.getInputProps('address')} />
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput label="Emergency contact name" withAsterisk data-testid="onboarding-emergency-name-input" {...form.getInputProps('emergency_contact_name')} />
              <TextInput label="Emergency contact phone" withAsterisk data-testid="onboarding-emergency-phone-input" {...form.getInputProps('emergency_contact_phone')} />
            </SimpleGrid>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Job" description="Your role" data-testid="onboarding-step-job">
          <Stack mt="lg" data-testid="onboarding-job-section">
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <Select
                label="Department"
                placeholder="Choose a department"
                withAsterisk
                data={DEPARTMENTS}
                data-testid="onboarding-department-select"
                {...form.getInputProps('department')}
              />
              <TextInput label="Job title" withAsterisk data-testid="onboarding-job-title-input" {...form.getInputProps('job_title')} />
              <TextInput label="Start date" type="date" withAsterisk data-testid="onboarding-start-date-input" {...form.getInputProps('start_date')} />
              <NativeSelect
                label="Work location"
                withAsterisk
                data={[{ value: '', label: 'Choose a location' }, ...LOCATIONS]}
                data-testid="onboarding-location-select"
                {...form.getInputProps('work_location')}
              />
            </SimpleGrid>
            <Radio.Group label="Employment type" withAsterisk data-testid="onboarding-employment-type-group" {...form.getInputProps('employment_type')}>
              <Group mt="xs">
                {EMPLOYMENT_TYPES.map((t) => (
                  <Radio key={t} value={t} label={t} data-testid={`onboarding-employment-type-${t.toLowerCase()}`} />
                ))}
              </Group>
            </Radio.Group>
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Documents" description="Optional uploads" data-testid="onboarding-step-documents">
          <Stack mt="lg" data-testid="onboarding-documents-section">
            <Text size="sm" c="dimmed">All uploads are optional. You can skip this step.</Text>
            {Object.keys(DOC_TYPES).map((type) => (
              <DocumentUpload key={type} userId={user.id} docType={type} doc={docs[type]} onChange={onDocChange} />
            ))}
          </Stack>
        </Stepper.Step>

        <Stepper.Step label="Review" description="Check & submit" data-testid="onboarding-step-review">
          <Stack mt="lg" data-testid="onboarding-review-section">
            <DetailsSummary values={form.getValues()} testPrefix="review" />
            <Divider label="Documents" labelPosition="left" />
            <Stack gap="xs" data-testid="review-documents">
              {Object.values(docs).filter(Boolean).length === 0
                ? <Text size="sm" c="dimmed" data-testid="review-no-documents">No documents uploaded.</Text>
                : Object.values(docs).filter(Boolean).map((d) => <DocumentCard key={d.id} doc={d} />)}
            </Stack>
            <Checkbox
              label="I confirm these details are correct"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.currentTarget.checked)}
              data-testid="onboarding-confirm-checkbox"
            />
          </Stack>
        </Stepper.Step>
      </Stepper>

      <Group justify="space-between" mt="xl">
        <Button variant="default" onClick={() => setActive(active - 1)} disabled={active === 0 || saving} data-testid="onboarding-back-button">
          Back
        </Button>
        {active < 3 ? (
          <Button onClick={next} loading={saving} data-testid="onboarding-next-button">
            {active === 2 ? 'Continue to review' : 'Save & continue'}
          </Button>
        ) : (
          <Button onClick={submit} loading={saving} disabled={!confirmed} color="green" data-testid="onboarding-submit-button">
            Submit to HR
          </Button>
        )}
      </Group>
    </Paper>
  );
}
