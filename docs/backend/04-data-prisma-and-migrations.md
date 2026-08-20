---
title: Data Prisma and Migrations
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - Database Reviewer
  - Security Owner
approvers:
  - Backend Tech Lead
risk: high
---

# 04. Dữ liệu, Prisma và migration

## 1. Database baseline

- PostgreSQL 17, encoding UTF-8, timezone UTC.
- Prisma ORM 7 với PostgreSQL driver adapter.
- Tên table/column SQL dùng `snake_case`; Prisma model/property dùng PascalCase/camelCase với `@@map`/`@map`.
- ID dùng UUID; business code có unique constraint riêng.
- Thời gian dùng `timestamptz`; ngày không có giờ dùng `date`.
- Tiền tệ lưu amount decimal + currency ISO, không lưu chuỗi hiển thị.
- Mọi write entity có `created_at/by`, `updated_at/by`, `version`.

## 2. Schema groups

### IAM

`users`, `identity_links`, `teams`, `departments`, `roles`, `permissions`, `role_permissions`, `user_roles`, `sessions`, `approval_requests`, `break_glass_grants`.

### Catalog

`industry_sectors`, `occupations`, `visa_routes`, `industry_field_definitions`, `qualification_types`, `interview_question_templates`, `interview_question_template_versions`, `supply_journey_templates`, `supply_journey_template_versions`, `journey_milestone_templates`, `email_templates`, `email_template_versions`.

### Recruitment

`clients`, `client_contacts`, `job_orders`, `job_order_visa_routes`, `job_order_requirement_versions`, `candidates`, `candidate_contacts`, `candidate_occupation_profiles`, `qualifications`, `portfolio_items`, `candidate_aliases`, `duplicate_review_cases`, `import_batches`, `import_rows`, `applications`, `application_status_history`, `interviews`, `interview_schedule_history`, `interview_question_snapshots`.

### Journey/document

`supply_journeys`, `journey_milestones`, `journey_milestone_attempts`, `documents`, `document_versions`, `document_links`, `document_access_events`.

### Email/jobs/reporting

`mailboxes`, `conversations`, `email_messages`, `email_recipients`, `attachments`, `email_match_decisions`, `outbox_events`, `job_attempts`, `tasks`, `report_export_jobs`, `audit_events`, `retention_policies`, `legal_holds`, `purge_runs`.

## 3. Core constraints

### Candidate/Application

```sql
CREATE UNIQUE INDEX applications_one_active_attempt
ON applications(candidate_id, job_order_id)
WHERE closed_at IS NULL;
```

- Unique `(candidate_id, job_order_id, attempt_no)`.
- `attempt_no >= 1`.
- Terminal Application status yêu cầu `closed_at` và decision actor/time.
- `requirement_snapshot` và version không update sau create; sửa bằng migration/repair command có audit riêng.

### Interview

- Unique `(application_id, round_no)`.
- `scheduled_start < scheduled_end` khi schedule status cần lịch.
- `COMPLETED` yêu cầu result/recordedAt theo policy.
- Schedule change append `interview_schedule_history`; không update mất giá trị cũ.
- Question snapshot immutable sau khi interview bắt đầu.

### Supply Journey

```sql
CREATE UNIQUE INDEX supply_journeys_one_effective_per_candidate
ON supply_journeys(candidate_id)
WHERE status IN ('ACTIVE', 'ON_HOLD');
```

- `candidate_id` phải khớp Candidate của `application_id`; service kiểm trong transaction và constraint trigger bảo vệ repair/direct SQL.
- Chỉ Application `PASSED` tạo journey.
- Template version snapshot bất biến.
- `COMPLETED` yêu cầu `completed_at`; `CANCELLED` yêu cầu reason.

### Email/outbox

- Unique `(provider, mailbox_id, provider_message_id)` khi provider ID tồn tại.
- Unique `outbox_events.idempotency_key`.
- Email message đã `SENT/RECEIVED` không update body/recipient; correction là event/message mới.
- Outbox payload có `schema_version`, aggregate ID và correlation ID; không chứa credential.

## 4. Candidate sensitive fields

| Data | Storage | Search |
|---|---|---|
| Passport number | Application-level ciphertext + key version | HMAC blind index của country + normalized value |
| Address detail | Ciphertext hoặc encrypted column | Chỉ region code không nhạy cảm |
| Email/phone | Plaintext có column encryption nếu hạ tầng hỗ trợ; access control | Normalized column/index theo policy |
| Email body | Sanitized/plain content encrypted at rest by storage/disk; field access policy | Không đưa full body vào global search |
| Document | Private object storage | Metadata/checksum trong DB |

Khóa mã hóa không nằm trong DB dump. Rotation dùng `key_version`, batch re-encryption idempotent và audit.

## 5. Versioned catalog pattern

Không update row version đã active/được tham chiếu. Dùng identity + version:

```text
catalog_item(id, stable_code)
catalog_version(id, item_id, version, status, valid_from, payload)
```

- Unique `(item_id, version)`.
- Chỉ một version `ACTIVE` tại một thời điểm nếu loại catalog yêu cầu.
- `DRAFT -> ACTIVE -> RETIRED`; không quay lại DRAFT.
- Runtime record lưu exact version ID hoặc snapshot.

## 6. Dynamic industry fields

`IndustryFieldDefinition.schema` là JSON Schema subset được server validate. Không cho custom script, regex không giới hạn hoặc remote `$ref`. Candidate profile `attributes` lưu JSONB cùng `schema_version_id`.

Index JSONB chỉ tạo cho query được Product Owner xác nhận và có load evidence; field dùng report/filter thường xuyên nên promote thành relational/reference field hoặc generated projection.

## 7. Document lifecycle

```text
UPLOADING -> QUARANTINED -> SCANNING -> SAFE | REJECTED
SAFE -> RETIRED -> PURGED
```

- Binary upload vào quarantine key; không dùng filename client làm object key.
- Checksum SHA-256, detected MIME, size và storage version bắt buộc.
- Signed download chỉ cho `SAFE`, TTL tối đa 5 phút baseline.
- `PURGED` xóa binary và PII metadata theo policy nhưng giữ purge evidence không chứa PII.

## 8. Audit append-only

`audit_events` không có update/delete API. DB role của application không có quyền update/delete table này. Event gồm actor/session/request/correlation, action, entity type/ID, reason, filtered diff, occurredAt và source.

Diff không chứa passport plaintext, credential, email body đầy đủ hoặc binary content.

## 9. Index baseline

| Table | Index |
|---|---|
| candidates | normalized email/phone, passport blind index, `(team_id, readiness_status, updated_at, id)`, owner |
| candidate_occupation_profiles | `(candidate_id, occupation_id)`, `(occupation_id, verification_status)` |
| job_orders | `(status, deadline, id)`, client, owner, occupation |
| applications | active partial unique, `(job_order_id, status, id)`, `(recruiter_user_id, status, id)` |
| interviews | `(application_id, round_no)`, `(schedule_status, scheduled_start, id)` |
| journey_milestones | `(owner_user_id, status, due_at, id)`, `(journey_id, sequence)` |
| email_messages | provider unique, Internet Message-ID, `(conversation_id, occurred_at, id)`, delivery status |
| tasks | `(assignee_user_id, status, due_at, id)` |
| audit_events | `(entity_type, entity_id, occurred_at)`, `(actor_user_id, occurred_at)` |
| outbox_events | partial `(state, available_at)` where pending/retry |

Index final chỉ merge sau `EXPLAIN (ANALYZE, BUFFERS)` trên dataset đại diện.

## 10. Migration rules

### Add column

1. Add nullable hoặc có safe constant default không rewrite table.
2. Deploy code đọc cả old/new.
3. Backfill idempotent theo chunk.
4. Verify null count/checksum.
5. Add constraint `NOT VALID`, validate, rồi enforce.

### Rename/remove

1. Add new column.
2. Dual-write tại application service.
3. Backfill và compare.
4. Chuyển read sang new.
5. Dừng dual-write sau compatibility window.
6. Drop old ở release riêng.

### Enum change

Ưu tiên lookup/check constraint hoặc PostgreSQL enum có kế hoạch rõ. Rename value cần application compatibility; không remove value đang tồn tại trước data migration.

### Index

Production dùng `CREATE INDEX CONCURRENTLY` ngoài transaction. Migration runner ghi trạng thái và cho resume an toàn.

## 11. Prisma migration convention

- Prisma schema mô tả model/relationship cơ bản.
- `migration.sql` chứa raw SQL cho partial index, check, trigger và permission.
- Mỗi migration có `README.md` cạnh migration khi risk high, gồm precheck, expected duration, lock risk, verify, rollback/forward-fix.
- `prisma migrate dev` chỉ local; staging/production dùng `prisma migrate deploy` từ immutable image.
- Không chạy `db push` trên shared/prod environment.

## 12. Seed policy

- Seed kỹ thuật: permission registry, system reason codes, safe defaults; idempotent và versioned.
- Seed demo/test: chỉ non-production, dữ liệu giả.
- Catalog/template nghiệp vụ production chỉ activate khi decision record approved.
- Seed không thay đổi password/secret và không tạo super-admin mặc định.

## 13. Import data

Import tách `upload -> parse -> map -> preview -> commit`.

- Upload file checksum và owner.
- Row parse lưu raw reference được bảo vệ, normalized candidate input và lỗi field.
- Commit dùng transaction theo chunk, idempotency theo batch/row.
- Catalog unknown vào review; không tự tạo catalog.
- Partial success có report đã mask.
- Re-run cùng batch không tạo Candidate/Application trùng.

## 14. Retention and purge

Retention duration chưa approved không được hardcode. Engine dùng `retention_policies` versioned, legal hold và dry-run report.

Purge chỉ chạy khi:

- `PURGE_ENABLED=true`;
- policy version approved/active;
- legal hold check pass;
- dry-run được authorized reviewer xác nhận;
- backup retention/replica behavior đã hiểu;
- event purge được audit.

## 15. Migration test gate

- Fresh database migrate từ zero.
- Upgrade từ snapshot schema production gần nhất.
- Roll-forward sau interrupted backfill.
- Constraint/index tồn tại đúng bằng database introspection.
- App N-1 và N chạy trong compatibility window.
- Query plans critical đạt threshold.
- Backup trước migration và restore drill cho migration high-risk.
