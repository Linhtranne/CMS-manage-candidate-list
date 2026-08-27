import { expect, test } from '@playwright/test';

test('configuration admin sees an actionable administration overview', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-e2e-role': 'config-admin' });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Quản trị hệ thống' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Khu vực quản trị' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Mở khu vực/ })).toHaveCount(5);
});

test('manager can drill down a denominator-based metric and queue an export', async ({ page }) => {
  await page.goto('/reports');
  await expect(page.getByRole('link', { name: 'Trúng tuyển 18/60 — 30%' })).toBeVisible();
  await page.getByRole('link', { name: 'Trúng tuyển 18/60 — 30%' }).click();
  await expect(page).toHaveURL(/\/applications\?view=passed/);

  await page.goto('/reports');
  await page.getByRole('button', { name: 'Xuất báo cáo' }).click();
  await page.getByRole('button', { name: 'Tạo tệp xuất' }).click();
  await expect(page.getByText('Đang chờ xử lý')).toBeVisible();
});

test('admin surfaces keep mailbox credentials out of the UI and expose audit filters', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-e2e-role': 'config-admin' });
  await page.goto('/admin/users');
  await expect(page.locator('#main-content').getByText('Phạm Đức Long')).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Đọc nội dung email', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Quản lý danh mục', exact: true })).toBeChecked();
  await page.getByLabel('Vai trò đang cấu hình').selectOption('recruiter');
  await expect(page.getByRole('heading', { name: /Ma trận quyền/ })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Quản lý danh mục', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Xem hồ sơ cơ bản', exact: true })).toBeChecked();

  await page.goto('/admin/mailbox');
  await expect(page.getByText(/Credential:|Thông tin xác thực:/)).toBeVisible();
  await expect(page.locator('input[value*="secret"], input[value*="token"]')).toHaveCount(0);

  await page.goto('/admin/audit');
  await expect(page.getByRole('row', { name: /Yêu cầu xuất báo cáo đơn ứng tuyển/ })).toBeVisible();
  await page.getByLabel(/Audit action|Thao tác audit/).fill('EMAIL_SENT');
  await expect(page.getByRole('row', { name: /Xếp hàng gửi phản hồi ứng viên/ })).toBeVisible();
});

test('recruiter is denied admin surfaces and keeps admin navigation hidden', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-e2e-role': 'recruiter' });
  await page.goto('/admin/users');

  await expect(page.getByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Quản trị', exact: true })).toHaveCount(0);
});
