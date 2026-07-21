import { describe, expect, it } from 'vitest';
import { loadConfig } from './index.js';

describe('параметры каркаса', () => {
  it('создаёт неизменяемую конфигурацию из безопасных значений', () => {
    const result = loadConfig({ SECFLY_ONBOARD_CORE_PORT: '4201' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ports.onboardCore).toBe(4201);
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it('возвращает русскую ошибку без значений окружения', () => {
    const result = loadConfig({ SECFLY_ONBOARD_CORE_PORT: 'не-порт' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.userMessage).toMatch(/Параметры запуска/);
  });
});
