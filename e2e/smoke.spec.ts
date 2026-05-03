import { test, expect } from '@playwright/test';

test('página de login carga correctamente', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Blue Motors/i);
});
