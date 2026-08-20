---
title: Backend Decision Register and Approvals
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Product Owner
reviewers:
  - Backend Tech Lead
  - Security Owner
  - Operations Owner
approvers:
  - Product Owner
  - Backend Tech Lead
risk: critical
---

# 12. Decision register và approvals

## 1. Status model

`proposed -> ready_for_human_approval -> approved | rejected | superseded`.

Chỉ người/nhóm ở cột Approver được đổi sang `approved`. Approval phải có corporate identity, thời gian, version/checksum tài liệu và phạm vi environment. Codex/agent/developer không tự phê duyệt quyết định high-risk.

Nếu đến required gate mà decision chưa approved, hệ thống dùng safe fallback và phase không được bật feature/data liên quan.

## 2. Decision register

| ID | Decision | Status | Owner | Approver | Required before | Safe fallback |
|---|---|---|---|---|---|---|
| DEC-001 | Role/action/scope/sensitivity matrix và separation of duties | `ready_for_human_approval` | Product Owner | Product Owner + Security Owner | Phase 0 IAM merge | deny-by-default; chỉ health/public bootstrap |
| DEC-002 | OIDC provider, issuer/audience, MFA claim, session idle/absolute timeout | `blocked_by_external_decision` | IT Identity Owner | Security Owner + IT Identity Owner | staging login | production API refuses authenticated boot |
| DEC-003 | Mail provider, mailbox address, tenant/DNS owner, OAuth scope, rate/retry limits | `blocked_by_external_decision` | IT/Mail Owner | Security Owner + Business Owner | Phase 1B staging email | `MAIL_PROVIDER=DISABLED` |
| DEC-004 | Production catalog, question/email/Journey templates, milestone fields/evidence/SLA, decision authorities | `blocked_by_external_decision` | Product Owner | Product Owner + Japan Operations Owner | activate production seeds / Phase 2 UAT | technical seed only; no business template active |
| DEC-005 | Privacy purpose/notice, retention, legal hold, cross-border recipient/approval và purge | `blocked_by_external_decision` | Privacy Owner | Privacy/Legal Owner + Business Owner | real-data import/share/go-live | synthetic data only; purge/share disabled |
| DEC-006 | Production topology/capacity, support window, SLO, alerts, RPO/RTO, backup/object immutability | `blocked_by_external_decision` | Operations Owner | Operations Owner + Business Owner | production environment build | staging only; no availability/DR claim |
| DEC-007 | KPI/report definitions, observation windows, UAT actors/dataset và release acceptance | `ready_for_human_approval` | Product Owner | Product Owner + QA Lead | Phase 3 report/UAT | operational raw counts only; no KPI release claim |

## 3. DEC-001 proposed baseline

Approve exact action registry và baseline role matrix tại [03-api-iam-and-permissions](./03-api-iam-and-permissions.md). Required confirmations:

- organizational scope hierarchy và owner/team/department/global mapping;
- ai được quyết định Application `PASSED/FAILED`;
- ai được merge Candidate, waive/reopen milestone, complete Journey;
- ai được đọc passport/email body/document/audit và tạo sensitive export;
- approval pairs cho role grant, cross-border share, break-glass và purge.

Không approve theo tên role chung chung; artifact approved phải chứa action/scope/sensitivity cụ thể.

## 4. DEC-002 required evidence

- provider/tenant/issuer discovery URL và exact audience/client/redirect URIs;
- immutable subject mapping, group/claim mapping và deprovisioning owner;
- MFA claim/policy, idle/absolute timeout, revoke latency;
- dev/staging/prod app registration separation và secret/key rotation;
- test account matrix không dùng shared account.

## 5. DEC-003 required evidence

- selected adapter trong interface của [07-email-hub-workers-and-storage](./07-email-hub-workers-and-storage.md);
- mailbox/domain ownership, sender display, reply/bounce path;
- OAuth permission và admin consent owner;
- SPF/DKIM/DMARC records/results;
- provider rate/quota, webhook/change feed/poller model, cursor behavior;
- data location/retention, raw MIME/attachment policy;
- approved retry/concurrency/uncertain-send reconciliation và canary allowlist.

## 6. DEC-004 required artifact

Versioned machine-readable seed package được business owner review, bao gồm:

- sector/occupation/visa route/residence/case type catalog;
- dynamic candidate fields + classification/validation;
- JobOrder requirement fields và change/version rules;
- interview question templates + required feedback;
- Journey Template applicability, DAG milestones, owner rule, SLA, checklist/evidence và completion condition;
- email templates/event rules/reminder cancellation;
- authority/reason/approval requirements cho decision/exception.

Seed package có checksum; activation là audited release step, không là startup side effect.

## 7. DEC-005 required artifact

- data inventory + purpose/legal basis/notice version;
- retention duration per Candidate/contact/message/raw MIME/attachment/document/audit/export/backup;
- correction/restriction/deletion/legal-hold request process;
- Japan recipient/category/purpose, transfer mechanism và approval workflow;
- masking/encryption/export/share controls;
- non-production anonymization rule và incident/breach contact.

Không dùng “theo chính sách công ty” nếu không có policy version/link/owner.

## 8. DEC-006 required artifact

- environment topology và failure domains, host/container sizing, network/egress;
- PostgreSQL/Redis/object storage/backup responsibility và support ownership;
- SLI/SLO/error budget/support window/escalation;
- RPO/RTO per data class, backup frequency/retention/immutability và restore schedule;
- capacity/load profile, growth/headroom và provider quota;
- monitoring/log retention/incident evidence locations.

## 9. DEC-007 required artifact

- report code/definition version/numerator/denominator/cohort/timezone/freshness;
- UAT actors theo role/scope, synthetic dataset và AC mapping;
- performance thresholds và observation window;
- release signatories, evidence retention và waiver authority;
- business completion definitions cho `PASSED`, `CLIENT_RECEIVED`, `SUPPLY_COMPLETED`.

## 10. Approval record format

Khi quyết định được duyệt, lưu file `docs/backend/decisions/DEC-xxx-<slug>.md` hoặc governance system tương đương:

```yaml
id: DEC-003
status: approved
version: 1.0.0
scope: staging-and-production
artifact_checksum: sha256:<approved-artifact-digest>
approvals:
  - role: Security Owner
    identity: <corporate-identity>
    at: <iso-8601>
  - role: Business Owner
    identity: <corporate-identity>
    at: <iso-8601>
```

Giá trị trong angle brackets là schema; approval thật không được để placeholder. Thay đổi materially khác cần version mới và impact review; không sửa âm thầm record đã approved.

## 11. Gate enforcement

- CI kiểm decision ID/status/version được manifest release tham chiếu.
- Runtime feature high-risk kiểm activation record đã seed từ approved artifact; env flag đơn lẻ không đủ.
- Nếu approval hết hạn/bị revoke, command mới bị fail-closed; dữ liệu lịch sử vẫn đọc theo permission.
- Release note nêu decision mới/superseded và migration/rollback impact.
