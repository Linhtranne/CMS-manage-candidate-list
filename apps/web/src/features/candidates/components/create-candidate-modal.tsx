'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, candidateJapaneseLevelOptions, candidateSourceOptions } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import { useCreateCandidate, type Candidate } from '../services/candidate-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';
const errorId = 'create-candidate-error';

function normalizePhoneInput(value: string): string {
  const normalized = value.trim().replace(/[\s().-]/g, '');
  if (normalized.startsWith('0')) return `+84${normalized.slice(1)}`;
  if (normalized.startsWith('84')) return `+${normalized}`;
  return normalized;
}

export function CreateCandidateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: (candidate: Candidate) => void }) {
  const { t } = useI18n();
  const createCandidate = useCreateCandidate();
  const nameRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLSelectElement>(null);
  const occupationRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [occupation, setOccupation] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('N4');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [address, setAddress] = useState('');
  const [readinessStatus, setReadinessStatus] = useState<'POTENTIAL' | 'QUALIFIED' | 'READY' | 'PAUSED' | 'NOT_SUITABLE'>('POTENTIAL');
  const [contactabilityStatus, setContactabilityStatus] = useState<'CONTACTABLE' | 'TEMPORARILY_UNREACHABLE' | 'DO_NOT_CONTACT'>('CONTACTABLE');
  const [source, setSource] = useState<string>(candidateSourceOptions[0].value);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'name' | 'industry' | 'occupation' | null>(null);
  const [saved, setSaved] = useState<Candidate | null>(null);

  useEffect(() => {
    if (open) return;
    setName(''); setIndustry(''); setOccupation(''); setJapaneseLevel('N4'); setEmail(''); setPhone(''); setPassportNumber(''); setAddress(''); setReadinessStatus('POTENTIAL'); setContactabilityStatus('CONTACTABLE');
    setSource(candidateSourceOptions[0].value); setError(''); setErrorField(null); setSaved(null);
  }, [open]);

  const submit = () => {
    if (!name.trim()) { setError(t('candidates.form.missingName')); setErrorField('name'); return requestAnimationFrame(() => nameRef.current?.focus()); }
    if (!industry) { setError(t('candidates.form.missingIndustry')); setErrorField('industry'); return requestAnimationFrame(() => industryRef.current?.focus()); }
    if (!occupation.trim()) { setError(t('candidates.form.missingOccupation')); setErrorField('occupation'); return requestAnimationFrame(() => occupationRef.current?.focus()); }
    setError(''); setErrorField(null);
    createCandidate.mutate({ name, industryLabels: [industry], occupation, japaneseLevel, email: email || null, phone: phone.trim() ? normalizePhoneInput(phone) : null, passportNumber: passportNumber.trim() || null, address: address.trim() || null, readinessStatus, contactabilityStatus, source, version: 0 }, {
      onSuccess: (candidate) => { setSaved(candidate); onCreated?.(candidate); },
      onError: (mutationError) => setError(localizedError(t, mutationError, t('common.errors.loadFailed')))
    });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!saved && Boolean(name.trim() || industry || occupation.trim() || email.trim() || phone.trim() || passportNumber.trim() || address.trim())} title={t('candidates.form.createTitle')} size="lg" footer={saved ? <Button variant="primary" onClick={onClose}>{t('candidates.form.close')}</Button> : <><Button onClick={onClose}>{t('candidates.form.cancel')}</Button><Button variant="primary" onClick={submit} disabled={createCandidate.isPending}>{createCandidate.isPending ? t('candidates.form.saving') : t('candidates.form.save')}</Button></>}>
    {saved ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">{t('candidates.form.created', { code: saved.code })}</div> : <div className="space-y-5">
      {error ? <p id={errorId} role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('candidates.form.name')}<input ref={nameRef} aria-label={t('candidates.form.nameAria')} aria-invalid={errorField === 'name'} aria-describedby={errorField === 'name' ? errorId : undefined} name="candidate-name" value={name} onChange={(event) => { setName(event.target.value); setErrorField(null); }} className={inputClass} autoComplete="name" /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.industry')}<select ref={industryRef} aria-label={t('candidates.form.industryAria')} aria-invalid={errorField === 'industry'} aria-describedby={errorField === 'industry' ? errorId : undefined} name="candidate-industry" value={industry} onChange={(event) => { setIndustry(event.target.value); setErrorField(null); }} className={inputClass}><option value="">{t('candidates.form.chooseIndustry')}</option>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.occupation')}<input ref={occupationRef} aria-label={t('candidates.form.occupationAria')} aria-invalid={errorField === 'occupation'} aria-describedby={errorField === 'occupation' ? errorId : undefined} name="candidate-occupation" value={occupation} onChange={(event) => { setOccupation(event.target.value); setErrorField(null); }} className={inputClass} autoComplete="off" /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.japanese')}<select aria-label={t('candidates.form.japaneseAria')} name="candidate-japanese" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}>{candidateJapaneseLevelOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.source')}<select aria-label={t('candidates.form.sourceAria')} name="candidate-source" value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}>{candidateSourceOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.email')}<input aria-label={t('candidates.form.email')} name="candidate-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.phone')}<input aria-label={t('candidates.form.phone')} name="candidate-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className={inputClass} inputMode="tel" /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.passportNumber')}<input aria-label={t('candidates.form.passportNumberAria')} name="candidate-passport" value={passportNumber} onChange={(event) => setPassportNumber(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.address')}<input aria-label={t('candidates.form.addressAria')} name="candidate-address" value={address} onChange={(event) => setAddress(event.target.value)} className={inputClass} autoComplete="street-address" /></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.readiness')}<select aria-label={t('candidates.form.readinessAria')} name="candidate-readiness" value={readinessStatus} onChange={(event) => setReadinessStatus(event.target.value as typeof readinessStatus)} className={inputClass}><option value="POTENTIAL">{t('candidates.form.readinessPotential')}</option><option value="QUALIFIED">{t('candidates.form.readinessQualified')}</option><option value="READY">{t('candidates.form.readinessReady')}</option><option value="PAUSED">{t('candidates.form.readinessPaused')}</option><option value="NOT_SUITABLE">{t('candidates.form.readinessNotSuitable')}</option></select></label>
        <label className="text-sm font-semibold text-text">{t('candidates.form.contactability')}<select aria-label={t('candidates.form.contactabilityAria')} name="candidate-contactability" value={contactabilityStatus} onChange={(event) => setContactabilityStatus(event.target.value as typeof contactabilityStatus)} className={inputClass}><option value="CONTACTABLE">{t('candidates.form.contactable')}</option><option value="TEMPORARILY_UNREACHABLE">{t('candidates.form.temporarilyUnreachable')}</option><option value="DO_NOT_CONTACT">{t('candidates.form.doNotContact')}</option></select></label>
      </div>
    </div>}
  </Modal>;
}
