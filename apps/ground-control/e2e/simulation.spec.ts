import { expect, test } from '@playwright/test';

test('страница моделирования выполняет детерминированный русский сценарий', async ({ page }) => {
  await page.goto('/simulation');
  await expect(page.getByText('Только виртуальное моделирование')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Синтетическая модель аппарата' })).toBeVisible();
  await expect(
    page.getByText('Реальное оборудование не подключено.', { exact: false }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Создать запуск' }).click();
  await expect(page.getByText('Создано', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Подготовить' }).click();
  await expect(page.getByText('Готово к запуску', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Запустить' }).click();

  const position = page.getByText('Положение X', { exact: true }).locator('..').locator('strong');
  const battery = page.getByText('Заряд', { exact: true }).locator('..').locator('strong');
  const initialPosition = await position.textContent();
  const initialBattery = await battery.textContent();
  await page.getByRole('button', { name: 'Выполнить один шаг' }).click();
  await expect(position).not.toHaveText(initialPosition ?? '');
  await expect(battery).not.toHaveText(initialBattery ?? '');

  await page.getByRole('button', { name: 'Приостановить' }).click();
  await expect(page.getByText('Моделирование приостановлено', { exact: true })).toBeVisible();
  await page.waitForTimeout(900);
  const pausedPosition = await position.textContent();
  await page.waitForTimeout(1_100);
  await expect(position).toHaveText(pausedPosition ?? '');
  await page.getByRole('button', { name: 'Продолжить' }).click();
  await page.getByRole('button', { name: 'Остановить', exact: true }).click();
  await page.getByRole('button', { name: 'Сбросить' }).click();
  await expect(page.getByText('Состояние сброшено', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Журнал событий' })).toBeVisible();
  await expect(page.getByText('Запуск создан', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await expect(page.locator('body')).not.toContainText(
    /\b(Start|Pause|Resume|Stop|Reset|Position|Speed|Heading|Battery|Route|Waypoint|Event)\b/,
  );
});
