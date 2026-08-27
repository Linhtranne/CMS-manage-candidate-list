'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, candidateJapaneseLevelOptions, candidateSourceOptions } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import { useUpdateCandidate, type CandidateDetail } from '../services/candidate-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

function normalizePhoneInput(value: string): string {
  const normalized = value.trim().replace(/[\s().-]/g, '');
  if (normalized.startsWith('0')) return `+84${normalized.slice(1)}`;
  if (normalized.startsWith('84')) return `+${normalized}`;
  return normalized;
}

export function CandidateEditModal({ candidate, open, onClose, onSaved }: { candidate: CandidateDetail; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const updateCandidate = useUpdateCandidate();
  const [name, setName] = useState(candidate.name);
  const [industryLabels, setIndustryLabels] = useState(candidate.industryLabels);
  const [occupation, setOccupation] = useState(candidate.occupation);
  const [japaneseLevel, setJapaneseLevel] = useState(candidate.japaneseLevel);
  const [source, setSource] = useState(candidate.source ?? '');
  const [email, setEmail] = useState(candidate.email ?? '');
  const [phone, setPhone] = useState(candidate.phone ?? '');
  const [passportNumber, setPassportNumber] = useState(candidate.passportNumber ?? '');
  const [address, setAddress] = useState(candidate.address ?? '');
  const [readinessStatus, setReadinessStatus] = useState(candidate.readinessStatus);
  const [contactabilityStatus, setContactabilityStatus] = useState(candidate.contactabilityStatus);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(candidate.name);
    setIndustryLabels(candidate.industryLabels);
    setOccupation(candidate.occupation);
    setJapaneseLevel(candidate.japaneseLevel);
    setSource(candidate.source ?? '');
    setEmail(candidate.email ?? '');
    setPhone(candidate.phone ?? '');
    setPassportNumber(candidate.passportNumber ?? '');
    setAddress(candidate.address ?? '');
    setReadinessStatus(candidate.readinessStatus);
    setContactabilityStatus(candidate.contactabilityStatus);
    setError('');
  }, [candidate.id, candidate.version, open]);

  const submit = () => {
    if (!name.trim() || industryLabels.length === 0 || !occupation.trim()) return setError(t('candidates.form.missingRequired'));
    setError('');
    updateCandidate.mutate({ id: candidate.id, body: { name, industryLabels, occupation, japaneseLevel, email: email || null, phone: phone.trim() ? normalizePhoneInput(phone) : null, passportNumber: passportNumber.trim() || null, address: address.trim() || null, source: source.trim() || candidateSourceOptions[0].value, readinessStatus, contactabilityStatus, version: candidate.version } }, { onSuccess: onSaved, onError: (mutationError) => setError(localizedError(t, mutationError, t('common.errors.loadFailed'))) });
  };

  return <Modal open={open} onClose={onClose} title={t('candidates.form.editTitle')} size="lg" footer={<><Button onClick={onClose}>{t('candidates.form.cancel')}</Button><Button variant="primary" onClick={submit} disabled={updateCandidate.isPending}>{updateCandidate.isPending ? t('candidates.form.saving') : t('candidates.form.saveChanges')}</Button></>}>
    <div className="space-y-5">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('candidates.form.name')}<input aria-label={t('candidates.form.name')} name="candidate-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.industry')}<select aria-label={t('candidates.form.industry')} name="candidate-industry" multiple value={industryLabels} onChange={(event) => setIndustryLabels(Array.from(event.target.selectedOptions, (option) => option.value))} className={`${inputClass} min-h-24`}>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select><span className="mt-1 block text-xs font-normal text-text-muted">{t('candidates.form.industryHint')}</span></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.occupation')}<input aria-label={t('candidates.form.occupation')} name="candidate-occupation" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.japanese')}<select aria-label={t('candidates.form.japanese')} name="candidate-japanese" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}>{candidateJapaneseLevelOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.source')}<input aria-label={t('candidates.form.sourceAria')} name="candidate-source" value={source} onChange={(event) => setSource(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.email')}<input aria-label={t('candidates.form.email')} name="candidate-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.phone')}<input aria-label={t('candidates.form.phone')} name="candidate-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.passportNumber')}<input aria-label={t('candidates.form.passportNumberAria')} name="candidate-passport" value={passportNumber} onChange={(event) => setPassportNumber(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.address')}<input aria-label={t('candidates.form.addressAria')} name="candidate-address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.readiness')}<select aria-label={t('candidates.form.readinessAria')} name="candidate-readiness" value={readinessStatus} onChange={(event) => setReadinessStatus(event.target.value as typeof readinessStatus)} className={inputClass}><option value="POTENTIAL">{t('candidates.form.readinessPotential')}</option><option value="QUALIFIED">{t('candidates.form.readinessQualified')}</option><option value="READY">{t('candidates.form.readinessReady')}</option><option value="PAUSED">{t('candidates.form.readinessPaused')}</option><option value="NOT_SUITABLE">{t('candidates.form.readinessNotSuitable')}</option></select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.contactability')}<select aria-label={t('candidates.form.contactabilityAria')} name="candidate-contactability" value={contactabilityStatus} onChange={(event) => setContactabilityStatus(event.target.value as typeof contactabilityStatus)} className={inputClass}><option value="CONTACTABLE">{t('candidates.form.contactable')}</option><option value="TEMPORARILY_UNREACHABLE">{t('candidates.form.temporarilyUnreachable')}</option><option value="DO_NOT_CONTACT">{t('candidates.form.doNotContact')}</option></select></label>
      </div>
    </div>
  </Modal>;
}
