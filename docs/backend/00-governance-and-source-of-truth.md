---
title: Backend Governance and Source of Truth
status: ready_for_human_approval
version: 1.0.0
updated_at: 2026-08-20
owner: Backend Tech Lead
approvers:
  - Backend Tech Lead
  - Product Owner
risk: high
---

# 00. Governance và nguồn sự thật

## 1. Mục tiêu

Ngăn đội backend tự suy diễn khi tài liệu, OpenAPI, frontend mock hoặc yêu cầu miệng khác nhau; định nghĩa cách thay đổi, review, phê duyệt và lưu bằng chứng cho hệ thống xử lý PII.

## 2. Thứ tự nguồn sự thật

| Ưu tiên | Nguồn | Phạm vi |
|---:|---|---|
| 1 | ADR `Accepted` và decision record `approved` | Quyết định kiến trúc/nghiệp vụ cụ thể |
| 2 | Tài liệu backend `approved` | Runtime, contract, module, security, operations |
| 3 | `docs/11-tu-dien-du-lieu.md` | Entity, field, enum và invariant domain |
| 4 | `packages/contracts/openapi/cms.yaml` sau alignment gate | HTTP contract thực thi |
| 5 | `docs/09-*`, `docs/13-*` | Acceptance và hành vi quan sát được |
| 6 | UI/UX specs | Trải nghiệm consumer |
| 7 | MSW fixture/handler/frontend backlog | Test double; không là nguồn business rule |

Một file có ưu tiên cao chỉ supersede phần được ghi rõ; không mặc định vô hiệu toàn bộ nguồn dưới.

## 3. Document status

| Status | Ý nghĩa | Có được code production? |
|---|---|---:|
| `draft` | Đang soạn, có thể còn mâu thuẫn | Không |
| `ready_for_human_approval` | Đã self-review, đủ để reviewer đánh giá | Chỉ spike/test scaffold không chứa dữ liệu thật |
| `approved` | Approver có thẩm quyền đã ký | Có, trong scope được duyệt |
| `blocked_by_external_decision` | Thiếu quyết định provider/legal/business | Không cho phần bị chặn |
| `superseded` | Có tài liệu thay thế | Không dùng cho thay đổi mới |

Metadata approval phải gồm `approved_by`, `approved_at`, decision/issue URL và version. Commit author không đồng nghĩa approver.

## 4. Risk control

| Risk | Ví dụ | Control bắt buộc |
|---|---|---|
| Low | copy docs, metric label | Human-on-the-loop |
| Medium | query/list, task automation | Review trước merge |
| High | auth, PII, permission, migration, email send, purge, deploy | Human-in-the-loop, staging evidence, rollback |

Không squash mất migration review trail hoặc decision record của thay đổi high-risk.

## 5. Definition of Ready cho một backend task

Task chỉ được kéo vào sprint khi có:

- spec và plan link;
- endpoint/service/repository interface chính xác;
- input, output, error và permission action;
- invariant/transaction boundary;
- test cases allow/deny/happy/error;
- migration impact hoặc ghi rõ `no schema change`;
- audit/metric/log requirement;
- decision dependency đã approved hoặc safe default fail-closed.

## 6. Change workflow

1. Tạo issue/decision record mô tả yêu cầu và tác động.
2. Cập nhật spec/data dictionary/ADR nếu thay đổi behavior hoặc schema.
3. Cập nhật OpenAPI và contract tests trước implementation.
4. Viết failing test cho behavior mới.
5. Implement tối thiểu, migration backward-compatible.
6. Chạy quality gate và staging rehearsal.
7. Reviewer kiểm security/permission/audit theo risk.
8. Merge, deploy staging, lưu evidence.
9. Chỉ release production sau approval gate.

## 7. Pull request contract

Mỗi PR backend phải có:

```markdown
## Spec
- docs/backend/...

## Risk
- Level: low | medium | high
- PII/auth/migration/email impact: ...

## Contract
- OpenAPI operationIds changed: ...
- Error codes changed: ...

## Verification
- Commands and exit codes
- Migration rehearsal evidence
- Permission allow/deny evidence

## Rollback
- Application rollback
- Database compatibility window
```

PR không được dùng câu “test đầy đủ” nếu không liệt kê command và kết quả.

## 8. Ownership

| Artifact | Author | Reviewer | Approver |
|---|---|---|---|
| Domain spec | Backend/BA | QA + đại diện nghiệp vụ | Product Owner |
| OpenAPI | Backend | Frontend + QA | Backend Tech Lead |
| Schema/migration | Backend | DBA/Tech Lead | Backend Tech Lead |
| Permission/threat model | Backend/Security | QA + Product | Security Owner |
| Email integration | Backend | IT/Security/QA | IT Owner |
| Test report | QA/Backend | Tech Lead | Tech Lead |
| Release | DevOps | QA/Security/Tech Lead | Product Owner |

## 9. Branch, commit và migration rules

- Branch dùng prefix `codex/` cho agent work hoặc convention được team duyệt.
- Một migration đã vào shared environment không được sửa; tạo migration kế tiếp.
- Commit migration kèm schema, integration test và rollback/forward-fix note.
- Không commit secret, production dump, email thật, attachment thật hoặc PII.
- Generated OpenAPI client chỉ commit sau `generate:contracts` và contract diff review.

## 10. Failure escalation

Developer phải dừng module liên quan khi:

- spec và OpenAPI cho hai enum/transition khác nhau;
- không xác định actor/permission/owner cho command nhạy cảm;
- migration cần drop/rename trực tiếp trên bảng đang dùng;
- provider timeout nhưng không có idempotency/reconciliation path;
- log/metric có nguy cơ chứa PII/secret;
- production decision record chưa approved.

Các module độc lập không bị chặn có thể tiếp tục nếu không phụ thuộc quyết định đó.
