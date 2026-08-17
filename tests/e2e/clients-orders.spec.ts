import { expect, test } from '@playwright/test';

test('staff reviews multi-industry order and candidate duplicate guard', async ({ page }) => {
  await page.goto('/orders/order-01');
  await expect(page.getByRole('heading', { name: 'Kỹ sư phần mềm' })).toBeVisible();
  await expect(page.getByText('Công nghệ thông tin', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm ứng viên vào đơn' }).click();
  const row = page.getByRole('row', { name: /Nguyễn Minh An.*Đã trong đơn/ });
  await expect(row.getByRole('checkbox')).toBeDisabled();
  const availableRow = page.getByRole('row', { name: /Võ Thanh Tùng.*Đang có lộ trình cung ứng/ });
  await availableRow.getByText(/Võ Thanh Tùng/).click();
  await expect(availableRow.getByRole('checkbox')).toBeChecked();
});

test('staff opens a client profile sheet while preserving query', async ({ page }) => {
  await page.goto('/clients?query=sakura');
  await page.getByText('Sakura Care Partners').click();
  await expect(page).toHaveURL(/query=sakura.*selectedId=client-02/);
  await expect(page.getByRole('dialog', { name: 'Hồ sơ khách hàng' })).toBeVisible();
});

test('staff opens the full client profile directly without leaving the list context', async ({ page }) => {
  await page.goto('/clients?query=sakura');
  await page.getByText('Sakura Care Partners').click();

  await expect(page).toHaveURL(/\/clients\?query=sakura.*selectedId=client-02/);
  await expect(page.getByRole('dialog', { name: 'Hồ sơ khách hàng' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();

  await page.getByRole('tab', { name: 'Đơn tuyển' }).click();
  await expect(page.getByText('Đơn tuyển đang hoạt động')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Hồ sơ khách hàng' })).toHaveCount(0);
});

test('staff opens the full order profile directly without leaving the list context', async ({ page }) => {
  await page.goto('/orders?query=ORD-IT');
  await page.getByText('Kỹ sư phần mềm').click();

  await expect(page).toHaveURL(/\/orders\?query=ORD-IT.*selectedId=order-01/);
  await expect(page.getByRole('dialog', { name: 'Hồ sơ đơn tuyển' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();
  await expect(page.getByText('Tiêu chí tuyển dụng')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Hồ sơ đơn tuyển' })).toHaveCount(0);
});
