# 05. Email Hub và lưu vết phản hồi

## 1. Mục tiêu

Email Hub biến hộp thư doanh nghiệp thành một phần của hồ sơ ứng viên: hệ thống gửi thông báo trạng thái đúng danh tính doanh nghiệp, lưu toàn bộ lịch sử và xử lý lỗi có kiểm soát. Baseline local/notification-only không mở luồng trả lời trong CMS.

## 1.1. Chế độ thông báo một chiều

`MAIL_MODE=NOTIFICATION_ONLY` là chế độ mặc định. Các event `application.created`, đổi trạng thái ứng tuyển và thay đổi lịch phỏng vấn được chuyển qua outbox/worker để tạo message `QUEUED` từ `MAIL_SENDER_ADDRESS` (thường là `noreply@company.vn`) tới email đã được phép liên hệ của ứng viên. Message có idempotency key theo event, được audit và đi qua cùng retry/bounce/failure path của Email Hub.

Ở chế độ này API từ chối inbound ingest, resolve-match, preview, draft, send thủ công và các thao tác reply/link; UI chỉ hiển thị lịch sử read-only. Đây là guardrail nghiệp vụ, không phải bằng chứng email đã tới Internet. Muốn bật provider thật phải hoàn thành DEC-003 và adapter tương ứng.

## 2. Baseline sender identity

MVP dùng đúng **một domain identity đã verify trong Amazon SES**, ví dụ `noreply@company.vn` (địa chỉ thực tế cần được duyệt). Node.js gửi qua Nodemailer SMTP tới endpoint SES; Nodemailer không phải mail provider.

Thiết kế không yêu cầu **một hộp thư chung chính danh** để nhận reply; nếu sau này bật interactive mode thì mailbox nhận phải được duyệt bằng DEC riêng.

- `MAIL_MODE=NOTIFICATION_ONLY`: không mở reply/inbound/IMAP trong CMS.
- Quyền gửi áp dụng theo phạm vi candidate/application/supply journey; mọi thao tác vẫn lưu actor nội bộ.
- Hỗ trợ nhiều sender identity chỉ là khả năng mở rộng tương lai; chỉ kích hoạt sau một DEC riêng về thương hiệu, pháp nhân, lưu lượng hoặc quyền truy cập.

Runtime contract hiện giữ `SMTP_IMAP` để tương thích API/DB; adapter cụ thể là `AWS_SES_SMTP_NODemailer` (`SesSmtpMailProviderAdapter`) và chỉ được bind sau khi DEC-003 approved.

### Điều kiện email chính danh trước go-live

- Miền gửi phải được SES verify; SPF/DKIM/DMARC phải đạt alignment cho luồng gửi production.
- `From` phải là địa chỉ thuộc SES verified identity đã phê duyệt; không giả mạo địa chỉ chưa verify.
- SES configuration set/SNS/EventBridge hoặc feedback forwarding phải ghi nhận delayed bounce/complaint. Provider acceptance không được trình bày như bằng chứng delivered.
- IT/Security lưu owner của DNS/AWS account, bằng chứng cấu hình, kết quả gửi thử có SPF/DKIM/DMARC pass và lịch kiểm tra lại. Thay region, provider, miền hoặc alias phải chạy lại gate này.
- Chính sách DMARC cuối cùng và lộ trình nâng mức bảo vệ phải do chủ sở hữu miền phê duyệt dựa trên toàn bộ nguồn gửi hợp lệ; CMS không tự sửa DNS.

## 3. Luồng gửi đi

```mermaid
sequenceDiagram
    actor Staff as Nhân viên
    participant API
    participant DB
    participant Q as Queue
    participant W as Worker
    participant P as Email Provider

    Staff->>API: Soạn/chọn mẫu và gửi
    API->>DB: Transaction: message + outbox
    API-->>Staff: Đã xếp hàng
    Q->>W: Send job + idempotency key
    W->>P: Gửi từ hộp thư chung
    P-->>W: Provider message/thread ID
    W->>DB: sent/delivered/failed + timestamp
```

### Quy tắc gửi

- Không giữ request HTTP chờ provider gửi xong.
- Mỗi message có idempotency key; retry không tạo email thứ hai.
- `outbox` trong PostgreSQL là nguồn sự thật. Dispatcher định kỳ quét bản ghi `PENDING`; BullMQ có thể được tái tạo nếu mất job.
- Template có phiên bản; message lưu snapshot nội dung đã gửi.
- Trạng thái tối thiểu: `draft`, `queued`, `sent`, `delivered`, `bounced`, `failed`.
- `opened` nếu có chỉ là tín hiệu tham khảo, không phải bằng chứng chắc chắn.

## 4. Luồng nhận phản hồi

```mermaid
flowchart LR
    A[Webhook hoặc mailbox poller] --> B[Lưu metadata thô]
    B --> C{Ghép chuỗi?}
    C -->|Reply token| D[Conversation]
    C -->|In-Reply-To / References| D
    C -->|Provider thread ID| D
    C -->|Chỉ khớp người gửi| E{Duy nhất?}
    E -->|Có| F[Đề xuất ghép]
    E -->|Không hoặc mơ hồ| G[Shared Inbox: Needs Review]
    D --> H[Lưu body + attachment]
    F --> H
    G --> I[Nhân viên ghép thủ công]
    I --> H
    H --> J[Tạo unread/task nếu cần]
```

Thứ tự bằng chứng ghép ưu tiên:

1. Reply token do CMS sinh.
2. `In-Reply-To` / `References` trỏ đến Message-ID đã lưu.
3. Provider thread/conversation ID.
4. Email người gửi là tín hiệu hỗ trợ, không đủ để tự đoán khi có nhiều hồ sơ/luồng.

Ingest dùng khóa duy nhất `(provider, mailbox_id, provider_message_id)` để webhook trùng hoặc poll lại không tạo message thứ hai. Poller lưu cursor/watermark và có chế độ catch-up khi webhook gián đoạn hoặc token/subscription được gia hạn.

## 5. Tệp đính kèm

1. Nhận metadata và stream vào vùng quarantine.
2. Kiểm tra kích thước, MIME thực, checksum và phần mở rộng.
3. Quét malware.
4. Nếu an toàn, chuyển sang bucket riêng tư và cập nhật `SAFE`.
5. Nếu nghi ngờ, giữ `QUARANTINED`, cấm preview/download trừ người có quyền xử lý.

Tệp được tải qua signed URL ngắn hạn; thao tác xem/tải tài liệu nhạy cảm có audit.

## 6. Shared Inbox

Các hàng đợi chính:

| View | Nội dung | Hành động |
|---|---|---|
| Needs Review | Không ghép được hoặc ghép mơ hồ | Gắn candidate/application/journey |
| Failed/Bounced | Gửi lỗi hoặc bị trả lại | Sửa địa chỉ, retry có kiểm soát |
| Unread Replies | Phản hồi chưa xử lý | Đọc, giao việc, đánh dấu hoàn tất |
| Quarantined Files | Tệp chưa an toàn | Xem metadata, xử lý theo quy trình |

## 7. Quy tắc nghiệp vụ quan trọng

- Email đến **không tự động** chuyển trạng thái phỏng vấn, đỗ/trượt, COE hoặc visa.
- Hệ thống có thể đề xuất tác vụ hoặc trích tín hiệu, nhưng nhân viên phải xác nhận.
- Chuyển tiếp nội bộ không được tạo ứng viên mới nếu không có đủ dữ liệu.
- Địa chỉ ứng viên thay đổi phải được xác nhận và lưu lịch sử.
- Retry bị giới hạn; quá số lần đưa vào DLQ và cảnh báo.
- Tự động trả lời/out-of-office, mailer-daemon và email do chính hộp thư gửi phải được nhận diện để tránh vòng lặp gửi tự động.
- HTML email phải được sanitize trước khi hiển thị; chặn script, remote tracking mặc định và liên kết nguy hiểm. Plain text là fallback bắt buộc.
- Hỗ trợ MIME/charset phổ biến, inline image/CID, forward, CC/BCC và delayed bounce mà không làm mất raw headers cần cho đối soát.
- SES SMTP credential rotation, quota gần ngưỡng và delivery/bounce/complaint event lag phải có cảnh báo và runbook.

## 8. Audit email

Ghi tối thiểu các sự kiện: soạn, gửi, provider chấp nhận, delivered/bounced/failed, retry, nhận, mở trong CMS, tải tệp, ghép tự động, đổi ghép thủ công và truy cập nội dung nhạy cảm.

Danh sách sự kiện nghiệp vụ nào được gửi, mức tự động hóa và người duyệt nằm tại [12-ma-tran-email-thong-bao.md](./12-ma-tran-email-thong-bao.md).
