import type { components } from '@cms/contracts';
import { createTranslator } from '@/i18n/translate';
import { getDomainLabel } from '@/i18n/domain-labels';
import type { Translate } from '@/i18n/types';

type EmailStatus = components['schemas']['EmailMessage']['status'] | components['schemas']['EmailSendResult']['status'];
export function emailStatusLabel(status: EmailStatus, t: Translate = createTranslator('vi')) {
  return getDomainLabel(t, 'emailStatus', status);
}

export function conversationStatusLabel(status: components['schemas']['Conversation']['status'], t: Translate = createTranslator('vi')) {
  return getDomainLabel(t, 'conversationStatus', status);
}
