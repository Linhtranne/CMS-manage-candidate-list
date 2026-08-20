---
title: Recruitment Domain Specification
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - Product Owner
  - Database Reviewer
approvers:
  - Backend Tech Lead
  - Product Owner
risk: high
---

# 05. Catalog, Client, Order, Candidate, Application và Interview

## 1. Phạm vi và aggregate ownership

| Module | Aggregate root | Transaction không được vượt qua |
|---|---|---|
| `catalog` | Catalog item/version, question template/version | Không update version đã active hoặc được tham chiếu |
| `clients-orders` | Client, ClientContact, JobOrder, requirement version | Không ghi Candidate/Application |
| `candidates` | Candidate, occupation profile, qualification, duplicate/import case | Không chứa trạng thái tuyển theo đơn |
| `applications-interviews` | Application, Interview, snapshot/history | Không tự khởi tạo SupplyJourney |

Một người là một Candidate. Một Candidate có thể có nhiều hồ sơ nghề, Application và Interview; readiness của Candidate không được suy ra trực tiếp từ kết quả một Application.

## 2. Service contracts

```ts
type CommandContext = {
  actorId: string;
  requestId: string;
  correlationId: string;
  idempotencyKey?: string;
  reason?: string;
};

interface CatalogService {
  createDraft(input: CreateCatalogDraft, ctx: CommandContext): Promise<CatalogVersion>;
  activate(versionId: string, expectedVersion: number, ctx: CommandContext): Promise<CatalogVersion>;
  retire(versionId: string, expectedVersion: number, ctx: CommandContext): Promise<CatalogVersion>;
}

interface CandidateService {
  create(input: CreateCandidate, ctx: CommandContext): Promise<Candidate>;
  update(id: string, input: UpdateCandidate, expectedVersion: number, ctx: CommandContext): Promise<Candidate>;
  addOccupationProfile(id: string, input: CreateOccupationProfile, ctx: CommandContext): Promise<CandidateOccupationProfile>;
  archive(id: string, expectedVersion: number, ctx: CommandContext): Promise<Candidate>;
  merge(input: MergeCandidates, ctx: CommandContext): Promise<MergeResult>;
}

interface ApplicationService {
  create(candidateId: string, input: CreateApplication, ctx: CommandContext): Promise<Application>;
  transition(id: string, input: TransitionApplication, expectedVersion: number, ctx: CommandContext): Promise<Application>;
}

interface InterviewService {
  create(applicationId: string, input: CreateInterview, ctx: CommandContext): Promise<Interview>;
  reschedule(id: string, input: RescheduleInterview, expectedVersion: number, ctx: CommandContext): Promise<Interview>;
  complete(id: string, input: CompleteInterview, expectedVersion: number, ctx: CommandContext): Promise<Interview>;
  cancel(id: string, input: CancelInterview, expectedVersion: number, ctx: CommandContext): Promise<Interview>;
}
```

Mọi command gọi authorization trước transaction; trong transaction phải re-check scope-bearing entity và version để chống TOCTOU.

## 3. Catalog và template versioning

State machine: `DRAFT -> ACTIVE -> RETIRED`. Không có transition ngược.

- `stableCode` là định danh nghiệp vụ; `(itemId, version)` là unique.
- Chỉ version `ACTIVE` được chọn cho record mới.
- Activate cần schema hợp lệ, nhãn Việt bắt buộc, và reference hợp lệ.
- Catalog referenced không hard delete. Retire chỉ ngăn chọn mới.
- Interview question template được snapshot toàn bộ câu hỏi, thứ tự, ngôn ngữ và scoring rule khi tạo Interview.
- Unknown catalog trong import tạo row error/review; không tự sinh catalog.

API bắt buộc: `GET/POST /catalog/{type}`, `POST /catalog/{type}/{id}/versions`, `POST /catalog/{type}/versions/{versionId}/activation`, `POST .../retirement`. Mutation dùng `If-Match` hoặc body `version`, không dùng cả hai trong cùng endpoint.

## 4. Client và JobOrder

`JobOrder.status`:

| From | To hợp lệ | Điều kiện |
|---|---|---|
| `DRAFT` | `OPEN`, `CANCELLED` | `OPEN` cần client active, quantity > 0, occupation và requirement version active |
| `OPEN` | `ON_HOLD`, `FILLED`, `CLOSED`, `CANCELLED` | reason bắt buộc trừ `FILLED`; không nhận Application mới sau transition |
| `ON_HOLD` | `OPEN`, `CLOSED`, `CANCELLED` | reopen cần deadline hợp lệ và reason |
| `FILLED` | `CLOSED` | chỉ đóng hành chính |
| `CLOSED`, `CANCELLED` | — | terminal |

Mỗi thay đổi tiêu chí tuyển tạo `job_order_requirement_versions`; Application mới snapshot exact version. Application hiện hữu không đổi hồi tố.

Transaction mở đơn ghi JobOrder, active requirement version, audit và outbox `job_order.opened`. Nếu một phần thất bại, toàn bộ rollback.

## 5. Candidate

### 5.1 State độc lập

- `recordStatus`: `ACTIVE`, `ARCHIVED`.
- `readinessStatus`: `POTENTIAL`, `QUALIFIED`, `READY`, `PAUSED`, `NOT_SUITABLE`.
- `contactabilityStatus`: `CONTACTABLE`, `TEMPORARILY_UNREACHABLE`, `DO_NOT_CONTACT`.

`DO_NOT_CONTACT` chặn mọi send command và reminder; override không tồn tại trong MVP. Archive cần reason nhưng không đóng Application/Journey ngầm; nếu còn aggregate hiệu lực, API trả `CANDIDATE_HAS_ACTIVE_WORK` và yêu cầu xử lý từng aggregate.

### 5.2 Normalize và duplicate

Normalize email bằng trim/lowercase; phone theo E.164 sau khi xác định country; tên dùng canonical Unicode để scoring nhưng giữ original; passport dùng ciphertext + blind index.

| Tín hiệu | Kết quả |
|---|---|
| Exact passport blind index | Chặn create/import và trả duplicate case |
| Exact normalized email/phone | Chặn auto-create; tạo review case |
| Fuzzy name + birth date hoặc nhiều tín hiệu yếu | Cho preview, không auto-merge |
| Không có tín hiệu đủ ngưỡng | Cho tạo mới |

Ngưỡng fuzzy là cấu hình versioned được Product Owner duyệt; trước approval chỉ exact matching được bật.

### 5.3 Merge

Merge là command high-risk, cần `candidate.merge`, reason và preview token còn hạn. Winner giữ ID; loser thành alias/merged record không sửa được. Transaction chuyển relationship được phép, từ chối khi hai Candidate có active Application cùng JobOrder hoặc cùng có Journey hiệu lực. Email message và audit không đổi owner lịch sử; thêm resolution link. Không tự chọn field khi hai giá trị nhạy cảm xung đột.

## 6. Import pipeline

`UPLOADED -> PARSED -> MAPPED -> PREVIEW_READY -> COMMITTING -> COMPLETED | COMPLETED_WITH_ERRORS | FAILED`.

- `POST /imports` nhận file đã scan `SAFE` và `Idempotency-Key`.
- Mapping chỉ dùng allowlist field/catalog.
- Preview trả counts: create/update/duplicate/review/error và sample đã mask.
- Commit yêu cầu preview token, checksum và mapping version khớp.
- Mỗi row có deterministic idempotency key `${batchId}:${rowNumber}:${normalizedHash}`.
- Chunk transaction không vượt 500 rows; batch có thể partial success nhưng mỗi row atomic.
- Error report dùng signed URL ngắn hạn, scope theo batch owner/team.

## 7. Application

`Application.status`: `MATCHED`, `IN_INTERVIEW_PROCESS`, `ON_HOLD`, `PASSED`, `FAILED`, `WITHDRAWN`.

| From | To hợp lệ | Điều kiện |
|---|---|---|
| `MATCHED` | `IN_INTERVIEW_PROCESS`, `ON_HOLD`, `WITHDRAWN` | Interview đầu tiên có thể được tạo cùng transaction |
| `IN_INTERVIEW_PROCESS` | `ON_HOLD`, `PASSED`, `FAILED`, `WITHDRAWN` | `PASSED/FAILED` cần decision permission, reason và policy-required feedback |
| `ON_HOLD` | `MATCHED`, `IN_INTERVIEW_PROCESS`, `FAILED`, `WITHDRAWN` | resume target phải phản ánh đã có Interview hay chưa |
| Terminal | — | mở attempt mới bằng Application mới sau khi order còn nhận hồ sơ |

Create kiểm Candidate active, JobOrder `OPEN`, scope, contact policy và active-attempt unique. Nó snapshot requirement version, recruiter/team và candidate profile references trong một transaction với history/audit/outbox.

Transition ghi append-only `application_status_history`. `PASSED` không tự tạo Journey; chỉ phát event `application.passed` và task cho coordinator.

## 8. Interview

- `scheduleStatus`: `DRAFT`, `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.
- `result`: `PASSED`, `FAILED`, `PENDING` hoặc null theo schedule state; Interview result không tự quyết định Application.
- Unique `(applicationId, roundNo)`; round tự tăng dưới row/advisory lock của Application.
- `SCHEDULED` cần UTC start/end, IANA timezone, mode, participant và active Application.
- Reschedule append old/new time, timezone, actor, reason; phát event sau commit.
- Complete cần feedback fields theo versioned question snapshot. Question snapshot immutable từ khi schedule.
- `NO_SHOW` và `CANCELLED` cần actor/reason; reminder pending phải bị cancel idempotently.

Saved views là query, không phải trạng thái mới:

- `waiting-interviews`: active Application có Interview `SCHEDULED` chưa hoàn tất.
- `interviewed`: tồn tại Interview `COMPLETED`.
- `passed-applications`: Application `PASSED`.

## 9. API errors

| Code | HTTP | Khi dùng |
|---|---:|---|
| `CATALOG_VERSION_IN_USE` | 409 | sửa/xóa version đã tham chiếu |
| `JOB_ORDER_NOT_OPEN` | 409 | tạo Application cho order không mở |
| `DUPLICATE_CANDIDATE_REVIEW_REQUIRED` | 409 | exact/strong duplicate |
| `MERGE_CONFLICT` | 409 | relationship không hợp nhất an toàn |
| `ACTIVE_APPLICATION_EXISTS` | 409 | trùng Candidate/JobOrder active attempt |
| `INVALID_STATUS_TRANSITION` | 422 | state transition ngoài bảng |
| `INTERVIEW_SCHEDULE_CONFLICT` | 409 | thời gian/người tham gia xung đột theo policy |
| `REQUIRED_FEEDBACK_MISSING` | 422 | complete/decision thiếu field |
| `VERSION_CONFLICT` | 409 | optimistic concurrency thất bại |

## 10. Required domain events

`candidate.created`, `candidate.updated`, `candidate.merged`, `job_order.opened`, `job_order.status_changed`, `application.created`, `application.status_changed`, `application.passed`, `interview.scheduled`, `interview.rescheduled`, `interview.completed`, `interview.cancelled`.

Event chỉ được publish từ transactional outbox; consumer phải idempotent theo event ID và payload có `schemaVersion`.

## 11. Acceptance gate

- AC-01, AC-02, AC-03, AC-18, AC-21–AC-24 và AC-31 chạy E2E trên PostgreSQL thật.
- Unit test bao phủ toàn bộ transition matrix allow/deny.
- Concurrency test chứng minh không tạo hai active Application và không trùng round.
- Permission test có ít nhất owner/team/global allow và cross-scope deny cho từng mutation.
- Snapshot test chứng minh đổi requirement/question template không sửa lịch sử.
- Import replay không tạo thêm record; merge giữ đủ history và audit.
