'use client';

import { useEffect, useMemo, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';
import { localizedError } from '@/i18n/errors';
import { getDomainLabel } from '@/i18n/domain-labels';
import { useUpdateAdminRole } from '../services/admin-queries';

type AdminRole = components['schemas']['AdminRole'];
type PermissionRule = components['schemas']['AdminPermissionRule'];
type Scope = PermissionRule['scope'];
type Sensitivity = PermissionRule['sensitivities'][number];
type PermissionGroup = 'candidates' | 'clientsOrders' | 'applications' | 'journeys' | 'documents' | 'mailbox' | 'reports' | 'config';
type PermissionDefinition = { action: string; group: PermissionGroup; labelKey: string; hintKey: string; defaultSensitivity: Sensitivity };

const permissionDefinitions: PermissionDefinition[] = [
  ['candidate.view', 'candidates', 'candidateView', 'candidateViewHint', 'NORMAL'],
  ['candidate.create_update_basic', 'candidates', 'candidateCreate', 'candidateCreateHint', 'NORMAL'],
  ['candidate.view_sensitive', 'candidates', 'candidateSensitive', 'candidateSensitiveHint', 'PERSONAL'],
  ['candidate.merge', 'candidates', 'candidateMerge', 'candidateMergeHint', 'PERSONAL'],
  ['job_order.view', 'clientsOrders', 'orderView', 'orderViewHint', 'NORMAL'],
  ['job_order.create_update', 'clientsOrders', 'orderCreate', 'orderCreateHint', 'NORMAL'],
  ['application.create_update', 'applications', 'applicationCreate', 'applicationCreateHint', 'NORMAL'],
  ['interview.schedule', 'applications', 'interviewSchedule', 'interviewScheduleHint', 'NORMAL'],
  ['interview.record_result', 'applications', 'interviewResult', 'interviewResultHint', 'PERSONAL'],
  ['supply_journey.view', 'journeys', 'journeyView', 'journeyViewHint', 'NORMAL'],
  ['supply_journey.update_milestone', 'journeys', 'journeyUpdate', 'journeyUpdateHint', 'NORMAL'],
  ['supply_journey.waive', 'journeys', 'journeyWaive', 'journeyWaiveHint', 'PERSONAL'],
  ['document.download_sensitive', 'documents', 'documentDownload', 'documentDownloadHint', 'HIGHLY_SENSITIVE'],
  ['email.read', 'mailbox', 'emailRead', 'emailReadHint', 'PERSONAL'],
  ['email.send', 'mailbox', 'emailSend', 'emailSendHint', 'PERSONAL'],
  ['email.manual_link', 'mailbox', 'emailLink', 'emailLinkHint', 'PERSONAL'],
  ['report.view', 'reports', 'reportView', 'reportViewHint', 'NORMAL'],
  ['report.export', 'reports', 'reportExport', 'reportExportHint', 'HIGHLY_SENSITIVE'],
  ['audit.view', 'reports', 'auditView', 'auditViewHint', 'NORMAL'],
  ['catalog.manage', 'config', 'catalogManage', 'catalogManageHint', 'NORMAL'],
  ['template.manage', 'config', 'templateManage', 'templateManageHint', 'NORMAL'],
  ['mailbox.configure', 'config', 'mailboxConfigure', 'mailboxConfigureHint', 'HIGHLY_SENSITIVE'],
  ['user.manage', 'config', 'userManage', 'userManageHint', 'NORMAL'],
  ['iam.configure', 'config', 'iamConfigure', 'iamConfigureHint', 'HIGHLY_SENSITIVE']
].map(([action, group, labelKey, hintKey, defaultSensitivity]) => ({ action, group: group as PermissionGroup, labelKey, hintKey, defaultSensitivity: defaultSensitivity as Sensitivity }));

const scopeOptions: Scope[] = ['SELF', 'TEAM', 'DEPARTMENT', 'ALL'];
const sensitivityOptions: Sensitivity[] = ['NORMAL', 'PERSONAL', 'HIGHLY_SENSITIVE'];
const groupOrder: PermissionGroup[] = ['candidates', 'clientsOrders', 'applications', 'journeys', 'documents', 'mailbox', 'reports', 'config'];

function cloneRole(role: AdminRole): AdminRole {
  return { ...role, actions: [...role.actions], scopes: [...role.scopes], sensitivities: [...role.sensitivities], permissionRules: role.permissionRules.map((rule) => ({ ...rule, sensitivities: [...rule.sensitivities] })) };
}

export function RolePermissionMatrix({ role }: { role: AdminRole }) {
  const { t, locale } = useI18n();
  const mutation = useUpdateAdminRole();
  const [draft, setDraft] = useState(() => cloneRole(role));
  const [baseRules, setBaseRules] = useState(() => JSON.stringify(role.permissionRules));
  const [saved, setSaved] = useState(false);
  const isDirty = JSON.stringify(draft.permissionRules) !== baseRules;
  const groupedDefinitions = useMemo(() => groupOrder.map((group) => ({ group, items: permissionDefinitions.filter((item) => item.group === group) })), []);
  const contentAccess = draft.permissionRules.some((rule) => ['candidate.view', 'candidate.view_sensitive', 'email.read', 'email.send', 'document.download_sensitive'].includes(rule.action));
  const approvals = draft.permissionRules.filter((rule) => rule.approvalRequired).length;

  useEffect(() => {
    const next = cloneRole(role);
    setDraft(next);
    setBaseRules(JSON.stringify(next.permissionRules));
    setSaved(false);
  }, [role]);

  const toggleAction = (definition: PermissionDefinition) => {
    setSaved(false);
    setDraft((current) => {
      const existing = current.permissionRules.find((rule) => rule.action === definition.action);
      if (existing) return { ...current, permissionRules: current.permissionRules.filter((rule) => rule.action !== definition.action) };
      const scope = role.scopes[0] ?? 'TEAM';
      return { ...current, permissionRules: [...current.permissionRules, { action: definition.action, scope, sensitivities: [definition.defaultSensitivity], approvalRequired: definition.defaultSensitivity === 'HIGHLY_SENSITIVE', reasonRequired: definition.defaultSensitivity === 'HIGHLY_SENSITIVE' }] };
    });
  };

  const updateRule = (action: string, patch: Partial<PermissionRule>) => {
    setSaved(false);
    setDraft((current) => ({ ...current, permissionRules: current.permissionRules.map((rule) => rule.action === action ? { ...rule, ...patch } : rule) }));
  };

  const save = async () => {
    const actions = draft.permissionRules.map((rule) => rule.action);
    const scopes = Array.from(new Set(draft.permissionRules.map((rule) => rule.scope))) as Scope[];
    const sensitivities = Array.from(new Set(draft.permissionRules.flatMap((rule) => rule.sensitivities))) as string[];
    const updated = await mutation.mutateAsync({ id: draft.id, body: { actions, scopes, sensitivities, permissionRules: draft.permissionRules, version: draft.version } });
    setDraft(cloneRole(updated));
    setBaseRules(JSON.stringify(updated.permissionRules));
    setSaved(true);
  };

  const scopeLabel: Record<Scope, string> = { SELF: t('admin.matrix.scopes.self'), TEAM: t('admin.matrix.scopes.team'), DEPARTMENT: t('admin.matrix.scopes.department'), ALL: t('admin.matrix.scopes.all') };
  const sensitivityLabel: Record<Sensitivity, string> = { NORMAL: t('admin.matrix.sensitivities.normal'), PERSONAL: t('admin.matrix.sensitivities.personal'), HIGHLY_SENSITIVE: t('admin.matrix.sensitivities.highlySensitive') };
  const key = (path: string) => t(path as Parameters<typeof t>[0]);
  const scopeAria = t('admin.matrix.scope').toLocaleLowerCase(locale);

  return <section className="rounded-lg border border-border bg-panel p-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h2 className="font-bold text-text">{t('admin.matrix.title', { role: getDomainLabel(t, 'adminRole', role.id) })}</h2><p className="mt-1 max-w-3xl text-sm text-text-muted">{t('admin.matrix.description')}</p></div>
      <div className="flex gap-2 text-xs text-text-muted"><span className="rounded-full bg-surface px-3 py-1">{t('admin.matrix.granted', { count: draft.permissionRules.length })}</span><span className="rounded-full bg-[#fff3dc] px-3 py-1 text-warning">{t('admin.matrix.approvals', { count: approvals })}</span></div>
    </div>
    {role.id === 'config-admin' && contentAccess ? <p role="alert" className="mt-4 rounded-control border border-[#efc3bf] bg-[#fff8f7] px-3 py-2 text-sm text-danger">{t('admin.matrix.warning')}</p> : null}
    <div className="mt-5 space-y-5">{groupedDefinitions.map(({ group, items }) => <section key={group} className="overflow-hidden rounded-lg border border-border"><div className="border-b border-border bg-surface px-4 py-3"><h3 className="font-semibold text-text">{key(`admin.matrix.groups.${group}`)}</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[58rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="w-[38%] px-4 py-3">{t('admin.matrix.permission')}</th><th className="w-[20%] px-4 py-3">{t('admin.matrix.scope')}</th><th className="w-[22%] px-4 py-3">{t('admin.matrix.data')}</th><th className="w-[20%] px-4 py-3">{t('admin.matrix.controls')}</th></tr></thead><tbody>{items.map((definition) => {
      const rule = draft.permissionRules.find((item) => item.action === definition.action);
      const enabled = Boolean(rule);
      const definitionLabel = key(`admin.matrix.permissions.${definition.labelKey}`);
      const definitionHint = key(`admin.matrix.permissions.${definition.hintKey}`);
      return <tr key={definition.action} className="border-b border-border last:border-0 align-top"><td className="px-4 py-3"><label className="flex items-start gap-3"><input type="checkbox" aria-label={definitionLabel} name={`permission-${definition.action}`} checked={enabled} onChange={() => toggleAction(definition)} className="mt-1 size-4 accent-[#2865ad]" /><span><span className="block font-semibold text-text">{definitionLabel}</span><span className="mt-1 block text-xs text-text-muted">{definitionHint}</span></span></label></td><td className="px-4 py-3"><select aria-label={`${definitionLabel} ${scopeAria}`} name={`permission-${definition.action}-scope`} disabled={!enabled} value={rule?.scope ?? 'TEAM'} onChange={(event) => updateRule(definition.action, { scope: event.target.value as Scope })} className="min-h-9 w-full rounded-control border border-border bg-panel px-2 text-sm disabled:bg-surface disabled:text-text-muted">{scopeOptions.map((option) => <option key={option} value={option}>{scopeLabel[option]}</option>)}</select></td><td className="px-4 py-3"><select aria-label={`${definitionLabel} ${t('admin.matrix.data')}`} name={`permission-${definition.action}-sensitivity`} disabled={!enabled} value={rule?.sensitivities[0] ?? definition.defaultSensitivity} onChange={(event) => updateRule(definition.action, { sensitivities: [event.target.value as Sensitivity] })} className="min-h-9 w-full rounded-control border border-border bg-panel px-2 text-sm disabled:bg-surface disabled:text-text-muted">{sensitivityOptions.map((option) => <option key={option} value={option}>{sensitivityLabel[option]}</option>)}</select></td><td className="px-4 py-3"><label className="flex items-start gap-2 text-xs text-text-muted"><input type="checkbox" aria-label={`${definitionLabel} ${t('admin.matrix.approval')}`} name={`permission-${definition.action}-approval`} disabled={!enabled} checked={rule?.approvalRequired ?? false} onChange={(event) => updateRule(definition.action, { approvalRequired: event.target.checked, reasonRequired: event.target.checked })} className="mt-0.5 size-4 accent-[#2865ad]" /><span>{t('admin.matrix.approval')}<br /><span className="text-[11px]">{rule?.reasonRequired ? t('admin.matrix.reasonRequired') : t('admin.matrix.noReason')}</span></span></label></td></tr>;
    })}</tbody></table></div></section>)}</div>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="text-sm" aria-live="polite">{mutation.error ? <span className="text-danger">{localizedError(t, mutation.error, t('admin.matrix.saveError'))}</span> : saved ? <span className="text-success">{t('admin.matrix.saved')}</span> : isDirty ? <span className="text-warning">{t('admin.matrix.dirty')}</span> : <span className="text-text-muted">{t('admin.matrix.clean')}</span>}</div><Button variant="primary" disabled={!isDirty || mutation.isPending} onClick={() => void save()}>{mutation.isPending ? t('admin.matrix.saving') : t('admin.matrix.save')}</Button></div>
  </section>;
}
