'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { useAddCandidatesToOrder, useClientsForOrder } from '../services/order-queries';
import { addCandidatesSchema } from '../schemas/add-candidates.schema';
import { CreateCandidateModal } from '@/features/candidates/components/create-candidate-modal';
import { useI18n } from '@/i18n/use-i18n';
import { translateValidationIssue } from '@/i18n/validation';
import { candidateIndustryOptions, catalogLabel, occupationLabel } from '@/i18n/catalog-options';
import { getDomainLabel } from '@/i18n/domain-labels';
import { localizedError } from '@/i18n/errors';

export function AddCandidatesDialog({ orderId, open, onClose, initialCandidateId }: { orderId: string; open: boolean; onClose: () => void; initialCandidateId?: string }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [occupation, setOccupation] = useState('');
  const [skill, setSkill] = useState('');
  const [japaneseLevel, setJapaneseLevel] = useState('');
  const [readiness, setReadiness] = useState('');
  const [hasActiveJourney, setHasActiveJourney] = useState('');
  const [createCandidateOpen, setCreateCandidateOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(initialCandidateId ? [initialCandidateId] : []);
  const [error, setError] = useState('');
  const matches = useClientsForOrder({ orderId, query, industry: industry || undefined, occupation: occupation || undefined, skill: skill || undefined, japaneseLevel: japaneseLevel || undefined, readiness: readiness || undefined, hasActiveJourney: hasActiveJourney || undefined });
  const mutation = useAddCandidatesToOrder();
  const closeDialog = () => { setCreateCandidateOpen(false); onClose(); };

  useEffect(() => {
    if (!open) return;
    setQuery(''); setIndustry(''); setOccupation(''); setSkill(''); setJapaneseLevel(''); setReadiness(''); setHasActiveJourney(''); setCreateCandidateOpen(false); setSelected(initialCandidateId ? [initialCandidateId] : []); setError('');
  }, [initialCandidateId, open]);

  const toggleCandidate = (candidateId: string) => {
    setSelected((current) => current.includes(candidateId) ? current.filter((id) => id !== candidateId) : [...current, candidateId]);
  };

  const submit = () => {
    const parsed = addCandidatesSchema.safeParse({ candidateIds: selected, source: 'MANUAL_MATCH' });
    if (!parsed.success) { setError(translateValidationIssue(t, parsed.error.issues[0], 'orders.addCandidates.validation')); return; }
    setError('');
    mutation.mutate({ orderId, body: parsed.data }, { onSuccess: closeDialog, onError: (cause) => setError(localizedError(t, cause, t('orders.addCandidates.validation'))) });
  };

  return <Modal open={open} onClose={closeDialog} confirmOnClose={Boolean(query || industry || occupation || skill || japaneseLevel || readiness || hasActiveJourney || selected.some((candidateId) => candidateId !== initialCandidateId))} title={t('orders.addCandidates.title')} description={t('orders.addCandidates.description')} size="lg" footer={<><Button variant="secondary" onClick={closeDialog}>{t('orders.addCandidates.cancel')}</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{t('orders.addCandidates.add')}</Button></>}>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="block text-sm font-semibold lg:col-span-2">{t('orders.addCandidates.search')}<input aria-label={t('orders.addCandidates.searchAria')} name="candidate-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('orders.addCandidates.searchPlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold">{t('orders.addCandidates.industry')}<select aria-label={t('orders.addCandidates.industryAria')} name="candidate-industry" value={industry} onChange={(event) => setIndustry(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('orders.addCandidates.allIndustries')}</option>{candidateIndustryOptions.filter(({ value }) => ['Công nghệ thông tin', 'Điều dưỡng', 'Cơ khí chế tạo'].includes(value)).map(({ value, key }) => <option key={value} value={value}>{t(key)}</option>)}</select></label><label className="block text-sm font-semibold">{t('orders.addCandidates.japanese')}<select aria-label={t('orders.addCandidates.japaneseAria')} name="candidate-japanese" value={japaneseLevel} onChange={(event) => setJapaneseLevel(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('orders.addCandidates.all')}</option>{(['N2', 'N3', 'N4'] as const).map((level) => <option key={level} value={level}>{level}</option>)}</select></label><label className="block text-sm font-semibold">{t('orders.addCandidates.occupation')}<input aria-label={t('orders.addCandidates.occupationAria')} name="candidate-occupation" value={occupation} onChange={(event) => setOccupation(event.target.value)} placeholder={t('orders.addCandidates.occupationPlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold">{t('orders.addCandidates.skill')}<input aria-label={t('orders.addCandidates.skillAria')} name="candidate-skill" value={skill} onChange={(event) => setSkill(event.target.value)} placeholder={t('orders.addCandidates.skillPlaceholder')} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold">{t('orders.addCandidates.readiness')}<select aria-label={t('orders.addCandidates.readinessAria')} name="candidate-readiness" value={readiness} onChange={(event) => setReadiness(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('orders.addCandidates.all')}</option><option value="Sẵn sàng phỏng vấn">{t('orders.addCandidates.readyInterview')}</option><option value="Đủ hồ sơ">{t('orders.addCandidates.completeProfile')}</option></select></label><label className="block text-sm font-semibold">{t('orders.addCandidates.journey')}<select aria-label={t('orders.addCandidates.journeyAria')} name="candidate-journey" value={hasActiveJourney} onChange={(event) => setHasActiveJourney(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">{t('orders.addCandidates.all')}</option><option value="false">{t('orders.addCandidates.noJourney')}</option><option value="true">{t('orders.addCandidates.activeJourney')}</option></select></label></div>
      {matches.isPending ? <div className="mt-4"><LoadingState /></div> : <div className="mt-4 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[660px] text-left text-sm"><thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-text-muted"><tr><th className="px-3 py-3">{t('orders.addCandidates.select')}</th><th className="px-3 py-3">{t('orders.addCandidates.candidate')}</th><th className="px-3 py-3">{t('orders.addCandidates.industryOccupation')}</th><th className="px-3 py-3">{t('orders.addCandidates.japaneseLevel')}</th><th className="px-3 py-3">{t('orders.addCandidates.readiness')}</th><th className="px-3 py-3">{t('orders.addCandidates.note')}</th></tr></thead><tbody>{(matches.data?.items ?? []).map((candidate) => {
        const disabled = candidate.hasActiveApplicationInOrder;
        const isSelected = selected.includes(candidate.id);
        const selectFromRow = () => { if (!disabled) toggleCandidate(candidate.id); };
        const readinessLabel = getDomainLabel(t, 'candidateReadiness', candidate.readiness);
        return <tr key={candidate.id} aria-selected={isSelected} tabIndex={disabled ? undefined : 0} onClick={selectFromRow} onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) { event.preventDefault(); selectFromRow(); } }} className={`border-b border-border last:border-0 ${disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-surface'}`}><td className="px-3 py-3"><input type="checkbox" aria-label={t('orders.addCandidates.chooseCandidate', { name: candidate.name })} name={`candidate-selection-${candidate.id}`} checked={isSelected} disabled={disabled} onClick={(event) => event.stopPropagation()} onChange={() => toggleCandidate(candidate.id)} /></td><td className="px-3 py-3 font-semibold">{candidate.code} · {candidate.name}</td><td className="px-3 py-3">{catalogLabel(t, candidate.industryLabel)}<br /><span className="text-xs text-text-muted">{occupationLabel(t, candidate.occupation)}</span></td><td className="px-3 py-3">{catalogLabel(t, candidate.japaneseLevel)}</td><td className="px-3 py-3">{readinessLabel}</td><td className="px-3 py-3">{disabled ? <StatusLabel tone="neutral">{t('orders.addCandidates.inOrder')}</StatusLabel> : candidate.hasActiveJourney ? <StatusLabel tone="warning">{t('orders.addCandidates.supplying')}</StatusLabel> : <StatusLabel tone="success">{t('orders.addCandidates.selectable')}</StatusLabel>}</td></tr>;
      })}</tbody></table></div>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-text-muted">{t('orders.addCandidates.notFound')}</p><Button variant="secondary" size="sm" onClick={() => setCreateCandidateOpen(true)}>{t('orders.addCandidates.createCandidate')}</Button></div>{error ? <p role="alert" className="mt-3 text-sm font-semibold text-danger">{error}</p> : null}
      <CreateCandidateModal open={createCandidateOpen} onClose={() => setCreateCandidateOpen(false)} onCreated={(candidate) => { setSelected((current) => current.includes(candidate.id) ? current : [...current, candidate.id]); setCreateCandidateOpen(false); }} />
    </Modal>;
}
