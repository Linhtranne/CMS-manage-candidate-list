# 13. Hợp đồng chức năng API/UI

## 1. Goal

Cung cấp hợp đồng quan sát được giữa CMS, API và worker cho các luồng danh mục đa ngành → candidate → application/interview → email → supply journey, để frontend/backend/test không tự diễn giải khác nhau.

## 2. Người dùng và phạm vi

Vai trò: Recruiter, Business, Japan Coordinator, Manager, Administrator. Ứng viên không gọi API và không có tài khoản.

Trong phạm vi:

- tìm/tạo/cập nhật/merge candidate;
- quản trị danh mục ngành, nghề, visa route, trường chuyên môn và Journey Template có version;
- lưu nhiều hồ sơ nghề cho một candidate;
- tạo application, nhiều vòng interview và quyết định kết quả;
- tạo/cập nhật lộ trình cung ứng;
- gửi email từ hộp thư chung, nhận reply, ghép thủ công và xử lý ngoại lệ;
- task, tài liệu, audit và saved views.

Ngoài phạm vi: portal ứng viên, CRM bán hàng đầy đủ, payroll/HRM sau tiếp nhận, AI tự quyết định kết quả.

## 3. Quy ước API

- Base path: `/api/v1`.
- Chọn REST + OpenAPI vì có nhiều consumer nội bộ (Web, Worker, import/integration) và cần hợp đồng độc lập; không dùng tRPC/GraphQL trong baseline.
- JSON UTF-8; ID là string UUID/ULID.
- List dùng cursor pagination và sort ổn định; không trả `SELECT *`.
- Request cập nhật gửi `version`; mismatch trả `409 VERSION_CONFLICT`.
- Mọi response có `request_id`; lỗi không tiết lộ sự tồn tại của bản ghi ngoài scope.
- Command nhạy cảm nhận `reason` và tạo audit trong cùng transaction khi có thể.
- Endpoint dùng danh từ số nhiều, đường dẫn lồng tối đa ba cấp. Thay đổi trạng thái phức tạp được biểu diễn bằng resource sự kiện/decision, không đặt động từ tùy ý trong URL.
- SSO session phải có expiry/revocation, CSRF protection cho mutation và rate limit theo user/IP/action. Response `429` kèm giới hạn, số còn lại và thời điểm reset.

Success response dùng envelope `{ "data": ..., "request_id": "..." }`; list bổ sung `page`. Response `204` là ngoại lệ không có body. Không trả stack trace, SQL/provider error hoặc secret.

Ví dụ list response:

```json
{
  "data": [],
  "page": { "next_cursor": null, "has_more": false },
  "request_id": "req_..."
}
```

Ví dụ lỗi:

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Bản ghi đã được người khác cập nhật.",
    "details": { "current_version": 8 }
  },
  "request_id": "req_..."
}
```

## 4. Danh mục đa ngành

| Hành động UI | API contract | Guard |
|---|---|---|
| Xem danh mục | `GET /industry-sectors`, `GET /occupations`, `GET /visa-routes` | Chỉ trả version active theo mặc định; cho phép tra cứu version lịch sử khi có quyền |
| Quản trị danh mục | `POST/PATCH /admin/industry-sectors`, `/occupations`, `/visa-routes` | Không sửa/xóa phá vỡ version đã được tham chiếu; thay đổi có reason và audit |
| Quản trị trường chuyên môn | `POST/PATCH /admin/industry-field-definitions` | Schema hợp lệ; không cho script tùy ý; preview ảnh hưởng trước khi activate |
| Quản trị câu hỏi | `POST/PATCH /admin/interview-question-templates` | Scope ngành/nghề/vòng; version đã dùng là bất biến |
| Quản trị lộ trình | `POST/PATCH /admin/supply-journey-templates` | Validate mốc, điều kiện cư trú, visa route và version |

Catalog API trả `code`, nhãn Việt/Nhật, status và version để UI không phụ thuộc tên hiển thị. IT là một `IndustrySector`; không có endpoint hoặc enum riêng cho toàn bộ quy trình IT.

## 5. Candidate và saved views

| Hành động UI | API contract | Kết quả quan sát được |
|---|---|---|
| Tìm danh sách | `GET /candidates?query=&readiness_status=&industry_sector_id=&occupation_id=&visa_route_id=&residence_context=&owner_id=&cursor=` | List đã mask theo quyền, cursor ổn định |
| Tạo hồ sơ | `POST /candidates` | Trả `201` hoặc cảnh báo/review trùng; không merge im lặng |
| Cập nhật | `PATCH /candidates/{id}` + `version` | Trả version mới; conflict nếu stale |
| Thêm/cập nhật hồ sơ nghề | `POST/PATCH /candidates/{id}/occupation-profiles` | Occupation active; `attributes` hợp schema version; không ghi đè hồ sơ nghề khác |
| Archive | `PATCH /candidates/{id}` với `record_status=ARCHIVED`, reason, version | Không xuất hiện trong view active; lịch sử còn nguyên |
| Merge | `POST /candidate-merge-cases/{id}/executions` | Chuyển liên kết transactionally, giữ alias và audit |
| Tiềm năng | `GET /views/potential-candidates` | `readiness_status=POTENTIAL` theo scope |

Form tạo/cập nhật phải normalize email/phone trước khi kiểm tra trùng nhưng vẫn hiển thị giá trị gốc. Candidate `DO_NOT_CONTACT` hiển thị guardrail rõ và vô hiệu hóa gửi email nếu không có luồng ngoại lệ được duyệt.

## 6. Application và Interview

| Hành động UI | API contract | Guard |
|---|---|---|
| Tạo/cập nhật đơn hàng | `POST/PATCH /job-orders` | Ngành/nghề/visa route hợp lệ; cập nhật tiêu chí phải tăng `requirement_version` |
| Tạo application | `POST /applications` | Candidate/job order hợp lệ; không có active attempt trùng; lưu `requirement_snapshot` bất biến |
| Tạo vòng PV | `POST /applications/{id}/interviews` | Application chưa đóng; `round_no` kế tiếp hợp lệ |
| Chốt bộ câu hỏi | `POST /interviews/{id}/question-snapshots` | Chọn template đúng ngành/nghề/vòng và lưu version bất biến |
| Đổi lịch | `PATCH /interviews/{id}` với lịch mới, reason, version | Giữ history lịch cũ/mới |
| Hoàn tất vòng | `PATCH /interviews/{id}` với `schedule_status=COMPLETED`, result, version | Bắt buộc feedback theo policy |
| Quyết định đỗ/trượt | `POST /applications/{id}/decisions` | Action permission; reason/evidence; transition hợp lệ |
| Rút hồ sơ | `POST /applications/{id}/withdrawals` | Không xóa interviews/history |

Saved views:

- `GET /views/waiting-interviews`: application active có Interview `SCHEDULED` chưa hoàn tất.
- `GET /views/interviewed`: application có ít nhất một Interview `COMPLETED`.
- `GET /views/passed-applications`: application `PASSED`.

UI không dùng một dropdown application để biểu diễn vòng phỏng vấn. Trang application hiển thị timeline từng vòng và trạng thái tổng `IN_INTERVIEW_PROCESS` cho đến khi có quyết định cuối.

## 7. Supply Journey

| Hành động UI | API contract | Guard |
|---|---|---|
| Gợi ý template phù hợp | `GET /applications/{id}/eligible-supply-journey-templates` | Tính từ nơi cư trú, visa route, JobOrder và hồ sơ nghề; không tự quyết định thay người dùng |
| Khởi tạo lộ trình | `POST /applications/{id}/supply-journey` với `template_id`, `template_version` | Chỉ application `PASSED`; template applicable; tối đa một journey hiệu lực |
| Xem timeline | `GET /supply-journeys/{id}` | Trả milestone, task, document, blocker theo quyền |
| Cập nhật mốc | `PATCH /journey-milestones/{id}` + `version` | Transition hợp lệ; completed cần evidence theo loại mốc |
| Mở lần nộp lại | `POST /journey-milestones/{id}/attempts` | Giữ attempt cũ; reason bắt buộc |
| Hoàn tất cung ứng | `POST /supply-journeys/{id}/completions` | `CLIENT_RECEIVED` đã complete và có quyền xác nhận |
| Hủy/tạm dừng | `POST /supply-journeys/{id}/cancellations` hoặc `PATCH` status + reason | Không xóa lịch sử/task/document |

UI tập trung vào tiến độ cung ứng và hiển thị Journey Template/version đã chọn. Ứng viên đang ở Nhật không bị ép qua mốc xuất cảnh. Chi tiết lịch/chặng bay chỉ xuất hiện như trường tùy chọn của milestone `DEPARTURE_PLAN`.

## 8. Email chung

| Hành động UI/worker | API/command | Kết quả |
|---|---|---|
| Preview template | `POST /email-previews` | Render subject/body/recipient/context, không tạo outbox |
| Gửi email | `POST /conversations/{id}/messages` | Transaction tạo message + outbox, trả `202 QUEUED` |
| Hủy email chờ | `POST /email-messages/{id}/cancellations` | Chỉ khi chưa gửi; audit |
| Ingest | internal provider adapter | Idempotent theo provider/mailbox/message ID |
| Ghép thủ công | `POST /inbox/messages/{id}/match-decisions` + reason | Candidate bắt buộc; application/journey tùy chọn; audit |
| Bỏ/đổi ghép | tạo `match-decision` mới + reason | Giữ lịch sử quyết định trước |
| Retry | `POST /email-messages/{id}/retry-attempts` | Chỉ lỗi retryable hoặc có override được phép |

Trạng thái UI sau khi nhấn gửi phải chuyển ngay thành “Đã xếp hàng”; không hiển thị “Đã gửi” trước khi worker/provider xác nhận. Khi API thành công nhưng queue event bị mất, outbox dispatcher vẫn phải phục hồi công việc.

## 9. Tệp và import/export

- Upload tạo metadata và object quarantine; chỉ `SAFE` mới preview/download.
- Signed URL hết hạn ngắn và không được cache công khai.
- Excel/CSV import là job có preview, mapping cột, progress, row-level result và downloadable error report đã mask PII.
- Giá trị ngành/nghề/visa không khớp catalog vào review queue; import không tự sinh danh mục mới.
- Re-import dùng batch checksum/dedupe rules; không tạo trùng âm thầm.
- Export kiểm tra quyền tại API, giới hạn số bản ghi, ghi lý do/audit và escape spreadsheet formula.

## 10. Error contract

| HTTP | Code | Khi dùng |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Field/format không hợp lệ |
| 401 | `UNAUTHENTICATED` | Chưa xác thực/session hết hạn |
| 403 | `FORBIDDEN` | Không có action/scope; không rò metadata |
| 404 | `NOT_FOUND` | Không tồn tại hoặc cố tình che bản ghi ngoài scope |
| 409 | `VERSION_CONFLICT` | Optimistic concurrency conflict |
| 409 | `REQUIREMENT_VERSION_CONFLICT` | JobOrder đổi version trong lúc tạo/giới thiệu application |
| 409 | `DUPLICATE_ACTIVE_APPLICATION` | Đã có active attempt cùng candidate/job order |
| 409 | `DUPLICATE_CANDIDATE_REVIEW_REQUIRED` | Cần review trùng trước khi tạo/merge |
| 422 | `CATALOG_VALUE_INACTIVE` | Ngành/nghề/visa route không còn hiệu lực cho bản ghi mới |
| 422 | `JOURNEY_TEMPLATE_NOT_APPLICABLE` | Template không phù hợp nơi cư trú, visa route hoặc đơn hàng |
| 422 | `INVALID_STATE_TRANSITION` | Command không hợp lệ với trạng thái hiện tại |
| 422 | `MISSING_REQUIRED_EVIDENCE` | Thiếu feedback/document/xác nhận bắt buộc |
| 429 | `RATE_LIMITED` | Quá giới hạn API/gửi |
| 503 | `DEPENDENCY_UNAVAILABLE` | Provider/object storage tạm lỗi; dữ liệu queued vẫn an toàn |

## 11. Happy path

1. Recruiter tạo/khớp candidate, gán owner, thêm một hoặc nhiều hồ sơ nghề và đánh giá `READY`.
2. Business/Recruiter tạo application cho JobOrder thuộc ngành/nghề cụ thể; CMS khóa `requirement_snapshot`.
3. Tạo Interview vòng 1, chốt bộ câu hỏi đúng version và gửi email mời qua hộp thư chung.
4. Reply của ứng viên được ghép vào conversation; nhân viên xác nhận tham dự.
5. Hoàn tất vòng 1, tạo vòng 2; bản ghi xuất hiện cả view “Đã PV” và “Chờ PV”.
6. Người có quyền xác nhận `PASSED`, chọn Journey Template phù hợp và khởi tạo SupplyJourney.
7. Điều phối hoàn tất từng milestone, trao đổi hồ sơ qua email và xử lý blocker.
8. Xác nhận mốc tiếp nhận phù hợp với template và hoàn tất cung ứng; “đã sang Nhật” chỉ áp dụng cho hành trình nhập cảnh mới.

## 12. Error/edge cases bắt buộc

- Candidate trùng/mơ hồ; candidate đổi email hoặc reply từ địa chỉ phụ.
- Hai người cập nhật cùng bản ghi; đổi owner trong khi có task mở.
- Nhiều vòng PV, đổi lịch, hủy, no-show, candidate rút giữa quy trình.
- Application đỗ nhiều đơn; quản lý chọn journey hiệu lực.
- Candidate có nhiều nghề; catalog đổi version; JobOrder đổi yêu cầu giữa lúc matching và tạo application.
- Ứng viên đang ở Nhật bị chọn nhầm template nhập cảnh mới; visa route không tương thích đơn hàng.
- COE/visa nộp lại, khách hàng hoãn, ứng viên đổi kế hoạch.
- Duplicate webhook, poller catch-up, queue mất job, provider timeout sau khi thực sự đã gửi.
- Auto-reply loop, forward/CC/BCC, HTML nguy hiểm, charset/MIME lạ, delayed bounce.
- Token mailbox hết hạn, object storage đầy, scan backlog.

## 13. Security và audit

- Mọi endpoint kiểm tra `role × action × scope × sensitivity` ở backend.
- Không trả body/tệp/PII trong list nếu thiếu quyền field-level.
- Merge, export, manual link, break-glass, transition và download nhạy cảm bắt buộc audit.
- Admin cấu hình không mặc định đọc dữ liệu nghiệp vụ.
- Log/metrics chỉ dùng ID kỹ thuật và thông tin đã redaction.
- Security test phải phủ BOLA/IDOR ngang scope, nâng quyền theo action, mass assignment trường nhạy cảm, rate-limit bypass, CSRF/CORS và unsafe provider payload.

## 14. Acceptance và test cần viết

Hợp đồng được chấp nhận khi:

- OpenAPI/schema cuối khớp field/enum ở [11-tu-dien-du-lieu.md](./11-tu-dien-du-lieu.md).
- OpenAPI mô tả auth, rate-limit headers, request/response examples và mọi error code; contract diff là gate CI.
- Các Given/When/Then trong [09-kiem-thu-nghiem-thu.md](./09-kiem-thu-nghiem-thu.md) có test tương ứng.
- Contract test chứng minh error code, pagination và version conflict.
- Negative permission test phủ toàn bộ action trong ma trận quyền.
- E2E chứng minh happy path và các critical edge case email/journey.
- E2E chứng minh Candidate đa nghề, snapshot yêu cầu/câu hỏi và hai Journey Template khác bối cảnh.
- UI test chứng minh loading/success/error/focus/keyboard và không phụ thuộc màu.

## 15. Open questions

1. Danh mục ngành/nghề/visa, field schema, chứng chỉ và bộ câu hỏi ban đầu.
2. Journey Template nào cần có cho ứng viên ngoài Nhật, đang ở Nhật, chuyển việc và đổi tư cách lưu trú.
3. Trường bắt buộc và evidence để đóng từng milestone.
4. Ai được quyết định `PASSED`, merge candidate và hoàn tất cung ứng.
5. Provider email, giới hạn gửi, loại attachment và retention.
6. Có cần song ngữ Việt/Nhật cho template/màn hình quản trị ngay Phase 1B hay để Phase 3.
7. SLA list/search, import, email sync và xử lý inbox sau khi có baseline tải thực tế.
