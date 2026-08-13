# 11. Từ điển dữ liệu và ràng buộc

## 1. Mục tiêu và quy ước

Tài liệu định nghĩa các trường cốt lõi, enum, khóa duy nhất và quy tắc dữ liệu cho CMS quản lý ứng viên và lộ trình cung ứng nhân sự đa ngành sang Nhật. IT là một ngành trong danh mục cấu hình, không phải phạm vi duy nhất của hệ thống.

- Khóa chính: UUID/ULID do hệ thống sinh; mã nghiệp vụ chỉ dùng hiển thị/tìm kiếm.
- Thời gian: `TIMESTAMPTZ`, lưu UTC; UI hiển thị theo múi giờ người dùng hoặc đơn hàng.
- Mọi bảng nghiệp vụ có `created_at`, `created_by`, `updated_at`, `updated_by`, `version`.
- Dữ liệu nghiệp vụ dùng archive; purge theo retention là quy trình riêng.
- Enum trong tài liệu là hợp đồng nghiệp vụ; thay đổi enum cần migration và cập nhật báo cáo/test.
- Danh mục và mẫu quy trình có version; bản ghi lịch sử giữ nguyên snapshot/version đã dùng.

## 2. Candidate

| Trường | Kiểu/giá trị | Bắt buộc | Quy tắc |
|---|---|---:|---|
| `id` | UUID/ULID | Có | Khóa nội bộ, không đổi |
| `candidate_code` | string | Có | Unique, ví dụ `UV-2026-00128` |
| `full_name` | string | Có | Trim, giữ nguyên dấu để hiển thị |
| `name_furigana` | string | Không | Tên đọc tiếng Nhật nếu có |
| `date_of_birth` | date | Không | Trường nhạy cảm, không hiển thị trên list mặc định |
| `primary_email` | string | Có để gửi mail | Lưu bản gốc và bản normalized lowercase/trim |
| `primary_phone` | string | Không | Lưu bản gốc và E.164 nếu chuẩn hóa được |
| `owner_user_id` | FK User | Có | Không để hồ sơ hoạt động không có owner |
| `team_id` | FK Team | Có | Là cơ sở tính data scope |
| `source_id` | FK CandidateSource | Có | Dùng cho attribution/report |
| `record_status` | `ACTIVE`, `ARCHIVED` | Có | Archive không phải purge |
| `readiness_status` | xem dưới | Có | Không chứa kết quả của từng application |
| `contactability_status` | xem dưới | Có | `DO_NOT_CONTACT` chặn hành động gửi |
| `japanese_level` | danh mục | Không | N5–N1 hoặc giá trị được quản trị |
| `current_country/region` | danh mục/string | Có | Dùng chọn lộ trình cung ứng phù hợp |
| `residence_status/expiry` | danh mục/date | Không | Trạng thái lưu trú hiện tại và ngày hết hạn nếu đang ở Nhật |
| `archived_at/reason` | timestamp/string | Khi archive | Bắt buộc reason |

`readiness_status`: `POTENTIAL`, `QUALIFIED`, `READY`, `PAUSED`, `NOT_SUITABLE`.

`contactability_status`: `CONTACTABLE`, `TEMPORARILY_UNREACHABLE`, `DO_NOT_CONTACT`.

### 2.1 Định danh nhạy cảm

| Trường | Cách lưu | Cách tìm |
|---|---|---|
| Passport number | ciphertext bằng khóa quản lý riêng | HMAC blind index của `issuing_country + normalized_passport` |
| Địa chỉ | ciphertext hoặc field encryption | Chỉ tìm ở mức khu vực không nhạy cảm nếu cần |
| Tệp giấy tờ | private object storage | Metadata/checksum trong DB, signed URL ngắn hạn |

Không ghi plaintext passport, token, body email hoặc nội dung tài liệu vào application log, search index hay analytics event.

## 3. Danh mục đa ngành và hồ sơ năng lực

### 3.1 IndustrySector, Occupation và VisaRoute

| Thực thể | Trường cốt lõi | Ràng buộc |
|---|---|---|
| `IndustrySector` | code, name_vi, name_ja, status, version | `code + version` unique; không xóa version đã được tham chiếu |
| `Occupation` | sector_id, code, name_vi, name_ja, status, version | `sector_id + code + version` unique |
| `VisaRoute` | code, name, residence_context, status, version | Phân biệt ứng viên ngoài Nhật và đang ở Nhật |
| `IndustryFieldDefinition` | sector/occupation, field_key, label, data_type, validation, required_rule, version | JSON schema được kiểm tra; không thực thi script tùy ý |

Không sao chép cứng danh mục ngành của portal tham khảo vào mã nguồn. Business owner duyệt danh mục khởi tạo; IT chỉ là một `IndustrySector` và có thể có các nghề như backend, frontend, QA hoặc hạ tầng.

### 3.2 CandidateOccupationProfile và Qualification

| Trường/Thực thể | Kiểu/giá trị | Quy tắc |
|---|---|---|
| `candidate_id`, `occupation_id` | FK | Một Candidate có thể có nhiều hồ sơ nghề |
| `years_experience` | decimal | Thuộc hồ sơ nghề, không phải thuộc tính chung toàn ứng viên |
| `skill_summary` | text | Tóm tắt năng lực theo nghề |
| `attributes` | JSONB | Kiểm tra theo `IndustryFieldDefinition` và `schema_version` |
| `schema_version` | integer | Giữ được ngữ nghĩa dữ liệu lịch sử |
| `verification_status` | `UNVERIFIED`, `VERIFIED`, `REJECTED` | Có `verified_at`, `verified_by`, reason khi từ chối |
| `Qualification` | candidate, type, issuer, result, issued/expiry dates, evidence document | Danh mục loại chứng chỉ có thể scoped theo ngành/nghề |
| `PortfolioItem` | candidate profile, type, URL/document, description | Portfolio IT chỉ là một trường hợp sử dụng |

Unique active `(candidate_id, occupation_id)`. Khi đổi nghề chính không xóa hồ sơ nghề cũ; chuyển trạng thái và giữ audit.

## 4. Client và JobOrder

| Thực thể | Trường cốt lõi | Ràng buộc |
|---|---|---|
| `Client` | code, legal/display name, country, owner | `client_code` unique |
| `ClientContact` | client, name, role, email, phone | Email/phone được mask theo quyền |
| `JobOrder` | client, code, title, sector, occupation, skills/conditions, accepted visa routes, Japanese level, location, salary, quantity, deadline, owner, status, requirement_version | `job_order_code` unique; quantity > 0; version yêu cầu tăng khi thay đổi tiêu chí |
| `JobOrderVisaRoute` | job_order, visa_route, priority, note | Unique `(job_order_id, visa_route_id)` |

`JobOrder.status`: `DRAFT`, `OPEN`, `ON_HOLD`, `FILLED`, `CANCELLED`, `CLOSED`.

Đây là ngữ cảnh cung ứng, không phải pipeline CRM bán hàng.

## 5. Application và Interview

### 5.1 Application

| Trường | Kiểu/giá trị | Quy tắc |
|---|---|---|
| `candidate_id`, `job_order_id` | FK | Bắt buộc |
| `attempt_no` | integer từ 1 | Tăng khi ứng viên quay lại cùng đơn hàng sau lần đã đóng |
| `status` | enum | `MATCHED`, `IN_INTERVIEW_PROCESS`, `ON_HOLD`, `PASSED`, `FAILED`, `WITHDRAWN` |
| `recruiter_user_id` | FK User | Owner tuyển dụng |
| `requirement_snapshot` | JSONB | Snapshot bất biến của ngành, nghề, kỹ năng, điều kiện, visa route và `requirement_version` lúc tạo/giới thiệu |
| `introduced_at` | timestamp | Thời điểm giới thiệu chính thức |
| `closed_at` | timestamp | Có khi `PASSED/FAILED/WITHDRAWN` |
| `version` | integer | Dùng optimistic concurrency |

Ràng buộc:

- Unique `(candidate_id, job_order_id, attempt_no)`.
- Partial unique `(candidate_id, job_order_id) WHERE closed_at IS NULL` để chỉ có một lần đang hoạt động.
- Chỉ `PASSED` mới được tạo `SupplyJourney`.
- Mọi transition ghi `ApplicationStatusHistory` append-only với actor, reason và version.
- Thay đổi JobOrder sau đó không hồi tố vào `requirement_snapshot` của Application cũ.

### 5.2 Interview

| Trường | Kiểu/giá trị | Quy tắc |
|---|---|---|
| `application_id`, `round_no` | FK/integer | Unique cùng application |
| `schedule_status` | enum | `DRAFT`, `SCHEDULED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` |
| `result` | enum | `PENDING`, `ADVANCE_NEXT_ROUND`, `PASS`, `FAIL` |
| `scheduled_start/end` | timestamptz | Bắt buộc khi `SCHEDULED` |
| `timezone` | IANA string | Không dùng offset cố định |
| `format/location_or_link` | string | Mask link nếu có thông tin nhạy cảm |
| `feedback` | text | Quyền đọc/ghi riêng theo chính sách |
| `question_snapshot_version` | integer | Khóa bộ câu hỏi đã dùng cho vòng phỏng vấn |

`InterviewQuestionTemplate` được scoped theo ngành/nghề/vòng và có version. Khi lên lịch hoặc bắt đầu phỏng vấn, hệ thống tạo `InterviewQuestionSnapshot`; chỉnh template sau đó không đổi lịch sử đánh giá.

View dẫn xuất:

- `waiting_interview`: tồn tại Interview `SCHEDULED` chưa hoàn tất trên application đang hoạt động.
- `interviewed`: tồn tại ít nhất một Interview `COMPLETED`.

## 6. SupplyJourney và JourneyMilestone

### 6.1 SupplyJourneyTemplate

| Trường | Giá trị | Quy tắc |
|---|---|---|
| `code`, `version` | string/integer | Unique; version đã dùng không được sửa phá vỡ lịch sử |
| `residence_context` | `OUTSIDE_JAPAN`, `IN_JAPAN` | Bắt buộc |
| `visa_route_id` | FK | Có thể bắt buộc theo loại lộ trình |
| `industry_sector_id/occupation_id` | FK tùy chọn | Chỉ dùng khi lộ trình khác thực sự theo ngành/nghề |
| `case_type` | `NEW_ENTRY`, `JOB_CHANGE`, `STATUS_CHANGE`, `OTHER` | Phân loại nghiệp vụ |
| `status` | `DRAFT`, `ACTIVE`, `RETIRED` | Chỉ template `ACTIVE` được chọn cho hành trình mới |

`JourneyMilestoneTemplate` định nghĩa thứ tự, điều kiện áp dụng, SLA, checklist và tài liệu cần có. Việc chọn template phải được kiểm tra với nơi cư trú, visa route, JobOrder và hồ sơ ứng viên.

### 6.2 SupplyJourney

| Trường | Giá trị | Quy tắc |
|---|---|---|
| `application_id` | FK | Unique cho lộ trình hiệu lực |
| `template_id/template_version` | FK/integer | Snapshot template được chọn lúc khởi tạo |
| `owner_user_id` | FK | Điều phối chịu trách nhiệm |
| `status` | enum | `ACTIVE`, `ON_HOLD`, `COMPLETED`, `CANCELLED` |
| `started_at/completed_at` | timestamp | `completed_at` chỉ khi đã xác nhận tiếp nhận |
| `cancel_reason` | string | Bắt buộc khi `CANCELLED` |

### 6.3 JourneyMilestone

Danh mục mốc chuẩn để Journey Template lựa chọn, sắp xếp và cấu hình điều kiện:

1. `JOB_ACCEPTANCE_CONFIRMED`
2. `CONTRACT_AND_DOCUMENTS`
3. `COE`
4. `VISA`
5. `PRE_DEPARTURE_PREPARATION`
6. `DEPARTURE_PLAN`
7. `ARRIVED_IN_JAPAN`
8. `CLIENT_RECEIVED`
9. `SUPPLY_COMPLETED`

Mỗi mốc có `status` (`NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`, `WAIVED`, `NOT_APPLICABLE`), `owner_user_id`, `planned_at`, `due_at`, `completed_at`, `blocker_reason`, `waive_reason`, `attempt_no`, checklist và liên kết tài liệu.

Ứng viên đang ở Nhật không bị ép qua các mốc xuất cảnh; template phù hợp có thể bỏ các mốc đó hoặc đánh dấu `NOT_APPLICABLE` có lý do. Các trường tùy chọn của `DEPARTURE_PLAN` gồm ngày xuất cảnh, điểm đi/đến, tham chiếu lịch trình và tệp xác nhận. Không tạo bảng `Flight`/`FlightSegment` trong baseline.

## 7. Email và tệp đính kèm

| Thực thể | Trường/ràng buộc chính |
|---|---|
| `Mailbox` | Một bản ghi `ACTIVE` trong MVP; provider, address, credential reference, sync cursor, health |
| `Conversation` | Bắt buộc `candidate_id`; `application_id`/`supply_journey_id` tùy ngữ cảnh; subject normalized |
| `EmailMessage` | direction, provider IDs, Internet Message-ID, from/to/cc/bcc, subject, sanitized HTML, plain text, raw-header reference, delivery status, timestamps |
| `Attachment` | message, filename, detected MIME, size, checksum, object key, scan status |
| `EmailMatchDecision` | message, rule, candidate/conversation được chọn, confidence, actor, reason |
| `Outbox` | message, idempotency key unique, state, attempts, next_attempt_at, last_error |

Ràng buộc quan trọng:

- Unique `(provider, mailbox_id, provider_message_id)`.
- `internet_message_id` được index nhưng không giả định unique toàn cục nếu provider trả dữ liệu lỗi.
- `idempotency_key` unique cho email logic gửi đi.
- Conversation không được tồn tại mà không có candidate sau khi rời `Needs Review`.
- `DO_NOT_CONTACT` chặn gửi mới, trừ luồng pháp lý được phê duyệt và audit.

## 8. Task, Document và Audit

| Thực thể | Quy tắc |
|---|---|
| `Task` | Bắt buộc assignee, status (`NEW`, `IN_PROGRESS`, `DONE`, `CANCELLED`), due date khi do rule tạo |
| `Document` | Candidate là owner dữ liệu; version, category, sensitivity, retention class, scan status |
| `DocumentLink` | Liên kết document với application/journey/milestone, không sao chép binary |
| `AuditEvent` | Append-only; actor, action, entity, occurred_at, correlation ID, reason, diff đã lọc PII |

## 9. Index theo query thực tế

- Candidate: normalized email/phone, passport blind index, `(team_id, readiness_status, updated_at)`, owner.
- Catalog/Profile: `(sector_id, status, version)`, `(occupation_id, status, version)`, `(candidate_id, occupation_id)`, visa route.
- Application: candidate, `(job_order_id, status)`, `(recruiter_user_id, status)`, partial active unique.
- Interview: `(application_id, round_no)`, `(schedule_status, scheduled_start)`.
- JourneyMilestone: `(owner_user_id, status, due_at)`, `(supply_journey_id, type, attempt_no)`.
- EmailMessage: provider composite unique, Internet Message-ID, `(conversation_id, sent_at)`, delivery status.
- Task: `(assignee_user_id, status, due_at)`.
- AuditEvent: `(entity_type, entity_id, occurred_at)`, `(actor_user_id, occurred_at)`.

Index cuối cùng phải được kiểm chứng bằng `EXPLAIN ANALYZE` trên dataset gần production; không thêm index chỉ vì trường tồn tại.

## 10. Import, merge và retention

- Import nhận Excel/CSV, có bước preview, mapping cột và xác nhận trước khi ghi.
- Mỗi import có `import_batch_id`, checksum file, row number, kết quả và lỗi; import lại không được tạo trùng âm thầm.
- Giá trị ngành/nghề/visa không khớp danh mục không tự tạo catalog mới; đưa dòng vào review queue để người có quyền map hoặc bổ sung danh mục.
- Merge candidate cho xem trước field thắng/thua, chuyển liên kết transactionally, giữ alias ID và audit; không xóa bản ghi nguồn.
- CSV export phải escape ô có thể bị spreadsheet hiểu là công thức.
- Retention class tách cho candidate, email, document, audit và backup.
- Legal hold chặn purge; sau purge chỉ giữ bằng chứng tối thiểu không chứa PII.

## 11. Điểm cần business owner duyệt

1. Danh mục ngành, nghề, visa route, chứng chỉ và bộ trường chuyên môn ban đầu.
2. Bộ câu hỏi phỏng vấn theo ngành/nghề và quy tắc version/snapshot.
3. Journey Template cho ứng viên ngoài Nhật, đang ở Nhật, chuyển việc và đổi tư cách lưu trú.
4. Trường hồ sơ/tài liệu/evidence bắt buộc theo từng loại đơn hàng.
5. Điều kiện chính xác để xác nhận `PASSED`, `CLIENT_RECEIVED` và `SUPPLY_COMPLETED`.
6. Retention và quyền xem feedback/phần thông tin hộ chiếu.
7. Quy tắc candidate quay lại cùng đơn hàng để tăng `attempt_no`.
