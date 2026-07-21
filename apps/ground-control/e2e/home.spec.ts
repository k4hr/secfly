import { expect, test } from '@playwright/test';
test('главная страница показывает русский каркас SecFly', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SecFly' })).toBeVisible();
  await expect(page.getByText('Только виртуальное моделирование')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ограничения текущей версии' })).toBeVisible();
});
