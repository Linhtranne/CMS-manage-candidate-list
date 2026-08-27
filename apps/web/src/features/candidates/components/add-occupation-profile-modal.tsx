'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import { useAddOccupationProfile } from '../services/candidate-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function AddOccupationProfileModal({ candidateId, open, onClose }: { candidateId: string; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const mutation = useAddOccupationProfile();
  const [industryLabel, setIndustryLabel] = useState<string>(candidateIndustryOptions[0]?.value ?? '');
  const [occupation, setOccupation] = useState('');
  const [yearsExperience, setYearsExperience] = useState('0');
  const [skills, setSkills] = useState('');
  const [desiredLocation, setDesiredLocation] = useState('');
  const [error, setError] = useState('');
  const reset = () => { setOccupation(''); setYearsExperience('0'); setSkills(''); setDesiredLocation(''); setError(''); };
  const close = () => { reset(); onClose(); };
  const save = () => {
    if (!occupation.trim()) { setError(t('candidates.form.missingOccupation')); return; }
    mutation.mutate({ id: candidateId, body: { industryLabel, occupation: occupation.trim(), yearsExperience: Number(yearsExperience) || 0, skills: skills.split(',').map((item) => item.trim()).filter(Boolean), desiredLocation: desiredLocation.trim() || null, attributes: {} } }, { onSuccess: close, onError: (cause) => setError(localizedError(t, cause, t('common.errors.loadFailed'))) });
  };
  return <Modal open={open} onClose={close} title={t('candidates.detail.overview.addProfile')} size="md" footer={<><Button onClick={close}>{t('common.actions.cancel')}</Button><Button variant="primary" onClick={save} disabled={mutation.isPending}>{mutation.isPending ? t('candidates.form.saving') : t('candidates.form.save')}</Button></>}>
    <div className="space-y-4">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <label className="block text-sm font-semibold text-text">{t('candidates.form.industry')}<select value={industryLabel} onChange={(event) => setIndustryLabel(event.target.value)} className={inputClass}>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
      <label className="block text-sm font-semibold text-text">{t('candidates.form.occupation')}<input value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-text">{t('candidates.detail.overview.yearsLabel')}<input type="number" min="0" max="80" value={yearsExperience} onChange={(event) => setYearsExperience(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-text">{t('candidates.detail.overview.desiredLocation')}<input value={desiredLocation} onChange={(event) => setDesiredLocation(event.target.value)} className={inputClass} /></label>
      </div>
      <label className="block text-sm font-semibold text-text">{t('candidates.detail.overview.skillsLabel')}<input value={skills} onChange={(event) => setSkills(event.target.value)} placeholder={t('candidates.detail.overview.skillsPlaceholder')} className={inputClass} /></label>
    </div>
  </Modal>;
}
