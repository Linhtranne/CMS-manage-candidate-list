'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { EmptyState } from '@/components/ui/empty-state';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';
import { useAdminMailbox, useUpdateAdminMailbox } from '../services/admin-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal';

export function MailboxSettingsPage() {
  const { t, formatDateTime } = useI18n();
  const query = useAdminMailbox();
  const update = useUpdateAdminMailbox();
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [adapter, setAdapter] = useState<'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'SMTP_IMAP'>('MICROSOFT_365');
  const [maxAttachmentMb, setMaxAttachmentMb] = useState('10');
  const [signature, setSignature] = useState('');
  const [receiveFolder, setReceiveFolder] = useState('Inbox');
  const [sentFolder, setSentFolder] = useState('Sent');
  const [retryLimit, setRetryLimit] = useState('3');
  const [alertAddress, setAlertAddress] = useState('');

  useEffect(() => {
    if (!query.data) return;
    setSenderName(query.data.senderName);
    setAdapter(query.data.adapter);
    setMaxAttachmentMb(String(Math.round(query.data.maxAttachmentBytes / 1024 / 1024)));
    setSignature(query.data.signature ?? '');
    setReceiveFolder(query.data.receiveFolder ?? 'Inbox');
    setSentFolder(query.data.sentFolder ?? 'Sent');
    setRetryLimit(String(query.data.retryLimit ?? 3));
    setAlertAddress(query.data.alertAddress ?? '');
  }, [query.data]);

  if (query.isPending) return <LoadingState label={t('adminExtra.mailbox.eyebrow')} />;
  if (query.error) return <ErrorState message={t('adminExtra.mailbox.saveError')} onRetry={() => void query.refetch()} />;
  const mailbox = query.data;
  if (!mailbox) return <EmptyState title={t('mailbox.page.loading')} description={t('mailbox.page.description')} />;

  const save = () => update.mutate({ senderName: senderName.trim(), adapter, maxAttachmentBytes: Math.max(1, Number(maxAttachmentMb) || 1) * 1024 * 1024, signature: signature.trim(), receiveFolder: receiveFolder.trim() || 'Inbox', sentFolder: sentFolder.trim() || 'Sent', retryLimit: Math.max(0, Math.min(10, Number(retryLimit) || 0)), alertAddress: alertAddress.trim() }, { onSuccess: () => setOpen(false) });
  const summary = [[t('adminExtra.mailbox.address'), mailbox.address], [t('adminExtra.mailbox.senderName'), mailbox.senderName], [t('adminExtra.mailbox.adapter'), mailbox.adapter], [t('adminExtra.mailbox.maxAttachment'), `${Math.round(mailbox.maxAttachmentBytes / 1024 / 1024)} MB`], [t('adminExtra.mailbox.folders'), `${mailbox.receiveFolder ?? t('adminExtra.mailbox.defaultReceiveFolder')} / ${mailbox.sentFolder ?? t('adminExtra.mailbox.defaultSentFolder')}`], [t('adminExtra.mailbox.retryAlert'), `${mailbox.retryLimit ?? 3} · ${mailbox.alertAddress ?? t('adminExtra.mailbox.credentialMissing')}`]];

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">{t('adminExtra.mailbox.eyebrow')}</p><h1 className="mt-1 text-2xl font-bold text-text">{t('adminExtra.mailbox.title')}</h1><p className="mt-2 text-sm text-text-muted">{t('adminExtra.mailbox.description')}</p></div><Button variant="primary" onClick={() => setOpen(true)}>{t('adminExtra.mailbox.edit')}</Button></div>
    <section className="max-w-3xl rounded-lg border border-border bg-panel p-5"><div className="grid gap-4 sm:grid-cols-2">{summary.map(([label, value]) => <div key={label}><p className="text-xs uppercase tracking-wide text-text-muted">{label}</p><p className="mt-1 font-semibold text-text">{value}</p></div>)}<div><p className="text-xs uppercase tracking-wide text-text-muted">{t('adminExtra.mailbox.health')}</p><div className="mt-1"><StatusLabel tone={mailbox.health === 'HEALTHY' ? 'success' : mailbox.health === 'DEGRADED' ? 'warning' : 'danger'}>{mailbox.health === 'HEALTHY' ? t('adminExtra.mailbox.healthy') : mailbox.health === 'DEGRADED' ? t('adminExtra.mailbox.degraded') : t('adminExtra.mailbox.disconnected')}</StatusLabel></div></div><div><p className="text-xs uppercase tracking-wide text-text-muted">{t('adminExtra.mailbox.lastChecked')}</p><p className="mt-1 font-semibold text-text">{formatDateTime(mailbox.lastCheckedAt)}</p></div></div><div className="mt-5 rounded-control border border-border bg-surface p-4 text-sm text-text-muted"><strong className="text-text">{t('adminExtra.mailbox.credential')}</strong> {mailbox.credentialConfigured ? t('adminExtra.mailbox.credentialConfigured') : t('adminExtra.mailbox.credentialMissing')}</div></section>
    <Modal open={open} title={t('adminExtra.mailbox.editTitle')} description={t('adminExtra.mailbox.editDescription')} onClose={() => setOpen(false)} size="md" footer={<><Button onClick={() => setOpen(false)}>{t('adminExtra.mailbox.cancel')}</Button><Button variant="primary" disabled={update.isPending || !senderName.trim()} onClick={save}>{update.isPending ? t('adminExtra.mailbox.saving') : t('adminExtra.mailbox.save')}</Button></>}><div className="space-y-4">{update.error ? <p role="alert" className="text-sm font-semibold text-danger">{localizedError(t, update.error, t('adminExtra.mailbox.saveError'))}</p> : null}<label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.senderName')}<input aria-label={t('adminExtra.mailbox.senderNameAria')} name="ten-nguoi-gui-mailbox" autoComplete="organization" value={senderName} onChange={(event) => setSenderName(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.adapter')}<select aria-label={t('adminExtra.mailbox.adapterAria')} name="adapter-mailbox" value={adapter} onChange={(event) => setAdapter(event.target.value as typeof adapter)} className={inputClass}><option value="MICROSOFT_365">{t('adminExtraValues.microsoft365')}</option><option value="GOOGLE_WORKSPACE">{t('adminExtraValues.googleWorkspace')}</option><option value="SMTP_IMAP">{t('adminExtraValues.smtpImap')}</option></select></label><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.maxAttachment')} ({t('adminExtraValues.megabytes')})<input aria-label={t('adminExtra.mailbox.maxAttachmentAria')} name="gioi-han-tep-mailbox" type="number" min="1" max="50" value={maxAttachmentMb} onChange={(event) => setMaxAttachmentMb(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.signature')}<textarea aria-label={t('adminExtra.mailbox.signatureAria')} name="chu-ky-email-mailbox" value={signature} onChange={(event) => setSignature(event.target.value)} className={`${inputClass} min-h-20 py-2`} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.receiveFolder')}<input aria-label={t('adminExtra.mailbox.receiveFolderAria')} name="thu-muc-nhan-mailbox" value={receiveFolder} onChange={(event) => setReceiveFolder(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.sentFolder')}<input aria-label={t('adminExtra.mailbox.sentFolderAria')} name="thu-muc-gui-mailbox" value={sentFolder} onChange={(event) => setSentFolder(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.retryLimit')}<input aria-label={t('adminExtra.mailbox.retryLimitAria')} name="so-lan-retry-mailbox" type="number" min="0" max="10" value={retryLimit} onChange={(event) => setRetryLimit(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">{t('adminExtra.mailbox.alertAddress')}<input aria-label={t('adminExtra.mailbox.alertAddressAria')} name="dia-chi-canh-bao-mailbox" type="email" autoComplete="email" value={alertAddress} onChange={(event) => setAlertAddress(event.target.value)} className={inputClass} /></label></div></div></Modal>
  </div>;
}
