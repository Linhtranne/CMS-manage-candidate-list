'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';
import { getDomainLabel } from '@/i18n/domain-labels';
import { useInviteAdminUser } from '../services/admin-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

type Role = components['schemas']['AdminRole'];

export function InviteUserModal({ open, roles, onClose }: { open: boolean; roles: Role[]; onClose: () => void }) {
  const { t } = useI18n();
  const mutation = useInviteAdminUser();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState('team-recruiting');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? 'recruiter');
  const [error, setError] = useState('');
  const [savedEmail, setSavedEmail] = useState('');

  useEffect(() => {
    if (open) return;
    setDisplayName(''); setEmail(''); setTeamId('team-recruiting'); setRoleId(roles[0]?.id ?? 'recruiter'); setError(''); setSavedEmail('');
  }, [open, roles]);

  const submit = () => {
    if (!displayName.trim() || !email.trim() || !roleId) return setError(t('admin.invite.required'));
    setError('');
    mutation.mutate({ displayName: displayName.trim(), email: email.trim(), teamId, roleIds: [roleId] }, { onSuccess: (user) => setSavedEmail(user.email), onError: (cause) => setError(localizedError(t, cause, t('admin.invite.required'))) });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!savedEmail && Boolean(displayName.trim() || email.trim())} title={t('admin.invite.title')} description={t('admin.invite.description')} size="md" footer={savedEmail ? <Button variant="primary" onClick={onClose}>{t('admin.invite.close')}</Button> : <><Button onClick={onClose}>{t('admin.invite.cancel')}</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? t('admin.invite.sending') : t('admin.invite.send')}</Button></>}>
    {savedEmail ? <p role="status" className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{t('admin.invite.created', { email: savedEmail })}</p> : <div className="space-y-4">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <label className="block text-sm font-semibold text-text">{t('admin.invite.name')}<input aria-label={t('admin.invite.nameAria')} name="ho-ten-nguoi-dung" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-text">{t('admin.invite.email')}<input aria-label={t('admin.invite.emailAria')} name="email-nguoi-dung" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-text">{t('admin.invite.team')}<select aria-label={t('admin.invite.teamAria')} name="doi-cua-nguoi-dung" value={teamId} onChange={(event) => setTeamId(event.target.value)} className={inputClass}><option value="team-recruiting">{t('admin.invite.recruiting')}</option><option value="team-coordination">{t('admin.invite.coordination')}</option><option value="team-platform">{t('admin.invite.platform')}</option><option value="team-compliance">{t('admin.invite.compliance')}</option></select></label>
      <label className="block text-sm font-semibold text-text">{t('admin.invite.role')}<select aria-label={t('admin.invite.roleAria')} name="vai-tro-nguoi-dung" value={roleId} onChange={(event) => setRoleId(event.target.value)} className={inputClass}>{roles.map((role) => { const localizedRole = getDomainLabel(t, 'adminRole', role.id); return <option key={role.id} value={role.id}>{localizedRole === role.id ? role.name : localizedRole}</option>; })}</select></label>
    </div>}
  </Modal>;
}
