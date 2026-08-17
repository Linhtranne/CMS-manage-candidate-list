import type { components } from '@cms/contracts';

export type Conversation = components['schemas']['Conversation'];
export type ConversationDetail = components['schemas']['ConversationDetail'];
export type EmailMessage = components['schemas']['EmailMessage'];

const candidate = { id: 'candidate-01', code: 'UV-0001', name: 'Nguyễn Minh An' };
const unknownCandidate = { id: 'candidate-unknown', code: 'CHUA-GHEP', name: 'Chưa xác định ứng viên' };
const actor = { id: 'u-recruiter', name: 'Nguyễn Minh Anh' };

const safeAttachment = { id: 'attachment-cv-01', fileName: 'CV-Nguyen-Minh-An.pdf', sizeBytes: 240_000, scanStatus: 'SAFE' as const, downloadUrl: '/mock/files/CV-Nguyen-Minh-An.pdf' };
const quarantinedAttachment = { id: 'attachment-risk-01', fileName: 'tai-lieu-la.zip', sizeBytes: 1_200_000, scanStatus: 'QUARANTINED' as const, downloadUrl: null };

const inbound: EmailMessage = { id: 'message-in-01', direction: 'INBOUND', status: 'RECEIVED', from: 'nguyen.minh.an@example.com', to: ['ungvien@company.vn'], cc: [], subject: 'Xác nhận lịch phỏng vấn', bodyText: 'Em xác nhận tham gia phỏng vấn lúc 09:00 ngày 20/08.', sanitizedHtml: null, sentOrReceivedAt: '2026-08-14T03:00:00.000Z', attachmentIds: [], immutable: true };
const outbound: EmailMessage = { id: 'message-out-01', direction: 'OUTBOUND', status: 'SENT', from: 'ungvien@company.vn', to: ['nguyen.minh.an@example.com'], cc: [], subject: 'Mời phỏng vấn vòng 1', bodyText: 'Chào bạn, lịch phỏng vấn của bạn được xác nhận.', sanitizedHtml: '<p>Chào bạn, lịch phỏng vấn của bạn được xác nhận.</p>', sentOrReceivedAt: '2026-08-13T03:00:00.000Z', attachmentIds: ['attachment-cv-01'], immutable: true };

export const conversationDetails: ConversationDetail[] = [
  { id: 'conversation-01', subject: 'Xác nhận lịch phỏng vấn', snippet: inbound.bodyText, lastActivityAt: inbound.sentOrReceivedAt, status: 'NEEDS_ACTION', candidate, applicationId: 'application-waiting-01', journeyId: null, messageCount: 2, hasUnreadInbound: true, version: 2, messages: [outbound, inbound], attachments: [safeAttachment], internalNotes: ['Đã đối chiếu với lịch vòng 1.'] },
  { id: 'conversation-unmatched', subject: 'Hỏi về cơ hội việc làm', snippet: 'Tôi muốn biết thêm thông tin về vị trí đang tuyển.', lastActivityAt: '2026-08-14T05:00:00.000Z', status: 'UNMATCHED', candidate: unknownCandidate, applicationId: null, journeyId: null, messageCount: 1, hasUnreadInbound: true, version: 1, messages: [{ id: 'message-unmatched-01', direction: 'INBOUND', status: 'RECEIVED', from: 'unknown@example.com', to: ['ungvien@company.vn'], cc: [], subject: 'Hỏi về cơ hội việc làm', bodyText: 'Tôi muốn biết thêm thông tin về vị trí đang tuyển.', sanitizedHtml: null, sentOrReceivedAt: '2026-08-14T05:00:00.000Z', attachmentIds: ['attachment-risk-01'], immutable: true }], attachments: [quarantinedAttachment], internalNotes: [] },
  { id: 'conversation-sent', subject: 'Yêu cầu bổ sung hồ sơ', snippet: 'Vui lòng bổ sung giấy tờ trước ngày hẹn.', lastActivityAt: '2026-08-12T04:00:00.000Z', status: 'SENT', candidate, applicationId: 'application-journey-blocked', journeyId: 'journey-01', messageCount: 1, hasUnreadInbound: false, version: 1, messages: [{ ...outbound, id: 'message-out-02', subject: 'Yêu cầu bổ sung hồ sơ', sentOrReceivedAt: '2026-08-12T04:00:00.000Z' }], attachments: [safeAttachment], internalNotes: [] }
];

export const conversationFixtures: Conversation[] = conversationDetails.map((detail) => ({ id: detail.id, subject: detail.subject, snippet: detail.snippet, lastActivityAt: detail.lastActivityAt, status: detail.status, candidate: detail.candidate, applicationId: detail.applicationId, journeyId: detail.journeyId, messageCount: detail.messageCount, hasUnreadInbound: detail.hasUnreadInbound, version: detail.version }));
export const findConversation = (id: string) => conversationDetails.find((conversation) => conversation.id === id);
export { actor };
