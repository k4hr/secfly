import { causationId, correlationId, eventId, instant, runId } from '@secfly/shared-types';
import { describe, expect, it } from 'vitest';
import { InMemoryEventLog, type EventRecord } from './index.js';

function record(run: string, sequence: number, id = `event-${String(sequence)}`): EventRecord {
  return {
    eventId: eventId(id),
    runId: runId(run),
    sequence,
    timestamp: instant('2026-01-01T00:00:00.000Z'),
    eventType: 'BootstrapDecisionRecorded',
    schemaVersion: { major: 1, minor: 0 },
    correlationId: correlationId('cor-1'),
    causationId: causationId('cause-1'),
    payload: Object.freeze({ stage: 1 }),
    integrityTag: 'not-calculated-at-stage-1',
  };
}

describe('журнал событий в памяти', () => {
  it('дополняется, сохраняет порядок и изолирует запуски', async () => {
    const log = new InMemoryEventLog();
    expect((await log.append(record('run-a', 0))).ok).toBe(true);
    expect((await log.append(record('run-a', 1))).ok).toBe(true);
    expect((await log.append(record('run-b', 0, 'event-b'))).ok).toBe(true);
    expect((await log.read(runId('run-a'))).map((item) => item.sequence)).toEqual([0, 1]);
    expect(await log.read(runId('run-b'))).toHaveLength(1);
  });

  it('не создаёт копию повтора и отклоняет разрыв', async () => {
    const log = new InMemoryEventLog();
    await log.append(record('run-a', 0));
    const duplicate = await log.append(record('run-a', 0));
    expect(duplicate.ok && duplicate.value.status).toBe('duplicate');
    expect((await log.read(runId('run-a'))).length).toBe(1);
    expect((await log.append(record('run-a', 3, 'event-3'))).ok).toBe(false);
  });
});
