---
title: Email Hub Workers and Storage Specification
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - Security Owner
  - Operations Owner
  - Product Owner
approvers:
  - Backend Tech Lead
  - Security Owner
risk: critical
---

# 07. Email Hub, Worker và Storage

## 1. Release posture

Baseline dùng đúng một shared mailbox. Provider, địa chỉ mailbox, tenant/DNS owner và credential flow đang `blocked_by_external_decision`; cho đến khi DEC-003 approved, `MAIL_PROVIDER=DISABLED` và mọi send/poll/webhook trả `MAIL_PROVIDER_DISABLED` hoặc health `not_configured`.

Email Hub lưu trao đổi hai chiều có audit; không phải marketing automation. Candidate không có tài khoản/portal.

## 2. Adapter contracts

```ts
type MailCursor = { value: string; issuedAt: string };

interface MailProviderAdapter {
  readonly provider: 'MICROSOFT_GRAPH' | 'GMAIL_API' | 'SMTP_IMAP';
  validateConnection(): Promise<ProviderHealth>;
  send(input: ProviderSendRequest, idempotencyKey: string): Promise<ProviderSendResult>;
  fetchChanges(cursor: MailCursor | null, limit: number): Promise<ProviderChangePage>;
  fetchMessage(providerMessageId: string): Promise<ProviderMessage>;
  fetchAttachment(providerMessageId: string, attachmentId: string): Promise<NodeJS.ReadableStream>;
  renewSubscription?(subscriptionId: string): Promise<ProviderSubscription>;
}

interface EmailCommandService {
  preview(input: PreviewEmail, ctx: CommandContext): Promise<EmailPreview>;
  enqueue(input: EnqueueEmail, ctx: CommandContext): Promise<EmailMessage>;
  retry(messageId: string, ctx: CommandContext): Promise<EmailMessage>;
  resolveMatch(messageId: string, input: ResolveEmailMatch, ctx: CommandContext): Promise<EmailMessage>;
}
```

Adapter normalize provider payload về domain DTO; provider-specific ID/header không rò vào các module nghiệp vụ.

## 3. Outbound state machine

`DRAFT -> QUEUED -> SENDING`; từ `SENDING` chuyển sang `SENT`, `RETRY_WAIT`, `RECONCILING` hoặc `FAILED`. `RECONCILING` chuyển sang `SENT`, `RETRY_WAIT` hoặc `FAILED` sau khi kiểm provider. `QUEUED/RETRY_WAIT` có thể chuyển `CANCELLED` trước khi provider nhận.

Delivery event bổ sung `DELIVERED`, `BOUNCED`, `COMPLAINED` nhưng không ghi đè send history.

### 3.1 Preview

Preview resolve template version bằng specificity: journey template > occupation > sector > visa route > global, rồi kiểm ambiguity. Kết quả chứa exact recipients, subject/body render, attachment metadata, sensitivity warning, template checksum và signed preview token TTL 15 phút.

Server bắt buộc kiểm:

- Candidate `CONTACTABLE` và không `DO_NOT_CONTACT`;
- recipient thuộc Candidate/ClientContact hợp lệ hoặc được nhập với quyền explicit;
- active template/rule đúng event và domain state;
- attachment `SAFE` và user có quyền đọc;
- mail nhạy cảm/decision phải manual preview/confirm;
- no auto-reply loop headers và send frequency policy.

### 3.2 Enqueue transaction

Trong cùng transaction: re-check preview token/domain version, tạo immutable EmailMessage `QUEUED`, recipients, attachment links, conversation, outbox event `email.send.requested`, audit. `Idempotency-Key` required; cùng key + cùng payload trả record cũ, khác payload trả 409.

### 3.3 Send worker

1. Claim job bằng BullMQ và DB state CAS `QUEUED/RETRY_WAIT -> SENDING`.
2. Re-check mailbox active, kill switch, contactability và cancellation.
3. Gọi adapter với stable provider idempotency key.
4. Lưu provider message ID, Internet Message-ID, sentAt và `SENT`.
5. Nếu timeout không rõ kết quả, chuyển `RECONCILING`, không gửi lại ngay.
6. Publish `email.sent`/`email.failed` qua outbox.

Provider response và DB update không thể atomic; reconciliation phải query/search provider bằng client reference trước retry. Không được “at least once” thành gửi trùng.

## 4. Retry policy

| Failure | Xử lý |
|---|---|
| 429/temporary 5xx/network trước khi provider nhận | exponential backoff có jitter, tôn trọng Retry-After |
| timeout/connection reset sau request | `RECONCILING`; không blind retry |
| auth/credential invalid | pause mailbox, alert critical, không retry hàng loạt |
| recipient invalid/permanent 4xx | `FAILED`/`BOUNCED`, tạo task nếu rule quy định |
| template/domain/contactability invalid | fail command trước queue hoặc cancel trước send |

Baseline tối đa 8 attempt trong 24 giờ cho transient failure; con số chỉ activate production cùng provider decision. Sau giới hạn, job vào DLQ có replay command được permission và audit bảo vệ.

## 5. Inbound ingestion

Webhook chỉ là tín hiệu; poller/change feed là reconciliation source. Webhook handler verify signature/token, dedupe notification và enqueue fetch; không tin body business data của webhook.

Transaction ingest:

1. normalize headers/body/recipients/time;
2. unique `(provider, mailboxId, providerMessageId)`;
3. sanitize HTML, store plain text và raw source reference private;
4. find/create Conversation;
5. persist message + match decision + các bản ghi metadata attachment ban đầu;
6. advance cursor chỉ sau page committed;
7. emit `email.received`.

Replay cùng provider message chỉ tăng technical duplicate metric; không tạo message/event nghiệp vụ thứ hai.

## 6. Matching priority

1. Verified reply token signed trong `Reply-To`/custom header.
2. `In-Reply-To` hoặc `References` khớp outbound Internet Message-ID/conversation.
3. Provider thread ID đã bound với conversation.
4. Sender + một active conversation duy nhất trong time window approved.
5. Nếu 0 hoặc >1 candidate, state `UNMATCHED`/`AMBIGUOUS`; tạo Shared Inbox task.

Subject token chỉ là hỗ trợ, không phải bằng chứng duy nhất. Manual resolve cần `email.match.resolve`, reason, selected Candidate/conversation và audit; message không bị sửa, chỉ append `EmailMatchDecision`.

Email inbound không tự đổi Interview, Application, visa, COE, milestone hay Journey. Approved rules chỉ được tạo task, stop reminder, hoặc gắn conversation.

## 7. Conversation và message immutability

- Conversation có Candidate bắt buộc sau khi matched; optional Application/Journey context.
- Message `SENT/RECEIVED` không update body/recipient. Redaction theo legal/privacy là tombstone + evidence, không chỉnh lịch sử âm thầm.
- Sanitized HTML dùng allowlist tag/attribute; strip script, form, event handler, remote active content và dangerous URL scheme.
- UI không load remote image mặc định; tracking pixel bị chặn/proxy theo approved policy.
- Logs, metrics và traces không chứa subject/body/full address/attachment filename nhạy cảm.

## 8. Attachment pipeline

Provider attachment stream đi thẳng vào private quarantine object, tính SHA-256 và enforce size while streaming. Không buffer toàn bộ file trong RAM.

`DISCOVERED -> DOWNLOADING -> QUARANTINED -> SCANNING -> SAFE | REJECTED | FAILED`.

- Filename sanitize, MIME detect từ content, archive bomb/size/count limit.
- Chỉ `SAFE` được preview/download/link Document.
- Failure/rejected tạo operational task; không tự retry vô hạn.
- Raw email/attachment object key không lộ qua API; download ký sau authorization.

## 9. Queues và payload

| Queue | Job name | Concurrency baseline | Idempotency |
|---|---|---:|---|
| `mail-outbound` | `send-email.v1` | 5 | message ID |
| `mail-ingest` | `fetch-message.v1` | 10 | mailbox + provider message ID |
| `mail-sync` | `sync-mailbox.v1` | 1/mailbox | cursor generation |
| `file-scan` | `scan-attachment.v1` | 2 | attachment + checksum |
| `reconcile` | `reconcile-send.v1` | 2 | message ID + attempt generation |
| `notifications` | `evaluate-reminder.v1` | 5 | rule + aggregate + due slot |

Payload chỉ chứa IDs, `schemaVersion`, request/correlation/event IDs; worker load current authorized data. Không đưa body, credential hoặc signed URL vào Redis.

Redis production cần persistence phù hợp, `maxmemory-policy=noeviction`, TLS/auth/network isolation. Worker xử lý SIGTERM: stop accepting, chờ active job trong shutdown budget, release/return job an toàn.

## 10. Scheduler

- Mail sync theo provider capability; cursor checkpoint transactional.
- Subscription renewal chạy trước expiry và alert nếu thất bại.
- Reminder query theo due window bằng stable key; re-check state/contactability ngay trước enqueue và send.
- Outbox dispatcher claim bằng `FOR UPDATE SKIP LOCKED`, publish, rồi mark; consumer vẫn idempotent.
- Stuck-job/reconciliation sweep không tự gửi lại uncertain sends.

## 11. Admin và health

Admin chỉ xem mailbox address, provider, last successful sync/send, cursor age, queue/DLQ counts, auth expiry và masked error. Không mặc định xem message body.

Health states: `not_configured`, `healthy`, `degraded`, `paused_auth`, `paused_operator`, `failed`. API readiness không phụ thuộc provider mail; gửi email fail-closed riêng. Kill switch audit bắt buộc và không xóa queue.

## 12. Security và provider gate

Trước staging email thật phải có:

- provider/tenant/mailbox/DNS ownership approved;
- least-privilege OAuth scope hoặc credential mechanism;
- secret store/rotation/revocation runbook;
- SPF, DKIM, DMARC evidence; reply và bounce test;
- webhook verification/replay protection;
- data residency/retention/privacy approval;
- approved retry/rate/concurrency limits;
- sandbox/canary recipient allowlist.

Không log token, raw MIME hoặc signed URL. Credential reference lưu trong DB, secret value nằm ngoài DB/repo.

## 13. Endpoints và errors

- `POST /emails/previews`, `POST /emails`, `POST /emails/{id}/retry`, `POST /emails/{id}/cancellation`.
- `GET /conversations`, `GET /conversations/{id}`, `GET /shared-inbox`.
- `POST /emails/{id}/match-resolution`.
- `POST /webhooks/mail/{provider}` không dùng session auth nhưng bắt buộc provider verification.
- `GET /admin/mailbox/health`, `POST /admin/mailbox/{pause|resume|sync}`.

Errors: `MAIL_PROVIDER_DISABLED`, `MAILBOX_UNHEALTHY`, `EMAIL_PREVIEW_EXPIRED`, `DO_NOT_CONTACT`, `EMAIL_TEMPLATE_NOT_APPLICABLE`, `EMAIL_TEMPLATE_AMBIGUOUS`, `EMAIL_SEND_UNCERTAIN`, `EMAIL_ALREADY_TERMINAL`, `EMAIL_MATCH_AMBIGUOUS`, `ATTACHMENT_NOT_SAFE`, `RATE_LIMITED`.

## 14. Acceptance gate

- AC-05–AC-09, AC-13–AC-16, AC-19, AC-26 và EM-AC-01–04 chạy trên adapter sandbox/fake + PostgreSQL/Redis/object storage thật.
- Duplicate webhook và poll replay chỉ tạo một message.
- Provider accepted rồi response timeout không tạo send thứ hai.
- Poller restart từ cursor không mất/nhân đôi mail.
- Auth expiry pause mailbox và alert; queue không bị mất.
- Auto-reply loop bị chặn; reminder dừng đúng state.
- HTML XSS/remote content và malicious attachment bị chặn.
- Cross-scope conversation/body/download access bị deny và audit.
