import { expect, test } from '@playwright/test';

test('staff records interview result, decides passed and starts the supply journey', async ({ page }) => {
  await page.goto('/applications?view=waiting-result');
  await page.getByText('Trần Quốc Bảo').click();
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng tuyển' })).toBeVisible();
  await page.getByRole('button', { name: 'Nhập kết quả' }).click();
  await page.getByLabel('Kết quả').selectOption('PASS');
  await page.getByLabel('Nhận xét phỏng vấn').fill('Đạt chuyên môn và giao tiếp.');
  await page.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(page.getByRole('button', { name: 'Quyết định' })).toBeVisible();
  await page.getByRole('button', { name: 'Quyết định' }).click();
  await page.getByRole('button', { name: 'Xác nhận trúng tuyển' }).click();
  await expect(page.getByRole('button', { name: 'Khởi tạo lộ trình cung ứng' })).toBeVisible();
  await page.getByRole('button', { name: 'Khởi tạo lộ trình cung ứng' }).click();
  await page.getByLabel('Mẫu lộ trình').selectOption('tokutei-it');
  await page.getByLabel('Ngày bắt đầu lộ trình').fill('2026-08-25T09:00');
  await page.getByRole('button', { name: 'Xác nhận khởi tạo' }).click();
  await expect(page.getByRole('dialog', { name: 'Khởi tạo lộ trình cung ứng' })).toHaveCount(0);
});

test('staff can see a multi-round application in both relevant views', async ({ page }) => {
  await page.goto('/applications?view=interviewed');
  await expect(page.getByText('Phạm Hoàng Nam')).toBeVisible();
  await page.getByRole('tab', { name: 'Chờ phỏng vấn' }).click();
  await expect(page.getByText('Phạm Hoàng Nam')).toBeVisible();
});
