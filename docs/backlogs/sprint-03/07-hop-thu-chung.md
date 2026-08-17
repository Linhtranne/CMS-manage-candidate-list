# Hộp thư chung Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây Shared Inbox một mailbox với conversation list/thread, composer, template, unmatched review, attachment quarantine và chống xử lý/gửi trùng.

**Architecture:** Email feature dùng immutable message DTO và asynchronous send status. Composer tạo draft/send request idempotent; incoming association hiển thị confidence/review state nhưng không tự đổi nghiệp vụ. MSW mô phỏng reply, bounce, timeout và version conflict.

**Tech Stack:** Next.js, TypeScript, TanStack Query, React Hook Form, Zod, MSW, Vitest, Playwright.

**Spec:** `docs/ui-ux/05-hop-thu-chung.md`; `docs/05-email-hub.md`; `docs/12-ma-tran-email-thong-bao.md`.

## Trạng thái implementation

- Tasks 1–5 đã triển khai ở frontend/mock runtime.
- Có contract/generated types, inbox/thread, immutable message, composer/template, queued send, idempotency key, unmatched review, attachment quarantine và version conflict.
- Unit test và E2E đã bao phủ queued reply, internal note, missing template context, explicit linking và tệp bị cách ly.
- Chưa kết nối Microsoft 365/Google Workspace/SMTP-IMAP hay lưu trữ backend thật; credential/poller/retention là phần tích hợp sau Sprint 3.

## Global Constraints

- MVP đúng một mailbox; view xử lý không phải nhiều mailbox.
- Candidate không đăng nhập; From là địa chỉ doanh nghiệp chung.
- Message đã gửi/nhận bất biến; internal note không vào email payload.
- Matcher mơ hồ phải review thủ công.
- Retry idempotent; timeout không khuyến khích gửi lại mù quáng.
- Tệp chưa scan/quarantine không được tải.
- Không hiển thị delivered/opened nếu không có evidence.

---

### Task 1: Email contract, statuses và fixtures

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/mail/services/mail-queries.ts`
- Create: `apps/web/src/features/mail/domain/email-status-label.ts`
- Create: `apps/web/src/mocks/fixtures/mail.ts`
- Create: `apps/web/src/mocks/handlers/mail.ts`
- Create: `apps/web/src/features/mail/domain/email-status-label.test.ts`

**Interfaces:**
- Produces: conversation list/detail, draft/send/retry/assign/link/attachment endpoints.
- Produces: `emailStatusLabel(status)` không suy đoán delivered/opened.

- [ ] **Step 1: Viết failing status test**

```ts
it.each([
  ['QUEUED', 'Đang chờ gửi'],
  ['SENT', 'Đã gửi'],
  ['BOUNCED', 'Bị trả lại'],
  ['UNMATCHED', 'Không xác định được ứng viên'],
])('maps %s to explicit Vietnamese text', (status, label) => {
  expect(emailStatusLabel(status)).toBe(label);
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/mail/domain/email-status-label.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Thêm immutable message schema và scenarios**

Fixture gồm received reply, queued send, failed, bounced, unmatched, quarantined attachment và thread vừa có message mới. Message có From/To/Cc, timestamps, body text/sanitized HTML, headers reference tối thiểu và attachments.

```ts
export type EmailMessageFixture = Readonly<{
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  status: EmailStatus;
  from: string;
  to: string[];
  subject: string;
  bodyText: string;
  sentOrReceivedAt: string;
  attachmentIds: string[];
}>;
```

- [ ] **Step 4: Generate contract và chạy tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/mail`  
Expected: PASS.

- [ ] **Step 5: Commit Mail contract**

```powershell
git add packages/contracts apps/web/src/features/mail apps/web/src/mocks
git commit -m "feat: add shared mailbox contracts"
```

---

### Task 2: Inbox list và conversation thread

**Files:**
- Create: `apps/web/src/features/mail/components/mailbox-page.tsx`
- Create: `apps/web/src/features/mail/components/conversation-list.tsx`
- Create: `apps/web/src/features/mail/components/conversation-thread.tsx`
- Create: `apps/web/src/features/mail/components/conversation-context.tsx`
- Create: `apps/web/src/app/(cms)/mailbox/page.tsx`
- Create: `apps/web/src/app/(cms)/mailbox/[conversationId]/page.tsx`
- Create: `apps/web/src/features/mail/components/mailbox-page.test.tsx`

**Interfaces:**
- Produces: `/mailbox` và `/mailbox/[conversationId]`.

- [ ] **Step 1: Viết failing thread test**

```tsx
it('separates internal notes from immutable email messages', async () => {
  render(<MailboxPage initialConversationId="conversation-01" />);
  expect(await screen.findByText('Chỉ nội bộ')).toBeVisible();
  expect(screen.getByText('Ứng viên phản hồi')).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Sửa email đã nhận' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/mail/components/mailbox-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement list/thread/context**

Views đúng UX-05. List hiển thị attachment bằng chữ. Thread sanitize HTML và hiển thị Candidate/Application/Journey context. Trên tablet, list → thread theo route thay vì ba cột bị bóp nhỏ.

```tsx
export function MessageBody({ message }: { message: EmailMessage }) {
  return message.sanitizedHtml
    ? <div dangerouslySetInnerHTML={{ __html: message.sanitizedHtml }} />
    : <p className="whitespace-pre-wrap">{message.bodyText}</p>;
}
```

Chỉ render `sanitizedHtml` do API sanitizer tạo; raw HTML không đi vào DTO Web.

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/mail/components`  
Expected: PASS cho thread, unmatched, no-permission, loading/error và tablet navigation.

- [ ] **Step 5: Commit Inbox UI**

```powershell
git add apps/web/src/features/mail/components 'apps/web/src/app/(cms)/mailbox'
git commit -m "feat: build shared inbox and threads"
```

---

### Task 3: Composer, templates và asynchronous send

**Files:**
- Create: `apps/web/src/features/mail/components/email-composer.tsx`
- Create: `apps/web/src/features/mail/components/template-picker.tsx`
- Create: `apps/web/src/features/mail/components/send-status.tsx`
- Create: `apps/web/src/features/mail/schemas/email-composer.schema.ts`
- Create: `apps/web/src/features/mail/components/email-composer.test.tsx`

**Interfaces:**
- Produces: draft payload `{ conversationId?, to, cc, subject, body, templateId?, context, attachmentIds, version? }`.
- Produces: send payload `{ draftId, idempotencyKey }`.

- [ ] **Step 1: Viết failing missing-variable/internal-note tests**

```tsx
it('blocks send when a required template variable is missing', async () => {
  render(<EmailComposer context={applicationWithoutInterviewTime} />);
  await userEvent.selectOptions(screen.getByLabelText('Mẫu email'), 'INTERVIEW_INVITATION');
  await userEvent.click(screen.getByRole('button', { name: 'Gửi email' }));
  expect(screen.getByText('Thiếu thời gian phỏng vấn')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/mail/components/email-composer.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement composer state machine**

From readonly; preview trước gửi; hai nút chữ `Lưu bản nháp`, `Gửi email`. Sau submit hiển thị `Đã xếp hàng gửi`, không `Đã gửi` cho đến khi status `SENT`. Internal note state nằm ngoài composer payload type.

```ts
export type SendEmailInput = {
  draftId: string;
  idempotencyKey: string;
};

export const visibleSendLabel: Record<SendStatus, string> = {
  QUEUED: 'Đã xếp hàng gửi',
  SENDING: 'Đang gửi',
  SENT: 'Đã gửi',
  FAILED: 'Gửi thất bại',
  BOUNCED: 'Bị trả lại',
};
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/mail`  
Expected: PASS cho draft, missing variable, queued, sent, failed, retry và idempotency.

- [ ] **Step 5: Commit Composer**

```powershell
git add apps/web/src/features/mail
git commit -m "feat: add shared mailbox composer"
```

---

### Task 4: Unmatched review, attachment safety và reply conflict

**Files:**
- Create: `apps/web/src/features/mail/components/link-conversation-dialog.tsx`
- Create: `apps/web/src/features/mail/components/attachment-row.tsx`
- Create: `apps/web/src/features/mail/components/reply-conflict-alert.tsx`
- Create: `apps/web/src/features/mail/components/link-conversation-dialog.test.tsx`

**Interfaces:**
- Produces: link payload `{ conversationId, candidateId, applicationId?, journeyId?, version }`.
- Consumes: attachment scan status và conversation version.

- [ ] **Step 1: Viết failing ambiguous/quarantine tests**

```tsx
it('requires manual candidate selection and blocks quarantined downloads', async () => {
  render(<LinkConversationDialog conversation={ambiguousConversationFixture} open />);
  expect(screen.getByRole('button', { name: 'Xác nhận liên kết' })).toBeDisabled();
  render(<AttachmentRow attachment={quarantinedAttachmentFixture} />);
  expect(screen.queryByRole('link', { name: /Tải xuống/ })).not.toBeInTheDocument();
  expect(screen.getByText('Bị cách ly')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/mail/components/link-conversation-dialog.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement manual link và conflict states**

Search kết quả mask theo quyền; link action audit. Trước reply, nếu `latestMessageId` đổi, composer bị chặn và hiển thị `Có phản hồi mới — tải lại chuỗi email`. Attachment chỉ có download link khi `scanStatus === 'SAFE'` và permission cho phép.

```tsx
const canDownload = attachment.scanStatus === 'SAFE' && permissions.includes('attachments.download');
return canDownload
  ? <a href={attachment.downloadUrl}>Tải xuống {attachment.fileName}</a>
  : <StatusLabel tone={attachment.scanStatus === 'QUARANTINED' ? 'danger' : 'neutral'}>{attachment.scanStatusLabel}</StatusLabel>;
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/mail`  
Expected: PASS cho ambiguous, duplicate email, quarantine, new-message conflict và permission.

- [ ] **Step 5: Commit Mail safety flows**

```powershell
git add apps/web/src/features/mail
git commit -m "feat: add mailbox review and safety states"
```

---

### Task 5: Shared Inbox E2E và release gate

**Files:**
- Create: `tests/e2e/shared-mailbox.spec.ts`

**Interfaces:**
- Consumes: inbox/thread/composer/unmatched scenarios.

- [ ] **Step 1: Viết failing E2E**

```ts
test('staff handles a reply and sends an audited response', async ({ page }) => {
  await page.goto('/mailbox?view=needs-action');
  await page.getByRole('row', { name: /Ứng viên phản hồi/ }).click();
  await page.getByRole('button', { name: 'Trả lời' }).click();
  await page.getByLabel('Nội dung').fill('Cảm ơn bạn đã phản hồi.');
  await page.getByRole('button', { name: 'Gửi email' }).click();
  await expect(page.getByText('Đã xếp hàng gửi')).toBeVisible();
});
```

- [ ] **Step 2: Chạy E2E và xác nhận fail**

Run: `pnpm e2e -- tests/e2e/shared-mailbox.spec.ts`  
Expected: FAIL trước khi flow hoàn chỉnh.

- [ ] **Step 3: Thêm unmatched, quarantine, send-failure, tablet và axe scenarios**

Không assert `Đã đọc`; chỉ assert status có evidence trong fixture.

```ts
test('unmatched mail requires explicit linking', async ({ page }) => {
  await page.goto('/mailbox?view=unmatched');
  await page.getByRole('row', { name: /Không xác định được ứng viên/ }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận liên kết' })).toBeDisabled();
  await assertNoSeriousA11yIssues(page);
});
```

- [ ] **Step 4: Chạy full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e -- tests/e2e/shared-mailbox.spec.ts`  
Expected: exit `0`.

- [ ] **Step 5: Commit Inbox gate**

```powershell
git add tests/e2e/shared-mailbox.spec.ts
git commit -m "test: cover shared mailbox workflows"
```
