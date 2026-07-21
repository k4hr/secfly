import type { EventRecord, EventRecorder } from '@secfly/event-log';
import { InMemoryEventLog } from '@secfly/event-log';
import {
  causationId,
  correlationId,
  domainError,
  err,
  eventId,
  instant,
  ok,
  runId,
  type DomainError,
  type Result,
} from '@secfly/shared-types';
import { describe, expect, it } from 'vitest';
import {
  DecisionBeforeEffectCoordinator,
  type SimulationIntent,
  type SimulationIntentSink,
} from './index.js';

const decision: EventRecord<{ readonly accepted: true }> = {
  eventId: eventId('decision-1'),
  runId: runId('run-1'),
  sequence: 0,
  timestamp: instant('2026-01-01T00:00:00.000Z'),
  eventType: 'BootstrapDecisionRecorded',
  schemaVersion: { major: 1, minor: 0 },
  correlationId: correlationId('cor-1'),
  causationId: causationId('cause-1'),
  payload: { accepted: true },
  integrityTag: 'not-calculated-at-stage-1',
};

class StubSink implements SimulationIntentSink<{ readonly note: string }> {
  readonly intents: SimulationIntent<{ readonly note: string }>[] = [];
  apply(intent: SimulationIntent<{ readonly note: string }>): Promise<Result<void, DomainError>> {
    this.intents.push(intent);
    return Promise.resolve(ok(undefined));
  }
}

describe('контракт решения до эффекта', () => {
  it('применяет заглушку только после записи и не повторяет эффект', async () => {
    const sink = new StubSink();
    const coordinator = new DecisionBeforeEffectCoordinator(new InMemoryEventLog(), sink);
    const execute = () =>
      coordinator.recordThenApply({ event: decision }, (decisionEventId) => ({
        decisionEventId,
        intentType: 'BOOTSTRAP_DEMONSTRATION_ONLY',
        payload: { note: 'Движение отсутствует' },
      }));
    expect((await execute()).ok).toBe(true);
    expect((await execute()).ok).toBe(true);
    expect(sink.intents).toHaveLength(1);
  });

  it('запрещает эффект при ошибке записи', async () => {
    const recorder: EventRecorder = {
      append: () => Promise.resolve(err(domainError('SEQUENCE_VIOLATION', 'Журнал недоступен.'))),
    };
    const sink = new StubSink();
    const coordinator = new DecisionBeforeEffectCoordinator(recorder, sink);
    const result = await coordinator.recordThenApply({ event: decision }, (decisionEventId) => ({
      decisionEventId,
      intentType: 'BOOTSTRAP_DEMONSTRATION_ONLY',
      payload: { note: 'Этого эффекта не будет' },
    }));
    expect(result.ok).toBe(false);
    expect(sink.intents).toHaveLength(0);
  });
});
