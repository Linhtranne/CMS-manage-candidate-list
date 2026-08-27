---
id: DEC-003
status: draft_waiting_external_inputs
version: 0.2.0
scope: staging-and-production
owner: IT/Mail Owner
approvers:
  - Security Owner
  - Business Owner
risk: critical
---

# DEC-003 — Mail provider và địa chỉ gửi doanh nghiệp

> Đây là bản draft để lấy thông tin. Chưa phải approval record và không được đưa vào `MAIL_PROVIDER_APPROVAL_RECORD_FILE` cho tới khi điền hết ô bắt buộc, đính kèm bằng chứng và có đủ chữ ký approver.

## 1. Quyết định kỹ thuật đã chốt sẵn

| Hạng mục | Quyết định |
|---|---|
| Luồng CMS | Thông báo trạng thái một chiều (`MAIL_MODE=NOTIFICATION_ONLY`) |
| Địa chỉ gửi | `noreply@<company-domain>`; không dùng địa chỉ cá nhân |
| Reply/inbound trong CMS | Tắt; UI/API chỉ đọc lịch sử message, không nhận reply hay tự ghép reply |
| Sự kiện gửi | Tiếp nhận application, đổi trạng thái application, lịch phỏng vấn được tạo/đổi/hủy/hoàn tất |
| Hàng đợi | DB transaction → outbox → queue `outbox` → worker gửi |
| An toàn gửi trùng | Idempotency theo event; retry không tạo message logic thứ hai |
| Recipient | Chỉ candidate có email hợp lệ và `CONTACTABLE`; không gửi `DO_NOT_CONTACT` |
| Audit | Ghi audit enqueue, sent, retry, uncertain, failed/bounced |
| Local | `MAIL_PROVIDER=FAKE`, không gửi Internet |

## 2. Provider và transport đã chọn

Đã chọn **Amazon SES SMTP + Nodemailer** cho luồng gửi. SES là mail provider; Nodemailer chỉ là thư viện Node.js tạo kết nối SMTP và dựng message. Không coi Nodemailer là một provider độc lập.

| Hạng mục | Quyết định | Giá trị runtime dự kiến |
|---|---|---|
| Mail provider | Amazon SES | `SMTP_IMAP` (contract runtime; adapter outbound-only) |
| Node transport | Nodemailer SMTP transport | `nodemailer.createTransport(...)` |
| Luồng inbound/IMAP | Tắt trong notification-only | Không bind change feed/IMAP |
| AWS region | Một region cố định cho staging và production; không dùng credential chéo region | `ap-southeast-2` (Asia Pacific — Sydney; identity hiện còn verification pending) |
| Sender identity | Domain identity đã verify trong SES | `noreply@linhtranne.id.vn` (sẽ dùng sau khi identity `linhtranne.id.vn` chuyển `Verified`) |

`SMTP_IMAP` hiện là giá trị contract tương thích trong codebase; adapter cụ thể đã triển khai là `AWS_SES_SMTP_NODemailer` (`SesSmtpMailProviderAdapter`) và chỉ được bind khi config/DEC-003 hợp lệ. Không dùng `MICROSOFT_GRAPH`/`GMAIL_API` cho DEC này. Nếu chưa có SES identity, credentials hoặc production access, giữ runtime ở `DISABLED`/`FAKE`.

## 3. Các giá trị bạn cần đi lấy

Chỉ các ô dưới đây cần lấy từ IT/Mail Owner/provider. Không ghi secret/token/private key vào tài liệu, chat hoặc Git; chỉ ghi secret reference trong secret manager.

### 3.1. Bắt buộc cho DEC này

| Trường cần điền | Giá trị cần lấy | Nơi lấy |
|---|---|---|
| `provider` | `SMTP_IMAP` (vendor `AWS_SES`, transport Nodemailer) | IT/Mail Owner |
| `sending_domain` | `linhtranne.id.vn` | DNS registrar/mail admin |
| `mailbox_address` | `noreply@linhtranne.id.vn` (dự kiến) | Mail admin |
| `sender_display_name` | Tên hiển thị chính thức | Business Owner |
| `dns_owner` | Người/nhóm quản trị DNS, corporate identity | IT |
| `mail_owner` | Người/nhóm chịu trách nhiệm mailbox/provider | IT |
| `data_region` | Quốc gia/vùng dữ liệu provider | Provider contract/admin |
| `retention_policy_ref` | Mã/link policy lưu message, attachment, audit | Privacy/Legal Owner |
| `sandbox_endpoint` | SES sandbox account/region dùng cho staging smoke | AWS Owner; không dùng recipient production |
| `canary_recipients` | Ít nhất 1–2 email kiểm soát của công ty | QA/Operations |
| `provider_quota` | Quota gửi/phút, burst, quota/ngày, concurrency | Provider portal/documentation |
| `bounce_path` | SES configuration set/SNS/EventBridge hoặc feedback forwarding và owner xử lý | AWS/Mail Owner |

### 3.2. AWS SES + Nodemailer — bắt buộc

| Trường cần điền | Giá trị cần lấy |
|---|---|
| `aws_account_id` | AWS account sở hữu SES identity |
| `aws_region` | `ap-southeast-2` (SMTP credentials có tính theo region) |
| `ses_identity_arn` | ARN của verified domain identity |
| `smtp_endpoint` | `email-smtp.ap-southeast-2.amazonaws.com` |
| `smtp_port`, `smtp_tls_mode` | `587` + STARTTLS (đã chọn cho local setup; cần smoke sau khi identity verify) |
| `smtp_username` | SES SMTP username; chỉ lưu dưới dạng secret reference |
| `smtp_password_ref` | Secret-manager reference cho SES SMTP password; không ghi password vào DEC, `.env`, log hoặc Git |
| `iam_principal_ref` | IAM user/role owner của SMTP credential và ticket rotation |
| `ses_configuration_set` | Configuration set dùng cho message tags, delivery/bounce/complaint events |
| `ses_identity_status` | `Verified` và DKIM status `Successful` trong đúng region |
| `sandbox_status` | `Sandbox` (SES console hiện hiển thị quota 200 email/24h và 1 email/giây; chỉ gửi recipient đã verify) |
| `production_access_evidence` | AWS console/ticket evidence cho request production access và sending limits |
| `sending_quota` | Max 24h, max send rate/second, current utilization |
| `bounce_complaint_destination` | SNS topic/EventBridge/feedback forwarding và owner xử lý |
| `custom_mail_from` | `Không chọn` (dùng default MAIL FROM của SES; chưa cần MX riêng) |
| `nodemailer_version_policy` | `7.0.13`, lock trong `apps/api/package.json`/`pnpm-lock.yaml` |

## 4. DNS evidence cần đính kèm

Điền bảng này bằng **giá trị thực tế sau khi DNS đã publish**. Không điền ví dụ.

| Record | Host/Name | Type | Value/Target | TTL | Checked at | Evidence |
|---|---|---|---|---|---|---|
| SPF | `@` | TXT | `<provider SPF, merged into one record>` | `<ttl>` | `<ISO-8601>` | `<screenshot/link>` |
| DKIM 1 | `<selector>._domainkey` | CNAME/TXT | `<exact provider value>` | `<ttl>` | `<ISO-8601>` | `<screenshot/link>` |
| DKIM 2 | `<selector>._domainkey` | CNAME/TXT | `<exact provider value>` | `<ttl>` | `<ISO-8601>` | `<screenshot/link>` |
| DMARC | `_dmarc` | TXT | `<v=DMARC1; ...>` | `<ttl>` | `<ISO-8601>` | `<screenshot/link>` |

Điều kiện pass:

- Chỉ có một SPF TXT record cho domain gửi; nếu đã có SPF thì merge thêm provider, không tạo record SPF thứ hai.
- DKIM selector resolve đúng public key/target do provider cấp và provider báo signing enabled.
- DMARC tồn tại tại `_dmarc.<domain>`; giai đoạn đầu có thể `p=none` để quan sát, sau đó Business/Security Owner duyệt nâng `quarantine` rồi `reject`.
- Email test tới mailbox kiểm soát có `spf=pass`, `dkim=pass`, `dmarc=pass` và alignment với `From: noreply@<domain>`.

## 5. Operational policy đề xuất

Các số này là baseline kỹ thuật đã điền; IT/Mail Owner chỉ sửa nếu quota provider thấp hơn và ghi rõ lý do.

```yaml
rate_per_minute: 60
burst: 10
max_concurrency: 5
max_attempts: 8
retry_window_seconds: 86400
```

Canary list phải giới hạn email kiểm soát trong staging. Không đưa email candidate thật vào canary list.

## 6. Approval checklist

- [ ] Provider và mailbox/domain owner đã được xác nhận.
- [ ] AWS account/region, SES identity, SMTP credential reference và IAM owner đã có evidence.
- [ ] Secret đã được lưu trong vault; DEC chỉ chứa `secret_ref`.
- [ ] SPF/DKIM/DMARC đã publish và có kết quả pass/alignment.
- [ ] SES sandbox/production status, canary recipients, quota và retry policy đã được xác nhận.
- [ ] Data region, retention, bounce/failure owner đã được Privacy/Operations review.
- [x] Provider adapter cụ thể đã được bind trong code; configured-but-unbound vẫn fail-closed.
- [ ] Staging smoke đã gửi tới canary và lưu evidence.
- [ ] Security Owner ký duyệt.
- [ ] Business Owner ký duyệt.

## 7. Approval record sau khi hoàn tất

Khi đã điền hết và ký duyệt, tạo file JSON **riêng** (không sửa draft này) theo schema:

```yaml
id: DEC-003
status: approved
version: 1.0.0
scope: staging-and-production
artifact_checksum: sha256:<sha256-of-approved-artifact>
provider: SMTP_IMAP
vendor: AWS_SES
transport: nodemailer-smtp
aws_region: <approved-aws-region>
ses_identity_arn: <verified-identity-arn>
smtp_endpoint: email-smtp.<approved-aws-region>.amazonaws.com
smtp_credential_ref: <secret-manager-reference>
sandbox_status: <sandbox|production>
canary_recipients:
  - <corporate-canary-address>
approvals:
  - role: Security Owner
    identity: <corporate-identity>
    at: <ISO-8601>
  - role: Business Owner
    identity: <corporate-identity>
    at: <ISO-8601>
operational_policy:
  rate_per_minute: 60
  burst: 10
  max_concurrency: 5
  max_attempts: 8
  retry_window_seconds: 86400
```

Do not include AWS secret access key, SES SMTP password, OAuth secret, refresh token, DKIM private key, mailbox password or raw candidate data in this artifact.
