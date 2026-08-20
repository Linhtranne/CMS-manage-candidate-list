---
title: Testing Strategy and Release Gates
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - QA Lead
  - Security Owner
  - Operations Owner
approvers:
  - Backend Tech Lead
  - QA Lead
risk: high
---

# 11. Test strategy và release gates

## 1. Principles

- Behavior mới có failing test trước implementation; test pass không thay thế review.
- Domain test dùng table-driven state/permission matrices.
- Repository/migration/constraint test dùng PostgreSQL thật; queue dùng Redis/BullMQ thật; file dùng S3-compatible test service.
- Provider boundary có contract adapter fake và sandbox evidence; không gọi production trong CI.
- E2E gọi HTTP qua auth/session/policy/DB/outbox/worker, không bypass service.
- Không dùng production PII trong fixture/log/snapshot.

## 2. Test suites

| Suite | Scope | Gate |
|---|---|---|
| unit | value object, normalize, state machine, policy, template selection, report math | PR |
| module integration | service + Prisma + transaction + constraint + outbox | PR |
| API contract | OpenAPI request/response/error/security, generated client compatibility | PR |
| E2E | critical business/permission flows with real dependencies | PR + staging |
| migration | zero-to-head, previous-to-head, interrupted backfill, N-1 compatibility | schema PR/release |
| worker resiliency | replay, retry, crash, shutdown, DLQ, reconciliation | PR + staging |
| security | auth/CSRF/BOLA/XSS/SSRF/upload/webhook/redaction/scans | PR/release |
| performance | representative mixed profile and saturation | release |
| recovery | DB PITR, object restore, outbox/queue reconcile | go-live + scheduled drill |
| UAT | Product/Recruiter/Japan Ops/IT/Admin scoped scenarios | release |

## 3. Canonical commands

Backend package scripts phải cung cấp và CI chạy:

```bash
pnpm --filter @cms/api lint
pnpm --filter @cms/api typecheck
pnpm --filter @cms/api test:unit
pnpm --filter @cms/api test:integration
pnpm --filter @cms/api test:contract
pnpm --filter @cms/api test:e2e
pnpm --filter @cms/api test:migration
pnpm --filter @cms/api test:security
pnpm --filter @cms/api build
pnpm --filter @cms/contracts generate
pnpm --filter @cms/contracts test
```

CI fail nếu command thiếu, bị skip không có approved waiver, hoặc generated OpenAPI/client diff chưa commit. Test environment tạo database/bucket/queue namespace riêng và cleanup theo exact namespace.

## 4. Coverage requirements

Không dùng line coverage làm bằng chứng duy nhất. Gate tối thiểu:

- 100% transition edge allow/deny cho Application, Interview, Journey, Milestone, Email, Task.
- 100% action registry có unauthenticated/forbidden/allowed test; sensitive action có missing-reason/approval test.
- Mọi database invariant có ít nhất một concurrent/constraint test.
- Mọi async consumer có replay và poison/transient/permanent failure test.
- Mọi error code trong OpenAPI có contract test ít nhất tại owning module.
- Critical service line/branch coverage >= 90/85%; toàn backend >= 80/75%, waiver cần owner/risk/expiry.

## 5. Contract and frontend compatibility

`openapi/cms.yaml` sau alignment là canonical. Pipeline:

1. lint OpenAPI 3.1 và custom rules (envelope, operationId, security, errors, examples, pagination);
2. generate TypeScript client/types;
3. fail nếu generated diff;
4. run backend provider contract tests;
5. run frontend consumer contract/MSW schema tests;
6. run backward-compatibility diff; breaking change cần versioning/approved migration.

Mock handler phải validate request/response bằng cùng schema; typed path literal count không đủ làm contract gate.

## 6. Required acceptance mapping

Tất cả AC-01–AC-32 và EM-AC-01–04 phải có test ID dạng `AC-xx` trong tên/tag và được map tại [13-traceability](./13-traceability.md). Backend sở hữu AC nghiệp vụ/API/security/async; frontend sở hữu UI-specific AC-28–30 nhưng backend cung cấp behavior/permission contract cần thiết.

Critical end-to-end journeys:

1. OIDC user scoped tạo Candidate đa nghề -> Order -> Application -> multi-round Interview -> PASSED -> Journey đúng template -> documents/evidence -> complete.
2. Shared mailbox preview/send/reply/attachment/match; inbound không đổi domain state.
3. Duplicate import replay -> review -> authorized merge, history/audit intact.
4. Cross-team/role/sensitive field deny ở list/detail/export/download/audit.
5. Concurrent update/version conflict và duplicate command idempotency.

## 7. Migration tests

- Apply all migrations lên empty PostgreSQL version production.
- Upgrade sanitized structural snapshot của release gần nhất.
- Verify raw SQL partial indexes/checks/triggers/DB roles bằng catalog queries.
- Interrupt/resume backfill; checksum/count/constraints đúng.
- Run app N-1 read/write smoke trong compatibility window.
- Capture locks/duration/query plans trên representative volume.
- Prove forward-fix/rollback image strategy; không dùng `db push`/`migrate reset`.

## 8. Worker/provider resilience

Fault injection tại trước/sau DB commit, trước/sau provider accept, Redis reconnect, worker SIGTERM, duplicate event/webhook, stale cursor, object timeout, scan unavailable.

Assertions:

- committed command không mất intent;
- replay không nhân đôi entity/message/task;
- uncertain send không blind retry;
- cursor chỉ advance sau commit;
- max attempt -> DLQ/alert đúng;
- graceful shutdown không bỏ job ở trạng thái giả thành công.

## 9. Security tests

- OIDC issuer/audience/state/nonce/PKCE invalid, expired/deactivated user/session revoke.
- CSRF missing/wrong, disallowed origin, method/content-type confusion.
- IDOR/BOLA across owner/team/department/global và list inference.
- Mass assignment, JSON depth/size, SQL/filter injection, cursor/token tamper.
- Email HTML XSS, dangerous URL/remote content; upload MIME/polyglot/archive bomb/malware.
- Webhook signature/replay/rate; reply token tamper/expiry.
- Secret/PII sentinel scan ở response/log/audit/trace/Redis/job payload/export.
- Dependency/container/SBOM/DAST reports không có unaccepted critical/high.

## 10. Performance gates

Profile và thresholds cuối cần DEC-006. Test report tối thiểu chứa:

- dataset shape: 100k Candidate, proportional profiles/applications/interviews/journeys/messages/tasks;
- 200 user identities với realistic concurrency, think time và scope distribution;
- p50/p95/p99/error/throughput, DB query/pool/locks, CPU/memory, Redis/queue age, storage/provider limits;
- steady state, burst, soak và recovery after dependency degradation;
- critical query plans và index evidence;
- saturation/headroom conclusion, không chỉ average latency.

## 11. Release gates

### Pull request

- linked approved/ready spec + implementation plan task;
- test-first evidence, review, lint/typecheck/unit/integration/contract/build green;
- schema/security/observability impact reviewed;
- no placeholder/secret/generated drift.

### Staging candidate

- immutable image/SBOM/scans; migration rehearsal;
- full E2E/security/resilience pass;
- provider sandbox/canary path pass;
- dashboards/alerts/runbooks operational;
- release notes, rollback/forward-fix and known risks.

### Production go-live

- DEC-001–DEC-007 required for scope approved;
- UAT signatures và no critical/high unaccepted;
- performance/SLO evidence;
- restore drill đạt approved RPO/RTO;
- mail DNS/reply/bounce evidence nếu mail enabled;
- privacy/retention/cross-border approval trước real data;
- Operations/Security/Backend/Product sign-off.

## 12. Evidence format

Mỗi release lưu immutable manifest:

```yaml
release: 1.0.0
commit: <git-sha>
image_digest: sha256:<digest>
openapi_checksum: sha256:<digest>
migration_head: <migration-id>
decisions: [DEC-001, DEC-002, DEC-003, DEC-004, DEC-005, DEC-006, DEC-007]
test_runs:
  - suite: e2e
    command: pnpm --filter @cms/api test:e2e
    result: passed
    artifact: <ci-artifact-id>
approvals:
  - role: Backend Tech Lead
    identity: <corporate-identity>
    at: <iso-8601>
```

Angle-bracket values ở đây là schema mô tả evidence runtime, không phải nội dung được phép để trống trong release thật. Manifest có checksum/signature hoặc được lưu ở CI system bất biến.

## 13. Waiver policy

Chỉ owner gate tương ứng được chấp nhận waiver; waiver ghi risk, scope, compensating control, owner và expiry. Không waiver cho missing auth/scope, data corruption/loss, email duplicate risk, secret/PII leakage, failed restore hoặc unapproved production data processing.
