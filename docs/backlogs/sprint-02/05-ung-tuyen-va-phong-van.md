# Ứng tuyển và phỏng vấn Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây Application list/detail, derived operational stages, nhiều vòng Interview, kết quả và gate chuyển trúng tuyển/khởi tạo Journey.

**Architecture:** Application giữ enum lõi; stage/view được suy ra bằng pure function từ Application + Interview. Form lịch/kết quả dùng Zod và optimistic concurrency; Journey chỉ được tạo qua action xác nhận riêng.

**Tech Stack:** Next.js, TypeScript, TanStack Query/Table, React Hook Form, Zod, MSW, Vitest, Playwright.

**Spec:** `docs/ui-ux/03-ung-vien-ung-tuyen-phong-van.md` mục B; `docs/02-vong-doi-ung-vien.md`.

## Global Constraints

- Không tạo enum Application cho “Chờ PV/Đã PV”; đó là derived view từ Interview.
- Nhiều vòng giữ lịch sử; đổi lịch không ghi đè lịch cũ.
- Kết quả cần actor/timestamp; không tự quyết định đạt/trượt.
- Trạng thái kết thúc cần reason.
- Chỉ Application `PASSED` được mở action khởi tạo Journey và Candidate không có Journey hiệu lực khác.

---

### Task 1: Contract và derived application stage

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/applications/domain/derive-application-stage.ts`
- Create: `apps/web/src/features/applications/services/application-queries.ts`
- Create: `apps/web/src/mocks/fixtures/applications.ts`
- Create: `apps/web/src/mocks/handlers/applications.ts`
- Create: `apps/web/src/features/applications/domain/derive-application-stage.test.ts`

**Interfaces:**
- Produces: list/detail/interview/decision/journey-eligibility endpoints.
- Produces: `deriveApplicationStage(application, interviews)`.

- [ ] **Step 1: Viết failing stage matrix**

```ts
it.each([
  ['MATCHED', [], 'NEWLY_MATCHED'],
  ['IN_INTERVIEW_PROCESS', [{ scheduleStatus: 'SCHEDULED' }], 'WAITING_INTERVIEW'],
  ['IN_INTERVIEW_PROCESS', [{ scheduleStatus: 'COMPLETED', result: 'PENDING' }], 'WAITING_RESULT'],
  ['PASSED', [], 'PASSED'],
])('derives %s with interviews as %s', (status, interviews, expected) => {
  expect(deriveApplicationStage({ status }, interviews)).toBe(expected);
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/applications/domain/derive-application-stage.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Implement stage precedence và contract**

Ưu tiên terminal Application status trước, sau đó scheduled Interview, completed-pending Interview, completed-known Interview và MATCHED. Fixture có vòng 1 completed + vòng 2 scheduled để xuất hiện ở cả view chờ/đã phỏng vấn.

```ts
export function deriveApplicationStage(application: Application, interviews: Interview[]): ApplicationStage {
  if (['PASSED', 'FAILED', 'WITHDRAWN'].includes(application.status)) return application.status;
  if (interviews.some((item) => item.scheduleStatus === 'SCHEDULED')) return 'WAITING_INTERVIEW';
  if (interviews.some((item) => item.scheduleStatus === 'COMPLETED' && item.result === 'PENDING')) return 'WAITING_RESULT';
  return application.status === 'MATCHED' ? 'NEWLY_MATCHED' : 'INTERVIEWED';
}
```

- [ ] **Step 4: Generate contract và chạy tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/applications`  
Expected: PASS.

- [ ] **Step 5: Commit stage slice**

```powershell
git add packages/contracts apps/web/src/features/applications apps/web/src/mocks
git commit -m "feat: add application stage contracts"
```

---

### Task 2: Application list, views và large sheet

**Files:**
- Create: `apps/web/src/features/applications/components/application-list-page.tsx`
- Create: `apps/web/src/features/applications/components/application-table.tsx`
- Create: `apps/web/src/features/applications/components/application-drawer.tsx`
- Create: `apps/web/src/app/(cms)/applications/page.tsx`
- Create: `apps/web/src/features/applications/components/application-list-page.test.tsx`

**Interfaces:**
- Produces: route `/applications` và view query `screening`, `waiting-interview`, `interviewed`, `waiting-result`, `passed`, `closed`, `overdue`.

- [ ] **Step 1: Viết failing overlapping-view test**

```tsx
it('keeps round-one-complete and round-two-scheduled in both valid views', async () => {
  const { rerender } = render(<ApplicationListPage initialView="interviewed" />);
  expect(await screen.findByText('application-multi-round')).toBeVisible();
  rerender(<ApplicationListPage initialView="waiting-interview" />);
  expect(await screen.findByText('application-multi-round')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/applications/components/application-list-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement list/large-sheet**

Columns: Candidate, Order, Client, vòng, stage, lịch, ngày ở trạng thái, việc tiếp theo, owner, cập nhật cuối. Click dòng mở trực tiếp large sheet hồ sơ với latest/next round, interview timeline và actions có chữ; không có summary drawer.

```tsx
return <CmsDataTable columns={applicationColumns} data={data.items} onRowSelect={(row) => setSelectedId(row.id)} />;
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/applications/components`  
Expected: PASS cho overlapping views, URL state, empty/permission/error.

- [ ] **Step 5: Commit Application list**

```powershell
git add apps/web/src/features/applications/components 'apps/web/src/app/(cms)/applications'
git commit -m "feat: build application pipeline ui"
```

---

### Task 3: Application detail và Interview scheduling

**Files:**
- Create: `apps/web/src/features/applications/components/application-detail-page.tsx`
- Create: `apps/web/src/features/applications/components/interview-timeline.tsx`
- Create: `apps/web/src/features/applications/components/interview-form.tsx`
- Create: `apps/web/src/features/applications/schemas/interview.schema.ts`
- Create: `apps/web/src/app/(cms)/applications/[applicationId]/page.tsx`
- Create: `apps/web/src/features/applications/components/interview-form.test.tsx`

**Interfaces:**
- Produces: create/reschedule payload với `scheduledAt`, `timeZone`, `mode`, `locationOrUrl`, `participants`, `version`.

- [ ] **Step 1: Viết failing timezone/reschedule test**

```tsx
it('requires timezone and preserves the previous schedule on reschedule', async () => {
  render(<InterviewForm interview={scheduledInterviewFixture} mode="reschedule" />);
  await userEvent.clear(screen.getByLabelText('Múi giờ'));
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đổi lịch' }));
  expect(screen.getByText('Vui lòng chọn múi giờ')).toBeVisible();
  expect(screen.getByText('Lịch cũ: 09:00 20/08/2026')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/applications/components/interview-form.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement timeline/form**

Interview timeline dùng text cho status/result; form phân biệt online/direct và validate URL/địa điểm tương ứng. Reschedule gửi event mới + reason, không PATCH mất timestamp cũ.

```ts
export const interviewSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('ONLINE'), meetingUrl: z.string().url(), scheduledAt: z.string(), timeZone: z.string().min(1) }),
  z.object({ mode: z.literal('IN_PERSON'), location: z.string().min(1), scheduledAt: z.string(), timeZone: z.string().min(1) }),
]);
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/applications`  
Expected: PASS cho create, reschedule, cancel, no-show và version conflict.

- [ ] **Step 5: Commit Interview UI**

```powershell
git add apps/web/src/features/applications 'apps/web/src/app/(cms)/applications/[applicationId]'
git commit -m "feat: add interview scheduling workflow"
```

---

### Task 4: Interview result, decision và Journey gate

**Files:**
- Create: `apps/web/src/features/applications/components/interview-result-form.tsx`
- Create: `apps/web/src/features/applications/components/application-decision-dialog.tsx`
- Create: `apps/web/src/features/applications/components/start-journey-dialog.tsx`
- Create: `apps/web/src/features/applications/schemas/interview-result.schema.ts`
- Create: `apps/web/src/features/applications/components/application-decision-dialog.test.tsx`

**Interfaces:**
- Produces: decision payload `{ status: 'PASSED' | 'FAILED' | 'WITHDRAWN', reasonCode?, decidedAt, version }`.
- Produces: journey start payload `{ templateId, templateVersion, ownerUserId, startedAt }`.

- [ ] **Step 1: Viết failing decision guards**

```tsx
it('blocks Passed until an interview result exists', async () => {
  render(<ApplicationDecisionDialog application={applicationWithoutResult} open />);
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trúng tuyển' }));
  expect(screen.getByText('Cần nhập kết quả phỏng vấn trước')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/applications/components/application-decision-dialog.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement result/decision/journey confirmation**

Result có result, feedback, strengths, concerns, next step, attachment. `StartJourneyDialog` chỉ mở sau PASSED, tải eligible templates, hiển thị active-journey conflict và không tạo âm thầm.

```tsx
const canStartJourney = application.status === 'PASSED' && eligibility.allowed;
return <Button disabled={!canStartJourney} onClick={openJourneyDialog}>Khởi tạo lộ trình cung ứng</Button>;
```

- [ ] **Step 4: Chạy full feature gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`  
Expected: exit `0`; unit/integration mock API cũng trả guard lỗi tương ứng.

- [ ] **Step 5: Commit decision slice**

```powershell
git add apps/web/src/features/applications
git commit -m "feat: add interview decisions and journey gate"
```

---

### Task 5: Critical-path E2E

**Files:**
- Create: `tests/e2e/applications-interviews.spec.ts`

**Interfaces:**
- Consumes: Candidate/Order/Application fixtures and Journey eligibility endpoint.

- [ ] **Step 1: Viết failing end-to-end flow**

```ts
test('staff schedules, records result and confirms a passed candidate', async ({ page }) => {
  await page.goto('/applications?view=waiting-interview');
  await page.getByRole('row', { name: /Nguyễn Minh An/ }).click();
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng tuyển' })).toBeVisible();
  await page.getByRole('button', { name: 'Nhập kết quả' }).click();
  await page.getByLabel('Kết quả').selectOption('PASS');
  await page.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(page.getByRole('button', { name: 'Khởi tạo lộ trình cung ứng' })).toBeVisible();
});
```

- [ ] **Step 2: Chạy E2E và xác nhận fail**

Run: `pnpm e2e -- tests/e2e/applications-interviews.spec.ts`  
Expected: FAIL trước khi toàn flow hoàn chỉnh.

- [ ] **Step 3: Bổ sung multi-round, withdrawn reason, permission và axe scenarios**

Mỗi scenario reset MSW state để chạy độc lập.

```ts
test('round one completed and round two scheduled remains in both views', async ({ page }) => {
  await page.goto('/applications?view=interviewed');
  await expect(page.getByText('application-multi-round')).toBeVisible();
  await page.goto('/applications?view=waiting-interview');
  await expect(page.getByText('application-multi-round')).toBeVisible();
});
```

- [ ] **Step 4: Chạy E2E và full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`  
Expected: exit `0`.

- [ ] **Step 5: Commit Sprint 2 gate**

```powershell
git add tests/e2e/applications-interviews.spec.ts
git commit -m "test: cover application and interview flow"
```

---

## Implementation status (2026-08-14)

Sprint 2 đã được triển khai trên mock runtime để trình bày và kiểm thử end-to-end:

- Contract OpenAPI và generated types: `GET /applications`, detail, create/reschedule/cancel/no-show interview, result, decision, journey eligibility/start; tất cả mutation có `version`, conflict `409` và validation `422`.
- Domain stage: `deriveApplicationStage` và `matchesApplicationView`; view `Đã phỏng vấn`/`Chờ phỏng vấn` là các điều kiện có thể giao nhau, không phải enum loại trừ.
- UI `/applications`: bảng pipeline, bảy view, tìm kiếm, URL state `view/query/selectedId`, click dòng mở trực tiếp hồ sơ large sheet; không có summary drawer.
- Hồ sơ ứng tuyển: tổng quan, timeline nhiều vòng, kết quả, tệp/ghi chú, lịch sử; lên lịch, đổi lịch giữ lịch cũ, hủy lịch và đánh dấu không đến.
- Guard quyết định: chưa có kết quả thì không được `PASSED`; `FAILED`/`WITHDRAWN` bắt buộc lý do; journey chỉ mở với `PASSED` và chặn ứng viên có journey `ACTIVE`/`ON_HOLD`.
- Fixtures/MSW gồm mới ghép, chờ lịch, chờ kết quả, đã phỏng vấn, nhiều vòng, trúng tuyển đủ điều kiện, conflict journey và kết thúc có lý do.
- E2E đã bao phủ critical path kết quả → trúng tuyển → khởi tạo journey và kiểm tra application nhiều vòng xuất hiện ở hai view.

Verification gần nhất: `pnpm generate:contracts`, `pnpm --filter @cms/web typecheck`, `pnpm --filter @cms/web lint`, `pnpm --filter @cms/web test` (41 tests), `pnpm e2e` (12 tests) đều pass. Backend persistence, email provider thật và quyền chi tiết theo team vẫn là phạm vi Sprint backend.
