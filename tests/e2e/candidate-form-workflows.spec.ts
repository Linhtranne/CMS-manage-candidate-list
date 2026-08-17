import { expect, test } from '@playwright/test';

test('staff creates a candidate from the shared modal', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('button', { name: 'Thêm ứng viên' }).click();
  await expect(page.getByRole('dialog', { name: 'Thêm ứng viên' })).toBeVisible();
  await page.getByLabel('Họ và tên').fill('Ứng viên E2E');
  await page.getByLabel('Ngành nghề').selectOption({ label: 'Điều dưỡng' });
  await page.getByLabel('Nghề nghiệp chính').fill('Nhân viên chăm sóc');
  await page.getByRole('button', { name: 'Lưu ứng viên' }).click();
  await expect(page.getByRole('status')).toContainText('Đã tạo hồ sơ ứng viên');
});

test('staff previews and confirms a candidate import in the shared modal', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('button', { name: 'Import ứng viên' }).click();
  await page.getByLabel('Tệp ứng viên').setInputFiles({ name: 'candidates.csv', mimeType: 'text/csv', buffer: Buffer.from('name,industry\nA,IT\nB,Care') });
  await expect(page.getByText('2 dòng hợp lệ')).toBeVisible();
  await page.getByRole('button', { name: 'Xác nhận import' }).click();
  await expect(page.getByRole('status')).toContainText('Đã import 2 hồ sơ ứng viên');
});

test('staff records duplicate review in the shared modal', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('button', { name: 'Rà soát nghi trùng' }).click();
  await expect(page.getByRole('dialog', { name: 'Rà soát ứng viên nghi trùng' })).toBeVisible();
  await page.getByRole('button', { name: 'Đánh dấu đã rà soát' }).click();
  await expect(page.getByRole('status')).toContainText('Đã ghi nhận kết quả rà soát trùng');
});

test('staff edits a candidate profile in the shared modal', async ({ page }) => {
  await page.goto('/candidates/candidate-09');
  await page.getByRole('button', { name: 'Chỉnh sửa hồ sơ' }).click();
  await page.getByLabel('Họ và tên').fill('Phạm Thu Hà E2E');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('heading', { name: 'Phạm Thu Hà E2E' })).toBeVisible();
});
