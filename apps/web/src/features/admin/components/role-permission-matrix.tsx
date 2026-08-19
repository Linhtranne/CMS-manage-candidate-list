'use client';

import { useEffect, useMemo, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { useUpdateAdminRole } from '../services/admin-queries';

type AdminRole = components['schemas']['AdminRole'];
type PermissionRule = components['schemas']['AdminPermissionRule'];
type Scope = PermissionRule['scope'];
type Sensitivity = PermissionRule['sensitivities'][number];

type PermissionDefinition = {
  action: string;
  group: string;
  label: string;
  hint: string;
  defaultSensitivity: Sensitivity;
};

const permissionDefinitions: PermissionDefinition[] = [
  { action: 'candidate.view', group: 'Ứng viên', label: 'Xem hồ sơ cơ bản', hint: 'Tên, liên hệ và trạng thái vận hành', defaultSensitivity: 'NORMAL' },
  { action: 'candidate.create_update_basic', group: 'Ứng viên', label: 'Tạo và cập nhật hồ sơ cơ bản', hint: 'Không bao gồm trường định danh nhạy cảm', defaultSensitivity: 'NORMAL' },
  { action: 'candidate.view_sensitive', group: 'Ứng viên', label: 'Xem dữ liệu cá nhân', hint: 'Điện thoại, địa chỉ và thông tin định danh', defaultSensitivity: 'PERSONAL' },
  { action: 'candidate.merge', group: 'Ứng viên', label: 'Gộp hồ sơ nghi trùng', hint: 'Bắt buộc lý do và phê duyệt', defaultSensitivity: 'PERSONAL' },
  { action: 'job_order.view', group: 'Khách hàng & đơn tuyển', label: 'Xem khách hàng và đơn tuyển', hint: 'Ngữ cảnh tuyển dụng theo phạm vi', defaultSensitivity: 'NORMAL' },
  { action: 'job_order.create_update', group: 'Khách hàng & đơn tuyển', label: 'Tạo và cập nhật đơn tuyển', hint: 'Chỉ role Business/Manager mặc định', defaultSensitivity: 'NORMAL' },
  { action: 'application.create_update', group: 'Ứng tuyển & phỏng vấn', label: 'Tạo và cập nhật đơn ứng tuyển', hint: 'Gắn ứng viên vào đơn tuyển', defaultSensitivity: 'NORMAL' },
  { action: 'interview.schedule', group: 'Ứng tuyển & phỏng vấn', label: 'Lên lịch phỏng vấn', hint: 'Tạo hoặc đổi lịch theo phạm vi', defaultSensitivity: 'NORMAL' },
  { action: 'interview.record_result', group: 'Ứng tuyển & phỏng vấn', label: 'Ghi kết quả phỏng vấn', hint: 'Kết quả, nhận xét và bước tiếp theo', defaultSensitivity: 'PERSONAL' },
  { action: 'supply_journey.view', group: 'Lộ trình cung ứng', label: 'Xem lộ trình cung ứng', hint: 'Mốc, tiến độ và trạng thái', defaultSensitivity: 'NORMAL' },
  { action: 'supply_journey.update_milestone', group: 'Lộ trình cung ứng', label: 'Cập nhật mốc lộ trình', hint: 'Hoàn tất, chặn hoặc không áp dụng', defaultSensitivity: 'NORMAL' },
  { action: 'supply_journey.waive', group: 'Lộ trình cung ứng', label: 'Miễn trừ mốc lộ trình', hint: 'Luôn yêu cầu lý do và người duyệt', defaultSensitivity: 'PERSONAL' },
  { action: 'document.download_sensitive', group: 'Tài liệu', label: 'Tải tài liệu nhạy cảm', hint: 'Hộ chiếu, COE, visa và giấy tờ', defaultSensitivity: 'HIGHLY_SENSITIVE' },
  { action: 'email.read', group: 'Hộp thư chung', label: 'Đọc nội dung email', hint: 'Body, người nhận và tệp đính kèm', defaultSensitivity: 'PERSONAL' },
  { action: 'email.send', group: 'Hộp thư chung', label: 'Gửi email chính danh', hint: 'Gửi từ hộp thư chung và lưu audit', defaultSensitivity: 'PERSONAL' },
  { action: 'email.manual_link', group: 'Hộp thư chung', label: 'Ghép email thủ công', hint: 'Liên kết email chưa định danh', defaultSensitivity: 'PERSONAL' },
  { action: 'report.view', group: 'Báo cáo & kiểm soát', label: 'Xem báo cáo', hint: 'KPI theo phạm vi dữ liệu', defaultSensitivity: 'NORMAL' },
  { action: 'report.export', group: 'Báo cáo & kiểm soát', label: 'Xuất báo cáo', hint: 'Có thể chứa PII, cần audit', defaultSensitivity: 'HIGHLY_SENSITIVE' },
  { action: 'audit.view', group: 'Báo cáo & kiểm soát', label: 'Xem audit log', hint: 'Lịch sử actor, action và resource', defaultSensitivity: 'NORMAL' },
  { action: 'catalog.manage', group: 'Cấu hình hệ thống', label: 'Quản lý danh mục', hint: 'Ngành, nghề, tuyến visa và nguồn', defaultSensitivity: 'NORMAL' },
  { action: 'template.manage', group: 'Cấu hình hệ thống', label: 'Quản lý template', hint: 'Template journey và email theo version', defaultSensitivity: 'NORMAL' },
  { action: 'mailbox.configure', group: 'Cấu hình hệ thống', label: 'Cấu hình mailbox', hint: 'Kết nối adapter, không đọc body email', defaultSensitivity: 'HIGHLY_SENSITIVE' },
  { action: 'user.manage', group: 'Cấu hình hệ thống', label: 'Quản lý người dùng', hint: 'Mời, khóa và thu hồi phiên', defaultSensitivity: 'NORMAL' },
  { action: 'iam.configure', group: 'Cấu hình hệ thống', label: 'Cấu hình IAM', hint: 'Role, scope và chính sách truy cập', defaultSensitivity: 'HIGHLY_SENSITIVE' }
];

const scopeOptions: Array<{ value: Scope; label: string }> = [
  { value: 'SELF', label: 'Chính mình' },
  { value: 'TEAM', label: 'Đội' },
  { value: 'DEPARTMENT', label: 'Phòng ban' },
  { value: 'ALL', label: 'Toàn công ty' }
];

const sensitivityOptions: Array<{ value: Sensitivity; label: string }> = [
  { value: 'NORMAL', label: 'Thông thường' },
  { value: 'PERSONAL', label: 'Dữ liệu cá nhân' },
  { value: 'HIGHLY_SENSITIVE', label: 'Rất nhạy cảm' }
];

const groupOrder = ['Ứng viên', 'Khách hàng & đơn tuyển', 'Ứng tuyển & phỏng vấn', 'Lộ trình cung ứng', 'Tài liệu', 'Hộp thư chung', 'Báo cáo & kiểm soát', 'Cấu hình hệ thống'];

function cloneRole(role: AdminRole): AdminRole {
  return { ...role, actions: [...role.actions], scopes: [...role.scopes], sensitivities: [...role.sensitivities], permissionRules: role.permissionRules.map((rule) => ({ ...rule, sensitivities: [...rule.sensitivities] })) };
}

function getRuleFrom(rules: PermissionRule[], action: string) {
  return rules.find((rule) => rule.action === action);
}

export function RolePermissionMatrix({ role }: { role: AdminRole }) {
  const [draft, setDraft] = useState(() => cloneRole(role));
  const [baseRules, setBaseRules] = useState(() => JSON.stringify(role.permissionRules));
  const [saved, setSaved] = useState(false);
  const mutation = useUpdateAdminRole();
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

  const getRule = (action: string) => getRuleFrom(draft.permissionRules, action);
  const toggleAction = (definition: PermissionDefinition) => {
    setSaved(false);
    setDraft((current) => {
      const existing = getRuleFrom(current.permissionRules, definition.action);
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

  return <section className="rounded-lg border border-border bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-bold text-text">Ma trận quyền · {role.name}</h2><p className="mt-1 max-w-3xl text-sm text-text-muted">Mỗi quyền có phạm vi và mức dữ liệu riêng. Mặc định không cấp quyền; quyền nhạy cảm có thể yêu cầu phê duyệt và lý do.</p></div><div className="flex gap-2 text-xs text-text-muted"><span className="rounded-full bg-surface px-3 py-1">{draft.permissionRules.length} quyền được cấp</span><span className="rounded-full bg-[#fff3dc] px-3 py-1 text-warning">{approvals} cần phê duyệt</span></div></div>{role.id === 'config-admin' && contentAccess ? <p role="alert" className="mt-4 rounded-control border border-[#efc3bf] bg-[#fff8f7] px-3 py-2 text-sm text-danger">Configuration admin không nên có quyền đọc nội dung ứng viên, tài liệu hoặc email. Hãy tách quyền cấu hình khỏi quyền nghiệp vụ.</p> : null}<div className="mt-5 space-y-5">{groupedDefinitions.map(({ group, items }) => <section key={group} className="overflow-hidden rounded-lg border border-border"><div className="border-b border-border bg-surface px-4 py-3"><h3 className="font-semibold text-text">{group}</h3></div><div className="overflow-x-auto"><table className="w-full min-w-[58rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="w-[38%] px-4 py-3">Quyền</th><th className="w-[20%] px-4 py-3">Phạm vi</th><th className="w-[22%] px-4 py-3">Dữ liệu</th><th className="w-[20%] px-4 py-3">Kiểm soát</th></tr></thead><tbody>{items.map((definition) => { const rule = getRule(definition.action); const enabled = Boolean(rule); return <tr key={definition.action} className="border-b border-border last:border-0 align-top"><td className="px-4 py-3"><label className="flex items-start gap-3"><input type="checkbox" aria-label={definition.label} name={`permission-${definition.action}`} checked={enabled} onChange={() => toggleAction(definition)} className="mt-1 size-4 accent-[#2865ad]" /><span><span className="block font-semibold text-text">{definition.label}</span><span className="mt-1 block text-xs text-text-muted">{definition.hint}</span></span></label></td><td className="px-4 py-3"><select aria-label={`${definition.label} phạm vi`} name={`permission-${definition.action}-scope`} disabled={!enabled} value={rule?.scope ?? 'TEAM'} onChange={(event) => updateRule(definition.action, { scope: event.target.value as Scope })} className="min-h-9 w-full rounded-control border border-border bg-panel px-2 text-sm disabled:bg-surface disabled:text-text-muted">{scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td className="px-4 py-3"><select aria-label={`${definition.label} mức dữ liệu`} name={`permission-${definition.action}-sensitivity`} disabled={!enabled} value={rule?.sensitivities[0] ?? definition.defaultSensitivity} onChange={(event) => updateRule(definition.action, { sensitivities: [event.target.value as Sensitivity] })} className="min-h-9 w-full rounded-control border border-border bg-panel px-2 text-sm disabled:bg-surface disabled:text-text-muted">{sensitivityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></td><td className="px-4 py-3"><label className="flex items-start gap-2 text-xs text-text-muted"><input type="checkbox" aria-label={`${definition.label} cần phê duyệt`} name={`permission-${definition.action}-approval`} disabled={!enabled} checked={rule?.approvalRequired ?? false} onChange={(event) => updateRule(definition.action, { approvalRequired: event.target.checked, reasonRequired: event.target.checked })} className="mt-0.5 size-4 accent-[#2865ad]" /><span>Cần phê duyệt<br /><span className="text-[11px]">{rule?.reasonRequired ? 'Bắt buộc nhập lý do' : 'Không yêu cầu lý do'}</span></span></label></td></tr>; })}</tbody></table></div></section>)}</div><div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div className="text-sm" aria-live="polite">{mutation.error ? <span className="text-danger">{mutation.error instanceof Error ? mutation.error.message : 'Không thể lưu thay đổi quyền.'}</span> : saved ? <span className="text-success">Đã lưu và ghi audit thay đổi quyền.</span> : isDirty ? <span className="text-warning">Có thay đổi chưa lưu.</span> : <span className="text-text-muted">Chưa có thay đổi.</span>}</div><Button variant="primary" disabled={!isDirty || mutation.isPending} onClick={() => void save()}>{mutation.isPending ? 'Đang lưu quyền' : 'Lưu quyền'}</Button></div></section>;
}
