'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';
import { useAdminRoles, useAdminUsers } from '../services/admin-queries';
import { RolePermissionMatrix } from './role-permission-matrix';

export function UsersPage() {
  const users = useAdminUsers();
  const roles = useAdminRoles();
  const [selectedRole, setSelectedRole] = useState('config-admin');
  if (users.isPending || roles.isPending) return <LoadingState label="Đang tải người dùng và quyền" />;
  if (users.error || roles.error) return <ErrorState message="Không thể tải cấu hình người dùng." onRetry={() => { void users.refetch(); void roles.refetch(); }} />;
  const role = roles.data?.items.find((item) => item.id === selectedRole) ?? roles.data?.items[0];
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-accent">Identity & access</p><h1 className="mt-1 text-2xl font-bold text-text">Người dùng và quyền</h1><p className="mt-2 max-w-3xl text-sm text-text-muted">Khóa tài khoản, thu hồi quyền và cấu hình scope theo vai trò. API vẫn là lớp cưỡng chế cuối cùng.</p></div><Button variant="primary">Mời người dùng</Button></div><section className="overflow-x-auto rounded-lg border border-border bg-panel p-5"><table className="w-full min-w-[46rem] text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase tracking-wide text-text-muted"><th className="px-3 py-3">Người dùng</th><th className="px-3 py-3">Đội</th><th className="px-3 py-3">Vai trò</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Hoạt động cuối</th></tr></thead><tbody>{users.data?.items.map((user) => <tr key={user.id} className="border-b border-border last:border-0"><td className="px-3 py-3"><p className="font-semibold text-text">{user.displayName}</p><p className="text-xs text-text-muted">{user.email}</p></td><td className="px-3 py-3 text-text-muted">{user.team.name}</td><td className="px-3 py-3"><div className="flex flex-wrap gap-1">{user.roleIds.map((roleId) => <button key={roleId} type="button" className="text-accent underline" onClick={() => setSelectedRole(roleId)}>{roleId}</button>)}</div></td><td className="px-3 py-3"><StatusLabel tone={user.status === 'ACTIVE' ? 'success' : user.status === 'LOCKED' ? 'danger' : 'warning'}>{user.status === 'ACTIVE' ? 'Đang hoạt động' : user.status === 'LOCKED' ? 'Đã khóa' : 'Đang mời'}</StatusLabel></td><td className="px-3 py-3 text-text-muted">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}</td></tr>)}</tbody></table></section><section className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-panel p-5"><label className="block text-sm font-semibold text-text">Vai trò đang cấu hình<select aria-label="Vai trò đang cấu hình" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="mt-1 min-h-10 min-w-64 rounded-control border border-border bg-panel px-3 font-normal">{roles.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><p className="max-w-xl text-sm text-text-muted">{role?.description}</p></section>{role ? <RolePermissionMatrix role={role} /> : null}</div>;
}
