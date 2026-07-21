import { describe, expect, it } from 'vitest';
import { STATE_ESTIMATOR_CAPABILITY } from './index.js';

describe('граница оценки состояния', () => {
  it('явно запрещает вычисления на ЭТАПЕ 1', () => {
    expect(STATE_ESTIMATOR_CAPABILITY).toMatchObject({ stage: 1, available: false });
    expect(STATE_ESTIMATOR_CAPABILITY.userMessage).toMatch(/[А-Яа-яЁё]/);
  });
});
