import type { components } from '@cms/contracts';
import { StatusLabel } from '@/components/ui/status-label';

type Attachment = components['schemas']['EmailAttachment'];
export function AttachmentRow({ attachment }: { attachment: Attachment }) {
  const canDownload = attachment.scanStatus === 'SAFE' && Boolean(attachment.downloadUrl);
  return <li className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-border bg-surface px-3 py-2 text-sm"><span className="font-semibold text-text">{attachment.fileName}</span>{canDownload ? <a className="font-semibold text-accent underline" href={attachment.downloadUrl ?? '#'}>Tải xuống</a> : <StatusLabel tone={attachment.scanStatus === 'QUARANTINED' ? 'danger' : 'warning'}>{attachment.scanStatus === 'QUARANTINED' ? 'Bị cách ly' : 'Chưa thể tải'}</StatusLabel>}</li>;
}
