import { describe, expect, it } from 'vitest';
import { instant, runId, VirtualClock } from './index.js';

describe('маркированные идентификаторы', () => {
  it('принимает корректный идентификатор', () => {
    expect(runId('run-001')).toBe('run-001');
  });
  it('отклоняет пустой идентификатор', () => {
    expect(() => runId('')).toThrow(/идентификатор/);
  });
});

describe('виртуальные часы', () => {
  it('детерминированно продвигает время', () => {
    const first = new VirtualClock(instant('2026-01-01T00:00:00.000Z'));
    const second = new VirtualClock(instant('2026-01-01T00:00:00.000Z'));
    expect(first.advanceBy(1_000)).toBe('2026-01-01T00:00:01.000Z');
    expect(first.advanceBy(2_000)).toBe(second.advanceBy(3_000));
  });

  it('запрещает отрицательное продвижение и прошлое', () => {
    const clock = new VirtualClock(instant('2026-01-01T00:00:00.000Z'));
    expect(() => clock.advanceBy(-1)).toThrow(/только вперёд/);
    expect(() => clock.advanceTo(instant('2025-01-01T00:00:00.000Z'))).toThrow(/назад/);
  });
});
