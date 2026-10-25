import { useEffect, useState } from 'react';
import { ActionIcon, Anchor, Group, Image, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { IconFile, IconPhoto, IconTrash, IconUpload } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../lib/api.js';
import { DOC_TYPES } from '../lib/config.js';

export const kebab = (s) => s.replace(/_/g, '-');
export const formatSize = (bytes) => (bytes > 1024 ** 2 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`);

// Shows a saved document: thumbnail for images, link for everything else.
export function DocumentCard({ doc, onRemove, removing }) {
  const t = kebab(doc.doc_type);
  const [url, setUrl] = useState('');
  const isImage = doc.mime_type?.startsWith('image/');

  useEffect(() => {
    let alive = true;
    api.getDocumentUrl(doc).then((u) => alive && setUrl(u)).catch(() => {});
    return () => { alive = false; };
  }, [doc]);

  return (
    <Paper withBorder p="sm" radius="md" data-testid={`document-${t}`}>
      <Group justify="space-between" wrap="nowrap">
        <Group wrap="nowrap" gap="sm">
          {isImage && url
            ? <Image src={url} w={56} h={56} radius="sm" fit="cover" alt={doc.file_name} data-testid={`document-${t}-preview`} />
            : <IconFile size={36} stroke={1.5} />}
          <div>
            <Text size="sm" fw={500} data-testid={`document-${t}-name`}>{doc.file_name}</Text>
            <Text size="xs" c="dimmed">
              {DOC_TYPES[doc.doc_type]?.label} · {formatSize(doc.size_bytes)}
              {url && <> · <Anchor href={url} target="_blank" rel="noreferrer" size="xs" data-testid={`document-${t}-open-link`}>Open</Anchor></>}
            </Text>
          </div>
        </Group>
        {onRemove && (
          <Tooltip label="Remove file">
            <ActionIcon
              variant="subtle"
              color="red"
              loading={removing}
              onClick={() => onRemove(doc)}
              aria-label={`Remove ${DOC_TYPES[doc.doc_type]?.label}`}
              data-testid={`document-${t}-remove-button`}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Paper>
  );
}

// One upload slot per document type. Uploading again replaces the old file.
export default function DocumentUpload({ userId, docType, doc, onChange }) {
  const t = kebab(docType);
  const cfg = DOC_TYPES[docType];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async ([file]) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      if (doc) await api.deleteDocument(doc);
      const saved = await api.uploadDocument(userId, docType, file);
      onChange(docType, saved);
      notifications.show({ color: 'green', message: `${cfg.label} uploaded`, 'data-testid': 'toast-upload-success' });
    } catch (e) {
      setError(`Upload failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const reject = ([rejection]) => {
    const code = rejection?.errors?.[0]?.code;
    if (code === 'file-too-large') setError(`File is too large. ${cfg.hint}.`);
    else if (code === 'file-invalid-type') setError(`This file type is not allowed. ${cfg.hint}.`);
    else setError('This file cannot be uploaded.');
  };

  const remove = async () => {
    setBusy(true);
    try {
      await api.deleteDocument(doc);
      onChange(docType, null);
    } catch (e) {
      setError(`Could not remove: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack gap={6} data-testid={`upload-${t}`}>
      <Text fw={500} size="sm">{cfg.label} <Text span c="dimmed" size="xs">(optional)</Text></Text>
      {doc ? (
        <DocumentCard doc={doc} onRemove={remove} removing={busy} />
      ) : (
        <Dropzone
          onDrop={upload}
          onReject={reject}
          accept={cfg.accept}
          maxSize={cfg.maxSize}
          maxFiles={1}
          multiple={false}
          loading={busy}
          data-testid={`upload-${t}-dropzone`}
          inputProps={{ 'data-testid': `upload-${t}-input` }}
        >
          <Group justify="center" gap="md" mih={70} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept><IconUpload size={32} stroke={1.5} /></Dropzone.Accept>
            <Dropzone.Reject><IconFile size={32} stroke={1.5} /></Dropzone.Reject>
            <Dropzone.Idle><IconPhoto size={32} stroke={1.5} /></Dropzone.Idle>
            <div>
              <Text size="sm">Drag a file here or click to choose</Text>
              <Text size="xs" c="dimmed">{cfg.hint}</Text>
            </div>
          </Group>
        </Dropzone>
      )}
      {error && <Text c="red" size="sm" data-testid={`upload-${t}-error`}>{error}</Text>}
    </Stack>
  );
}
