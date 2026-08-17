import type { components } from '@cms/contracts';

type EmailStatus = components['schemas']['EmailMessage']['status'] | components['schemas']['EmailSendResult']['status'];
export function emailStatusLabel(status: EmailStatus) {
  const labels: Record<EmailStatus, string> = { RECEIVED: 'Đã nhận', QUEUED: 'Đang chờ gửi', SENDING: 'Đang gửi', SENT: 'Đã gửi', FAILED: 'Gửi thất bại', BOUNCED: 'Bị trả lại' };
  return labels[status];
}

export function conversationStatusLabel(status: components['schemas']['Conversation']['status']) {
  const labels: Record<components['schemas']['Conversation']['status'], string> = { NEEDS_ACTION: 'Cần xử lý', MATCHED: 'Đã ghép', UNMATCHED: 'Chưa ghép', SENT: 'Đã gửi', RECEIVED: 'Đã nhận', CLOSED: 'Đã đóng' };
  return labels[status];
}
