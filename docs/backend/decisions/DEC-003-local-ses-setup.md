# SES + Nodemailer local setup

Code đã có adapter AWS SES SMTP + Nodemailer nhưng mặc định vẫn **không gửi Internet**. Local chỉ gửi thật khi bạn chủ động chuyển provider, có approval record DEC-003 hợp lệ và đã xác minh identity/recipient trong đúng region.

Local hiện đã được cấu hình theo bản ghi tự xác nhận `scope=development` tại `.local-secrets/dec-003-local.json`. Bản ghi này chỉ mở khóa môi trường local, không thay thế approval doanh nghiệp cho staging/production.

## 1. Giá trị đã xác định

- AWS region: `ap-southeast-2` (Asia Pacific — Sydney)
- SES SMTP endpoint: `email-smtp.ap-southeast-2.amazonaws.com`
- Khuyến nghị transport: port `587` + STARTTLS (`SES_SMTP_SECURE=false`)
- Sender: `noreply@linhtranne.id.vn` sau khi SES báo identity `Verified`
- Runtime contract: `MAIL_PROVIDER=SMTP_IMAP` (vendor `AWS_SES`, adapter `SesSmtpMailProviderAdapter`)
- Mail mode: `MAIL_MODE=NOTIFICATION_ONLY`; adapter này không nhận inbound/reply/IMAP

## 2. Bạn cần làm bên ngoài repository

1. Trong SES Sydney, mở identity `linhtranne.id.vn`, bấm **Get DNS Records**, thêm đúng DKIM/CNAME (và MAIL FROM record nếu bạn đã chọn custom MAIL FROM) vào DNS. Chờ trạng thái identity/DKIM chuyển `Verified/Successful`.
2. Vì account đang ở Sandbox, verify từng địa chỉ nhận test trong SES (hoặc request production access). Khi chưa production access, chỉ gửi tới địa chỉ đã verify.
3. Với staging/production, hoàn thiện và ký [DEC-003 draft](./DEC-003-mail-provider-draft.md), sau đó lưu approval record JSON vào secret manager hoặc một đường dẫn được mount read-only. Bản ghi local hiện tại chỉ là self-attested cho `development`; không dùng nó cho staging/production. Không đưa SMTP password vào DEC, Git, issue hoặc chat.
4. Từ file CSV AWS đã tải, lấy đúng hai cột `SMTP user name` và `SMTP password`. Không dùng `IAM user name` làm SMTP username.

## 3. Cấu hình local (PowerShell)

Trong `.env` (file này đã được `.gitignore`), giữ các giá trị sau và tự điền hai secret ở máy của bạn:

```dotenv
MAIL_PROVIDER=SMTP_IMAP
MAIL_MODE=NOTIFICATION_ONLY
MAIL_SENDER_ADDRESS=noreply@linhtranne.id.vn
MAIL_PROVIDER_APPROVAL_RECORD_FILE=/run/secrets/dec-003-local.json
MAIL_CANARY_RECIPIENTS=tuhithanahihi@gmail.com

SES_SMTP_ENDPOINT=email-smtp.ap-southeast-2.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_SECURE=false
SES_SMTP_USERNAME=<SMTP user name từ CSV>
SES_SMTP_PASSWORD=
SES_SMTP_PASSWORD_FILE=/run/secrets/ses_smtp_password
```

`docker-compose.yml` đã chuyển các biến `SES_SMTP_*` vào API/worker; sau khi sửa `.env`, cần recreate container (`docker compose --profile queue up -d --build --force-recreate api worker scheduler`) để process nhận giá trị mới.
Nếu chạy trong container, `MAIL_PROVIDER_APPROVAL_RECORD_FILE` và `SES_SMTP_PASSWORD_FILE` phải là đường dẫn **bên trong container** được mount read-only; đường dẫn Windows như `C:\...` chỉ dùng khi chạy API trực tiếp trên host.

Không dán giá trị thật vào tài liệu này. Nếu secret đã từng bị lộ, revoke/rotate SMTP credential trong IAM/SES rồi cập nhật `.env` mới.
Ở `staging`/`production`, runtime từ chối `SES_SMTP_PASSWORD` dạng raw và yêu cầu `SES_SMTP_PASSWORD_FILE`; local development/test mới cho phép đọc raw secret từ `.env` vì file này đã bị gitignore.

## 4. Chuyển mailbox local sang provider SMTP

Seed demo mặc định vẫn dùng `FAKE` để không gửi nhầm. Khi `.env` đã chọn rõ `MAIL_PROVIDER=SMTP_IMAP`, seed sẽ đồng bộ mailbox thông báo sang `SMTP_IMAP`, địa chỉ `MAIL_SENDER_ADDRESS` và trạng thái `HEALTHY`. Có thể chạy lại `pnpm --filter @cms/api db:seed:local-data` khi cần nạp lại dữ liệu local. Nếu đổi provider từ giao diện **Quản trị → Hộp thư**, chọn adapter tương ứng và lưu; không để mailbox ở `NOT_CONFIGURED`.

## 5. Kiểm tra an toàn trước khi gửi

```powershell
pnpm --filter @cms/api db:migrate:status
pnpm --filter @cms/api typecheck
pnpm --filter @cms/api test:provider-smoke-gate
```

Health endpoint chỉ báo provider đã verify được kết nối; nó không chứng minh thư đã tới inbox. Gửi một notification tới địa chỉ canary đã verify, kiểm tra message trong SES và phần header `Authentication-Results` (SPF/DKIM/DMARC), rồi mới mở rộng recipient.

Để quay về chế độ không gửi Internet, đặt lại `MAIL_PROVIDER=FAKE` (synthetic local) hoặc `MAIL_PROVIDER=DISABLED` (fail-closed), rồi restart API/worker.
