import { expect, test } from '@playwright/test';

test('staff handles a reply and records an audited queued response', async ({ page }) => {
  await page.goto('/mailbox?view=needs-action');
  await page.getByText('Xác nhận lịch phỏng vấn').click();
  const modal = page.getByRole('dialog', { name: 'Chi tiết hộp thư chung' });
  await expect(modal).toBeVisible();
  await expect(page.getByText('Ghi chú nội bộ')).toBeVisible();
  await page.getByRole('button', { name: 'Trả lời' }).click();
  await page.getByLabel('Nội dung').fill('Cảm ơn bạn đã phản hồi.');
  await page.getByRole('button', { name: 'Gửi email' }).click();
  await expect(page.getByText('Đang chờ gửi').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Soạn email trả lời' })).toHaveCount(0);
  await expect(modal).toBeVisible();
  await page.getByRole('button', { name: 'Đóng chi tiết email' }).click();
  await expect(modal).toHaveCount(0);
});

test('unmatched email requires explicit linking and quarantined file cannot be downloaded', async ({ page }) => {
  await page.goto('/mailbox?view=unmatched');
  await page.getByText('Hỏi về cơ hội việc làm').click();
  await page.getByRole('button', { name: 'Liên kết ứng viên' }).click();
  await expect(page.getByRole('button', { name: 'Xác nhận liên kết' })).toBeDisabled();
  await expect(page.getByText('Bị cách ly')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Tải xuống' })).toHaveCount(0);
});
