'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { Modal } from '@/components/ui/modal';
import { StatusLabel } from '@/components/ui/status-label';
import { EmptyState } from '@/components/ui/empty-state';
import { useAdminMailbox, useUpdateAdminMailbox } from '../services/admin-queries';

const inputClass = 'mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal';

export function MailboxSettingsPage() {
  const query = useAdminMailbox();
  const update = useUpdateAdminMailbox();
  const [open, setOpen] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [adapter, setAdapter] = useState<'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'SMTP_IMAP'>('MICROSOFT_365');
  const [maxAttachmentMb, setMaxAttachmentMb] = useState('10');
  const [signature, setSignature] = useState('');
  const [receiveFolder, setReceiveFolder] = useState('Inbox');
  const [sentFolder, setSentFolder] = useState('Sent');
  const [retryLimit, setRetryLimit] = useState('3');
  const [alertAddress, setAlertAddress] = useState('');

  useEffect(() => {
    if (!query.data) return;
    setSenderName(query.data.senderName);
    setAdapter(query.data.adapter);
    setMaxAttachmentMb(String(Math.round(query.data.maxAttachmentBytes / 1024 / 1024)));
    setSignature(query.data.signature ?? '');
    setReceiveFolder(query.data.receiveFolder ?? 'Inbox');
    setSentFolder(query.data.sentFolder ?? 'Sent');
    setRetryLimit(String(query.data.retryLimit ?? 3));
    setAlertAddress(query.data.alertAddress ?? '');
  }, [query.data]);

  if (query.isPending) return <LoadingState label="Đang kiểm tra mailbox" />;
  if (query.error) return <ErrorState message="Không thể tải trạng thái mailbox." onRetry={() => void query.refetch()} />;
  const mailbox = query.data;
  if (!mailbox) return <EmptyState title="Chưa có cấu hình mailbox" description="Cấu hình hộp thư chung để bắt đầu nhận và gửi email chính danh." />;

  const save = () => update.mutate({
    senderName: senderName.trim(),
    adapter,
    maxAttachmentBytes: Math.max(1, Number(maxAttachmentMb) || 1) * 1024 * 1024,
    signature: signature.trim(),
    receiveFolder: receiveFolder.trim() || 'Inbox',
    sentFolder: sentFolder.trim() || 'Sent',
    retryLimit: Math.max(0, Math.min(10, Number(retryLimit) || 0)),
    alertAddress: alertAddress.trim()
  }, { onSuccess: () => setOpen(false) });

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-medium text-accent">Kết nối hộp thư chung</p><h1 className="mt-1 text-2xl font-bold text-text">Mailbox health</h1><p className="mt-2 text-sm text-text-muted">Theo dõi trạng thái vận hành và cập nhật thông số không chứa credential.</p></div>
      <Button variant="primary" onClick={() => setOpen(true)}>Chỉnh sửa cấu hình</Button>
    </div>
    <section className="max-w-3xl rounded-lg border border-border bg-panel p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {[["Địa chỉ", mailbox.address], ["Tên người gửi", mailbox.senderName], ["Adapter", mailbox.adapter], ["Giới hạn tệp", `${Math.round(mailbox.maxAttachmentBytes / 1024 / 1024)} MB`], ["Thư mục nhận / gửi", `${mailbox.receiveFolder ?? 'Inbox'} / ${mailbox.sentFolder ?? 'Sent'}`], ["Retry / cảnh báo", `${mailbox.retryLimit ?? 3} lần · ${mailbox.alertAddress ?? 'Chưa cấu hình'}`]].map(([label, value]) => <div key={label}><p className="text-xs uppercase tracking-wide text-text-muted">{label}</p><p className="mt-1 font-semibold text-text">{value}</p></div>)}
        <div><p className="text-xs uppercase tracking-wide text-text-muted">Sức khỏe</p><div className="mt-1"><StatusLabel tone={mailbox.health === 'HEALTHY' ? 'success' : mailbox.health === 'DEGRADED' ? 'warning' : 'danger'}>{mailbox.health === 'HEALTHY' ? 'Ổn định' : mailbox.health === 'DEGRADED' ? 'Suy giảm' : 'Mất kết nối'}</StatusLabel></div></div>
        <div><p className="text-xs uppercase tracking-wide text-text-muted">Kiểm tra lần cuối</p><p className="mt-1 font-semibold text-text">{new Date(mailbox.lastCheckedAt).toLocaleString('vi-VN')}</p></div>
      </div>
      <div className="mt-5 rounded-control border border-border bg-surface p-4 text-sm text-text-muted"><strong className="text-text">Credential:</strong> {mailbox.credentialConfigured ? 'Đã cấu hình (giá trị được che và không thể xem lại).' : 'Chưa cấu hình.'}</div>
    </section>
    <Modal open={open} title="Chỉnh sửa mailbox" description="Credential không được hiển thị hoặc lưu lại trong form này." onClose={() => setOpen(false)} size="md" footer={<><Button onClick={() => setOpen(false)}>Hủy</Button><Button variant="primary" disabled={update.isPending || !senderName.trim()} onClick={save}>{update.isPending ? 'Đang lưu…' : 'Lưu cấu hình'}</Button></>}>
      <div className="space-y-4">
        {update.error ? <p role="alert" className="text-sm font-semibold text-danger">{update.error instanceof Error ? update.error.message : 'Không thể lưu cấu hình.'}</p> : null}
        <label className="block text-sm font-semibold text-text">Tên người gửi<input aria-label="Tên người gửi mailbox" name="ten-nguoi-gui-mailbox" autoComplete="organization" value={senderName} onChange={(event) => setSenderName(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-text">Adapter<select aria-label="Adapter mailbox" name="adapter-mailbox" value={adapter} onChange={(event) => setAdapter(event.target.value as typeof adapter)} className={inputClass}><option value="MICROSOFT_365">Microsoft 365</option><option value="GOOGLE_WORKSPACE">Google Workspace</option><option value="SMTP_IMAP">SMTP / IMAP</option></select></label>
        <label className="block text-sm font-semibold text-text">Giới hạn tệp (MB)<input aria-label="Giới hạn tệp mailbox" name="gioi-han-tep-mailbox" type="number" min="1" max="50" value={maxAttachmentMb} onChange={(event) => setMaxAttachmentMb(event.target.value)} className={inputClass} /></label>
        <label className="block text-sm font-semibold text-text">Chữ ký email<textarea aria-label="Chữ ký email mailbox" name="chu-ky-email-mailbox" value={signature} onChange={(event) => setSignature(event.target.value)} className={`${inputClass} min-h-20 py-2`} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-text">Thư mục nhận<input aria-label="Thư mục nhận mailbox" name="thu-muc-nhan-mailbox" value={receiveFolder} onChange={(event) => setReceiveFolder(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">Thư mục gửi<input aria-label="Thư mục gửi mailbox" name="thu-muc-gui-mailbox" value={sentFolder} onChange={(event) => setSentFolder(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">Số lần retry<input aria-label="Số lần retry mailbox" name="so-lan-retry-mailbox" type="number" min="0" max="10" value={retryLimit} onChange={(event) => setRetryLimit(event.target.value)} className={inputClass} /></label><label className="block text-sm font-semibold text-text">Địa chỉ cảnh báo<input aria-label="Địa chỉ cảnh báo mailbox" name="dia-chi-canh-bao-mailbox" type="email" autoComplete="email" value={alertAddress} onChange={(event) => setAlertAddress(event.target.value)} className={inputClass} /></label></div>
      </div>
    </Modal>
  </div>;
}
