# Phase 1B Email Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Triển khai shared mailbox hai chiều, chống gửi/nhận trùng, attachment quarantine và operational recovery mà không tự đổi trạng thái tuyển dụng.

**Architecture:** Email domain lưu intent/message/conversation; provider adapter cô lập Graph/Gmail/SMTP-IMAP; BullMQ xử lý send/ingest/scan/reconcile; DB outbox bảo đảm committed intent.

**Tech Stack:** Phase 0 stack + provider SDK được DEC-003 chọn, S3-compatible storage, antivirus scanner, HTML sanitizer.

**Spec:** [Email Hub](../07-email-hub-workers-and-storage.md), [Security](../09-security-privacy-threat-model.md), [Operations](../10-observability-operations-dr.md).

**Global Constraints:** Mặc định `MAIL_PROVIDER=DISABLED`. Fake adapter được dùng cho CI; provider thật chỉ cấu hình sau DEC-003 và privacy scope DEC-005. Không gửi tới recipient ngoài staging canary allowlist trước gate.

### Task 1: Add email schema, domain model and disabled adapter

**Files:**

- Create: `apps/api/src/modules/email-hub/{domain,application,infrastructure,http,workers}/**`
- Create: `apps/api/prisma/migrations/20260820020100_email_hub/migration.sql`
- Create: `apps/api/src/modules/email-hub/infrastructure/providers/mail-provider.port.ts`
- Create: `apps/api/src/modules/email-hub/infrastructure/providers/disabled.adapter.ts`, `fake.adapter.ts`
- Create: `apps/api/test/email/email-domain.integration-spec.ts`

**Interfaces:** `MailProviderAdapter`, `EmailCommandService`, outbound/inbound state machines and unique provider/idempotency constraints from spec 07.

- [ ] Write failing schema/state/immutability/dedupe tests and disabled-provider health/send behavior.
- [ ] Run email integration tests; confirm RED.
- [ ] Implement mailbox/conversation/message/recipient/attachment/match tables, ports, disabled/fake adapters and state transition guards.
- [ ] Ensure SENT/RECEIVED body/recipient cannot be mutated through repository/service.
- [ ] Run migration/integration/security redaction tests.
- [ ] Commit: `feat(email): add immutable email domain foundation`.

### Task 2: Implement preview, enqueue and outbound worker

**Files:**

- Create: `apps/api/src/modules/email-hub/application/email-preview.service.ts`, `email-command.service.ts`
- Create: `apps/api/src/modules/email-hub/workers/send-email.processor.ts`, `reconcile-send.processor.ts`
- Create: `apps/api/src/modules/email-hub/http/emails.controller.ts`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/api/test/email/outbound-resilience.integration-spec.ts`, `apps/api/test/email/outbound.e2e-spec.ts`

**Interfaces:** `POST /emails/previews`, `POST /emails`, retry/cancel; stable provider idempotency key; states include `RECONCILING` for uncertain outcome.

- [ ] Write failing tests for expired/tampered preview, DNC, template mismatch, same-key replay, provider timeout after accept, transient/permanent/auth failure and auto-reply loop.
- [ ] Run focused suites and retain RED evidence.
- [ ] Implement specificity resolver, signed preview, transaction enqueue + outbox, send CAS, retry classifier and reconciliation-before-retry.
- [ ] Add kill switch, queue metrics, auth-pause alert and canonical errors; no body/recipient in Redis/log.
- [ ] Run AC-05, AC-08, AC-15, AC-19, EM-AC-01/03/04 and contract/security tests.
- [ ] Commit: `feat(email): add idempotent outbound delivery`.

### Task 3: Implement inbound webhook/poller and matcher

**Files:**

- Create: `apps/api/src/modules/email-hub/http/mail-webhook.controller.ts`
- Create: `apps/api/src/modules/email-hub/workers/{mail-sync.processor.ts,fetch-message.processor.ts}`
- Create: `apps/api/src/modules/email-hub/application/email-matcher.service.ts`
- Create: `apps/api/test/email/inbound-replay.integration-spec.ts`, `apps/api/test/email/matcher.e2e-spec.ts`
- Modify: `packages/contracts/openapi/cms.yaml`

**Interfaces:** verified webhook signal -> fetch queue; transactional cursor; priority reply token -> headers -> provider thread -> unique sender conversation -> manual inbox.

- [ ] Write failing tests for invalid/replayed webhook, duplicate webhook+poll, crash before/after cursor commit, token/header/thread matches and ambiguous sender.
- [ ] Run tests and confirm duplicate/cursor/matcher assertions fail.
- [ ] Implement webhook verification/replay cache, change fetch, normalization/sanitization, unique ingest transaction and append-only match decisions.
- [ ] Implement shared inbox/manual resolution permission + reason; inbound event can only create task/stop approved reminder.
- [ ] Run AC-06–08, AC-13–14, AC-16 and EM-AC-02.
- [ ] Commit: `feat(email): ingest and match mailbox replies safely`.

### Task 4: Implement attachment quarantine and document handoff

**Files:**

- Create: `apps/api/src/platform/storage/object-storage.port.ts`, `s3-object-storage.adapter.ts`
- Create: `apps/api/src/platform/files/file-scan.port.ts`, `apps/api/src/modules/email-hub/workers/scan-attachment.processor.ts`
- Create: `apps/api/test/files/attachment-security.integration-spec.ts`
- Modify: `apps/api/src/modules/email-hub/http/conversations.controller.ts`

**Interfaces:** streaming download -> checksum/quarantine -> MIME/AV scan -> `SAFE|REJECTED|FAILED`; signed download only after permission.

- [ ] Write failing tests for oversize stream, forged MIME, malware, archive bomb, scan outage, signed URL expiry and cross-scope access.
- [ ] Run file security tests and confirm RED.
- [ ] Implement streaming limits/checksum/private keys, scanner adapter/state transitions, safe metadata endpoints and document candidate handoff.
- [ ] Enforce no raw object key/provider attachment ID in public DTO; audit body/download access.
- [ ] Run AC-09 and attachment portions AC-06/EM-AC-02 plus redaction scan.
- [ ] Commit: `feat(files): quarantine and scan email attachments`.

### Task 5: Implement selected provider and production operations

**Files:**

- Create: `apps/api/src/modules/email-hub/infrastructure/providers/approved-mail-provider.adapter.ts`
- Create: `apps/api/src/modules/email-hub/http/mailbox-admin.controller.ts`
- Create: `apps/api/runbooks/{mail-auth-expiry.md,mail-sync-recovery.md,uncertain-send.md,email-kill-switch.md}`
- Create: `apps/api/test/providers/mail-provider.contract-spec.ts`
- Modify: `docker-compose.prod.yml`, `.env.example`

**Interfaces:** concrete adapter must satisfy shared contract; admin exposes masked health/pause/resume/sync, never credential/body.

- [ ] After DEC-003 approval, bind `ApprovedMailProviderAdapter` to the selected provider SDK and add sandbox contract tests from approved cursor/send behavior.
- [ ] Run provider contract tests against fake and sandbox; verify concrete adapter initially fails.
- [ ] Implement least-privilege OAuth/credential reference, send/fetch/attachment/subscription methods and rate/quota handling.
- [ ] Add health/alerts/runbooks, webhook endpoint config, cursor/subscription renewal and canary recipient enforcement.
- [ ] Execute SPF/DKIM/DMARC, send/reply/bounce, auth expiry, duplicate and uncertain-send staging drills; attach evidence IDs.
- [ ] Commit: `feat(email): integrate approved shared mailbox provider`.

### Phase 1B checkpoint

- [ ] DEC-003 and applicable DEC-005 records are approved and checksummed.
- [ ] Full email/resilience/security suites and AC/EM mappings pass.
- [ ] Security/Operations verify kill switch, credential revoke, DLQ/reconciliation and no-PII telemetry.
- [ ] Backend Tech Lead verifies [Phase 1B DoD](../14-definition-of-done.md#5-phase-1b-dod).
