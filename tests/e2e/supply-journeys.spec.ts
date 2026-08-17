import { expect, test } from '@playwright/test';

test('coordinator updates an in-Japan milestone without forcing departure data', async ({ page }) => {
  await page.goto('/supply-journeys/journey-in-japan-01');
  await page.getByRole('button', { name: 'Cập nhật mốc' }).first().click();
  await expect(page.getByText('Thông tin kế hoạch xuất cảnh (tùy chọn)')).toHaveCount(0);
  await page.getByLabel('Trạng thái mốc').selectOption('COMPLETED');
  await page.getByRole('button', { name: 'Lưu mốc' }).click();
  await expect(page.getByText('Mốc đã được cập nhật')).toBeVisible();
});

test('journey list exposes waiting-candidate as a derived view', async ({ page }) => {
  await page.goto('/supply-journeys?view=waiting-candidate');
  const row = page.getByRole('row', { name: /Võ Thanh Tùng/ });
  await expect(row).toContainText('Hồ sơ COE');
  await expect(row).toContainText('Có rủi ro');
});
