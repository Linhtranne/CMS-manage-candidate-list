'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { useClients } from '@/features/clients/services/client-queries';
import { useCreateOrder } from '../services/order-queries';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, catalogValue } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function CreateOrderModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const positionRef = useRef<HTMLInputElement>(null);
  const clients = useClients();
  const mutation = useCreateOrder();
  const [position, setPosition] = useState('');
  const [clientId, setClientId] = useState('');
  const [industryLabel, setIndustryLabel] = useState('');
  const [occupation, setOccupation] = useState('');
  const [location, setLocation] = useState('');
  const [target, setTarget] = useState('1');
  const [deadline, setDeadline] = useState('');
  const [salary, setSalary] = useState('');
  const [contractType, setContractType] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('N4');
  const [criteria, setCriteria] = useState('');
  const [error, setError] = useState('');
  const [savedCode, setSavedCode] = useState('');

  useEffect(() => {
    if (open) return;
    setPosition(''); setClientId(''); setIndustryLabel(''); setOccupation(''); setLocation(''); setTarget('1'); setDeadline(''); setSalary(''); setContractType(''); setJapaneseLevel('N4'); setCriteria(''); setError(''); setSavedCode('');
  }, [open]);

  const submit = () => {
    const targetValue = Number(target);
    if (!position.trim() || !clientId || !industryLabel || !occupation.trim() || !location.trim() || !deadline || !Number.isInteger(targetValue) || targetValue < 1) {
      setError(t('orders.form.required'));
      requestAnimationFrame(() => positionRef.current?.focus());
      return;
    }
    setError('');
    mutation.mutate({ position: position.trim(), clientId, industryLabel: catalogValue(t, industryLabel), occupation: occupation.trim(), location: location.trim(), target: targetValue, deadline: new Date(`${deadline}T00:00:00.000Z`).toISOString(), ownerId: 'u-recruiter', salary: salary.trim(), contractType: contractType.trim(), japaneseLevel, criteria: criteria.split(',').map((value) => value.trim()).filter(Boolean) }, {
      onSuccess: (order) => setSavedCode(order.code),
      onError: (cause) => setError(localizedError(t, cause, t('common.errors.loadFailed')))
    });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!savedCode && Boolean(position.trim() || clientId || industryLabel || occupation.trim() || location.trim() || deadline || salary.trim() || contractType.trim() || criteria.trim())} title={t('orders.form.createTitle')} description={t('orders.form.createDescription')} size="lg" footer={savedCode ? <Button variant="primary" onClick={onClose}>{t('orders.form.close')}</Button> : <><Button onClick={onClose}>{t('orders.form.cancel')}</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? t('orders.form.saving') : t('orders.form.save')}</Button></>}>
    {savedCode ? <p role="status" className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">{t('orders.form.created', { code: savedCode })}</p> : clients.isPending ? <LoadingState label={t('orders.form.loadingClients')} /> : <div className="space-y-5">
      {error ? <p id="create-order-error" role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('orders.form.name')}<input ref={positionRef} aria-label={t('orders.form.nameAria')} aria-invalid={Boolean(error && !position.trim())} aria-describedby={error && !position.trim() ? 'create-order-error' : undefined} name="order-position" autoComplete="off" value={position} onChange={(event) => { setPosition(event.target.value); setError(''); }} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.client')}<select aria-label={t('orders.form.clientAria')} name="order-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}><option value="">{t('orders.form.chooseClient')}</option>{clients.data?.items.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.industry')}<select aria-label={t('orders.form.industryAria')} name="order-industry" value={industryLabel} onChange={(event) => setIndustryLabel(event.target.value)} className={inputClass}><option value="">{t('orders.form.chooseIndustry')}</option>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.occupation')}<input aria-label={t('orders.form.occupationAria')} name="order-occupation" autoComplete="off" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.location')}<input aria-label={t('orders.form.locationAria')} name="order-location" autoComplete="off" value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.target')}<input aria-label={t('orders.form.targetAria')} name="order-target" type="number" min="1" value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.deadline')}<input aria-label={t('orders.form.deadlineAria')} name="order-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.salary')}<input aria-label={t('orders.form.salaryAria')} name="order-salary" autoComplete="off" value={salary} onChange={(event) => setSalary(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.contract')}<input aria-label={t('orders.form.contractAria')} name="order-contract-type" autoComplete="off" value={contractType} onChange={(event) => setContractType(event.target.value)} className={inputClass} /></label>
        <label className="text-sm font-semibold text-text">{t('orders.form.japanese')}<select aria-label={t('orders.form.japaneseAria')} name="order-japanese-level" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}>{(['N5', 'N4', 'N3', 'N2', 'N1'] as const).map((level) => <option key={level} value={level}>{level}</option>)}<option value="UNSPECIFIED">{t('orders.form.undefined')}</option></select></label>
        <label className="text-sm font-semibold text-text sm:col-span-2">{t('orders.form.criteria')}<textarea aria-label={t('orders.form.criteriaAria')} name="order-criteria" value={criteria} onChange={(event) => setCriteria(event.target.value)} placeholder={t('orders.form.criteriaPlaceholder')} className={`${inputClass} min-h-20 py-2`} /></label>
      </div>
    </div>}
  </Modal>;
}
