import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-e2e-role': 'config-admin' });
});

test('config admin validates and sends an internal user invite', async ({ page }) => {
  await page.goto('/admin/users');
  await page.getByRole('button', { name: 'Mời người dùng' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mời người dùng' });
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: 'Gửi lời mời' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Vui lòng điền đủ thông tin mời người dùng.');

  await page.getByLabel('Họ tên người dùng').fill('QA Invitee');
  await page.getByLabel('Email người dùng').fill('qa.invitee@company.vn');
  await page.getByLabel('Đội của người dùng').selectOption('team-recruiting');
  await page.getByLabel('Vai trò người dùng').selectOption('recruiter');
  await page.getByRole('button', { name: 'Gửi lời mời' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Đã tạo lời mời cho qa.invitee@company.vn.');
  await dialog.getByRole('button', { name: 'Đóng', exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test('config admin creates and retires a versioned catalog value', async ({ page }) => {
  await page.goto('/admin/catalogs');
  await page.getByRole('button', { name: 'Thêm giá trị' }).click();
  const dialog = page.getByRole('dialog', { name: 'Thêm giá trị danh mục' });
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: 'Lưu giá trị' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Nhập mã và nhãn danh mục.');
  await page.getByLabel('Mã danh mục').fill('QA_CATALOG');
  await page.getByLabel('Nhãn danh mục').fill('Danh mục QA');
  await page.getByRole('button', { name: 'Lưu giá trị' }).click();
  await expect(page.getByRole('row', { name: /QA_CATALOG.*Danh mục QA/ })).toBeVisible();

  const row = page.getByRole('row', { name: /QA_CATALOG.*Danh mục QA/ });
  await row.getByRole('button', { name: 'Ngừng sử dụng' }).click();
  const confirm = page.getByRole('dialog', { name: 'Ngừng sử dụng danh mục?' });
  await confirm.getByRole('button', { name: 'Xác nhận ngừng' }).click();
  await expect(row).toContainText('Đã ngừng');
});

test('config admin validates and creates an email template without exposing credentials', async ({ page }) => {
  await page.goto('/admin/templates');
  await page.getByRole('button', { name: 'Tạo mẫu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo mẫu' });
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: 'Tạo bản nháp' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('Nhập tên và nội dung xem trước.');
  await page.getByLabel('Loại mẫu').selectOption('EMAIL');
  await page.getByLabel('Tên mẫu').fill('QA Email Template');
  await page.getByLabel('Nội dung xem trước').fill('Nội dung kiểm thử');
  await page.getByLabel('Tiêu đề email của mẫu').fill('Tiêu đề QA');
  await page.getByLabel('Nội dung email của mẫu').fill('Xin chào {{candidate.name}}');
  await page.getByRole('button', { name: 'Tạo bản nháp' }).click();
  await expect(page.getByRole('article').filter({ hasText: 'QA Email Template' })).toContainText('Bản nháp');
});

test('config admin edits mailbox settings without a credential input', async ({ page }) => {
  await page.goto('/admin/mailbox');
  await expect(page.locator('input[value*="secret"], input[value*="token"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Chỉnh sửa cấu hình' }).click();
  const dialog = page.getByRole('dialog', { name: 'Chỉnh sửa mailbox' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('input[value*="secret"], input[value*="token"]')).toHaveCount(0);
  await page.getByLabel('Tên người gửi mailbox').fill('Candidate Supply QA');
  await page.getByRole('button', { name: 'Lưu cấu hình' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Candidate Supply QA')).toBeVisible();
});
