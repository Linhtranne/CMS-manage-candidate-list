# Khách hàng và đơn tuyển Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây list/large-sheet/detail cho Client và list/drawer/detail cho JobOrder, cùng luồng tìm/thêm Candidate hiện có vào đơn tuyển.

**Implementation status (2026-08-14):** Hoàn tất frontend slice: đa ngành IT/cơ khí/điều dưỡng, client/order list-detail, health metrics tách biệt, auto-audit khi đóng sau đủ chỉ tiêu, candidate search, duplicate guard và E2E critical paths. Backend thật, audit persistence và catalog API vẫn nối ở sprint backend.

**Architecture:** Hai feature `clients` và `orders` dùng chung organization catalog, list primitives và generated contract. JobOrder giữ yêu cầu đa ngành; modal add-candidate gọi search endpoint và mutation tạo Application.

**Tech Stack:** Next.js, TypeScript, TanStack Query/Table, React Hook Form, Zod, MSW, Vitest, Playwright.

**Spec:** `docs/ui-ux/02-viec-khach-hang-don-tuyen.md` mục B/C; `docs/01-yeu-cau-nghiep-vu.md`.

## Global Constraints

- Client/Order chỉ cung cấp ngữ cảnh tuyển dụng, không mở rộng CRM doanh thu/công nợ.
- Loại tổ chức, ngành và nghề lấy từ catalog, không hard-code IT.
- Không xóa vật lý record đã có lịch sử.
- Đóng sau `FILLED` dùng reason audit tự động; hủy/đóng ngoại lệ cần reason và audit; chỉ tiêu và trạng thái có version.
- Một Candidate không có hai Application đang hoạt động trong cùng JobOrder.

---

### Task 1: Client/Order contract và fixtures

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/clients/services/client-queries.ts`
- Create: `apps/web/src/features/orders/services/order-queries.ts`
- Create: `apps/web/src/mocks/fixtures/clients.ts`
- Create: `apps/web/src/mocks/fixtures/orders.ts`
- Create: `apps/web/src/mocks/handlers/clients-orders.ts`
- Create: `apps/web/src/features/orders/services/order-queries.test.ts`

**Interfaces:**
- Produces: list/detail paths cho `/clients`, `/orders`; `POST /orders/{id}/applications`.
- Produces: `useClients`, `useClient`, `useOrders`, `useOrder`, `useAddCandidatesToOrder`.

- [ ] **Step 1: Viết failing contract test**

```ts
it('returns order health counts without conflating applications and journeys', async () => {
  const order = await fetchOrder('order-01');
  expect(order.metrics).toEqual({ target: 20, activeApplications: 12, passed: 5, supplied: 2 });
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/orders/services/order-queries.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Thêm schema/fixtures đa ngành**

Tạo ít nhất ba đơn thuộc IT, cơ khí và điều dưỡng. `Client` có organization type; `Order` có occupation, location, target, deadline, owner, status và metrics tách biệt.

```ts
export const orderFixtures: JobOrder[] = [
  { id: 'order-it-01', industryLabel: 'Công nghệ thông tin', target: 8, activeApplications: 5, passed: 2, supplied: 1 },
  { id: 'order-mech-01', industryLabel: 'Cơ khí', target: 20, activeApplications: 12, passed: 5, supplied: 2 },
  { id: 'order-care-01', industryLabel: 'Điều dưỡng', target: 10, activeApplications: 7, passed: 3, supplied: 0 },
];
```

- [ ] **Step 4: Generate contract và chạy test**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/clients src/features/orders`  
Expected: PASS.

- [ ] **Step 5: Commit contract slice**

```powershell
git add packages/contracts apps/web/src/features/clients apps/web/src/features/orders apps/web/src/mocks
git commit -m "feat: add client and order contracts"
```

---

### Task 2: Client list, large sheet và detail

**Files:**
- Create: `apps/web/src/features/clients/components/client-list-page.tsx`
- Create: `apps/web/src/features/clients/components/client-drawer.tsx`
- Create: `apps/web/src/features/clients/components/client-detail-page.tsx`
- Create: `apps/web/src/app/(cms)/clients/page.tsx`
- Create: `apps/web/src/app/(cms)/clients/[clientId]/page.tsx`
- Create: `apps/web/src/features/clients/components/client-list-page.test.tsx`

**Interfaces:**
- Consumes: client queries, `CmsDataTable`, `DetailDrawer`.
- Produces: routes `/clients`, `/clients/[clientId]`.

- [ ] **Step 1: Viết failing UI test**

```tsx
it('opens the full client profile sheet without losing list filters', async () => {
  render(<ClientListPage />);
  await userEvent.click(await screen.findByText('Sakura Care Partners'));
  expect(screen.getByRole('dialog', { name: 'Hồ sơ khách hàng' })).toBeVisible();
  expect(window.location.search).toContain('selectedId=client-02');
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/clients/components/client-list-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement list/large-sheet/detail tabs**

Columns và tabs đúng UX-02. Primary action `Thêm khách hàng`; status bằng text. Click một dòng mở trực tiếp large sheet hồ sơ; không có bước summary drawer.

```tsx
export const clientTabs = ['Tổng quan', 'Người liên hệ', 'Đơn tuyển dụng', 'Ứng viên và kết quả cung ứng', 'Tệp và ghi chú', 'Lịch sử thay đổi'] as const;
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/clients`  
Expected: PASS cho list, empty, permission và large sheet restore.

- [ ] **Step 5: Commit Client UI**

```powershell
git add apps/web/src/features/clients 'apps/web/src/app/(cms)/clients'
git commit -m "feat: build client management ui"
```

---

### Task 3: Order list, health labels và detail

**Files:**
- Create: `apps/web/src/features/orders/components/order-list-page.tsx`
- Create: `apps/web/src/features/orders/components/order-drawer.tsx`
- Create: `apps/web/src/features/orders/components/order-detail-page.tsx`
- Create: `apps/web/src/features/orders/components/order-status-form.tsx`
- Create: `apps/web/src/app/(cms)/orders/page.tsx`
- Create: `apps/web/src/app/(cms)/orders/[orderId]/page.tsx`
- Create: `apps/web/src/features/orders/components/order-list-page.test.tsx`

**Interfaces:**
- Produces: routes `/orders`, `/orders/[orderId]`.
- Produces: close payload `{ status: 'CLOSED', reasonCode, note, version }`.

- [ ] **Step 1: Viết failing test cho health và auto-audit close**

```tsx
it('closes a filled order without asking for a reason', async () => {
  const onSaved = vi.fn();
  render(<OrderStatusForm order={{ ...activeOrderFixture, status: 'FILLED' }} onSaved={onSaved} />);
  await userEvent.selectOptions(screen.getByLabelText('Trạng thái'), 'CLOSED');
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
  expect(screen.queryByLabelText('Lý do đóng đơn')).not.toBeInTheDocument();
  expect(onSaved).toHaveBeenCalledOnce();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/orders/components/order-list-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement list/detail/status form**

Health labels: `Sắp hết hạn`, `Thiếu ứng viên`, `Chậm phỏng vấn`, `Chờ kết quả lâu`, `Đã đủ chỉ tiêu`, `Khách hàng tạm dừng`. Không dùng warning icon làm tín hiệu duy nhất.

```ts
export const closeOrderSchema = z.object({
  status: z.literal('CLOSED'),
  reasonCode: z.string().min(1, 'Vui lòng chọn lý do đóng đơn'),
  note: z.string().max(1000).optional(),
  version: z.number().int().nonnegative(),
});
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/orders`  
Expected: PASS cho multi-industry fields, auto-audit close và version conflict.

- [ ] **Step 5: Commit Order UI**

```powershell
git add apps/web/src/features/orders 'apps/web/src/app/(cms)/orders'
git commit -m "feat: build job order management ui"
```

---

### Task 4: Tìm và thêm Candidate vào Order

**Files:**
- Create: `apps/web/src/features/orders/components/add-candidates-dialog.tsx`
- Create: `apps/web/src/features/orders/schemas/add-candidates.schema.ts`
- Create: `apps/web/src/features/orders/components/add-candidates-dialog.test.tsx`
- Create: `tests/e2e/clients-orders.spec.ts`

**Interfaces:**
- Consumes: `GET /candidates/search-for-order`, `POST /orders/{id}/applications`.
- Produces: payload `{ candidateIds: string[], source: 'MANUAL_MATCH' }`.

- [ ] **Step 1: Viết failing duplicate guard test**

```tsx
it('disables a candidate who already has an active application in the order', async () => {
  render(<AddCandidatesDialog orderId="order-01" open />);
  const row = await screen.findByRole('row', { name: /Nguyễn Minh An.*Đã trong đơn/ });
  expect(within(row).getByRole('checkbox')).toBeDisabled();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/orders/components/add-candidates-dialog.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement search/filter/select/mutation**

Kết quả hiển thị readiness, occupation, Japanese level, active-application flag và active-journey warning. Không AI-rank; sort/filter minh bạch.

```tsx
const selectable = !candidate.hasActiveApplicationInOrder;
return <CandidateMatchRow candidate={candidate} checkboxDisabled={!selectable} warning={candidate.hasActiveJourney ? 'Đang có lộ trình cung ứng' : undefined} />;
```

- [ ] **Step 4: Chạy full feature gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e -- tests/e2e/clients-orders.spec.ts`  
Expected: exit `0`; duplicate bị chặn cả UI và mock API `409`.

- [ ] **Step 5: Commit Sprint 1 slice**

```powershell
git add apps/web/src/features/orders tests/e2e/clients-orders.spec.ts
git commit -m "feat: add candidates to job orders"
```
