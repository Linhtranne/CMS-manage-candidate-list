import { expect, test } from '@playwright/test';

test('staff reviews candidate views and opens the candidate drawer', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await expect(page.getByRole('heading', { name: 'Ứng viên' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Ứng viên tiềm năng' })).toHaveAttribute('aria-selected', 'true');
  const row = page.getByRole('row', { name: /UV-0009.*Phạm Thu Hà/ });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng viên' })).toBeVisible();
  await expect(page.getByText('Mở hồ sơ đầy đủ')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng viên' }).getByRole('tab', { name: 'Ứng tuyển', exact: true })).toBeVisible();
});

test('staff uses the candidate detail drawer and switches to applications', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('row', { name: /UV-0009.*Phạm Thu Hà/ }).click();
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng viên' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Lộ trình cung ứng' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Hồ sơ ứng viên' }).getByRole('tab', { name: 'Ứng tuyển', exact: true }).click();
  await expect(page.getByText('Chưa có đơn ứng tuyển')).toBeVisible();
});

test('legacy candidate profile URLs open the detail drawer', async ({ page }) => {
  await page.goto('/candidates/candidate-09');
  await expect(page).toHaveURL(/\/candidates\?selectedId=candidate-09$/);
  await expect(page.getByRole('dialog', { name: 'Hồ sơ ứng viên' })).toBeVisible();
  await expect(page.getByText('Mở hồ sơ đầy đủ')).toHaveCount(0);
});

test('staff switches candidate saved view to active applications', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('tab', { name: 'Đang ứng tuyển' }).click();
  await expect(page).toHaveURL(/view=applying/);
  await expect(page.getByRole('row', { name: /UV-0001.*Nguyễn Minh An/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /UV-0009.*Phạm Thu Hà/ })).toHaveCount(0);
});
