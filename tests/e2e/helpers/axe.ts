import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

export async function assertNoSeriousA11yIssues(page: Page) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;}' });
  await page.evaluate(async () => {
    const animations = Array.from(document.querySelectorAll('*')).flatMap((element) =>
      element.getAnimations().filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity),
    );
    await Promise.all(animations.map((animation) => animation.finished.catch(() => undefined)));
    if (document.fonts?.ready) await document.fonts.ready;
  });
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical');
  expect(serious, serious.map((violation) => `${violation.id}: ${violation.help}`).join('\n')).toEqual([]);
}
