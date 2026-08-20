---
title: Tasks Reports Admin and Audit Specification
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - Product Owner
  - Security Owner
  - Operations Owner
approvers:
  - Backend Tech Lead
  - Product Owner
risk: high
---

# 08. Task, Report, Admin và Audit

## 1. Task model

Task hỗ trợ công việc có nguồn từ rule hoặc người dùng; Task không thay state của aggregate nguồn.

```ts
interface TaskService {
  create(input: CreateTask, ctx: CommandContext): Promise<Task>;
  assign(id: string, input: AssignTask, expectedVersion: number, ctx: CommandContext): Promise<Task>;
  start(id: string, expectedVersion: number, ctx: CommandContext): Promise<Task>;
  complete(id: string, input: CompleteTask, expectedVersion: number, ctx: CommandContext): Promise<Task>;
  cancel(id: string, input: CancelTask, expectedVersion: number, ctx: CommandContext): Promise<Task>;
}
```

`Task.status`: `NEW`, `IN_PROGRESS`, `DONE`, `CANCELLED`.

- Assignee bắt buộc là active user/team có scope tới reference entity.
- Rule-created task cần `dueAt`, `ruleCode`, `sourceEventId`, `dedupeKey` unique khi active.
- Manual task cần title, reference entity, due date hoặc explicit `noDueDateReason`.
- `DONE/CANCELLED` terminal; reopen tạo task mới liên kết predecessor.
- Complete task không complete milestone/application; handler nghiệp vụ phải gọi explicit domain command trước hoặc sau theo workflow được spec cho phép.
- `waitingOn`: `CANDIDATE`, `CLIENT_PARTNER`, `INTERNAL`, `OTHER`, null; đây là filter, không phải status.

Deterministic dedupe key: `{ruleCode}:{entityType}:{entityId}:{businessSlot}`. Replay event update task chưa bắt đầu nếu rule cho phép; không tạo duplicate.

## 2. Task generation rules

Rule được version, activate và có owner. Input là domain event; output chỉ create/update/cancel task hoặc request notification. Rule engine không chạy arbitrary code.

| Event | Task baseline |
|---|---|
| `application.passed` | Điều phối review và khởi tạo Journey |
| `interview.scheduled/rescheduled` | Xác nhận lịch/reminder theo rule active |
| `journey.milestone.blocked` | Follow-up blocker theo party/review date |
| `email.received` unmatched/ambiguous | Shared Inbox resolve match |
| `email.bounced` | Sửa contact/recipient |
| document rejected/scan failed | Review và yêu cầu lại hồ sơ |

Rule nghiệp vụ production chưa approved thì không activate; event vẫn được lưu/audit, không tự sinh hành động bất ngờ.

## 3. Ownership transfer

Transfer Candidate/Order/Journey owner là command riêng có permission, new owner scope, reason và expected version. Transaction:

1. đổi owner aggregate;
2. reassign open rule-created tasks theo transfer policy;
3. giữ manually assigned task trừ khi request chỉ rõ và actor có quyền;
4. append history/audit/outbox.

Không bulk transfer nếu preview không còn đúng version. Batch transfer chạy async, mỗi entity atomic, report partial failure đã mask.

## 4. Reporting principles

- Report là read model/query; không ghi ngược domain.
- Mọi số có definition, numerator, denominator, timezone, date basis, filter scope và data freshness.
- Quyền/scope áp trước aggregation và export; không aggregate rồi lọc client-side.
- Empty/unknown khác zero. Late-arriving event có policy recompute.
- Report query phổ biến có materialized projection; refresh idempotent và có watermark.

## 5. Canonical reports

| Code | Definition | Time basis | Denominator |
|---|---|---|---|
| `candidate_inventory` | Count active Candidate theo readiness/sector/occupation/visa/residence | snapshot `asOf` | all scoped active Candidate |
| `order_pipeline` | Count active Application theo JobOrder/status | application state at `asOf` | scoped active attempts |
| `interview_outcomes` | Count completed Interview theo result/round/order | `completedAt` | completed interviews trong range |
| `application_conversion` | PASSED/FAILED/WITHDRAWN từ applications created trong cohort | `application.createdAt` cohort | applications đủ observation window |
| `journey_progress` | Journey/milestone theo status, overdue, blocker party | snapshot + dueAt | scoped effective journeys/milestones |
| `time_to_milestone` | median/p50/p90 từ journey start đến milestone completion | completion cohort | milestones completed, loại waived/N/A |
| `email_operations` | sent/delivered/bounced/failed/unmatched/response latency | provider event time | messages đủ provider status |
| `task_workload` | open/overdue/done theo assignee/team/rule | snapshot/doneAt | scoped tasks |

`conversionRate` trả `{ numerator, denominator, value|null }`; value null nếu denominator zero. Date range dùng `[from, to)` UTC sau khi convert từ timezone request.

## 6. Query API

`GET /reports/{code}?from=&to=&timezone=&groupBy=&filters=` trả:

```json
{
  "data": {
    "definitionVersion": "1.0.0",
    "asOf": "2026-08-20T00:00:00Z",
    "freshnessSeconds": 60,
    "dimensions": [],
    "series": [],
    "totals": {}
  },
  "requestId": "..."
}
```

Server allowlist dimension/filter/sort. Query cost guard giới hạn range/cardinality; request quá lớn trả `REPORT_QUERY_TOO_EXPENSIVE` và gợi ý export.

## 7. Export

Bulk export mặc định tắt bằng `BULK_EXPORT_ENABLED=false`. Khi approved:

1. `POST /report-exports` validate permission, scope, columns, purpose/reason và estimate.
2. Job lưu immutable scope snapshot và policy version.
3. Worker re-check requester active, generate CSV UTF-8 an toàn chống formula injection, encrypt private object.
4. Download ticket TTL tối đa 5 phút, số lần tải có giới hạn, audit mỗi lần.
5. Object tự hết hạn theo export retention approved.

Không export passport plaintext, full email body, secret, raw audit diff hoặc document binary bằng report export. Sensitive export cần action riêng và approval nếu policy yêu cầu.

## 8. Admin boundaries

Admin endpoints quản lý user/team/role assignment, catalog/template version, rule activation, mailbox health, feature flag safe và operational jobs. Admin không mặc định có `candidate.pii.read`, `email.body.read`, `document.download`, `audit.sensitive.read`.

- Không có generic SQL/query console.
- Không sửa record nghiệp vụ trực tiếp.
- Feature flag high-risk cần decision/approval record; production changes audit trước/sau.
- System job retry/cancel cần permission, reason, state precondition và idempotency.
- Role/permission registry do code/seed quản lý; UI không tạo permission string tùy ý.

## 9. Audit contract

```ts
type AuditEvent = {
  id: string;
  occurredAt: string;
  actorType: 'USER' | 'SYSTEM' | 'SUPPORT';
  actorId: string | null;
  sessionId: string | null;
  requestId: string;
  correlationId: string;
  action: string;
  entityType: string;
  entityId: string;
  scope: { teamId?: string; departmentId?: string };
  reason?: string;
  outcome: 'SUCCESS' | 'DENIED' | 'FAILED';
  diff?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
};
```

Audit writer nằm cùng transaction với successful mutation qua DB insert; denied access audit best-effort vào security channel nhưng request không phụ thuộc availability của analytics sink. Application DB role không có update/delete audit table.

Diff dùng allowlist và mask/hash; tuyệt đối không chứa password/token/passport plaintext/email body/full attachment content. Read access tới PII, email body, document, export và audit nhạy cảm tạo access event.

## 10. Audit query và integrity

- `GET /audit-events` bắt buộc `audit.read`, scope, time range tối đa và cursor.
- Filter allowlist: actor, action, entityType/entityId, outcome, date.
- Sensitive metadata cần `audit.sensitive.read` và reason.
- Export audit là job riêng có approval/retention.
- Daily partition/hash manifest hoặc immutable log sink được Operations/Security chọn trong DEC-006; baseline DB append-only + encrypted backup, không được tuyên bố tamper-proof.

## 11. Retention và legal hold

Policy version quyết định retention cho Candidate, message/raw MIME, attachment/document, audit và export. `legal_holds` chặn purge theo subject/entity/category. Trước khi duration được Legal/Privacy approve, purge production bị tắt; archive không đồng nghĩa purge.

Purge pipeline: dry-run -> reviewer approval -> execute theo chunk -> verify object/DB -> immutable purge evidence. Không log PII đã purge.

## 12. Endpoints và errors

- Tasks: `GET/POST /tasks`, `POST /tasks/{id}/{assignment|start|completion|cancellation}`.
- Reports: `GET /reports/{code}`, `POST/GET /report-exports`, `POST /report-exports/{id}/downloads`.
- Admin: `/admin/users`, `/admin/role-assignments`, `/admin/catalog`, `/admin/rules`, `/admin/jobs`, `/admin/mailbox/health`.
- Audit: `GET /audit-events`, `POST /audit-exports`.

Errors: `TASK_ALREADY_EXISTS`, `TASK_TERMINAL`, `ASSIGNEE_OUT_OF_SCOPE`, `REPORT_FILTER_UNSUPPORTED`, `REPORT_QUERY_TOO_EXPENSIVE`, `EXPORT_DISABLED`, `EXPORT_EXPIRED`, `APPROVAL_REQUIRED`, `PURGE_DISABLED`, `LEGAL_HOLD_ACTIVE`, `VERSION_CONFLICT`.

## 13. Acceptance gate

- AC-10, AC-11, AC-17, AC-21, AC-27, AC-31 và AC-32 có E2E allow/deny.
- Event replay không tạo task/export/audit mutation trùng.
- Owner transfer đồng bộ aggregate/task trong transaction và không vượt scope.
- Mỗi canonical report có golden dataset kiểm numerator/denominator/timezone/zero/null.
- Export chống CSV formula injection, hết hạn và bị deny sau revoke user/scope.
- Admin không đọc email body/PII/document nếu không có action độc lập.
- Audit mutation bị DB permission từ chối; diff/log scan không lộ sensitive fixtures.
- Legal hold chặn purge; purge disabled chặn cả API và scheduler.
