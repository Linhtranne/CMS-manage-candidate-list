# Sprint 2 — Application và Interview

status: approved

## Goal

Xây pipeline Ứng tuyển & Phỏng vấn cho nhân viên nội bộ, từ danh sách stage suy ra đến lịch phỏng vấn, kết quả, quyết định và gate khởi tạo Lộ trình cung ứng.

## Users and scope

- Nhân viên kinh doanh/tuyển dụng: xem pipeline, lên lịch/đổi lịch, nhập kết quả và đề xuất quyết định.
- Điều phối/Quản lý: xác nhận trúng tuyển, xem quyền khởi tạo journey và xử lý conflict.
- In scope: `/applications`, `/applications/[applicationId]`, URL views, multi-round interviews, result/decision forms, journey eligibility/start confirmation, audit-oriented mock API.
- Out of scope: portal ứng viên, email provider thật, backend persistence thật, tự động quyết định đỗ/trượt.

## Contract

- Application lõi: `MATCHED | IN_INTERVIEW_PROCESS | PASSED | FAILED | WITHDRAWN | ON_HOLD`.
- Interview: round, scheduledAt, timeZone, mode, meetingUrl/location, participants, status, result, feedback, version, history.
- Stage UI được suy ra: `NEWLY_MATCHED | WAITING_INTERVIEW | WAITING_RESULT | INTERVIEWED | PASSED | FAILED | WITHDRAWN`.
- Endpoints: list/detail applications, create/reschedule/cancel interview, save result, decision, journey eligibility, start journey.
- Mọi mutation gửi `version`; stale version trả conflict và không ghi đè.

## Rules and edge cases

- Nhiều vòng giữ lịch cũ; vòng 1 đã hoàn tất + vòng 2 đã lên lịch xuất hiện đồng thời ở view `Đã phỏng vấn` và `Chờ phỏng vấn`.
- `PASSED` chỉ khi có kết quả phỏng vấn; `FAILED`/`WITHDRAWN` cần reason code.
- Chỉ `PASSED` mới mở start-journey; candidate có journey `ACTIVE`/`ON_HOLD` bị chặn.
- Online bắt buộc URL hợp lệ; trực tiếp bắt buộc địa điểm; timezone luôn bắt buộc.
- Không bulk quyết định; không tự đổi stage từ email hay điểm số.

## UI contract

- Navigation `/applications` có các view: `screening`, `waiting-interview`, `interviewed`, `waiting-result`, `passed`, `closed`, `overdue`.
- Click dòng mở trực tiếp large sheet `Hồ sơ ứng tuyển`, không có summary drawer; giữ filter/view/selectedId trên URL.
- Sheet có tab tổng quan, interview timeline, kết quả, tệp/ghi chú, lịch sử và action có chữ.
- Trạng thái loading, empty, no-result, error, permission và conflict đều có nội dung hành động tiếp theo.

## Acceptance criteria

- Given application nhiều vòng, when vòng 1 completed và vòng 2 scheduled, then xuất hiện đúng ở cả hai view hợp lệ.
- Given interview online, when thiếu URL/timezone, then không lưu và hiển thị lỗi theo trường.
- Given reschedule, when lưu lịch mới, then lịch cũ vẫn hiển thị trong timeline và có reason.
- Given application chưa có result, when xác nhận `PASSED`, then bị chặn.
- Given application `PASSED` và không có active journey, when xác nhận template/owner/ngày bắt đầu, then start journey thành công và ghi audit.
- Given active journey conflict hoặc version cũ, when submit, then bị chặn, không ghi đè và hiển thị reload action.

## Verification

- Unit/domain: stage matrix, schema online/in-person, reschedule history, decision/journey guards.
- Component: URL view state, direct large sheet, loading/error/permission/conflict.
- E2E: waiting-interview → schedule → result → passed → journey gate; multi-round overlap; mobile/tablet/a11y.
- Release gates: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`.

## Delivery status

Status: implemented and verified on mock runtime (2026-08-14).

- Application pipeline route, seven saved views, URL state and direct large sheet are implemented.
- Multi-round stage derivation keeps completed and scheduled applications in both applicable views.
- Interview scheduling, timezone/mode validation, reschedule history, cancellation and no-show are implemented.
- Interview result, decision guards, active-journey conflict and explicit journey start confirmation are implemented.
- Browser MSW registration is included so local/E2E runtime uses the same contract as unit tests.
- Release evidence: workspace lint, typecheck, unit tests, production build and 12 Playwright E2E tests pass; 41 web tests pass.

## Deferred decisions

- Backend persistence, provider email và quyền chi tiết theo team sẽ nối ở sprint backend; frontend mock contract phải giữ đúng payload/version/audit fields.
