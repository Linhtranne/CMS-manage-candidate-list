# 06. Phân quyền, bảo mật và kiểm toán

## 1. Mô hình quyền

Quyền hiệu lực được xác định bởi bốn chiều:

`Role × Module action × Data scope × Sensitivity`

- **Role:** Recruiter, Business, Japan Coordinator, Manager, Administrator.
- **Module action:** view, create, update, transition, export, download, configure.
- **Data scope:** self, team, department, company.
- **Sensitivity:** normal, personal, highly sensitive.

Không chỉ dùng role thuần túy vì hai recruiter có thể cùng vai trò nhưng chỉ được xem dữ liệu của đội mình.

## 2. Ma trận quyền action-level baseline

Ký hiệu phạm vi: `A` = bản ghi được giao trực tiếp, `T` = đội, `D` = phòng ban, `C` = toàn công ty, `P` = cần phê duyệt/lý do bổ sung, `—` = không có quyền mặc định.

| Action | Recruiter | Business | Japan Coordinator | Manager | Admin |
|---|---:|---:|---:|---:|---:|
| `candidate.view` | T | D | A | D | — |
| `candidate.create/update_basic` | T | D | A | D | — |
| `candidate.view_sensitive` | A | A | A | D | — |
| `candidate.merge` | — | — | — | D+P | — |
| `job_order.view` | T | D | A | D | — |
| `job_order.create/update` | — | D | — | D | — |
| `application.create/update` | T | D | A (sau bàn giao) | D | — |
| `interview.schedule` | T | D | — | D | — |
| `interview.record_result` | A | A | — | D | — |
| `supply_journey.view` | A | D | A | D | — |
| `supply_journey.update_milestone` | — | — | A | D | — |
| `email.read/send` | A/T | A/D | A | D | — |
| `email.manual_link` | T | D | A | D | — |
| `document.download_sensitive` | A | A | A | D | — |
| `export.candidate_data` | — | — | — | D+P | — |
| `iam.configure` | — | — | — | Giới hạn | C |

Ma trận này là baseline đủ cụ thể để viết policy/test; business owner vẫn phải phê duyệt trước khi đặt `status: approved`. Backend quyết định quyền theo action và scope tại thời điểm request, không suy ra từ màn hình đang mở.

### 2.1 Chuyển ownership và quyền khẩn cấp

- Khi đổi owner/team, quyền hiệu lực được tính lại ngay; task đang mở phải được chuyển giao hoặc xác nhận giữ owner cũ, và toàn bộ thay đổi có audit.
- Owner cũ không giữ quyền riêng chỉ vì từng phụ trách; họ chỉ còn quyền nếu scope vai trò hiện tại vẫn cho phép.
- `break-glass` chỉ dành cho quản lý/kiểm soát được chỉ định, bắt buộc lý do, thời hạn ngắn, cảnh báo và review sau sự kiện; không cấp quyền vĩnh viễn.

## 3. Kiểm soát truy cập

- SSO qua nhà cung cấp danh tính doanh nghiệp; bắt buộc MFA cho tài khoản có quyền nhạy cảm.
- Tài khoản nghỉ việc bị disable và thu hồi session/token; không xóa để giữ audit.
- Backend kiểm tra quyền cho mọi request; không dựa vào việc ẩn nút frontend.
- Export và download tài liệu nhạy cảm là quyền riêng, có thể yêu cầu lý do/phê duyệt.
- Signed URL ngắn hạn, bucket private, chặn directory listing.
- SSH dùng key, cấm đăng nhập root và mật khẩu trực tiếp trên máy chủ production.

## 4. Bảo vệ dữ liệu cá nhân

- TLS cho toàn bộ kết nối ngoài; mã hóa disk/backup và secret storage.
- Mask hộ chiếu, địa chỉ và dữ liệu định danh trên list; chỉ mở khi có quyền.
- Không ghi body email, token, hộ chiếu hoặc secret vào application log.
- Có retention policy cho ứng viên không còn hoạt động, email, tài liệu và backup.
- Hỗ trợ legal hold/xử lý yêu cầu dữ liệu nếu chính sách doanh nghiệp yêu cầu.

## 5. Audit

Mỗi `AuditEvent` gồm:

- actor và session/request correlation ID;
- action, entity type, entity ID;
- thời gian UTC và nguồn IP/device metadata ở mức phù hợp;
- before/after đã lọc dữ liệu nhạy cảm hoặc diff nghiệp vụ;
- reason đối với merge, export, override và manual email linking.

Audit là append-only. Chỉ nhóm kiểm soát được truy vấn đầy đủ; quản trị viên hạ tầng không tự động có quyền đọc nội dung nghiệp vụ.

## 6. Các mối đe dọa ưu tiên

| Rủi ro | Kiểm soát chính |
|---|---|
| Nhân viên xem quá phạm vi | Scope enforcement ở backend + negative permission tests |
| Xuất hàng loạt PII | Quyền export riêng, hạn mức, audit, cảnh báo |
| Tệp email độc hại | Quarantine, malware scan, MIME/checksum validation |
| Gửi email trùng | Outbox + idempotency key |
| Chiếm tài khoản | SSO, MFA, session revocation, rate limit |
| Ghi đè dữ liệu đồng thời | Optimistic concurrency |
| Rò rỉ qua log/backup | Redaction, encryption, quyền truy cập, retention |
| Admin đọc dữ liệu trái nhiệm vụ | Tách admin cấu hình và quyền nội dung |

## 7. Kiểm tra quyền bắt buộc

- Test cho cả quyền cho phép và từ chối ở API.
- Kiểm tra người dùng đổi ID trong URL/request không xem được bản ghi ngoài scope.
- Kiểm tra export/download không thể vượt quyền qua API trực tiếp.
- Kiểm tra admin cấu hình không đọc được body email/candidate document khi chưa cấp quyền.
- Kiểm tra quyền vẫn đúng sau chuyển đội, nghỉ việc và thay đổi role.
