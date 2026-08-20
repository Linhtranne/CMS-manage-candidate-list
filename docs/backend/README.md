---
title: Backend Production Handoff
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
risk: high
---

# Backend Production Handoff

## 1. Mục đích

Thư mục này là gói bàn giao để đội backend triển khai production cho Japan Candidate Supply CMS. Tài liệu mô tả contract, kiến trúc, dữ liệu, module, bảo mật, vận hành, kiểm thử và kế hoạch thực thi. Frontend/MSW hiện tại là consumer và test double; business rule phải được triển khai tại backend theo gói này.

## 2. Trạng thái bàn giao

| Hạng mục | Trạng thái | Điều kiện tiếp theo |
|---|---|---|
| Thiết kế kỹ thuật | `ready_for_human_approval` | Backend Tech Lead review |
| Nghiệp vụ và workflow | `ready_for_human_approval` | Product Owner review |
| Auth, PII và permission | `ready_for_human_approval` | Security Owner approve |
| Email production | `blocked_by_external_decision` | Chọn provider, mailbox và DNS owner |
| Production release | `blocked_by_release_gate` | Staging evidence, UAT, security và DR |

Đội backend có thể bắt đầu Contract Alignment và Phase 0 sau khi Backend Tech Lead phê duyệt tài liệu kỹ thuật. Không bật dữ liệu thật, mailbox thật hoặc purge trước các gate tương ứng.

## 3. Thứ tự đọc bắt buộc

1. [Governance và nguồn sự thật](./00-governance-and-source-of-truth.md)
2. [Contract alignment](./01-contract-alignment.md)
3. [Kiến trúc và runtime](./02-architecture-and-runtime.md)
4. [API, IAM và permission](./03-api-iam-and-permissions.md)
5. [Dữ liệu, Prisma và migration](./04-data-prisma-and-migrations.md)
6. [Catalog, Client, Order, Candidate, Application và Interview](./05-recruitment-domain.md)
7. [Supply Journey và Document](./06-supply-journey-and-documents.md)
8. [Email Hub, Worker và Storage](./07-email-hub-workers-and-storage.md)
9. [Task, Report, Admin và Audit](./08-tasks-reports-admin-audit.md)
10. [Security, privacy và threat model](./09-security-privacy-threat-model.md)
11. [Observability, operations và DR](./10-observability-operations-dr.md)
12. [Test strategy và release gates](./11-testing-and-release-gates.md)
13. [Decision register và approvals](./12-decision-register.md)
14. [Traceability](./13-traceability.md)
15. [Definition of Done](./14-definition-of-done.md)

Sau đó đọc implementation plan của phase được giao trong [plans](./plans/README.md).

## 4. Bản đồ module

| Module | Aggregate sở hữu | Không được làm |
|---|---|---|
| `identity-access` | User, Team, Role, Session, Policy | Không đọc PII nghiệp vụ ngoài policy evaluation |
| `catalog` | Industry, Occupation, VisaRoute, FieldDefinition, Template | Không sửa version đã được tham chiếu |
| `clients-orders` | Client, Contact, JobOrder | Không tạo Candidate hoặc quyết định Application |
| `candidates` | Candidate, OccupationProfile, DuplicateCase, ImportBatch | Không lưu Interview/Journey status |
| `applications-interviews` | Application, Interview, snapshots, status history | Không tự tạo Journey khi PASSED |
| `supply-journeys` | Journey, Milestone, attempt, evidence link | Không biến departure thành aggregate hàng không |
| `email-hub` | Mailbox, Conversation, EmailMessage, Attachment, Outbox | Không tự đổi trạng thái nghiệp vụ từ body email |
| `tasks-reporting` | Task, report query, export job | Không ghi ngược aggregate nguồn qua report |
| `audit` | AuditEvent, access event, purge evidence | Append-only; không có update/delete CMS |

## 5. Runtime artifacts

```text
apps/api/
├── src/bootstrap/api.ts
├── src/bootstrap/worker.ts
├── src/bootstrap/scheduler.ts
├── src/modules/<module>/
├── prisma/schema.prisma
├── prisma/migrations/
├── test/
└── Dockerfile
```

- `api`: HTTP `/api/v1`, OIDC/session, permission, query và synchronous command.
- `worker`: BullMQ processors cho email, file, import, export và aggregates.
- `scheduler`: outbox dispatch, mailbox poll, reminder, retention dry-run và health jobs.
- `migration`: `prisma migrate deploy` chạy như một release step riêng, không chạy tự động khi API boot.

## 6. Global invariants

1. Một người có một Candidate; ứng tuyển nhiều đơn tạo nhiều Application.
2. Một Candidate/JobOrder chỉ có một active Application attempt.
3. Application giữ requirement snapshot và Interview giữ question snapshot.
4. Một Candidate chỉ có một SupplyJourney `ACTIVE` hoặc `ON_HOLD`.
5. Email inbound không tự chuyển kết quả phỏng vấn, COE, visa hoặc journey.
6. Message/outbox và domain command liên quan được commit transactionally.
7. Mọi mutation versioned dùng optimistic concurrency và trả `VERSION_CONFLICT`.
8. Admin cấu hình không mặc định đọc PII, email body hoặc document.
9. Audit/status history là append-only.
10. Không hard delete dữ liệu nghiệp vụ qua CMS; purge chỉ chạy theo policy đã approved và legal hold.

## 7. API baseline

- REST + OpenAPI 3.1 tại `/api/v1`.
- JSON camelCase; ID UUIDv7 hoặc UUID do hệ thống sinh và được biểu diễn bằng string.
- Success envelope `{ data, page?, requestId }`.
- Error envelope `{ error: { code, messageKey, params?, fieldErrors?, currentVersion? }, requestId }`.
- Cursor pagination cho mọi list; sort ổn định có `id` làm tie-breaker.
- OIDC SSO; không có local password login production.
- Mutation yêu cầu CSRF token và kiểm tra action/scope/sensitivity tại backend.

## 8. Development gates

Một PR backend không được merge nếu thiếu một trong các mục sau:

- spec và plan link trong PR;
- failing test trước implementation cho behavior mới;
- unit/integration/contract test tương ứng;
- permission allow/deny test cho endpoint nhạy cảm;
- migration rehearsal và rollback note khi có schema change;
- audit/metric/log redaction review;
- OpenAPI generated diff được commit và frontend contract test chạy xanh.

## 9. Production gates

Production release cần đồng thời:

- tất cả decision bắt buộc có status `approved`;
- UAT ký bởi Product Owner và đại diện các bộ phận;
- security review không còn critical/high chưa được chấp nhận;
- restore drill đạt RPO/RTO đã duyệt;
- email SPF/DKIM/DMARC, reply và bounce path có bằng chứng;
- performance profile gần production đạt SLO;
- rollback image, migration compatibility và runbook đã diễn tập.

## 10. Safe defaults

| Cấu hình | Giá trị an toàn trước approval |
|---|---|
| `MAIL_PROVIDER` | `DISABLED` |
| `PURGE_ENABLED` | `false` |
| `BULK_EXPORT_ENABLED` | `false` |
| `BREAK_GLASS_ENABLED` | `false` |
| `AUTO_REMINDER_ENABLED` | `false` |
| `PRODUCTION_SEED_ACTIVATION` | `false` |

Không được đổi các giá trị này ở production chỉ bằng biến môi trường; activation cần decision record và audit release.

## 11. Handoff rule

Developer không tự bổ sung enum, endpoint, role, template, retention duration hoặc retry policy ngoài spec. Nếu cần thay đổi, tạo decision record, cập nhật OpenAPI/data dictionary/test trước implementation.
