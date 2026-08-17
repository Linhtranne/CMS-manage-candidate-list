import { expect, test } from '@playwright/test';

test('staff reviews candidate views and opens the candidate drawer', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await expect(page.getByRole('heading', { name: 'Ứng viên' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Ứng viên tiềm năng' })).toHaveAttribute('aria-selected', 'true');
  const row = page.getByRole('row', { name: /UV-0009.*Phạm Thu Hà/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng viên' })).toBeVisible();
  await expect(page.getByText('Mở hồ sơ đầy đủ')).toBeVisible();
});

test('staff opens full candidate profile and switches to applications', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('row', { name: /UV-0009.*Phạm Thu Hà/ }).click();
  await page.getByRole('link', { name: 'Mở hồ sơ đầy đủ' }).click();
  await expect(page).toHaveURL(/\/candidates\/candidate-09$/);
  await expect(page.getByRole('heading', { name: 'Phạm Thu Hà' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Lộ trình cung ứng' })).toBeVisible();
  await page.getByRole('tab', { name: 'Ứng tuyển' }).click();
  await expect(page.getByText('Chưa có đơn ứng tuyển')).toBeVisible();
});

test('staff switches candidate saved view to active applications', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('tab', { name: 'Đang ứng tuyển' }).click();
  await expect(page).toHaveURL(/view=applying/);
  await expect(page.getByRole('row', { name: /UV-0001.*Nguyễn Minh An/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /UV-0009.*Phạm Thu Hà/ })).toHaveCount(0);
});
