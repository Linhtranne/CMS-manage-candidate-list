'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, catalogValue, organizationTypeValue } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import type { Client } from '../services/client-types';
import { useUpdateClient } from '../services/client-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function ClientEditModal({ client, open, onClose, onSaved }: { client: Client; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const mutation = useUpdateClient();
  const [name, setName] = useState(client.name);
  const [organizationType, setOrganizationType] = useState(organizationTypeValue(t, client.organizationType));
  const [industry, setIndustry] = useState(catalogValue(t, client.industryLabels[0]));
  const [region, setRegion] = useState(client.region);
  const [contactName, setContactName] = useState(client.contactName ?? '');
  const [notes, setNotes] = useState(client.notes ?? '');
  const [status, setStatus] = useState<Client['status']>(client.status);
  const [error, setError] = useState('');

  const submit = () => {
    if (!name.trim() || !industry || !region.trim()) { setError(t('clients.form.requiredAll')); return; }
    setError('');
    mutation.mutate({ id: client.id, body: { name: name.trim(), organizationType: organizationTypeValue(t, organizationType), industryLabels: [catalogValue(t, industry)], region: region.trim(), ownerId: client.owner.id, contactName: contactName.trim() || null, notes: notes.trim() || null, status, version: client.version } }, { onSuccess: onSaved, onError: (cause) => setError(localizedError(t, cause, t('common.errors.loadFailed'))) });
  };

  return <Modal open={open} onClose={onClose} title={t('clients.form.editTitle')} description={t('clients.form.editDescription')} size="lg" footer={<><Button onClick={onClose}>{t('clients.form.cancel')}</Button><Button variant="primary" disabled={mutation.isPending} onClick={submit}>{mutation.isPending ? t('clients.form.saving') : t('clients.form.saveChanges')}</Button></>}>
    <div className="space-y-5">{error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}<div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-text sm:col-span-2">{t('clients.form.name')}<input aria-label={t('clients.form.nameAria')} name="client-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-text">{t('clients.form.organizationType')}<select aria-label={t('clients.form.organizationTypeAria')} name="organization-type" value={organizationType} onChange={(event) => setOrganizationType(event.target.value)} className={inputClass}><option value="Doanh nghiệp tiếp nhận">{t('clients.form.receiver')}</option><option value="Nghiệp đoàn / tổ chức giám sát">{t('clients.form.supervisor')}</option><option value="Đối tác tuyển dụng">{t('clients.form.recruiter')}</option><option value="Đơn vị đào tạo">{t('clients.form.training')}</option></select></label><label className="text-sm font-semibold text-text">{t('clients.form.industry')}<select aria-label={t('clients.form.industryAria')} name="client-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className={inputClass}>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label><label className="text-sm font-semibold text-text">{t('clients.form.region')}<input aria-label={t('clients.form.regionAria')} name="client-region" value={region} onChange={(event) => setRegion(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-text">{t('clients.form.status')}<select aria-label={t('clients.form.statusAria')} name="client-status" value={status} onChange={(event) => setStatus(event.target.value as Client['status'])} className={inputClass}><option value="PROSPECT">{t('clients.form.prospect')}</option><option value="ACTIVE">{t('clients.form.active')}</option><option value="PAUSED">{t('clients.form.paused')}</option><option value="INACTIVE">{t('clients.form.inactive')}</option></select></label><label className="text-sm font-semibold text-text">{t('clients.form.contact')}<input aria-label={t('clients.form.contactAria')} name="client-contact" value={contactName} onChange={(event) => setContactName(event.target.value)} className={inputClass} /></label><label className="text-sm font-semibold text-text sm:col-span-2">{t('clients.form.notes')}<textarea aria-label={t('clients.form.notesAria')} name="client-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className={`${inputClass} min-h-24 py-2`} /></label></div></div>
  </Modal>;
}
