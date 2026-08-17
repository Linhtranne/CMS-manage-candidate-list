# Lộ trình cung ứng Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây Journey list/detail, milestone workflow, evidence, blocker/waiver và thông tin xuất cảnh tùy chọn mà không biến sản phẩm thành flight tracker.

**Architecture:** `supply-journeys` dùng snapshot template từ contract. UI render milestone theo dependency; các view “chờ ứng viên/đối tác” suy ra từ `BLOCKED + blockerParty`. Mutation luôn gửi version và backend/mock cưỡng chế một active journey trên Candidate.

**Tech Stack:** Next.js, TypeScript, TanStack Query/Table, React Hook Form, Zod, MSW, Vitest, Playwright.

**Spec:** `docs/ui-ux/04-lo-trinh-cung-ung.md`; `docs/02-vong-doi-ung-vien.md`; `docs/11-tu-dien-du-lieu.md`.

## Trạng thái implementation

- Tasks 1–4 đã triển khai ở frontend/mock runtime.
- Có contract/generated types, hai bối cảnh Việt Nam và đang ở Nhật, derived health/waiting view, milestone guard, evidence, waiver permission và departure fields tùy chọn.
- Unit test và E2E đã bao phủ invariant một journey hiệu lực, thiếu evidence, blocker, no-departure và cập nhật mốc.
- Chưa tích hợp database/NestJS và provider xuất cảnh thật; đó là phạm vi backend sau Sprint 3.

## Global Constraints

- Một Candidate chỉ tối đa một Journey `ACTIVE`/`ON_HOLD`.
- Template/version bất biến trên Journey đang chạy.
- `NOT_APPLICABLE` khác `WAIVED`; waiver cần quyền, lý do và approver/evidence theo policy.
- “Chờ ứng viên/đối tác” là derived view, không tạo enum mới.
- Departure fields chỉ xuất hiện khi template có milestone tương ứng.
- Hoàn tất dựa trên tiếp nhận/cung ứng, không dựa riêng chuyến đi.

---

### Task 1: Journey contract, fixtures và derived health

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/journeys/domain/derive-journey-health.ts`
- Create: `apps/web/src/features/journeys/services/journey-queries.ts`
- Create: `apps/web/src/mocks/fixtures/journeys.ts`
- Create: `apps/web/src/mocks/handlers/journeys.ts`
- Create: `apps/web/src/features/journeys/domain/derive-journey-health.test.ts`

**Interfaces:**
- Produces: list/detail/milestone/waiver/completion/cancellation endpoints.
- Produces: `deriveJourneyHealth({ now, dueAt, blocked, completed })`.

- [ ] **Step 1: Viết failing health/invariant tests**

```ts
it.each([
  [{ completed: true }, 'COMPLETED'],
  [{ blocked: true }, 'AT_RISK'],
  [{ dueAt: '2026-08-10T00:00:00Z', now: '2026-08-14T00:00:00Z' }, 'OVERDUE'],
])('derives journey health', (input, expected) => {
  expect(deriveJourneyHealth(input)).toBe(expected);
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/journeys/domain/derive-journey-health.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Thêm schema và fixtures theo hai bối cảnh**

Fixture A: tuyển từ Việt Nam có COE/visa/departure. Fixture B: đang ở Nhật, không có departure. Cả hai có template/version, milestones, owner, due dates và evidence requirements.

```ts
export function deriveWaitingView(milestone: JourneyMilestone) {
  if (milestone.status !== 'BLOCKED') return null;
  return milestone.blockerParty === 'CANDIDATE' ? 'WAITING_CANDIDATE' :
    milestone.blockerParty === 'CLIENT_PARTNER' ? 'WAITING_EXTERNAL' : 'BLOCKED';
}
```

- [ ] **Step 4: Generate contract và chạy tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/journeys`  
Expected: PASS; handler từ chối active journey thứ hai bằng `409 ACTIVE_SUPPLY_JOURNEY_EXISTS`.

- [ ] **Step 5: Commit Journey contract**

```powershell
git add packages/contracts apps/web/src/features/journeys apps/web/src/mocks
git commit -m "feat: add supply journey contracts"
```

---

### Task 2: Journey list, views và detail shell

**Files:**
- Create: `apps/web/src/features/journeys/components/journey-list-page.tsx`
- Create: `apps/web/src/features/journeys/components/journey-table.tsx`
- Create: `apps/web/src/features/journeys/components/journey-drawer.tsx`
- Create: `apps/web/src/features/journeys/components/journey-detail-page.tsx`
- Create: `apps/web/src/app/(cms)/supply-journeys/page.tsx`
- Create: `apps/web/src/app/(cms)/supply-journeys/[journeyId]/page.tsx`
- Create: `apps/web/src/features/journeys/components/journey-list-page.test.tsx`

**Interfaces:**
- Produces: `/supply-journeys` và `/supply-journeys/[journeyId]`.

- [ ] **Step 1: Viết failing view test**

```tsx
it('shows waiting-candidate from blocker party without a separate status enum', async () => {
  render(<JourneyListPage initialView="waiting-candidate" />);
  const row = await screen.findByRole('row', { name: /Trần Thu Hà/ });
  expect(within(row).getByText('Chờ ứng viên')).toBeVisible();
  expect(within(row).getByText('Hồ sơ COE')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/journeys/components/journey-list-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement list/drawer/detail tabs**

Columns: Candidate, Order, Client, template, current milestone, nearest due, progress, health, owner, updated. Detail tabs: Progress, Documents, Tasks, Email, History. Không render icon máy bay.

```tsx
export const journeyTabs = ['Tiến độ', 'Hồ sơ', 'Công việc', 'Email', 'Lịch sử'] as const;
export function JourneyProgress({ completed, applicable }: { completed: number; applicable: number }) {
  return <span>{completed}/{applicable} mốc hoàn tất</span>;
}
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/journeys/components`  
Expected: PASS cho views, template version, empty/permission/error và tablet drawer.

- [ ] **Step 5: Commit Journey shell**

```powershell
git add apps/web/src/features/journeys/components 'apps/web/src/app/(cms)/supply-journeys'
git commit -m "feat: build supply journey views"
```

---

### Task 3: Milestone actions, evidence, waiver và departure fields

**Files:**
- Create: `apps/web/src/features/journeys/components/milestone-list.tsx`
- Create: `apps/web/src/features/journeys/components/milestone-form.tsx`
- Create: `apps/web/src/features/journeys/components/waive-milestone-dialog.tsx`
- Create: `apps/web/src/features/journeys/components/departure-fields.tsx`
- Create: `apps/web/src/features/journeys/schemas/milestone.schema.ts`
- Create: `apps/web/src/features/journeys/components/milestone-form.test.tsx`

**Interfaces:**
- Produces: milestone payload `{ status, dueAt?, blockerParty?, blockerReason?, evidenceIds?, version }`.
- Produces: waiver payload `{ reason, approverId, evidenceIds, version }`.

- [ ] **Step 1: Viết failing waiver/departure tests**

```tsx
it('requires approval data for WAIVED and hides departure fields when not applicable', async () => {
  render(<MilestoneForm milestone={coeMilestoneFixture} journey={inJapanJourneyFixture} />);
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái'), 'WAIVED');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mốc' }));
  expect(screen.getByText('Vui lòng nhập lý do miễn')).toBeVisible();
  expect(screen.queryByLabelText('Thông tin chuyến đi')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/journeys/components/milestone-form.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement milestone guards**

Chỉ mở milestone hiện tại/có vấn đề. `COMPLETED` kiểm evidence requirement; `BLOCKED` yêu cầu blocker party/reason; `NOT_APPLICABLE` yêu cầu reason; `WAIVED` dùng dialog permission `journeys.waive`. `DepartureFields` render khi `milestone.code === 'DEPARTURE_PLAN'`.

```tsx
{milestone.code === 'DEPARTURE_PLAN' ? <DepartureFields control={form.control} /> : null}
```

```ts
const milestoneSchema = z.object({
  status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'WAIVED', 'NOT_APPLICABLE']),
  blockerParty: z.enum(['CANDIDATE', 'CLIENT_PARTNER', 'INTERNAL', 'OTHER']).optional(),
  blockerReason: z.string().optional(),
  evidenceIds: z.array(z.string().uuid()),
  version: z.number().int().nonnegative(),
});
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/journeys`  
Expected: PASS cho dependency blocked, evidence missing, waiver, N/A, version conflict và no-departure flow.

- [ ] **Step 5: Commit milestone workflow**

```powershell
git add apps/web/src/features/journeys
git commit -m "feat: add journey milestone workflow"
```

---

### Task 4: Journey E2E và release gate

**Files:**
- Create: `tests/e2e/supply-journeys.spec.ts`

**Interfaces:**
- Consumes: Vietnam-entry và in-Japan fixtures.

- [ ] **Step 1: Viết failing E2E cho hai template contexts**

```ts
test('coordinator updates a milestone without forcing flight data', async ({ page }) => {
  await page.goto('/supply-journeys/journey-in-japan-01');
  await page.getByRole('button', { name: 'Cập nhật mốc' }).click();
  await expect(page.getByLabel('Thông tin chuyến đi')).toHaveCount(0);
  await page.getByLabel('Trạng thái').selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Lưu mốc' }).click();
  await expect(page.getByText('Mốc đã được cập nhật')).toBeVisible();
});
```

- [ ] **Step 2: Chạy E2E và xác nhận fail**

Run: `pnpm e2e -- tests/e2e/supply-journeys.spec.ts`  
Expected: FAIL trước khi feature hoàn chỉnh.

- [ ] **Step 3: Thêm waiver permission, conflict, tablet và axe scenarios**

Scenario hoàn tất Journey phải kiểm `CLIENT_RECEIVED` và không dựa vào departure.

```ts
test('waiver remains hidden for coordinators without approval permission', async ({ page }) => {
  await page.goto('/supply-journeys/journey-01?as=coordinator');
  await page.getByRole('button', { name: 'Cập nhật mốc' }).click();
  await expect(page.getByRole('option', { name: 'Được miễn' })).toHaveCount(0);
  await assertNoSeriousA11yIssues(page);
});
```

- [ ] **Step 4: Chạy full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e -- tests/e2e/supply-journeys.spec.ts`  
Expected: exit `0`.

- [ ] **Step 5: Commit Journey gate**

```powershell
git add tests/e2e/supply-journeys.spec.ts
git commit -m "test: cover supply journey workflows"
```
