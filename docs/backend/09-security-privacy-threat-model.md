---
title: Security Privacy and Threat Model
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Security Owner
reviewers:
  - Backend Tech Lead
  - Privacy Owner
  - Operations Owner
approvers:
  - Security Owner
  - Privacy Owner
risk: critical
---

# 09. Security, privacy và threat model

## 1. Security objectives

1. Chỉ nhân viên nội bộ đã xác thực và còn active mới truy cập CMS.
2. Mọi access bị giới hạn bởi action, scope và sensitivity tại backend.
3. Passport, liên hệ, email body, document và export được bảo vệ xuyên suốt vòng đời.
4. Không gửi email, chia sẻ sang Nhật, purge hay break-glass khi chưa có approval tương ứng.
5. Security event và business mutation có truy vết nhưng log/audit không trở thành nguồn rò PII.

## 2. Assets và classification

| Class | Ví dụ | Control tối thiểu |
|---|---|---|
| `PUBLIC` | catalog label công khai | integrity, versioning |
| `INTERNAL` | order title, task metadata | auth + scope |
| `CONFIDENTIAL` | email/phone, interview feedback, salary | scoped action, mask, audit access |
| `RESTRICTED` | passport, address detail, email body, document, export | action riêng, encrypt, reason/approval khi cần, access audit |
| `SECRET` | OIDC/mail/storage/DB keys, signing keys | secret manager, rotation, không qua app response/log |

Data owner là Product/Business; custodian là Engineering/Operations; Privacy Owner duyệt purpose, retention và cross-border processing.

## 3. Trust boundaries

```text
Browser --TLS--> Reverse proxy/WAF --private network--> API
API --private TLS/network--> PostgreSQL / Redis / Object storage
Worker/Scheduler --egress allowlist--> Mail provider / OIDC provider
Mail provider --verified webhook--> Public webhook endpoint --> queue/fetch
Operations --MFA + audited access--> hosts, secret store, backups
```

Không expose PostgreSQL, Redis, object storage admin port hoặc metrics nội bộ ra Internet. API và webhook có ingress policy riêng; worker không có public listener.

## 4. Threat register và controls

| Threat | Primary controls | Required evidence |
|---|---|---|
| Account takeover/session theft | OIDC MFA, short session, secure cookies, revoke, device/IP anomaly alert | SSO/MFA/revoke E2E |
| CSRF/CORS abuse | SameSite cookie, CSRF double-submit/bound token, exact origin allowlist | negative browser/API tests |
| BOLA/IDOR | action + scope check sau entity load, deny-by-default | cross-team matrix tests |
| Stored/reflected XSS từ email/import | server validation, HTML sanitization, output encoding, CSP | malicious corpus tests |
| SQL/query injection | Prisma parameterization, filter allowlist, no generic query | SAST + negative tests |
| SSRF | không fetch arbitrary URL; egress allowlist; object/provider SDK | URL bypass tests |
| Malicious upload/archive bomb | quarantine, stream limit, MIME detect, antivirus, archive limits | malware/size/MIME tests |
| Email spoof/replay/loop | SPF/DKIM/DMARC, webhook verification, provider ID dedupe, loop headers | DNS/provider evidence + replay tests |
| Queue replay/poison payload | payload schema/version, idempotency, max attempts, DLQ permission | replay/fuzz tests |
| Secret leakage | external secret store, redaction, no secret in Redis/DB/repo | secret scan + log fixture test |
| Privilege escalation | code-owned permission registry, approval, separation of duties | allow/deny/SoD tests |
| Insider bulk exfiltration | export off by default, purpose/reason, scope snapshot, audit/alerts | export abuse tests |
| Backup/object leakage | encryption, separate credentials, restricted restore, retention | restore/access review |
| Supply-chain compromise | lockfile, provenance/SBOM, dependency/container scan, signed images | CI artifact reports |

## 5. Authentication/session controls

- Production chỉ OIDC Authorization Code + PKCE; local password endpoint không tồn tại.
- Issuer, audience, redirect URI, signing algorithm/key và nonce/state kiểm exact; không dùng wildcard redirect.
- Identity map bằng immutable provider subject + issuer; email không là primary key.
- `Secure`, `HttpOnly`, `SameSite=Lax/Strict` session cookie; rotate session sau login/privilege change.
- Idle/absolute timeout và MFA claim policy được DEC-002 approve; trước đó production auth bị chặn.
- Deactivated user revoke session và chặn queue/export download ngay lần kiểm sau.
- Support không impersonate user. Break-glass mặc định tắt, time-bound, dual approval và high-severity alert.

## 6. Authorization

Controller không tự suy luận quyền. Flow bắt buộc: authenticate -> CSRF (mutation) -> resolve action -> load minimal scope metadata -> policy evaluate -> sensitivity check -> validate -> execute -> audit.

- List/search apply scope trong SQL.
- Entity ngoài scope trả 404 hoặc 403 theo endpoint policy nhất quán, không lộ tồn tại.
- Field serializer mask/remove trước DTO; không dựa vào frontend.
- Admin role không ngầm có data-content permissions.
- Bulk action authorize từng item và batch-level action; partial result không lộ item ngoài scope.

Chi tiết registry/matrix ở [03-api-iam-and-permissions](./03-api-iam-and-permissions.md).

## 7. Encryption và key management

- TLS 1.2+ ở ingress/provider; internal TLS hoặc private network + authenticated service tùy topology approved.
- Disk/database/object/backup encryption at rest bắt buộc.
- Restricted fields dùng application encryption envelope; DEK/key version trong ciphertext metadata, KEK ở external KMS/secret store.
- Passport search dùng HMAC blind index với key riêng encryption key.
- Rotation hỗ trợ decrypt old/encrypt new, batch idempotent, audit; không log plaintext.
- Signing keys cho preview/reply token tách khỏi session/mail credential và có overlap window khi rotate.

## 8. Input, output và API hardening

- DTO reject unknown field cho command; string length/Unicode normalization/enum/range rõ trong OpenAPI.
- Request body/headers/upload size giới hạn tại proxy và API.
- JSON depth/property count và decompression limit.
- Cursor/preview/reply token ký, bound vào purpose/user/scope/version, TTL ngắn.
- Error response dùng messageKey/params an toàn; stack/provider/SQL detail chỉ ở redacted internal log.
- CSP, `frame-ancestors`, `nosniff`, Referrer-Policy và Permissions-Policy cấu hình tại frontend/proxy.
- Rate limit theo user/session/IP/action; login ở IdP, webhook theo provider identity và replay window.

## 9. Privacy controls

Trước dữ liệu thật cần approved privacy record gồm lawful purpose, notice version, data categories, recipients, retention, data-subject process và cross-border transfer sang Nhật.

- Thu thập tối thiểu; dynamic field mới cần classification/purpose.
- Consent/notice acceptance nếu pháp lý yêu cầu phải lưu version/time/source; hệ thống không tự coi email reply là consent.
- Share/export sang Nhật cần recipient/purpose/scope/version/approval và expiry; không gửi public link.
- Correction/restriction/legal hold/purge là explicit audited workflow.
- Non-production chỉ dùng synthetic hoặc anonymized fixtures đã kiểm re-identification risk.

Duration và legal basis đang `blocked_by_external_decision`; `PURGE_ENABLED=false`, production data import/share bị chặn đến DEC-005 approved.

## 10. Secrets và environment

- Secret chỉ inject runtime từ secret manager/file permission-restricted; không commit `.env`, không bake image.
- Tách secret theo environment và service; API không cần raw backup/admin credential.
- Rotation runbook cho DB, OIDC, mail, storage, encryption/signing.
- Startup validate secret reference nhưng không in value/hash có thể dò.
- CI dùng short-lived identity khi nền tảng hỗ trợ; production secret không vào fork/preview job.
- Secret scanning chạy trên commit và image/config artifact.

## 11. Logging và audit redaction

Allowlist metadata: request/correlation ID, route template, status, duration, actor pseudonymous ID, entity type/ID, job/event ID, error code. Denylist: authorization/cookie/token, raw header/MIME, body, passport, address, full email/phone, filename nhạy cảm, signed URL, SQL bind values.

Redaction test dùng sentinel fixtures và scan toàn bộ captured logs/traces/audit. Fail gate nếu sentinel xuất hiện.

## 12. Vulnerability management

- Lock dependency và runtime image digest; generate SBOM CycloneDX/SPDX.
- PR: SAST, secret scan, dependency policy, unit/security tests.
- Release: container/IaC/config scan, DAST staging, manual threat review cho flow critical.
- Critical/high không có approved risk acceptance thì chặn release.
- Security Owner sở hữu triage SLA và disclosure/patch runbook; severity dựa trên exploitability + data exposure, không chỉ scanner score.

## 13. Incident response

Runbook phải bao phủ account/session compromise, mailbox token, leaked export/signed URL, malware upload, data exfiltration, ransomware/data loss và dependency compromise.

Flow: detect -> preserve evidence -> contain/revoke/kill switch -> assess scope -> notify owner/legal -> eradicate -> recover/verify -> post-incident actions. Không purge/log cleanup khi incident hold đang active.

## 14. Security acceptance gate

- Tất cả endpoint nhạy cảm có unauthenticated, forbidden scope, wrong sensitivity và allowed test.
- CSRF/CORS/session fixation/revoke/expired user test pass.
- OWASP-style injection, XSS, SSRF, upload, webhook replay, mass assignment và rate-limit tests pass.
- Secret/log/trace/audit sentinel scan sạch.
- Cross-border share/export/download có approval, expiry, revoke và access audit.
- Threat register được Security Owner ký; không còn critical/high mở hoặc risk acceptance hết hạn.
