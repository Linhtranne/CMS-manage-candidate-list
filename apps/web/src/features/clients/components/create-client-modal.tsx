'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, catalogValue } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import { useCreateClient } from '../services/client-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';
const errorId = 'create-client-error';

export function CreateClientModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const mutation = useCreateClient();
  const nameRef = useRef<HTMLInputElement>(null);
  const industryRef = useRef<HTMLSelectElement>(null);
  const regionRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('Doanh nghiệp tiếp nhận');
  const [industry, setIndustry] = useState('');
  const [region, setRegion] = useState('');
  const [contactName, setContactName] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'name' | 'industry' | 'region' | null>(null);
  const [savedCode, setSavedCode] = useState('');

  useEffect(() => {
    if (open) return;
    setName(''); setOrganizationType('Doanh nghiệp tiếp nhận'); setIndustry(''); setRegion(''); setContactName(''); setNotes(''); setError(''); setErrorField(null); setSavedCode('');
  }, [open]);

  const submit = () => {
    if (!name.trim()) {
      setError(t('clients.form.requiredName')); setErrorField('name');
      return requestAnimationFrame(() => nameRef.current?.focus());
    }
    if (!industry) {
      setError(t('clients.form.requiredIndustry')); setErrorField('industry');
      return requestAnimationFrame(() => industryRef.current?.focus());
    }
    if (!region.trim()) {
      setError(t('clients.form.requiredRegion')); setErrorField('region');
      return requestAnimationFrame(() => regionRef.current?.focus());
    }
    setError('');
    setErrorField(null);
    mutation.mutate({ name: name.trim(), organizationType, industryLabels: [catalogValue(t, industry)], region: region.trim(), ownerId: 'u-recruiter', contactName: contactName.trim() || null, notes: notes.trim() || null }, {
      onSuccess: (client) => setSavedCode(client.code),
      onError: (cause) => setError(localizedError(t, cause, t('common.errors.loadFailed')))
    });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!savedCode && Boolean(name.trim() || industry || region.trim() || contactName.trim() || notes.trim())} title={t('clients.form.createTitle')} description={t('clients.form.createDescription')} size="lg" footer={savedCode ? <Button variant="primary" onClick={onClose}>{t('clients.form.close')}</Button> : <><Button onClick={onClose}>{t('clients.form.cancel')}</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? t('clients.form.saving') : t('clients.form.save')}</Button></>}>
    {savedCode ? <p role="status" className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{t('clients.form.created', { code: savedCode })}</p> : <div className="space-y-5">
      {error ? <p id={errorId} role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('clients.form.name')}<input ref={nameRef} aria-label={t('clients.form.nameAria')} aria-invalid={errorField === 'name'} aria-describedby={errorField === 'name' ? errorId : undefined} name="client-name" value={name} onChange={(event) => { setName(event.target.value); setErrorField(null); }} className={inputClass} autoComplete="organization" /></label>
        <label className="text-sm font-semibold text-text">{t('clients.form.organizationType')}<select aria-label={t('clients.form.organizationTypeAria')} name="organization-type" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className={inputClass}><option value="Doanh nghiệp tiếp nhận">{t('clients.form.receiver')}</option><option value="Nghiệp đoàn / tổ chức giám sát">{t('clients.form.supervisor')}</option><option value="Đối tác tuyển dụng">{t('clients.form.recruiter')}</option><option value="Đơn vị đào tạo">{t('clients.form.training')}</option></select></label>
        <label className="text-sm font-semibold text-text">{t('clients.form.industry')}<select ref={industryRef} aria-label={t('clients.form.industryAria')} aria-invalid={errorField === 'industry'} aria-describedby={errorField === 'industry' ? errorId : undefined} name="client-industry" value={industry} onChange={(event) => { setIndustry(event.target.value); setErrorField(null); }} className={inputClass}><option value="">{t('clients.form.chooseIndustry')}</option>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('clients.form.region')}<input ref={regionRef} aria-label={t('clients.form.regionAria')} aria-invalid={errorField === 'region'} aria-describedby={errorField === 'region' ? errorId : undefined} name="client-region" value={region} onChange={(event) => { setRegion(event.target.value); setErrorField(null); }} className={inputClass} placeholder={t('clients.form.regionPlaceholder')} autoComplete="off" /></label>
        <label className="text-sm font-semibold text-text">{t('clients.form.contact')}<input aria-label={t('clients.form.contactAria')} name="client-contact" value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('clients.form.notes')}<textarea aria-label={t('clients.form.notesAria')} name="client-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24 py-2`} /></label>
      </div>
    </div>}
  </Modal>;
}
