import type { RuntimeConfig } from '../../../../platform/config/config.schema.js';
import { ApprovedMailProviderAdapter } from './approved-mail-provider.adapter.js';
import { CanaryMailProviderAdapter } from './canary-mail-provider.adapter.js';
import { RateLimitedMailProviderAdapter } from './rate-limited-mail-provider.adapter.js';
import type { MailOperationLimiter } from './mail-provider-rate-limiter.js';
import { MailProviderError, type MailProviderAdapter } from './mail-provider.port.js';

/**
 * Bind the runtime provider only when a concrete delegate exists. Until
 * DEC-003 selects and implements one, an enabled provider must fail at
 * composition time rather than silently behaving like DISABLED.
 */
export function bindMailProvider(
  config: Pick<RuntimeConfig, 'mail'>,
  disabled: MailProviderAdapter,
  limiter: MailOperationLimiter,
  delegate?: MailProviderAdapter,
): MailProviderAdapter {
  if (config.mail.provider === 'DISABLED') return disabled;
  if (!config.mail.enabled || !config.mail.approved) throw new MailProviderError('MAIL_PROVIDER_APPROVAL_REQUIRED');
  if (!config.mail.operationalPolicy) throw new MailProviderError('MAIL_PROVIDER_OPERATIONAL_POLICY_REQUIRED');
  if (!limiter) throw new MailProviderError('MAIL_PROVIDER_RATE_LIMITER_NOT_BOUND');
  if (!delegate) throw new MailProviderError('MAIL_PROVIDER_ADAPTER_NOT_BOUND');
  if (delegate.provider !== config.mail.provider) throw new MailProviderError('MAIL_PROVIDER_BINDING_MISMATCH');
  const approved = new ApprovedMailProviderAdapter(delegate, () => config.mail.enabled && config.mail.approved);
  const rateLimited = new RateLimitedMailProviderAdapter(approved, limiter);
  return new CanaryMailProviderAdapter(rateLimited, config.mail.canaryOnly, config.mail.canaryRecipients);
}
