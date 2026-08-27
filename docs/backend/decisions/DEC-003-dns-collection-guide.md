# Hướng dẫn lấy SPF, DKIM, DMARC cho DEC-003

Tài liệu này chỉ hướng dẫn **lấy giá trị và bằng chứng**. Việc sửa DNS phải do DNS Owner/IT thực hiện. Không tự nhập các giá trị ví dụ bên dưới nếu provider chưa cấp đúng giá trị đó.

## 1. Xác định nơi quản trị DNS

Bạn cần biết domain gửi, ví dụ `company.vn`, và quyền vào DNS host (Cloudflare, GoDaddy, Namecheap, nhà đăng ký domain hoặc DNS nội bộ).

Nếu chưa biết DNS đang nằm ở đâu, chạy:

```powershell
Resolve-DnsName -Type NS company.vn
```

Tên trong phần `NameHost` là nameserver. Gửi tên đó cho IT/DNS Owner để xác định portal đăng nhập. Không đổi nameserver trong bước này.

## 2. Kiểm tra record hiện tại trước khi sửa

Thay `company.vn` và selector bằng domain thật:

```powershell
Resolve-DnsName -Type TXT company.vn
Resolve-DnsName -Type TXT _dmarc.company.vn
Resolve-DnsName -Type CNAME selector1._domainkey.company.vn
Resolve-DnsName -Type TXT selector1._domainkey.company.vn
```

Ghi lại toàn bộ record hiện tại vào bảng DNS evidence trong [DEC-003 draft](./DEC-003-mail-provider-draft.md). Đặc biệt không xóa SPF hiện có vì website, CRM, hóa đơn hoặc marketing có thể đang gửi mail qua cùng domain.

## 3. SPF

SPF là **một TXT record duy nhất** tại root domain (`@`). Nếu đã có SPF, phải merge thêm provider vào record đó; không tạo record SPF thứ hai.

Giá trị thường gặp khi chỉ có một provider:

| Provider | Giá trị tham khảo |
|---|---|
| Amazon SES (không dùng custom MAIL FROM) | Không thêm một SPF record mới cho SES; giữ SPF hiện có và bảo đảm DKIM/DMARC alignment |
| Amazon SES (có custom MAIL FROM) | Copy chính xác `include:amazonses.com`/giá trị SPF mà SES hiển thị cho MAIL FROM domain, rồi merge vào SPF hiện có |

Nếu công ty còn sender khác, giữ nguyên các `include:`/IP hợp lệ và thêm provider mới. SPF có giới hạn DNS lookup; không copy nhiều record từ nhiều nguồn một cách máy móc.

Thao tác:

1. Mở DNS host → DNS Records → TXT.
2. Tìm record host `@` bắt đầu bằng `v=spf1`.
3. Sửa record hiện tại hoặc tạo một record duy nhất.
4. TTL dùng mặc định/3600; lưu lại screenshot và thời gian.
5. Chờ DNS propagate rồi chạy `Resolve-DnsName -Type TXT company.vn`.

## 4. DKIM

DKIM cần **public key/target** trong DNS; private key chỉ nằm ở provider/vault, không đưa vào DEC.

### Amazon SES Easy DKIM

1. AWS Console → SES → đúng Region → Configuration → Verified identities → chọn domain.
2. Chọn Easy DKIM, ưu tiên khóa 2048-bit.
3. Copy nguyên văn ba CNAME record (name/value) SES phát sinh; không tự đoán selector hoặc target.
4. Tạo các CNAME ở DNS host, TTL 3600 hoặc mặc định.
5. Chờ DNS resolve rồi kiểm tra SES báo DKIM `Successful`/identity `Verified`; lưu screenshot hoặc ticket evidence.

SES Easy DKIM tạo record theo từng AWS Region. Nếu gửi ở region khác, phải verify/configure identity và DKIM cho region đó.

### Không dùng BYODKIM trong DEC-003

Chỉ dùng BYODKIM nếu Security Owner phê duyệt riêng và secret private key được quản lý trong vault. DEC này dùng Easy DKIM mặc định để giảm vận hành key.

## 5. DMARC

DMARC là TXT record tại `_dmarc` của domain gửi. Nên triển khai theo từng bước:

1. Bắt đầu quan sát, không chặn mail:

```text
v=DMARC1; p=none; rua=mailto:dmarc@company.vn; adkim=r; aspf=r; pct=100
```

2. Theo dõi report ít nhất một tuần và sửa mọi sender hợp lệ đang fail SPF/DKIM.
3. Khi đã ổn, Business/Security Owner duyệt chuyển dần sang `p=quarantine` rồi `p=reject`.
4. Không dùng `p=reject` ngay trong lần đầu nếu chưa có report và test alignment.

`dmarc@company.vn` phải là mailbox/reporting destination do công ty kiểm soát. Nếu dùng địa chỉ report ngoài domain, cần cấu hình ủy quyền nhận report tương ứng.

## 6. Kiểm tra pass/alignment bằng email thật

Sau khi SPF/DKIM/DMARC đã resolve:

1. Gửi một email staging từ `noreply@company.vn` tới Gmail/Outlook kiểm soát.
2. Mở message → Show original/View source.
3. Tìm `Authentication-Results` và ghi lại:

```text
spf=pass
dkim=pass
dmarc=pass
```

4. Kiểm tra domain trong DKIM `header.d=` hoặc SPF envelope domain align với domain `From` theo policy đã chọn.
5. Lưu header đã mask địa chỉ nhạy cảm, provider message ID, timestamp, recipient canary vào evidence; không commit raw header chứa token.

## 7. Form bạn chỉ cần gửi lại

Bạn có thể trả lời bằng form này; không gửi secret/private key:

```text
PROVIDER=AWS_SES_SMTP_NODemailer
RUNTIME_MAIL_PROVIDER=SMTP_IMAP
SENDING_DOMAIN=
MAILBOX_ADDRESS=
SENDER_DISPLAY_NAME=
DNS_PROVIDER=
DNS_OWNER=
MAIL_OWNER=
AWS_REGION=
SES_IDENTITY_ARN=
SES_SMTP_ENDPOINT=
SES_SMTP_PORT=
SES_SMTP_CREDENTIAL_REF_ONLY=
SES_CONFIGURATION_SET=
IAM_PRINCIPAL_REF=
PRODUCTION_ACCESS_EVIDENCE=
SES_DKIM_CNAME_1_NAME=
SES_DKIM_CNAME_1_TARGET=
SES_DKIM_CNAME_2_NAME=
SES_DKIM_CNAME_2_TARGET=
SES_DKIM_CNAME_3_NAME=
SES_DKIM_CNAME_3_TARGET=
SPF_RECORD_AFTER_PUBLISH=
DMARC_RECORD_AFTER_PUBLISH=
CANARY_RECIPIENT_1=
CANARY_RECIPIENT_2=
SANDBOX_ENDPOINT=
PROVIDER_QUOTA=
DATA_REGION=
RETENTION_POLICY_REF=
BOUNCE_OWNER=
```

## Nguồn chính thức AWS SES

- [Obtaining Amazon SES SMTP credentials](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html)
- [Connecting to an Amazon SES SMTP endpoint](https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html)
- [Easy DKIM in Amazon SES](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-dkim-easy.html)
- [Creating and verifying identities](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html)
- [Request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)

## Nguồn tham khảo provider khác

- Google: [Set up SPF](https://support.google.com/a/answer/33786), [Set up DKIM](https://support.google.com/a/answer/174124), [Recommended DMARC rollout](https://support.google.com/a/answer/10032473).
- Microsoft: [Set up SPF/DNS records](https://learn.microsoft.com/microsoft-365/admin/get-help-with-domains/create-dns-records-at-any-dns-hosting-provider), [Set up DKIM](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure), [Set up DMARC](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dmarc-configure).
