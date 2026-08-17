import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { conversationFixtures, findConversation } from '../fixtures/mail';

type SendEmailRequest = components['schemas']['SendEmailRequest'];
type LinkConversationRequest = components['schemas']['LinkConversationRequest'];
const problem = (code: string, message: string, status: number) => HttpResponse.json({ code, message, traceId: `mock-${code.toLowerCase()}` }, { status });
const idempotencyResults = new Map<string, components['schemas']['EmailSendResult']>();

export const mailHandlers = [
  http.get('*/api/v1/mailbox/conversations', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').toLowerCase();
    const view = url.searchParams.get('view') ?? 'all';
    const items = conversationFixtures.filter((conversation) => {
      const haystack = `${conversation.subject} ${conversation.snippet} ${conversation.candidate.name} ${conversation.candidate.code}`.toLowerCase();
      const matchesView = view === 'all' || (view === 'needs-action' && conversation.status === 'NEEDS_ACTION') || (view === 'unmatched' && conversation.status === 'UNMATCHED') || (view === 'sent' && conversation.status === 'SENT') || (view === 'received' && conversation.status === 'RECEIVED');
      return (!query || haystack.includes(query)) && matchesView;
    });
    return HttpResponse.json({ items });
  }),
  http.get('*/api/v1/mailbox/conversations/:id', ({ params }) => { const conversation = findConversation(String(params.id)); return conversation ? HttpResponse.json(conversation) : problem('NOT_FOUND', 'Không tìm thấy chuỗi email', 404); }),
  http.post('*/api/v1/mailbox/conversations/:id/send', async ({ params, request }) => {
    const conversation = findConversation(String(params.id));
    if (!conversation) return problem('NOT_FOUND', 'Không tìm thấy chuỗi email', 404);
    const body = (await request.json()) as SendEmailRequest;
    const key = `${conversation.id}:${body.idempotencyKey}`;
    const previous = idempotencyResults.get(key);
    if (previous) return HttpResponse.json(previous, { status: 202 });
    if (body.version !== conversation.version) return problem('VERSION_CONFLICT', 'Chuỗi email vừa có phản hồi mới, hãy tải lại trước khi gửi.', 409);
    if (!body.to.length || !body.subject.trim() || !body.body.trim()) return problem('VALIDATION_ERROR', 'Cần nhập người nhận, tiêu đề và nội dung.', 422);
    const now = new Date().toISOString();
    const messageId = `message-out-${conversation.id}-${conversation.version + 1}`;
    const result = { messageId, status: 'QUEUED' as const, queuedAt: now };
    idempotencyResults.set(key, result);
    const message: components['schemas']['EmailMessage'] = { id: messageId, direction: 'OUTBOUND', status: 'QUEUED', from: 'ungvien@company.vn', to: body.to, cc: body.cc ?? [], subject: body.subject, bodyText: body.body, sanitizedHtml: null, sentOrReceivedAt: now, attachmentIds: body.attachmentIds ?? [], immutable: true };
    conversation.messages.push(message);
    conversation.messageCount += 1;
    conversation.lastActivityAt = now;
    conversation.snippet = body.body.slice(0, 120);
    conversation.status = 'SENT';
    conversation.version += 1;
    return HttpResponse.json(result, { status: 202 });
  }),
  http.post('*/api/v1/mailbox/conversations/:id/link', async ({ params, request }) => {
    const conversation = findConversation(String(params.id));
    if (!conversation) return problem('NOT_FOUND', 'Không tìm thấy chuỗi email', 404);
    const body = (await request.json()) as LinkConversationRequest;
    if (body.version !== conversation.version) return problem('VERSION_CONFLICT', 'Chuỗi email vừa được cập nhật, hãy tải lại.', 409);
    if (!body.candidateId?.trim()) return problem('CANDIDATE_REQUIRED', 'Cần chọn ứng viên để liên kết.', 422);
    conversation.candidate = { id: body.candidateId, code: body.candidateId === 'candidate-01' ? 'UV-0001' : body.candidateId.toUpperCase(), name: body.candidateId === 'candidate-01' ? 'Nguyễn Minh An' : 'Ứng viên đã chọn' };
    conversation.applicationId = body.applicationId ?? null;
    conversation.journeyId = body.journeyId ?? null;
    conversation.status = 'MATCHED';
    conversation.version += 1;
    return HttpResponse.json(conversation);
  })
];
