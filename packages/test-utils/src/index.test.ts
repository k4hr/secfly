import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_TEST_INSTANT, BOOTSTRAP_TEST_RUN_ID } from './index.js';

describe('детерминированные испытательные значения', () => {
  it('не используют случайные или текущие данные', () => {
    expect(BOOTSTRAP_TEST_INSTANT).toBe('2026-01-01T00:00:00.000Z');
    expect(BOOTSTRAP_TEST_RUN_ID).toBe('bootstrap-run-1');
  });
});
