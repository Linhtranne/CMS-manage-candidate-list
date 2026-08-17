import { expect, test } from '@playwright/test';
import { assertNoSeriousA11yIssues } from './helpers/axe';

test('staff filters, opens and completes a work item', async ({ page }) => {
  await page.goto('/work');
  await page.getByRole('button', { name: 'Quá hạn 3' }).click();
  await expect(page).toHaveURL(/view=overdue/);
  const row = page.locator('tbody tr').filter({ hasText: 'Nguyễn Minh An' }).first();
  await row.click();
  await expect(page.getByRole('dialog', { name: 'Chi tiết công việc' })).toBeVisible();
  await page.getByRole('button', { name: 'Đánh dấu hoàn thành' }).click();
  await expect(page.getByText('Đã hoàn thành công việc')).toBeVisible();
});

test.use({ viewport: { width: 768, height: 1024 } });
test('tablet keeps work actions and remains accessible', async ({ page }) => {
  await page.goto('/work?view=actionable');
  await page.locator('tbody tr').filter({ hasText: 'Nguyễn Minh An' }).first().click();
  await expect(page.getByRole('button', { name: 'Đánh dấu hoàn thành' })).toBeVisible();
  await assertNoSeriousA11yIssues(page);
});
