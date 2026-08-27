'use client';

import { useEffect, useState } from 'react';
import { KeyRound, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { getDomainLabel } from '@/i18n/domain-labels';
import { useI18n } from '@/i18n/use-i18n';
import { useCurrentUser } from '@/lib/auth/use-current-user';
import { useUpdateCurrentUser } from '../services/account-queries';

function statusTone(status: string): 'success' | 'danger' | 'warning' | 'neutral' {
  if (status === 'ACTIVE') return 'success';
  if (status === 'LOCKED' || status === 'DISABLED') return 'danger';
  if (status === 'INVITED') return 'warning';
  return 'neutral';
}

export function AccountPage() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const updateUser = useUpdateCurrentUser();
  const [displayName, setDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (user.data) setDisplayName(user.data.displayName);
  }, [user.data]);

  if (user.isPending) return <LoadingState label={t('account.loading')} />;
  if (user.error || !user.data) return <ErrorState message={t('account.loadError')} onRetry={() => void user.refetch()} />;

  const currentUser = user.data;
  const roleSlugs: Record<string, string> = {
    RECRUITER: 'recruiter',
    BUSINESS: 'business',
    COORDINATOR: 'coordinator',
    MANAGER: 'manager',
    CONFIG_ADMIN: 'config-admin',
    AUDITOR: 'auditor'
  };
  const roleNames = currentUser.roles.map((role) => getDomainLabel(t, 'adminRole', roleSlugs[role] ?? role));

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage('');
    setProfileError('');
    const nextDisplayName = displayName.trim();
    if (!nextDisplayName) {
      setProfileError(t('account.displayNameRequired'));
      return;
    }
    try {
      await updateUser.mutateAsync({ displayName: nextDisplayName });
      setProfileMessage(t('account.saved'));
    } catch {
      setProfileError(t('account.updateError'));
    }
  };

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage('');
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError(t('account.passwordMismatch'));
      return;
    }
    try {
      await updateUser.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(t('account.passwordUpdated'));
    } catch {
      setPasswordError(t('account.passwordUpdateError'));
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-semibold text-accent">{t('account.eyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold text-text">{t('account.title')}</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-muted">{t('account.description')}</p>
      </header>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f1fb] text-accent"><UserRound aria-hidden="true" size={19} /></span>
          <div>
            <h2 className="font-bold text-text">{t('account.profileTitle')}</h2>
            <p className="mt-1 text-sm text-text-muted">{t('account.profileDescription')}</p>
          </div>
        </div>
        <form className="mt-5 space-y-4" onSubmit={(event) => void saveProfile(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-text">
              {t('account.displayName')}
              <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={160} autoComplete="name" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
            </label>
            <label className="block text-sm font-semibold text-text">
              {t('account.email')}
              <input value={currentUser.email} readOnly aria-describedby="account-email-hint" className="mt-1 min-h-10 w-full rounded-control border border-border bg-surface px-3 font-normal text-text-muted" />
              <span id="account-email-hint" className="mt-1 block text-xs font-normal text-text-muted">{t('account.emailReadOnly')}</span>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
            <span>{t('account.roles')}: <strong className="font-semibold text-text">{roleNames.join(', ') || t('common.states.unknown')}</strong></span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-2">{t('account.status')}: <StatusLabel tone={statusTone(currentUser.status)}>{t(`account.statuses.${currentUser.status.toLowerCase()}` as 'account.statuses.active')}</StatusLabel></span>
          </div>
          {profileError ? <p role="alert" className="text-sm font-semibold text-danger">{profileError}</p> : null}
          {profileMessage ? <p role="status" className="text-sm font-semibold text-success">{profileMessage}</p> : null}
          <Button type="submit" variant="primary" disabled={updateUser.isPending}>{updateUser.isPending ? t('account.saving') : t('account.save')}</Button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-panel p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8f1fb] text-accent"><KeyRound aria-hidden="true" size={19} /></span>
          <div>
            <h2 className="font-bold text-text">{t('account.passwordTitle')}</h2>
            <p className="mt-1 text-sm text-text-muted">{t('account.passwordDescription')}</p>
          </div>
        </div>
        <form className="mt-5 max-w-2xl space-y-4" onSubmit={(event) => void changePassword(event)}>
          <label className="block text-sm font-semibold text-text">{t('account.currentPassword')}<input required type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="current-password" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-text">{t('account.newPassword')}<input required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label>
            <label className="block text-sm font-semibold text-text">{t('account.confirmPassword')}<input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={128} autoComplete="new-password" className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" /></label>
          </div>
          {passwordError ? <p role="alert" className="text-sm font-semibold text-danger">{passwordError}</p> : null}
          {passwordMessage ? <p role="status" className="text-sm font-semibold text-success">{passwordMessage}</p> : null}
          <Button type="submit" variant="secondary" disabled={updateUser.isPending}>{updateUser.isPending ? t('account.saving') : t('account.changePassword')}</Button>
        </form>
      </section>
    </div>
  );
}
