---
title: Phase 1B Task 4 attachment quarantine evidence
status: ready_for_human_approval
technical_review: complete
external_approvals: pending
version: 1.0.0
updated_at: 2026-08-24
owner: Backend Tech Lead
risk: critical
---

# Phase 1B Task 4 evidence

## Delivered

- Added a streaming `ObjectStoragePort` and S3-compatible adapter. Quarantine uploads enforce a byte limit while streaming, compute SHA-256, verify an expected checksum and delete partial objects on failure. Raw object keys remain private.
- Added attachment metadata/state transitions: `DISCOVERED -> DOWNLOADING -> QUARANTINED -> SCANNING -> SAFE | REJECTED | FAILED`, provider attachment binding, detected MIME, scan reason and timestamps.
- Inbound ingest now creates sanitized attachment metadata and an ID-only `file.scan.requested` outbox handoff. The command platform routes scan events to `file-scan`; queue payloads are redacted for object keys/signed URLs.
- Added scan worker orchestration: provider stream fetch, quarantine upload, size/integrity checks, scanner verdict handling, terminal state CAS and `document.candidate.created` only after `SAFE`. Rejected/failed scans emit operationally visible ID-only events.
- Added policy/scope/audit-gated mailbox attachment download. Only `SAFE` attachments can create a short-lived signed URL; the response never contains the private object key and every successful access is audited.
- Added the shared email HTML sanitizer and preview-binding test so outbound and inbound renderable HTML cannot carry scripts, handlers, forms, images or dangerous URL schemes.
- Added migration grants and delete revocation for attachment evidence, plus canonical OpenAPI route/schema for the authorized download action.

## Verification

```text
vitest run test/files/attachment-security.integration-spec.ts --pool=threads --maxWorkers=1  # 6 tests passed
vitest run test/email/email-migration.spec.ts --pool=threads --maxWorkers=1                  # passed
vitest run test/platform/outbox-publisher.spec.ts --pool=threads --maxWorkers=1              # passed
vitest run (API) --pool=threads --maxWorkers=1                                                # 48 files passed, 4 skipped; 172 passed, 15 skipped
pnpm --filter @cms/api typecheck                                                              # passed
pnpm --filter @cms/api lint                                                                   # passed; MODULE_BOUNDARY_VIOLATIONS=0
pnpm --filter @cms/api build                                                                  # passed
node worker-module boot smoke                                                                  # WORKER_MODULE_BOOT_OK
pnpm --filter @cms/contracts generate                                                         # passed
pnpm --filter @cms/contracts typecheck                                                        # passed
vitest run (contracts) --pool=threads --maxWorkers=1                                          # 2 files, 7 tests passed
```

The focused security suite covers streamed oversize rejection, filename/path sanitization, forged MIME mismatch, malware and archive-style scanner rejection, scanner outage, checksum/integrity failure, ID-only handoff and signed-download deny-before-`SAFE` behavior. Storage and scanner remain injectable ports; the default runtime bindings are disabled/fail-closed until production object-storage and antivirus approvals exist.

## Remaining gates

- A real S3-compatible bucket, antivirus/content scanner and retention/lifecycle policy are still external production dependencies. No real object upload, malware engine or signed URL is claimed in this environment.
- Document classification/linking is intentionally not automatic. `document.candidate.created` is a handoff signal; coordinator classification/linking remains governed by the Document/Journey phase.
- Backend Tech Lead, Security Owner and Operations Owner must review this evidence before Phase 1B integration.
