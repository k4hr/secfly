import { describe, expect, it } from 'vitest';
import { DEFAULT_SYNTHETIC_VEHICLE_CONFIG, parseSyntheticVehicleConfig } from './index.js';

describe('параметры синтетической модели', () => {
  it('принимает и замораживает безопасные демонстрационные значения', () => {
    const result = parseSyntheticVehicleConfig(DEFAULT_SYNTHETIC_VEHICLE_CONFIG);
    expect(result.ok).toBe(true);
    if (result.ok) expect(Object.isFrozen(result.value)).toBe(true);
  });

  it.each([
    { simulationStepMilliseconds: -1 },
    { defaultHorizontalSpeed: Number.NaN },
    { maximumVerticalSpeed: Number.POSITIVE_INFINITY },
    { initialBatteryPercent: 101 },
    { defaultHorizontalSpeed: 30, maximumHorizontalSpeed: 20 },
  ])('отклоняет недопустимые значения с русской ошибкой', (change) => {
    const result = parseSyntheticVehicleConfig({ ...DEFAULT_SYNTHETIC_VEHICLE_CONFIG, ...change });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.userMessage).toMatch(/[А-Яа-яЁё]/);
  });
});
