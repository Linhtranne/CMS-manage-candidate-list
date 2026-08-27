'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import { candidateIndustryOptions, catalogValue } from '@/i18n/catalog-options';
import { localizedError } from '@/i18n/errors';
import type { JobOrder } from '../services/order-types';
import { useUpdateOrder } from '../services/order-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

export function OrderEditModal({ order, open, onClose, onSaved }: { order: JobOrder; open: boolean; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n();
  const mutation = useUpdateOrder();
  const [position, setPosition] = useState(order.position);
  const [industryLabel, setIndustryLabel] = useState(order.industryLabel);
  const [occupation, setOccupation] = useState(order.occupation);
  const [location, setLocation] = useState(order.location);
  const [target, setTarget] = useState(String(order.target));
  const [deadline, setDeadline] = useState(order.deadline.slice(0, 10));
  const [salary, setSalary] = useState(order.salary ?? '');
  const [contractType, setContractType] = useState(order.contractType ?? '');
  const [japaneseLevel, setJapaneseLevel] = useState(order.japaneseLevel ?? 'N4');
  const [criteria, setCriteria] = useState((order.criteria ?? []).join('\n'));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPosition(order.position); setIndustryLabel(order.industryLabel); setOccupation(order.occupation); setLocation(order.location); setTarget(String(order.target)); setDeadline(order.deadline.slice(0, 10)); setSalary(order.salary ?? ''); setContractType(order.contractType ?? ''); setJapaneseLevel(order.japaneseLevel ?? 'N4'); setCriteria((order.criteria ?? []).join('\n')); setError('');
  }, [open, order.id, order.version]);

  const submit = () => {
    const numericTarget = Number(target);
    const deadlineIso = new Date(`${deadline}T00:00:00.000Z`).toISOString();
    if (!position.trim() || !industryLabel || !occupation.trim() || !location.trim() || !Number.isInteger(numericTarget) || numericTarget < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(deadline) || Number.isNaN(new Date(deadlineIso).getTime()) || !order.occupationCatalogVersionId) {
      setError(t('orders.form.required')); return;
    }
    setError('');
    mutation.mutate({ orderId: order.id, body: { position: position.trim(), industryLabel: catalogValue(t, industryLabel), occupation: occupation.trim(), location: location.trim(), target: numericTarget, deadline: deadlineIso, occupationCatalogVersionId: order.occupationCatalogVersionId, salary: salary.trim(), contractType: contractType.trim(), japaneseLevel, criteria: criteria.split('\n').map((value) => value.trim()).filter(Boolean), version: order.version } }, { onSuccess: onSaved, onError: (cause) => setError(localizedError(t, cause, t('common.errors.loadFailed'))) });
  };

  return <Modal open={open} onClose={onClose} title={t('orders.profile.editTitle')} size="lg" footer={<><Button onClick={onClose}>{t('common.actions.cancel')}</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? t('orders.form.saving') : t('common.actions.save')}</Button></>}>
    <div className="space-y-5">{error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}<div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-semibold text-text sm:col-span-2">{t('orders.form.name')}<input aria-label={t('orders.form.nameAria')} name="order-position-edit" value={position} onChange={(event) => setPosition(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.industry')}<select aria-label={t('orders.form.industryAria')} name="order-industry-edit" value={industryLabel} onChange={(event) => setIndustryLabel(event.target.value)} className={inputClass}>{candidateIndustryOptions.map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.occupation')}<input aria-label={t('orders.form.occupationAria')} name="order-occupation-edit" value={occupation} onChange={(event) => setOccupation(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.location')}<input aria-label={t('orders.form.locationAria')} name="order-location-edit" value={location} onChange={(event) => setLocation(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.target')}<input aria-label={t('orders.form.targetAria')} name="order-target-edit" type="number" min="1" value={target} onChange={(event) => setTarget(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.deadline')}<input aria-label={t('orders.form.deadlineAria')} name="order-deadline-edit" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.salary')}<input aria-label={t('orders.form.salaryAria')} name="order-salary-edit" value={salary} onChange={(event) => setSalary(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.contract')}<input aria-label={t('orders.form.contractAria')} name="order-contract-edit" value={contractType} onChange={(event) => setContractType(event.target.value)} className={inputClass} /></label>
      <label className="text-sm font-semibold text-text">{t('orders.form.japanese')}<select aria-label={t('orders.form.japaneseAria')} name="order-japanese-edit" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className={inputClass}>{(['N5', 'N4', 'N3', 'N2', 'N1'] as const).map((level) => <option key={level} value={level}>{level}</option>)}<option value="UNSPECIFIED">{t('orders.form.undefined')}</option></select></label>
      <label className="text-sm font-semibold text-text sm:col-span-2">{t('orders.form.criteria')}<textarea aria-label={t('orders.form.criteriaAria')} name="order-criteria-edit" value={criteria} onChange={(event) => setCriteria(event.target.value)} className={`${inputClass} min-h-24 py-2`} placeholder={t('orders.profile.criteriaPlaceholder')} /></label>
    </div></div>
  </Modal>;
}
