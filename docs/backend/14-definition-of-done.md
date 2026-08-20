---
title: Backend Definition of Done
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - Product Owner
  - QA Lead
  - Security Owner
  - Operations Owner
approvers:
  - Backend Tech Lead
  - Product Owner
risk: high
---

# 14. Definition of Done

## 1. Feature/PR DoD

Feature chỉ Done khi tất cả mục áp dụng đều có evidence:

- RQ/AC, spec section, plan task và decision dependency được link.
- Contract/OpenAPI/data dictionary/state/error được cập nhật trước hoặc cùng code.
- Failing test được ghi nhận trước implementation; unit/integration/contract/E2E cần thiết chạy xanh.
- Permission unauthenticated/deny/allow và sensitivity test có đủ.
- Input/output/error/idempotency/concurrency/audit/metric/log redaction được triển khai.
- Migration có precheck, rehearsal, compatibility, verify và forward-fix/rollback note.
- Async/provider flow có replay/retry/uncertain/DLQ/shutdown test.
- Docs/runbook/config schema thay đổi cùng behavior.
- Lint/typecheck/build/test/scans pass; generated artifact không drift.
- Reviewer chuyên môn tương ứng approve; waiver hợp lệ được link nếu có.

“Code đã viết”, “test unit xanh” hoặc “chạy được local” riêng lẻ không đủ Done.

## 2. Module DoD

Mỗi module hoàn thành khi:

1. aggregate ownership/dependency architecture test enforce;
2. tất cả command/query contracts và errors trong spec tồn tại;
3. state/permission matrices bao phủ allow/deny;
4. DB constraints/index/migrations được introspection/performance verify;
5. outbox/event schema/idempotent consumers có compatibility test;
6. API/OpenAPI/generated client/frontend consumer contract xanh;
7. dashboards/alerts/runbooks cho failure modes critical có thật;
8. module AC mapping trong [13-traceability](./13-traceability.md) xanh.

## 3. Phase 0 DoD

- NestJS/Prisma/PostgreSQL/Redis/object storage runtime reproducible local/CI/staging.
- Canonical OpenAPI alignment hoàn thành; password login production bị loại.
- OIDC/session/CSRF/action/scope/sensitivity deny-by-default được E2E chứng minh.
- Base schema/migration/audit/outbox/queue/idempotency/config/health/telemetry hoạt động.
- CI commands/gates, image/SBOM/scans và migration rehearsal xanh.
- DEC-001 approved; DEC-002 approved trước staging login thật.

## 4. Phase 1A DoD

- Catalog/client/contact/JobOrder/requirement version complete.
- Candidate profile/import/duplicate/merge complete.
- Application/Interview/snapshots/saved views complete.
- AC-01–03, AC-17–18, AC-21–24, AC-31 relevant pass.
- Representative query plans/load evidence đạt thresholds approved.

## 5. Phase 1B DoD

- DEC-003/DEC-005 relevant email processing approved.
- One mailbox adapter, outbound/ingest/matcher/attachment/shared inbox/admin health hoàn chỉnh.
- DNS/auth/reply/bounce/canary, duplicate/uncertain-send/restart/auth-expiry evidence pass.
- AC-05–09, AC-13–16, AC-19, AC-26 và EM-AC-01–04 pass.
- Kill switch và incident runbooks được diễn tập.

## 6. Phase 2 DoD

- DEC-004 templates/authority/evidence approved và seed checksum activated.
- Start/template selection/DAG milestone/attempt/block/waive/N-A/document/task integration complete.
- AC-04, AC-20, AC-25, privacy aspects AC-27 và concurrency pass.
- Hai context Journey khác nhau, gồm một flow không có departure bắt buộc, được UAT.

## 7. Phase 3–4 DoD

- Canonical report definitions/export/task/admin/audit/retention controls complete.
- DEC-005–DEC-007 approved cho production scope.
- Full security, performance, recovery và UAT pass.
- Backup/restore drill đạt RPO/RTO; alerts/runbooks/on-call/support ownership active.
- Production release manifest, rollback/forward-fix, image digest và approvals đầy đủ.
- Post-deploy smoke/observation window pass; không có critical/high unaccepted.

## 8. Production release DoD

Release chỉ Done sau khi production behavior được chứng minh, không phải khi deployment command thành công:

- exact version/image/migration/OpenAPI đang chạy được xác minh;
- login/permission/critical read-write/queue/storage/provider health smoke pass;
- metrics/logs/traces/alerts thu được và redacted;
- queue lag/error/provider/DB/storage trong threshold qua observation window;
- rollback target và kill switches sẵn sàng;
- release manifest/signatures lưu immutable;
- Product/Backend/QA/Security/Operations xác nhận các gate thuộc trách nhiệm.

## 9. Not Done conditions

Bất kỳ mục sau làm hạng mục chưa Done:

- spec/decision còn mâu thuẫn hoặc required decision chưa approved;
- endpoint chỉ tồn tại trong mock/OpenAPI nhưng không có provider E2E;
- auth/scope chỉ kiểm frontend/controller mà thiếu service/query enforcement;
- migration chỉ chạy fresh DB, chưa rehearsal upgrade;
- async happy path pass nhưng replay/crash/uncertain outcome chưa test;
- provider/DNS/backup/restore/performance chỉ được cấu hình, chưa có runtime evidence;
- production dùng data/template/retention/mailbox chưa approved;
- có secret/PII trong source/log/trace/audit/Redis/artifact;
- waiver không owner, không expiry hoặc che critical control.
