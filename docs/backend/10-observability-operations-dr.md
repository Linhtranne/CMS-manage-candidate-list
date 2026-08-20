---
title: Observability Operations and Disaster Recovery
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Operations Owner
reviewers:
  - Backend Tech Lead
  - Security Owner
approvers:
  - Operations Owner
  - Backend Tech Lead
risk: critical
---

# 10. Observability, operations và DR

## 1. Target topology

Baseline modular monolith triển khai bằng immutable container trên Ubuntu Server. Production topology cuối cùng, failure domains và capacity cần DEC-006 approve.

```text
Internet -> TLS reverse proxy -> API replicas
                              -> static/frontend service
Private network: API/worker/scheduler -> PostgreSQL
                                      -> Redis/BullMQ
                                      -> S3-compatible private object storage
                                      -> telemetry collector
Egress allowlist: OIDC + selected mail provider
Backup target: separate credentials/failure domain
```

API, worker và scheduler dùng cùng image/digest nhưng command riêng. Migration là release job riêng. PostgreSQL/Redis/object storage không public. Một scheduler leader qua DB advisory lock; nhiều instance không chạy duplicate schedule.

## 2. Environment contract

| Group | Required values | Fail behavior |
|---|---|---|
| app | `APP_ENV`, `APP_VERSION`, `PUBLIC_BASE_URL`, `LOG_LEVEL` | invalid -> process exit |
| database | `DATABASE_URL` secret reference, pool/timeouts | unavailable -> readiness false |
| Redis | URL/TLS/auth, prefix, queue limits | worker readiness false; API async command 503 |
| storage | endpoint/bucket/region/credential refs, size limits | upload/download disabled |
| OIDC | issuer/client/redirect/audience/session settings | production API refuses boot |
| mail | provider/mailbox/credential refs/webhook secret | `DISABLED` is valid safe state |
| security | encryption/blind-index/signing key refs, allowed origins | missing production key -> exit |
| features | mail/purge/export/reminder/break-glass flags | safe defaults in handoff README |

Config schema is code-reviewed and tested. Startup logs key names/status only, không values.

## 3. Container/runtime hardening

- Run non-root, read-only root filesystem, drop Linux capabilities, no privilege escalation.
- Writable tmpfs/volume chỉ cho nhu cầu đã biết; application state không nằm trong container filesystem.
- Health endpoints tách liveness/readiness; không trả dependency URL/secret/detail public.
- CPU/memory/pid/file descriptor limits và graceful shutdown budget.
- Image pinned by digest, minimal runtime, SBOM và scan; timezone UTC.
- Reverse proxy enforce TLS, request limits, security headers, timeout phù hợp upload/webhook.

## 4. Health endpoints

- `/health/live`: event loop/process sống; không check network dependency.
- `/health/ready`: DB query, migration compatibility, required keys/config; API có thể ready khi mail disabled nhưng response component thể hiện `not_configured` ở admin health.
- `/health/startup`: bootstrap/migration compatibility hoàn tất.
- Worker health: Redis connection, active processor heartbeat, queue pause reason.
- Scheduler health: leader lease/last success per schedule.

Health public chỉ trả status/version; component detail cần operational permission/network.

## 5. Structured observability

Mọi request/job/event mang `requestId`, `correlationId`, `traceId`; job preserve correlation của source event và có attempt ID mới.

### Metrics

- HTTP: rate, error by code/status, latency p50/p95/p99, in-flight.
- DB: pool usage/wait, query latency, lock/deadlock, replica/backup status.
- Queue: depth, oldest age, active, completed/failed/retry/DLQ, processing duration.
- Email: queued/sent/uncertain/failed/bounced, ingest lag, cursor age, unmatched, auth expiry.
- Storage/file: upload/scan duration, rejected/failed, object errors.
- Business: application/journey transition failure, overdue milestone/task, export/purge attempts; label cardinality bounded.

Không dùng candidate/user/message ID làm metric label.

### Logs/traces

JSON logs có timestamp UTC, level, service/process/version, IDs, route/job name, outcome/error code/duration. OpenTelemetry spans cho API -> DB/outbox -> worker/provider; payload/PII không gắn vào span. Sampling giữ error/critical transaction nhưng vẫn redacted.

## 6. Proposed SLOs

Các SLO là proposal cần DEC-006 approve trước go-live:

| SLI | Target proposal |
|---|---|
| API availability, trừ planned maintenance | 99.9% tháng |
| Read API p95 | < 500 ms cho profile chuẩn |
| Mutation API p95, không tính async provider | < 800 ms |
| Queue job start p95 | < 60 giây normal load |
| Mail inbound visibility p95 | < 5 phút |
| Email send enqueue-to-attempt p95 | < 2 phút |
| Critical alert acknowledgment | < 15 phút trong support window approved |

Release không được tuyên bố đạt SLO nếu chưa đo workload gần production.

## 7. Alerts

| Severity | Trigger examples | Action |
|---|---|---|
| Critical | auth unavailable toàn hệ thống, DB unavailable, suspected data leak, mail credential compromised, restore/backup chain invalid | page on-call + incident |
| High | error budget burn, queue oldest age breach, mail sync/auth paused, DLQ growth, storage scan unavailable | page/support owner |
| Medium | elevated 4xx/5xx, slow query, reminder lag, capacity trend | ticket + investigate |

Alert phải actionable, có runbook URL, owner, dedupe/suppression và recovery signal. Không alert dựa trên một lỗi đơn lẻ nếu không có impact/risk.

## 8. Runbook set

Production handoff bắt buộc có executable runbooks dưới `runbooks/` khi code:

- API/DB/Redis/object storage unavailable;
- queue backlog/stuck/DLQ replay;
- mailbox auth expiry, webhook failure, sync cursor recovery, uncertain send;
- malicious upload/scan outage;
- migration failure/lock/forward-fix;
- backup failure, point-in-time DB restore, object restore;
- leaked credential/export/signed URL và user revoke;
- disk/capacity exhaustion;
- release rollback và scheduler leader issue.

Mỗi runbook có symptom, impact, safe diagnostics, containment, recovery, verify, escalation và evidence location. Không hướng dẫn xóa queue/data hàng loạt để “khắc phục nhanh”.

## 9. Backup strategy

### PostgreSQL

- Encrypted base backup + continuous WAL/archive cho PITR.
- Backup service identity tách application identity.
- Automated integrity/completion check; restore drill trên isolated environment.
- Schema migration artifact/image phải giữ cùng backup window.

### Object storage

- Versioning/object lock hoặc immutable backup theo legal/operations approval.
- Inventory manifest gồm key/version/checksum/encryption metadata; DB-document link có thể reconcile.
- Lifecycle không được xóa object đang legal hold.

### Redis

Redis không là nguồn sự thật nghiệp vụ. Dùng AOF/persistence để giảm mất queue state, nhưng recovery dựa DB outbox/reconciliation. `noeviction` để không âm thầm mất job.

Backup không bao gồm usable plaintext secret; secret store có recovery process riêng.

## 10. RPO/RTO và restore

RPO/RTO cuối cùng `blocked_by_external_decision`. Proposal để sizing:

- PostgreSQL + object metadata: RPO <= 15 phút, RTO <= 4 giờ.
- Mail/queue: không mất committed intent nhờ outbox; reconcile <= 4 giờ.
- Object binary: RPO <= 24 giờ nếu chưa có synchronous replication, RTO <= 8 giờ.

Không dùng proposal làm cam kết cho đến DEC-006 approved. Go-live cần restore drill end-to-end: DB PITR, object version, application compatibility, checksum/link reconciliation, auth/access và critical workflow smoke.

## 11. Deployment and rollback

1. Build/test/scan/sign immutable image và OpenAPI artifact.
2. Backup health/preflight, capacity và decision gates.
3. Run backward-compatible `prisma migrate deploy` release job.
4. Deploy API canary, smoke/readiness; rồi worker; scheduler cuối.
5. Monitor error/latency/queue/provider metrics trong observation window.
6. Promote hoặc rollback image. Migration destructive không cùng release; forward-fix script chuẩn bị trước.

Rollback không được chạy `migrate reset`/down migration mù. App N-1 phải tương thích schema trong window đã test. Mail/purge/export có kill switch độc lập.

## 12. Capacity và load profile

Baseline design: khoảng 100.000 Candidate, 200 internal users, một mailbox. Load test data gần distribution production nhưng synthetic; profile gồm concurrent search/list, candidate detail, import, report/export, email bursts, inbound poll, milestone/task jobs và mixed traffic.

Capacity report phải ghi hardware/container limits, DB connections/query plans, Redis memory, object throughput, queue concurrency, provider rate limit, saturation point và headroom. Không scale concurrency vượt provider/DB limit chỉ để giảm queue depth.

## 13. Operational acceptance gate

- Compose/manifests có pinned image, non-root, healthcheck, resource limit và private networking.
- Fresh install và upgrade/rollback rehearsal pass.
- Dashboards/alerts/runbooks link từ release evidence; redaction scan sạch.
- Backup jobs thành công và restore drill đạt RPO/RTO approved.
- Kill switch mail/reminder/export/purge được diễn tập và audit.
- Host reboot/process SIGTERM không mất committed intent hoặc gửi email trùng.
- Capacity test đạt SLO/headroom approved; không có queue/connection leak.
