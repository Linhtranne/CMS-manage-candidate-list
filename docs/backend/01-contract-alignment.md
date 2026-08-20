---
title: Backend Contract Alignment
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
approvers:
  - Backend Tech Lead
  - Frontend Tech Lead
risk: high
---

# 01. Contract alignment

## 1. Gate

Không implement domain controller/service trước khi `packages/contracts/openapi/cms.yaml` đạt toàn bộ mục trong tài liệu này. OpenAPI hiện tại phục vụ frontend/MSW và chưa phải production contract.

## 2. Canonical conventions

| Concern | Canonical decision |
|---|---|
| Base path | `/api/v1` |
| Format | JSON UTF-8 |
| Field naming | camelCase cho wire contract TypeScript |
| ID | UUID string; server sinh, client không tự tạo business entity ID |
| Timestamp | RFC 3339 UTC; timezone nghiệp vụ là IANA string riêng |
| List | Cursor pagination, stable sort, `id` tie-breaker |
| Mutation concurrency | `version` bắt buộc cho update/transition |
| Success | `{ data, page?, requestId }` |
| Error | `{ error: { code, messageKey, params?, fieldErrors?, currentVersion? }, requestId }` |
| Localization | API trả code/key/params; không trả câu tiếng Việt làm contract |
| Unknown fields | DTO dùng whitelist + forbid non-whitelisted cho command |

## 3. Security scheme

OpenAPI phải khai báo:

```yaml
components:
  securitySchemes:
    sessionCookie:
      type: apiKey
      in: cookie
      name: cms_sid
    csrfHeader:
      type: apiKey
      in: header
      name: X-CSRF-Token
security:
  - sessionCookie: []
```

- GET safe dùng session cookie.
- POST/PATCH/DELETE cần session cookie và CSRF header.
- OIDC callback và health endpoints khai báo `security: []` có chủ đích.
- MFA được IdP enforce; API kiểm `amr`/policy claim nếu provider cung cấp.

## 4. Auth endpoint changes

Loại khỏi production contract:

- `POST /auth/login` với email/password.

Thay bằng:

| Method | Path | Behavior |
|---|---|---|
| GET | `/auth/oidc/start?returnTo=` | Validate returnTo allowlist, tạo state/nonce/PKCE và redirect IdP |
| GET | `/auth/oidc/callback` | Verify state/nonce/code, provision/update internal user, tạo session, redirect |
| GET | `/auth/session` | Trả user, roles, permissions, scopes và expiry |
| POST | `/auth/logout` | Revoke session, clear cookie, audit |
| GET | `/auth/csrf` | Trả CSRF token gắn session |

Tài khoản `LOCKED`/`DISABLED` không tạo session. User chưa được mời hoặc không có role active nhận `403 USER_NOT_PROVISIONED`.

## 5. Canonical enums

### Candidate

```text
recordStatus: ACTIVE | ARCHIVED
readinessStatus: POTENTIAL | QUALIFIED | READY | PAUSED | NOT_SUITABLE
contactabilityStatus: CONTACTABLE | TEMPORARILY_UNREACHABLE | DO_NOT_CONTACT
```

`operationalPhase` là projection read-only:

```text
POTENTIAL | APPLYING | PASSED | SUPPLYING | SUPPLIED
```

### JobOrder

```text
DRAFT | OPEN | ON_HOLD | FILLED | CANCELLED | CLOSED
```

`RECRUITING` đổi thành `OPEN`; `PAUSED` đổi thành `ON_HOLD`. `CANCELLED` khác `CLOSED` và luôn cần reason.

### Application và Interview

```text
Application: MATCHED | IN_INTERVIEW_PROCESS | ON_HOLD | PASSED | FAILED | WITHDRAWN
Interview.scheduleStatus: DRAFT | SCHEDULED | COMPLETED | CANCELLED | NO_SHOW
Interview.result: PENDING | ADVANCE_NEXT_ROUND | PASS | FAIL
```

`PORTAL` bị loại khỏi Application source vì baseline không có candidate portal.

### Task

```text
status: NEW | IN_PROGRESS | DONE | CANCELLED
waitingOn: NONE | CANDIDATE | CLIENT_PARTNER | INTERNAL | SYSTEM
```

View `waiting-reply` được suy ra từ `status=IN_PROGRESS` và `waitingOn`, không tạo status thứ năm.

### Journey và email

Giữ enum tại data dictionary: Journey `ACTIVE|ON_HOLD|COMPLETED|CANCELLED`; Milestone `NOT_STARTED|IN_PROGRESS|COMPLETED|BLOCKED|WAIVED|NOT_APPLICABLE`; Email delivery `DRAFT|QUEUED|SENDING|SENT|DELIVERED|BOUNCED|FAILED|CANCELLED`.

## 6. Endpoint inventory bắt buộc

### System và IAM

- `/health/live`, `/health/ready`, `/metrics` (metrics chỉ internal network).
- Auth endpoints tại mục 4.
- `/me`, `/search`, `/saved-views`.
- `/admin/users`, `/admin/teams`, `/admin/roles`, `/admin/audit`.

### Catalog

- Read: `/industry-sectors`, `/occupations`, `/visa-routes`.
- Admin: `/admin/industry-sectors`, `/admin/occupations`, `/admin/visa-routes`.
- `/admin/industry-field-definitions`.
- `/admin/interview-question-templates`.
- `/admin/supply-journey-templates` và version activation/retirement commands.
- `/admin/email-templates` và version activation/retirement commands.

### Recruitment

- `/clients`, `/clients/{id}`, `/clients/{id}/contacts`.
- `/job-orders`, `/job-orders/{id}`, `/job-orders/{id}/status-transitions`.
- `/candidates`, `/candidates/{id}`, `/candidates/{id}/occupation-profiles`.
- `/candidate-imports`, preview/commit/status/error-report resources.
- `/candidate-duplicate-cases/{id}/decisions`.
- `/applications`, `/applications/{id}`, `/applications/{id}/decisions`, `/applications/{id}/withdrawals`.
- `/applications/{id}/interviews`, reschedule/cancel/no-show/result commands.
- `/interviews/{id}/question-snapshots`.

### Journey/document

- `/applications/{id}/eligible-supply-journey-templates`.
- `/applications/{id}/supply-journey`.
- `/supply-journeys`, `/supply-journeys/{id}`, completion/cancellation/hold/resume commands.
- `/journey-milestones/{id}`, `/journey-milestones/{id}/attempts`, waiver command.
- `/documents/uploads`, `/documents/{id}`, signed-download command, links và verification.

### Email

- `/mailbox/conversations`, `/mailbox/conversations/{id}`.
- `/email-previews`, `/email-drafts`, `/conversations/{id}/messages`.
- `/email-messages/{id}/cancellations`, `/email-messages/{id}/retry-attempts`.
- `/inbox/messages/{id}/match-decisions`.
- Provider webhook endpoint tách theo adapter và có signature verification.

### Task/report

- `/work-items`, `/work-items/{id}`, summary.
- `/reports/summary`, `/reports/funnel` và drill-down query.
- `/report-exports`, `/report-exports/{id}`.

## 7. Response examples

### Success

```json
{
  "data": {
    "id": "018f0f4b-1f4c-7c3a-9c5e-0f3b5e8f1b20",
    "version": 3
  },
  "requestId": "req_01J5Y1M3A4"
}
```

### Cursor list

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false
  },
  "requestId": "req_01J5Y1M3A4"
}
```

### Error

```json
{
  "error": {
    "code": "VERSION_CONFLICT",
    "messageKey": "errors.versionConflict",
    "params": {},
    "currentVersion": 4
  },
  "requestId": "req_01J5Y1M3A4"
}
```

## 8. Error code baseline

| HTTP | Code |
|---:|---|
| 400 | `VALIDATION_ERROR`, `INVALID_CURSOR`, `INVALID_SORT` |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED`, `CSRF_INVALID` |
| 403 | `FORBIDDEN`, `USER_NOT_PROVISIONED`, `APPROVAL_REQUIRED` |
| 404 | `NOT_FOUND` |
| 409 | `VERSION_CONFLICT`, `DUPLICATE_ACTIVE_APPLICATION`, `ACTIVE_SUPPLY_JOURNEY_EXISTS`, `IDEMPOTENCY_CONFLICT` |
| 422 | `INVALID_STATE_TRANSITION`, `CATALOG_VALUE_INACTIVE`, `MISSING_REQUIRED_EVIDENCE`, `JOURNEY_TEMPLATE_NOT_APPLICABLE`, `DO_NOT_CONTACT` |
| 413 | `PAYLOAD_TOO_LARGE`, `ATTACHMENT_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 429 | `RATE_LIMITED` |
| 503 | `DEPENDENCY_UNAVAILABLE` |

Không phân biệt 403/404 theo cách làm lộ record ngoài scope; policy query trả `NOT_FOUND` cho resource không được phép biết tồn tại.

## 9. Pagination và filter

- Cursor là token opaque có signature, chứa sort key cuối và filter hash.
- Request đổi filter/sort với cursor cũ trả `INVALID_CURSOR`.
- Default page size 25; max 100 cho list thường, max 50 cho audit/email body list.
- Sort allowlist theo endpoint; không truyền raw column SQL.
- Search query trim, giới hạn 200 ký tự và rate-limit.

## 10. Rate-limit classes

| Class | Baseline | Scope |
|---|---:|---|
| Auth start/callback | 20/phút | IP + session attempt |
| Read/search | 120/phút | user |
| Mutation | 60/phút | user + action |
| Email send/retry | 30/phút | user + mailbox |
| Export/import | 10/giờ | user |
| Webhook | provider-specific | signature + mailbox |

Giá trị có thể điều chỉnh sau load test nhưng class và `429` contract không thay đổi.

## 11. Contract CI gate

CI phải:

1. Validate OpenAPI 3.1 syntax và unresolved `$ref`.
2. Lint naming/security/examples/error coverage.
3. Sinh TypeScript types và fail khi có uncommitted diff.
4. Chạy contract tests cho mọi operationId.
5. Chạy breaking-change diff so với contract trên main.
6. Chạy frontend typecheck và MSW handler coverage.

Test hiện chỉ kiểm năm path literal phải được thay bằng kiểm tra operation inventory, canonical enum và envelope schema.

## 12. Alignment exit criteria

- Không còn `/auth/login` password contract.
- Không còn enum Candidate/JobOrder cũ.
- Mọi list có cursor/page contract.
- Mọi mutation có auth, CSRF, permission và documented errors.
- Mọi response có envelope/requestId.
- Endpoint inventory mục 6 có operationId duy nhất.
- Generated client, frontend typecheck và contract tests đều xanh.
