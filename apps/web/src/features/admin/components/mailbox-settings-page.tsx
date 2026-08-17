'use client';

import { useAdminMailbox } from '../services/admin-queries';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { StatusLabel } from '@/components/ui/status-label';

export function MailboxSettingsPage() {
  const query = useAdminMailbox();
  if (query.isPending) return <LoadingState label="Đang kiểm tra mailbox" />;
  if (query.error) return <ErrorState message="Không thể tải trạng thái mailbox." onRetry={() => void query.refetch()} />;
  const mailbox = query.data;
  if (!mailbox) return null;
  return <div className="space-y-6"><div><p className="text-sm font-medium text-accent">Kết nối hộp thư chung</p><h1 className="mt-1 text-2xl font-bold text-text">Mailbox health</h1><p className="mt-2 text-sm text-text-muted">Chỉ hiển thị trạng thái vận hành. Credential đã lưu không bao giờ trả về giao diện.</p></div><section className="max-w-2xl rounded-lg border border-border bg-panel p-5"><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs uppercase tracking-wide text-text-muted">Địa chỉ</p><p className="mt-1 font-semibold text-text">{mailbox.address}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Tên người gửi</p><p className="mt-1 font-semibold text-text">{mailbox.senderName}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Adapter</p><p className="mt-1 font-semibold text-text">{mailbox.adapter}</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Giới hạn tệp</p><p className="mt-1 font-semibold text-text">{Math.round(mailbox.maxAttachmentBytes / 1024 / 1024)} MB</p></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Sức khỏe</p><div className="mt-1"><StatusLabel tone={mailbox.health === 'HEALTHY' ? 'success' : mailbox.health === 'DEGRADED' ? 'warning' : 'danger'}>{mailbox.health === 'HEALTHY' ? 'Ổn định' : mailbox.health === 'DEGRADED' ? 'Suy giảm' : 'Mất kết nối'}</StatusLabel></div></div><div><p className="text-xs uppercase tracking-wide text-text-muted">Kiểm tra lần cuối</p><p className="mt-1 font-semibold text-text">{new Date(mailbox.lastCheckedAt).toLocaleString('vi-VN')}</p></div></div><div className="mt-5 rounded-control border border-border bg-surface p-4 text-sm text-text-muted"><strong className="text-text">Credential:</strong> {mailbox.credentialConfigured ? 'Đã cấu hình (giá trị được che và không thể xem lại).' : 'Chưa cấu hình.'}</div></section></div>;
}
