---
title: API IAM and Permissions
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Security Owner
reviewers:
  - Backend Tech Lead
  - Product Owner
approvers:
  - Security Owner
risk: high
---

# 03. API, IAM và permission

## 1. Authentication decision

Production dùng enterprise OIDC Authorization Code flow với state, nonce và PKCE. Không lưu password người dùng CMS. MFA, password policy và account recovery thuộc IdP; CMS vẫn kiểm user provisioning/status và session revocation của mình.

Provider cụ thể được cấu hình bằng issuer metadata, không hardcode Microsoft/Google. Issuer allowlist chỉ có giá trị được IT Owner approved.

## 2. Session model

| Field | Rule |
|---|---|
| `id` | 256-bit random opaque ID; DB chỉ lưu hash |
| `userId` | Internal user FK |
| `issuedAt`, `expiresAt` | Absolute expiry theo policy |
| `idleExpiresAt` | Sliding idle expiry có max absolute limit |
| `oidcSubject`, `issuer` | Unique identity mapping |
| `authMethods` | Claim đã normalize; không chứa token raw |
| `ipHash`, `userAgentSummary` | Dùng security/audit theo policy, không fingerprint quá mức |
| `revokedAt`, `revokeReason` | Logout, disable user, role change nhạy cảm, incident |

Cookie `cms_sid` là `HttpOnly`, `Secure`, `SameSite=Lax`, không chứa user data. Session material nằm ở Redis với PostgreSQL revocation/source record nếu cần đối soát. Redis mất dữ liệu làm session hết hiệu lực, không bypass auth.

## 3. CSRF và CORS

- Mọi mutation browser gửi `X-CSRF-Token` gắn session.
- Token rotate khi login và privilege elevation.
- CORS allowlist chính xác theo origin production/staging; không dùng wildcard với credential.
- `Origin`/`Sec-Fetch-Site` bất thường bị reject và metric hóa.
- GET không được thay đổi state hoặc trigger email/export.

## 4. User lifecycle

```text
INVITED -> ACTIVE -> LOCKED | DISABLED
LOCKED -> ACTIVE (approved unlock)
DISABLED không tự quay lại ACTIVE từ OIDC callback
```

- OIDC subject/email không tự cấp role.
- First login chỉ thành công khi invitation/user mapping active.
- Disable user revoke toàn bộ session, chuyển/review task và ghi audit.
- Đổi team/role làm permission có hiệu lực ngay; session cache version mismatch buộc refresh.

## 5. Permission registry

Action string là API contract, không đặt theo tên UI. Baseline:

```text
candidate.view
candidate.create
candidate.update_basic
candidate.view_sensitive
candidate.merge
candidate.archive
client.view
client.create
client.update
job_order.view
job_order.create
job_order.update
job_order.transition
application.view
application.create
application.update
application.decide
interview.schedule
interview.record_result
supply_journey.view
supply_journey.create
supply_journey.update_milestone
supply_journey.waive_milestone
supply_journey.complete
email.read
email.send
email.manual_link
email.retry
document.upload
document.download
document.download_sensitive
task.view
task.update
task.assign
report.view
export.create
catalog.configure
iam.configure
audit.view
break_glass.activate
```

Thêm action cần migration/seed, OpenAPI permission note, negative test và decision review.

## 6. Scope model

```text
SELF < TEAM < DEPARTMENT < COMPANY
```

Scope không chỉ so owner ID. Mỗi resource công bố `ScopeAttributes`:

```ts
export type ScopeAttributes = {
  ownerUserId?: string;
  teamId?: string;
  departmentId?: string;
};
```

Policy evaluation:

```ts
export type AuthorizationInput = {
  actor: ActorContext;
  action: PermissionAction;
  resource?: ScopeAttributes;
  sensitivity: 'NORMAL' | 'PERSONAL' | 'HIGHLY_SENSITIVE';
  reason?: string;
};

export interface AuthorizationService {
  assertAllowed(input: AuthorizationInput): Promise<AuthorizationDecision>;
  scopeFilter(actor: ActorContext, action: PermissionAction): PrismaScopeFilter;
}
```

List query bắt buộc dùng `scopeFilter`; detail/mutation dùng query scoped ngay từ DB. Không load record ngoài scope rồi mới trả 403.

## 7. Baseline role matrix

| Action group | Recruiter | Business | Japan Coordinator | Manager | Config Admin |
|---|---|---|---|---|---|
| Candidate normal | TEAM | DEPARTMENT | ASSIGNED | DEPARTMENT | None |
| Candidate sensitive | ASSIGNED | ASSIGNED | ASSIGNED | DEPARTMENT | None |
| Client/Order | TEAM read | DEPARTMENT write | ASSIGNED read | DEPARTMENT | None |
| Application/Interview | TEAM | DEPARTMENT | ASSIGNED after handoff | DEPARTMENT | None |
| Journey milestone | Read assigned | Read department | ASSIGNED write | DEPARTMENT | None |
| Email body/send | TEAM/assigned | DEPARTMENT/assigned | ASSIGNED | DEPARTMENT | None |
| Merge/export/waive | None | None | None | Approval + reason | None |
| IAM/catalog | None | None | None | Limited | COMPANY config |

Đây là seed baseline để viết test. Production role activation vẫn cần Product/Security approval trong decision register.

## 8. Sensitivity và field policy

| Level | Ví dụ | Default response |
|---|---|---|
| NORMAL | code, status, owner, occupation | Full theo scope |
| PERSONAL | email, phone, DOB, address region | Mask trên list; detail theo action |
| HIGHLY_SENSITIVE | passport, identity document, email body, feedback hạn chế | Omit hoặc explicit reveal/download action |

- API schema dùng separate summary/detail DTO; không serialize rồi xóa field ngẫu nhiên.
- Masked field có `null` hoặc `maskedValue` theo schema, không trả raw cạnh masked.
- Search index không chứa plaintext passport/email body/document text nhạy cảm.
- Signed URL chỉ tạo sau permission check và có audit.

## 9. Approval and reason

Command có `approvalRequired=true` không chấp nhận client tự truyền approver tùy ý. Backend tạo ApprovalRequest hoặc kiểm approved decision liên kết command.

Các action bắt buộc reason:

- candidate merge/archive exception;
- application failure/withdrawal override;
- journey cancellation/waiver/completion override;
- sensitive export/download bulk;
- manual email relink/retry override;
- break-glass.

Reason trim, 10–1.000 ký tự, không được chứa secret; được audit và có quyền xem riêng.

## 10. Break-glass

- Disabled mặc định.
- Chỉ role được Security chỉ định.
- Yêu cầu reason, incident/reference ID và expiry tối đa 60 phút.
- Không cho phép tự phê duyệt nếu policy yêu cầu two-person rule.
- Gửi alert ngay, audit mọi access, review sau sự kiện.
- Không bỏ qua field redaction trong application log.

## 11. API enforcement order

1. Request ID và safe logging context.
2. Session authentication.
3. CSRF cho mutation.
4. Route-level action requirement.
5. Request validation/normalization.
6. Scoped resource lookup.
7. Sensitivity/approval/reason policy.
8. Domain invariant và transaction.
9. Audit/outbox commit.
10. Response mapping/redaction.

Validation error không được dùng để dò record ngoài scope; scoped lookup xảy ra trước business validation cần resource.

## 12. Rate limiting

Limiter dùng actor/session và IP ở auth boundary. Reverse proxy header chỉ tin từ proxy allowlist. `X-Forwarded-For` từ client public bị bỏ qua.

Response 429:

```text
RateLimit-Limit
RateLimit-Remaining
RateLimit-Reset
Retry-After
```

Không dùng rate limit thay authorization hoặc idempotency.

## 13. Audit events

IAM tối thiểu ghi:

- login success/failure category, logout, session expired/revoked;
- invitation, activation, lock, disable, unlock;
- role/team/scope changes;
- permission denied theo action và resource type, không chứa PII;
- break-glass request/approval/use/expiry;
- sensitive reveal/download/export.

Không log OIDC code, access token, refresh token, session cookie hoặc CSRF token.

## 14. Security tests

- OIDC state/nonce/PKCE mismatch.
- Open redirect qua `returnTo`.
- Session fixation, idle/absolute expiry, revoke-all.
- CSRF missing/invalid/cross-origin.
- Horizontal and vertical authorization.
- Role cache stale sau role/team change.
- BOLA/IDOR trên list/detail/download/export.
- Mass assignment `ownerUserId`, `teamId`, sensitivity và audit fields.
- Config admin không đọc email/document/candidate PII.
- Break-glass expiry và alert.

Permission-negative suite cho registry mục 5 phải đạt 100% trước release.
