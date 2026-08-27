import { expect, test } from '@playwright/test';

test('staff can sign in, reach the work queue, and sign out', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Đăng nhập CMS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tiếp tục với Google' })).toHaveCount(0);

  await page.getByLabel('Email công việc').fill('staff@example.com');
  await page.getByLabel('Mật khẩu').fill('secret');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await expect(page).toHaveURL(/\/work$/);
  await expect(page.getByRole('heading', { name: 'Việc của tôi' })).toBeVisible();

  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Đăng nhập CMS' })).toBeVisible();
});

test('invalid credentials stay on login and expose a user-safe error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email công việc').fill('unknown@example.com');
  await page.getByLabel('Mật khẩu').fill('wrong-pass');
  await page.getByRole('button', { name: 'Đăng nhập' }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng.' })).toHaveText('Email hoặc mật khẩu không đúng.');
  await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeEnabled();
});
