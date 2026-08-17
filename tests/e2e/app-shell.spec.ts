import { expect, test } from '@playwright/test';
import { assertNoSeriousA11yIssues } from './helpers/axe';

test('app shell works on desktop and tablet', async ({ page }) => {
  await page.goto('/work');
  await expect(page.getByRole('link', { name: 'Ứng viên' })).toBeVisible();

  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole('button', { name: 'Mở điều hướng' })).toBeVisible();
  await assertNoSeriousA11yIssues(page);
});

test('navigation exposes orders and keeps the active state on order detail', async ({ page }) => {
  await page.goto('/orders/order-01');
  const ordersLink = page.getByRole('link', { name: 'Đơn tuyển' });
  await expect(ordersLink).toHaveAttribute('href', '/orders');
  await expect(ordersLink).toHaveClass(/bg-\[#e8f1fb\]/);
});

test('health endpoint exposes production security baseline', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.ok()).toBe(true);
  expect(await response.json()).toEqual({ status: 'ok', service: 'cms-web' });
  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['content-security-policy']).toContain("default-src 'self'");
});

test('mobile navigation fits the viewport and closes with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/work');
  await page.getByRole('button', { name: 'Mở điều hướng' }).click();

  const panel = page.locator('.cms-mobile-navigation-panel');
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box?.width).toBeLessThanOrEqual(359);
  expect(box?.height).toBeGreaterThanOrEqual(800);
  await expect(page.getByRole('button', { name: 'Đóng điều hướng' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('.cms-mobile-navigation-panel')).toHaveCount(0);
});
