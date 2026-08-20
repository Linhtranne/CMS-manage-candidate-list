---
title: Supply Journey and Documents Specification
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
reviewers:
  - Product Owner
  - Japan Operations Owner
  - Security Owner
approvers:
  - Backend Tech Lead
  - Product Owner
risk: high
---

# 06. Supply Journey và Document

## 1. Boundary và invariants

SupplyJourney bắt đầu từ một Application `PASSED` và kết thúc khi hoàn tất cung ứng/tiếp nhận hoặc bị hủy. Nó không phải flight management, immigration decision engine hay candidate portal.

1. Candidate chỉ có tối đa một Journey `ACTIVE` hoặc `ON_HOLD`.
2. `candidateId` của Journey phải khớp Candidate của Application nguồn.
3. Template/version và milestone snapshot bất biến sau khi tạo.
4. Email/attachment không tự hoàn tất milestone.
5. Evidence chỉ hợp lệ khi document version là `SAFE` và user có quyền link.
6. `WAIVED` khác `NOT_APPLICABLE`: waive là miễn trừ cho mốc vốn áp dụng và cần quyền/reason.
7. Mốc xuất cảnh là tùy chọn theo template; không có Flight aggregate.

## 2. Service contracts

```ts
interface SupplyJourneyService {
  previewStart(applicationId: string, templateVersionId: string, ctx: CommandContext): Promise<JourneyPreview>;
  start(applicationId: string, input: StartJourney, ctx: CommandContext): Promise<SupplyJourney>;
  changeStatus(id: string, input: ChangeJourneyStatus, expectedVersion: number, ctx: CommandContext): Promise<SupplyJourney>;
  complete(id: string, input: CompleteJourney, expectedVersion: number, ctx: CommandContext): Promise<SupplyJourney>;
  cancel(id: string, input: CancelJourney, expectedVersion: number, ctx: CommandContext): Promise<SupplyJourney>;
}

interface JourneyMilestoneService {
  start(id: string, expectedVersion: number, ctx: CommandContext): Promise<JourneyMilestone>;
  block(id: string, input: BlockMilestone, expectedVersion: number, ctx: CommandContext): Promise<JourneyMilestone>;
  complete(id: string, input: CompleteMilestone, expectedVersion: number, ctx: CommandContext): Promise<JourneyMilestone>;
  waive(id: string, input: WaiveMilestone, expectedVersion: number, ctx: CommandContext): Promise<JourneyMilestone>;
  markNotApplicable(id: string, input: MarkNotApplicable, expectedVersion: number, ctx: CommandContext): Promise<JourneyMilestone>;
  openAttempt(id: string, input: OpenAttempt, expectedVersion: number, ctx: CommandContext): Promise<JourneyMilestoneAttempt>;
}

interface DocumentService {
  createUpload(input: CreateUpload, ctx: CommandContext): Promise<UploadTicket>;
  finalizeUpload(id: string, input: FinalizeUpload, ctx: CommandContext): Promise<DocumentVersion>;
  link(documentVersionId: string, input: LinkDocument, ctx: CommandContext): Promise<DocumentLink>;
  createDownload(id: string, ctx: CommandContext): Promise<DownloadTicket>;
}
```

## 3. Template selection

Applicable template được lọc theo `residenceContext`, `visaRouteVersionId`, `caseType`, và optional sector/occupation. Selection precedence:

1. exact residence + visa + case + occupation;
2. exact residence + visa + case + sector;
3. exact residence + visa + case, không scope ngành;
4. không có match: chặn với `JOURNEY_TEMPLATE_NOT_APPLICABLE`.

Không tự fallback sang template khác residence/visa/case. Nếu nhiều template cùng specificity đang active, chặn `JOURNEY_TEMPLATE_AMBIGUOUS`; Product Owner phải retire hoặc sửa effective date.

Preview trả template/version, milestone được include/exclude, required evidence, SLA, owner rule và warning. Start yêu cầu `previewToken` ký, TTL 15 phút, chứa application version và template checksum.

## 4. Start transaction

Trong một transaction serializable hoặc advisory lock theo Candidate:

1. re-read Application và Candidate;
2. verify Application `PASSED`, template active/applicable và preview token;
3. verify partial unique không có Journey hiệu lực;
4. tạo Journey + milestone snapshot + dependency edges;
5. gán owner theo rule; rule không resolve được thì chặn start;
6. tạo task ban đầu và outbox `supply_journey.started`;
7. ghi audit.

Retry cùng `Idempotency-Key` trả cùng Journey. Khác payload với cùng key trả `IDEMPOTENCY_KEY_REUSED`.

## 5. Journey state machine

| From | To | Điều kiện |
|---|---|---|
| `ACTIVE` | `ON_HOLD` | reason, blocker party và review date bắt buộc |
| `ON_HOLD` | `ACTIVE` | reason; unblock task đóng idempotently |
| `ACTIVE`, `ON_HOLD` | `CANCELLED` | `journey.cancel`, reason code/text; đóng/cancel task còn mở |
| `ACTIVE` | `COMPLETED` | tất cả required milestone `COMPLETED`, `WAIVED` hợp lệ hoặc `NOT_APPLICABLE`; completion condition approved |
| Terminal | — | không transition; journey mới chỉ sau command riêng từ Application hợp lệ |

Không cho complete nếu có document đang `QUARANTINED/SCANNING`, task bắt buộc mở, milestone `BLOCKED/IN_PROGRESS/NOT_STARTED`, hoặc evidence thiếu.

## 6. Milestone và dependency

`JourneyMilestone.status`: `NOT_STARTED`, `IN_PROGRESS`, `BLOCKED`, `COMPLETED`, `WAIVED`, `NOT_APPLICABLE`.

| Command | From | To | Rule |
|---|---|---|---|
| start | `NOT_STARTED`, `BLOCKED` | `IN_PROGRESS` | dependency đã satisfied; blocked resume cần reason |
| block | `NOT_STARTED`, `IN_PROGRESS` | `BLOCKED` | blockerParty, reason, expected resolution bắt buộc |
| complete | `IN_PROGRESS`, `BLOCKED` | `COMPLETED` | checklist/evidence/fields pass; permission theo type |
| waive | non-terminal | `WAIVED` | `journey.milestone.waive`, reason và approval record |
| not-applicable | `NOT_STARTED` | `NOT_APPLICABLE` | applicability expression false hoặc authorized correction |

Dependency graph phải là DAG khi activate template. Dependency được satisfied bởi `COMPLETED`, approved `WAIVED` hoặc `NOT_APPLICABLE`. Parallel milestone có thể start khi toàn bộ predecessor của nó satisfied.

Mỗi transition append history và phát event. `completedAt/by`, waive metadata và blocker metadata không được ghi đè bởi update chung.

## 7. Attempts và correction

Attempt dùng cho hồ sơ/nộp lại/kiểm tra lại mà không xóa lần cũ.

- `attemptNo` tăng atomic dưới lock milestone.
- Open attempt cần reason; attempt cũ thành `SUPERSEDED` hoặc giữ kết quả terminal.
- Milestone đã `COMPLETED` chỉ reopen bằng `journey.milestone.reopen` + approval; history/evidence cũ giữ nguyên.
- Correction template sau start không thay snapshot âm thầm. Command `migrateJourneyTemplate` nằm ngoài MVP, bị fail-closed cho đến khi có decision/migration plan approved.

## 8. Checklist, field và evidence

Template version định nghĩa JSON Schema subset cho field, checklist và evidence requirement. Server kiểm:

- required field và type;
- catalog version còn tồn tại, không nhất thiết còn active;
- required document category/count;
- document version `SAFE`, cùng Candidate owner và sensitivity cho phép;
- evidence timestamp không sau command time;
- manual attestation có actor, reason và attachment/reference theo policy.

Không cho script hoặc remote `$ref`. Expression applicability chỉ dùng DSL allowlist (`eq`, `in`, `and`, `or`, `exists`) trên immutable context snapshot.

## 9. Document pipeline

1. `POST /documents/uploads` kiểm quyền, category, size và trả private pre-signed upload vào quarantine.
2. Client upload binary bằng object key do server cấp.
3. `POST /documents/{id}/finalize` kiểm object metadata/checksum và enqueue scan.
4. Worker detect MIME, antivirus scan, optional content policy; state thành `SAFE` hoặc `REJECTED`.
5. Chỉ `SAFE` được link/download. Rejected binary được cách ly rồi purge theo security retention.

Filename chỉ là metadata đã sanitize. Download ticket TTL tối đa 5 phút, one-purpose, audit mọi sensitive access. Range download do storage gateway xử lý nhưng vẫn cần authorization trước khi ký.

## 10. Document ownership và version

- Candidate là data owner; Document có nhiều immutable versions.
- `DocumentLink` liên kết version với Application/Journey/Milestone; không copy binary.
- Upload version mới không đổi link cũ. Command replace evidence tạo link mới và supersede link cũ có history.
- Không cho link document giữa hai Candidate.
- Delete UI là retire/unlink theo quyền; hard purge chỉ qua retention engine và legal-hold gate.

## 11. Task và email integration

- Milestone start/block/due tạo hoặc update Task bằng deterministic key `journey:{journeyId}:milestone:{milestoneId}:{ruleCode}`.
- Event chỉ yêu cầu notification/email; Email Hub tự kiểm contactability, template activation và send rule.
- Incoming attachment chỉ tạo document candidate ở `QUARANTINED`; coordinator phải classify/link sau `SAFE`.
- Reply có thể đóng task “awaiting reply” khi matcher confidence chắc chắn và rule approved, nhưng không complete milestone.

## 12. Endpoints

| Method/path | Mục đích |
|---|---|
| `GET /applications/{id}/supply-journey-preview?templateVersionId=` | Preview selection và start preconditions |
| `POST /applications/{id}/supply-journey` | Start với preview token + idempotency |
| `GET /supply-journeys/{id}` | Timeline, milestone, tasks, document metadata đã scope |
| `PATCH /supply-journeys/{id}` | Hold/resume bằng explicit command discriminator |
| `POST /supply-journeys/{id}/completion` | Complete |
| `POST /supply-journeys/{id}/cancellation` | Cancel |
| `POST /journey-milestones/{id}/{start|block|completion|waiver|not-applicable}` | Explicit transition |
| `POST /journey-milestones/{id}/attempts` | Mở attempt mới |
| `POST /documents/uploads`, `POST /documents/{id}/finalize` | Upload pipeline |
| `POST /documents/{id}/links`, `POST /documents/{id}/downloads` | Link/download có audit |

## 13. API errors

`APPLICATION_NOT_PASSED`, `ACTIVE_JOURNEY_EXISTS`, `JOURNEY_TEMPLATE_NOT_APPLICABLE`, `JOURNEY_TEMPLATE_AMBIGUOUS`, `JOURNEY_PREVIEW_EXPIRED`, `MILESTONE_DEPENDENCY_UNMET`, `MILESTONE_EVIDENCE_MISSING`, `DOCUMENT_NOT_SAFE`, `DOCUMENT_OWNER_MISMATCH`, `JOURNEY_COMPLETION_BLOCKED`, `INVALID_STATUS_TRANSITION`, `VERSION_CONFLICT`.

Conflict/state error trả 409; validation/evidence error trả 422; authorization luôn dùng 403 không tiết lộ entity ngoài scope.

## 14. Acceptance gate

- AC-04, AC-20, AC-25, AC-27 và AC-31 chạy E2E trên DB + object storage thật trong test environment.
- Concurrency test chứng minh partial unique dưới hai Application `PASSED`.
- Template applicability test đủ residence/visa/case/sector/occupation, ambiguous và no-match.
- Dependency DAG validation và mọi state transition có allow/deny test.
- Journey không có departure milestone vẫn complete hợp lệ khi template quy định.
- Malware/forged MIME/checksum mismatch bị chặn; signed URL hết hạn và cross-scope download bị deny.
- Reopen/attempt/waive giữ history và audit, không sửa evidence cũ.
