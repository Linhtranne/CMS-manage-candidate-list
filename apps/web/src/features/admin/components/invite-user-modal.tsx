'use client';

import { useEffect, useState } from 'react';
import type { components } from '@cms/contracts';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useInviteAdminUser } from '../services/admin-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 text-sm text-text focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20';

type Role = components['schemas']['AdminRole'];

export function InviteUserModal({ open, roles, onClose }: { open: boolean; roles: Role[]; onClose: () => void }) {
  const mutation = useInviteAdminUser();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [teamId, setTeamId] = useState('team-recruiting');
  const [roleId, setRoleId] = useState(roles[0]?.id ?? 'recruiter');
  const [error, setError] = useState('');
  const [savedEmail, setSavedEmail] = useState('');

  useEffect(() => {
    if (open) return;
    setDisplayName(''); setEmail(''); setTeamId('team-recruiting'); setRoleId(roles[0]?.id ?? 'recruiter'); setError(''); setSavedEmail('');
  }, [open, roles]);

  const submit = () => {
    if (!displayName.trim() || !email.trim() || !roleId) return setError('Vui lòng điền đủ thông tin mời người dùng.');
    setError('');
    mutation.mutate({ displayName: displayName.trim(), email: email.trim(), teamId, roleIds: [roleId] }, { onSuccess: (user) => setSavedEmail(user.email), onError: (cause) => setError(cause.message) });
  };

  return <Modal open={open} onClose={onClose} confirmOnClose={!savedEmail && Boolean(displayName.trim() || email.trim())} title="Mời người dùng" description="Tạo lời mời vào CMS nội bộ và gán vai trò ban đầu." size="md" footer={savedEmail ? <Button variant="primary" onClick={onClose}>Đóng</Button> : <><Button onClick={onClose}>Hủy</Button><Button variant="primary" onClick={submit} disabled={mutation.isPending}>{mutation.isPending ? 'Đang gửi…' : 'Gửi lời mời'}</Button></>}>
    {savedEmail ? <p role="status" className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">Đã tạo lời mời cho {savedEmail}.</p> : <div className="space-y-4">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <label className="block text-sm font-semibold text-text">Họ tên<input aria-label="Họ tên người dùng" name="ho-ten-nguoi-dung" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-text">Email công ty<input aria-label="Email người dùng" name="email-nguoi-dung" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm font-semibold text-text">Đội<select aria-label="Đội của người dùng" name="doi-cua-nguoi-dung" value={teamId} onChange={(event) => setTeamId(event.target.value)} className={inputClass}><option value="team-recruiting">Tuyển dụng</option><option value="team-coordination">Điều phối</option><option value="team-platform">Vận hành hệ thống</option><option value="team-compliance">Kiểm soát</option></select></label>
      <label className="block text-sm font-semibold text-text">Vai trò<select aria-label="Vai trò người dùng" name="vai-tro-nguoi-dung" value={roleId} onChange={(event) => setRoleId(event.target.value)} className={inputClass}>{roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label>
    </div>}
  </Modal>;
}
