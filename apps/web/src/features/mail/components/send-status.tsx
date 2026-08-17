import type { components } from '@cms/contracts';
import { StatusLabel } from '@/components/ui/status-label';
import { emailStatusLabel } from '../domain/email-status-label';

export function SendStatus({ status }: { status: components['schemas']['EmailSendResult']['status'] }) {
  const tone = status === 'FAILED' || status === 'BOUNCED' ? 'danger' : status === 'SENT' ? 'success' : status === 'QUEUED' ? 'info' : 'warning';
  return <StatusLabel tone={tone}>{emailStatusLabel(status)}</StatusLabel>;
}
