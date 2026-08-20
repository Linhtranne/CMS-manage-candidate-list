import type { components } from '@cms/contracts';
import { StatusLabel } from '@/components/ui/status-label';
import { useI18n } from '@/i18n/use-i18n';
import { emailStatusLabel } from '../domain/email-status-label';

export function SendStatus({ status }: { status: components['schemas']['EmailSendResult']['status'] }) {
  const { t } = useI18n();
  const tone = status === 'FAILED' || status === 'BOUNCED' ? 'danger' : status === 'SENT' ? 'success' : status === 'QUEUED' ? 'info' : 'warning';
  return <StatusLabel tone={tone}>{emailStatusLabel(status, t)}</StatusLabel>;
}
