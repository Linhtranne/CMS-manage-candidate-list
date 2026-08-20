'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, candidateJapaneseLevelOptions, candidateSourceOptions } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import { useUpdateCandidate, type CandidateDetail } from '../services/candidate-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function CandidateEditModal({ candidate, open, onClose, onSaved }: { candidate: CandidateDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const updateCandidate = useUpdateCandidate();
  const [name, setName] = useState(candidate.name);
  const [industry, setIndustry] = useState(candidate.industryLabels[0] ?? '');
  const [occupation, setOccupation] = useState(candidate.occupation);
  const [japaneseLevel, setJapaneseLevel] = useState(candidate.japaneseLevel);
  const [email, setEmail] = useState(candidate.email ?? '');
  const [phone, setPhone] = useState(candidate.phone ?? '');
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim() || !industry || !occupation.trim()) return setError(t('candidates.form.missingRequired'));
    setError('');
    updateCandidate.mutate({ id: candidate.id, body: { name, industryLabels: [industry], occupation, japaneseLevel, email: email || null, phone: phone || null, address: candidate.address ?? null, source: candidate.source ?? candidateSourceOptions[0].value, readinessStatus: candidate.readinessStatus, contactabilityStatus: candidate.contactabilityStatus, version: candidate.version } }, { onSuccess: onSaved, onError: (mutationError) => setError(localizedError(t, mutationError, t('common.errors.loadFailed'))) });
  };

  return <Modal open={open} onClose={onClose} title={t('candidates.form.editTitle')} description={t('candidates.form.editDescription', { code: candidate.code })} size="lg" footer={<><Button onClick={onClose}>{t('candidates.form.cancel')}</Button><Button variant="primary" onClick={submit} disabled={updateCandidate.isPending}>{updateCandidate.isPending ? t('candidates.form.saving') : t('candidates.form.saveChanges')}</Button></>}>
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('candidates.form.name')}<input aria-label={t('candidates.form.name')} name="candidate-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.industry')}<select aria-label={t('candidates.form.industry')} name="candidate-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass}>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.occupation')}<input aria-label={t('candidates.form.occupation')} name="candidate-occupation" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.japanese')}<select aria-label={t('candidates.form.japanese')} name="candidate-japanese" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}>{candidateJapaneseLevelOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.email')}<input aria-label={t('candidates.form.email')} name="candidate-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.phone')}<input aria-label={t('candidates.form.phone')} name="candidate-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
      </div>
    </div>
  </Modal>;
}
