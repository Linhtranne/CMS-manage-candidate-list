# 12. Ma trận email và thông báo

> Trạng thái: `reviewed` — một hộp thư chung trong MVP; nội dung mẫu và người phê duyệt phải được business owner duyệt trước production.

## 1. Mục tiêu

Định nghĩa khi nào CMS gửi email cho ứng viên, mức tự động hóa, ai chịu trách nhiệm và phản hồi được lưu vào đâu. Ứng viên không có tài khoản CMS; email là kênh tương tác chính thức duy nhất trong phạm vi hiện tại.

## 2. Nguyên tắc chung

- Tất cả email gửi từ một hộp thư chung, có tên/chữ ký nhân viên phụ trách.
- Mọi email đi gắn candidate; gắn application hoặc supply journey khi có ngữ cảnh.
- Template có version; message lưu snapshot subject/body/attachment thực tế.
- Template có thể áp dụng chung hoặc scoped theo ngành, nghề, visa route và Journey Template; không hardcode riêng luồng IT.
- “Tự động” chỉ có nghĩa hệ thống xếp hàng gửi theo rule đã duyệt, không tự thay đổi kết quả phỏng vấn, COE, visa hay hoàn tất cung ứng.
- Email nhạy cảm hoặc thay đổi lịch quan trọng cần preview và xác nhận người gửi; hệ thống không tự suy diễn từ nội dung reply.
- `DO_NOT_CONTACT` chặn gửi trừ trường hợp được phê duyệt rõ ràng.

## 3. Ma trận sự kiện

| Sự kiện | Mức gửi baseline | Người xác nhận | Ngữ cảnh bắt buộc | Tệp/biến chính | Hành động khi reply |
|---|---|---|---|---|---|
| Mời phỏng vấn | Thủ công từ template | Recruiter/Business phụ trách | Candidate + Application + Interview | vòng, thời gian, timezone, hình thức/link | Ghi conversation; tạo unread/task, không tự xác nhận tham dự |
| Đổi lịch phỏng vấn | Thủ công, cảnh báo thay đổi | Owner lịch | Application + Interview | lịch cũ/mới, lý do | Ghi reply; nhân viên xác nhận lịch cuối |
| Hủy phỏng vấn | Thủ công | Owner hoặc Manager theo policy | Application + Interview | vòng, lý do được phép công bố | Không tự đóng application |
| Nhắc phỏng vấn | Tự động theo rule đã duyệt hoặc thủ công | Template owner; không duyệt từng mail nếu rule active | Interview `SCHEDULED` | thời gian, link | Auto-reply không tạo vòng lặp |
| Yêu cầu bổ sung hồ sơ | Thủ công từ checklist | Owner candidate/journey | Candidate + application/journey | danh sách tài liệu, hạn, hướng dẫn | Tệp reply vào quarantine/scan; tạo task xử lý |
| Nhắc hồ sơ quá hạn | Tự động có giới hạn | Manager duyệt rule | Milestone/task đang mở | tài liệu thiếu, hạn mới | Dừng reminder khi có reply hoặc task hoàn tất |
| Thông báo không đạt | Thủ công | Recruiter/Business; có thể cần Manager | Application đã có quyết định | template phù hợp chính sách | Không cho gửi trước khi transition hợp lệ |
| Thông báo trúng tuyển/đề nghị nhận việc | Thủ công, bắt buộc preview | Business/Manager theo policy | Application `PASSED` | vị trí, đơn hàng, bước tiếp theo | Reply tạo task xác nhận nhận việc; không tự hoàn tất milestone |
| Xác nhận đã nhận hồ sơ | Thủ công hoặc rule sau kiểm tra | Japan Coordinator | Supply Journey + milestone | danh mục đã nhận/còn thiếu | Không tự đánh dấu tài liệu hợp lệ chỉ vì có attachment |
| Cập nhật COE | Thủ công | Japan Coordinator | Milestone COE | trạng thái được phép công bố, bước tiếp | Reply lưu vào journey conversation |
| Cập nhật visa | Thủ công | Japan Coordinator | Milestone Visa | lịch hẹn/kết quả, tài liệu | Không tự chuyển `COMPLETED` từ body email |
| Lịch đào tạo/chuẩn bị | Thủ công từ template | Japan Coordinator | Milestone preparation | lịch, địa điểm/link, checklist | Ghi xác nhận, tạo task nếu cần |
| Kế hoạch xuất cảnh | Thủ công, bắt buộc preview | Japan Coordinator/Manager theo policy | Milestone departure plan | ngày xuất cảnh, đầu mối, hướng dẫn; lịch bay nếu có | Mọi thay đổi phải gửi phiên bản mới và giữ lịch sử cũ |
| Thay đổi kế hoạch xuất cảnh | Thủ công, mức ưu tiên cao | Manager hoặc người được ủy quyền | Supply Journey + milestone | nội dung cũ/mới, lý do, hành động cần xác nhận | Tạo task khẩn; không ghi đè message cũ |
| Xác nhận đã sang Nhật/tiếp nhận | Thủ công | Japan Coordinator/Business | Milestone arrived/client received | thời gian, đầu mối tiếp nhận | Chỉ người có quyền mới hoàn tất milestone |

## 4. Quy tắc template

Mỗi template có:

- `template_key`, version, ngôn ngữ, trạng thái `DRAFT/ACTIVE/RETIRED`;
- loại sự kiện, subject, HTML đã sanitize, plain text;
- scope tùy chọn gồm ngành, nghề, visa route, Journey Template và thứ tự ưu tiên fallback;
- biến được phép, biến bắt buộc và fallback;
- loại attachment được phép;
- owner, approver, `approved_at` và ngày hiệu lực;
- chính sách gửi thủ công/tự động, giới hạn reminder và khoảng yên lặng.

Không cho kích hoạt template nếu còn biến chưa có fallback. Preview phải hiển thị người nhận, From, Reply-To, ngành/nghề/visa và application/journey context cùng attachment trước khi gửi thủ công. Nếu không có template chuyên biệt, hệ thống chỉ fallback sang template chung đã được duyệt, không tự tạo nội dung theo ngành.

## 5. Trạng thái gửi và retry

Luồng trạng thái: `DRAFT → QUEUED → SENT`, sau đó có thể nhận `DELIVERED`, `BOUNCED`, `FAILED`. `OPENED` nếu provider hỗ trợ chỉ là tín hiệu tham khảo.

- Lỗi tạm thời: retry exponential backoff có giới hạn.
- Lỗi vĩnh viễn/bounce: không retry mù; tạo task kiểm tra địa chỉ.
- Hết retry: đưa DLQ, cảnh báo owner và giữ đầy đủ attempt/error đã lọc secret.
- Hủy trước khi worker gửi: chỉ cho phép khi còn `QUEUED`, có audit.

## 6. Ghép phản hồi và SLA xử lý

Thứ tự ghép: reply token → `In-Reply-To/References` → provider thread → sender như tín hiệu hỗ trợ. Không đủ chắc chắn thì vào `Needs Review`.

Mỗi reply được ghi:

- thời gian provider nhận và thời gian CMS ingest;
- sender/recipient headers, subject, body plain/sanitized HTML;
- tệp, checksum, trạng thái scan;
- rule/bằng chứng ghép và người override nếu ghép thủ công;
- unread owner và thời điểm được xử lý.

SLA số cụ thể do quản lý duyệt. Báo cáo tối thiểu đo `sync lag`, `reply-to-first-read`, `reply-to-resolved`, số unread quá hạn, unmatched age và failed/bounced age.

## 7. Guardrail tự động hóa

- Một event chỉ tạo một email logic bằng idempotency key gồm event, entity, template version và recipient.
- Reminder dừng khi candidate reply, task hoàn tất, entity đóng hoặc đạt số lần tối đa.
- Out-of-office/mailer-daemon không kích hoạt reminder/reply dây chuyền.
- Rule không được tự tạo candidate từ email mơ hồ hoặc tự đổi trạng thái pháp lý/nghiệp vụ.
- Gửi hàng loạt cần quyền riêng, preview số lượng, rate limit, khả năng hủy phần chưa gửi và audit.

## 8. Tiêu chí nghiệm thu

### EM-AC-01 — Gửi có ngữ cảnh

**Given** nhân viên có quyền mở candidate và application.  
**When** gửi mẫu mời phỏng vấn đã active.  
**Then** message lưu snapshot, actor, conversation, interview context và được gửi đúng một lần từ hộp thư chung.

### EM-AC-02 — Reply có tệp

**Given** ứng viên reply kèm tệp.  
**When** mailbox sync.  
**Then** body, thời gian, headers và attachment được ghi đúng conversation; tệp chưa `SAFE` không thể tải.

### EM-AC-03 — Reminder dừng đúng lúc

**Given** rule nhắc hồ sơ đang hoạt động.  
**When** ứng viên reply hoặc task được hoàn tất trước lịch nhắc tiếp.  
**Then** hệ thống không gửi reminder tiếp và ghi lý do hủy job.

### EM-AC-04 — Không gửi sai trạng thái

**Given** application chưa có quyết định `PASSED`.  
**When** người dùng cố gửi template trúng tuyển.  
**Then** API từ chối với lỗi nghiệp vụ rõ ràng và không tạo outbox.

## 9. Quyết định còn mở

1. Provider và địa chỉ hộp thư chung chính thức.
2. Danh sách template/ngôn ngữ, nội dung pháp lý và người phê duyệt.
3. SLA, lịch reminder, quiet hours và số lần tối đa.
4. Giới hạn tệp/kích thước, loại MIME và retention email.
5. Chính sách email hàng loạt và các trường hợp cần phê duyệt hai bước.
6. Template nào cần nội dung riêng theo ngành/nghề/visa route và template fallback tương ứng.
