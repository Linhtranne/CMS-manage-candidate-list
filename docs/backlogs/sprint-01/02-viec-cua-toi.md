# Việc của tôi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây màn hình mặc định `/work` để nhân viên xử lý task theo SLA, saved view, KPI filter và drawer hành động.

**Implementation status (2026-08-14):** Hoàn tất frontend slice: OpenAPI + generated types, MSW fixture/handler, TanStack Query, KPI/URL filter, 9-column queue, detail drawer, versioned complete action và Playwright desktop/tablet coverage. Backend thật và permission enforcement vẫn nối ở sprint backend.

**Architecture:** Feature `work` dùng OpenAPI-generated DTO, TanStack Query và list primitives từ Sprint 0. MSW mô phỏng task list/action nhưng không tự quyết định trạng thái Candidate/Application/Journey.

**Tech Stack:** Next.js, TypeScript, TanStack Query/Table, MSW, Vitest, Testing Library, Playwright.

**Spec:** `docs/ui-ux/02-viec-khach-hang-don-tuyen.md` mục A; `docs/ui-ux/01-khung-cms.md`.

## Global Constraints

- `Cần xử lý` là view mặc định; thứ tự: quá hạn, hôm nay, SLA ngắn, ưu tiên cao.
- KPI là số + nhãn chữ, click để filter; không dùng card/icon nhiều màu.
- Task tự động hiển thị nguồn/rule; không tự chuyển kết quả nghiệp vụ.
- Mọi list state ở URL; mọi action theo permission và version.
- Đủ loading, empty, no-results, permission, error, partial success và conflict.

---

### Task 1: Contract, query và fixtures của Work Queue

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/work/types.ts`
- Create: `apps/web/src/features/work/services/work-queries.ts`
- Create: `apps/web/src/mocks/fixtures/work.ts`
- Create: `apps/web/src/mocks/handlers/work.ts`
- Create: `apps/web/src/features/work/services/work-queries.test.ts`

**Interfaces:**
- Produces: `GET /work-items`, `GET /work-items/summary`, `PATCH /work-items/{id}`.
- Produces: `useWorkItems(params)`, `useWorkSummary(params)`, `useUpdateWorkItem()`.

- [ ] **Step 1: Viết failing query test**

```ts
it('requests the default actionable view', async () => {
  const result = await fetchWorkItems({ view: 'actionable', sort: 'priority' });
  expect(result.items[0]).toMatchObject({ id: 'work-overdue-01', sourceType: 'INTERVIEW_RESULT_DUE' });
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/work/services/work-queries.test.ts`  
Expected: FAIL vì path/query chưa tồn tại.

- [ ] **Step 3: Thêm schema và handler thực tế**

`WorkItem` bắt buộc có `id`, `title`, `priority`, `status`, `dueAt`, `assignee`, `sourceType`, `sourceLabel`, `candidate`, `order`, `client`, `updatedAt`, `version`. Fixture gồm quá hạn, hôm nay, chờ reply và milestone bị chặn.

```ts
export const workKeys = {
  list: (params: WorkListParams) => ['work-items', params] as const,
  summary: (params: WorkListParams) => ['work-summary', params] as const,
};
```

- [ ] **Step 4: Generate contract và chạy test**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/work`  
Expected: PASS; generated client và handler cùng payload.

- [ ] **Step 5: Commit contract slice**

```powershell
git add packages/contracts apps/web/src/features/work apps/web/src/mocks
git commit -m "feat: add work queue contract"
```

---

### Task 2: KPI filter, saved views và Work table

**Files:**
- Create: `apps/web/src/features/work/components/work-summary.tsx`
- Create: `apps/web/src/features/work/components/work-table.tsx`
- Create: `apps/web/src/features/work/components/work-page.tsx`
- Create: `apps/web/src/features/work/components/work-page.test.tsx`
- Modify: `apps/web/src/app/(cms)/work/page.tsx`

**Interfaces:**
- Consumes: `useWorkItems`, `useWorkSummary`, `useListParams`, `CmsDataTable`.
- Produces: `WorkPage` route content.

- [ ] **Step 1: Viết failing interaction test**

```tsx
it('filters overdue work from the summary label', async () => {
  render(<WorkPage />);
  await userEvent.click(await screen.findByRole('button', { name: /Quá hạn 3/ }));
  expect(window.location.search).toContain('view=overdue');
  expect(screen.getByRole('columnheader', { name: 'Hạn xử lý' })).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/work/components/work-page.test.tsx`  
Expected: FAIL vì page components chưa tồn tại.

- [ ] **Step 3: Implement page với cột chuẩn**

Columns: Ưu tiên, Hạn xử lý, Công việc, Ứng viên, Đơn tuyển, Khách hàng, Trạng thái, Phụ trách, Hoạt động cuối. KPI button chỉ có số/nhãn và `aria-pressed` khi view đang chọn.

```tsx
export function WorkSummaryItem({ label, count, active, onSelect }: Props) {
  return <button aria-pressed={active} onClick={onSelect}><strong>{count}</strong><span>{label}</span></button>;
}
```

- [ ] **Step 4: Chạy component tests**

Run: `pnpm --filter @cms/web test -- src/features/work/components`  
Expected: PASS cho actionable/overdue/empty/no-results.

- [ ] **Step 5: Commit Work list**

```powershell
git add apps/web/src/features/work/components 'apps/web/src/app/(cms)/work'
git commit -m "feat: build my work queue"
```

---

### Task 3: Work drawer và action mutations

**Files:**
- Create: `apps/web/src/features/work/components/work-drawer.tsx`
- Create: `apps/web/src/features/work/components/work-actions.tsx`
- Create: `apps/web/src/features/work/schemas/update-work-item.schema.ts`
- Create: `apps/web/src/features/work/components/work-drawer.test.tsx`

**Interfaces:**
- Consumes: `useUpdateWorkItem`, `DetailDrawer`.
- Produces: action payload `{ status?, dueAt?, assigneeId?, reason?, version }`.

- [ ] **Step 1: Viết failing test cho nguồn task và complete action**

```tsx
it('shows why the task exists and completes with optimistic concurrency', async () => {
  render(<WorkDrawer workItemId="work-overdue-01" />);
  expect(await screen.findByText('Chưa nhập kết quả phỏng vấn')).toBeVisible();
  await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }));
  expect(await screen.findByText('Đã hoàn thành công việc')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/work/components/work-drawer.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement drawer và mutation conflict**

Drawer hiển thị source/rule, due, owner, Candidate/Order, activity và history. Actions: hoàn thành, gửi email, đổi hạn, chuyển owner, mở hồ sơ. Handler trả `409 VERSION_CONFLICT` khi version cũ; UI hiển thị `Dữ liệu vừa được cập nhật` và nút `Tải lại`.

```tsx
const actions: WorkAction[] = [
  { key: 'complete', label: 'Đánh dấu hoàn thành', permission: 'work.update' },
  { key: 'email', label: 'Gửi email', permission: 'mail.send' },
  { key: 'reschedule', label: 'Đổi hạn xử lý', permission: 'work.update' },
  { key: 'reassign', label: 'Chuyển người phụ trách', permission: 'work.assign' },
];
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/work`  
Expected: PASS cho success, permission denied và version conflict.

- [ ] **Step 5: Commit Work actions**

```powershell
git add apps/web/src/features/work
git commit -m "feat: add work item actions"
```

---

### Task 4: Work Queue E2E và release gate

**Files:**
- Create: `tests/e2e/work-queue.spec.ts`

**Interfaces:**
- Consumes: `/work`, MSW work scenarios.

- [ ] **Step 1: Viết failing E2E**

```ts
test('staff filters, opens and completes a work item', async ({ page }) => {
  await page.goto('/work');
  await page.getByRole('button', { name: /Quá hạn/ }).click();
  await page.getByRole('row', { name: /Nguyễn Minh An/ }).click();
  await page.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click();
  await expect(page.getByText('Đã hoàn thành công việc')).toBeVisible();
});
```

- [ ] **Step 2: Chạy E2E và xác nhận fail**

Run: `pnpm e2e -- tests/e2e/work-queue.spec.ts`  
Expected: FAIL cho đến khi route/action hoàn chỉnh.

- [ ] **Step 3: Bổ sung scenario tablet, permission và axe**

Không tạo snapshot pixel; assert theo role/name/status text và URL.

```ts
test.use({ viewport: { width: 768, height: 1024 } });
test('tablet keeps work actions and permission messaging', async ({ page }) => {
  await page.goto('/work?scenario=forbidden-action');
  await page.getByRole('row', { name: /Nguyễn Minh An/ }).click();
  await expect(page.getByRole('button', { name: 'Đánh dấu hoàn thành' })).toHaveCount(0);
  await assertNoSeriousA11yIssues(page);
});
```

- [ ] **Step 4: Chạy full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e -- tests/e2e/work-queue.spec.ts`  
Expected: exit `0`.

- [ ] **Step 5: Commit feature gate**

```powershell
git add tests/e2e/work-queue.spec.ts
git commit -m "test: cover my work critical path"
```
