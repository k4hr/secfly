import type { EventRecord, EventRecorder } from '@secfly/event-log';
import {
  domainError,
  err,
  ok,
  type DomainError,
  type EventId,
  type Result,
} from '@secfly/shared-types';

export interface RecordedDecision<TDecision> {
  readonly event: EventRecord<TDecision>;
}

export interface SimulationIntent<TPayload> {
  readonly decisionEventId: EventId;
  readonly intentType: 'BOOTSTRAP_DEMONSTRATION_ONLY';
  readonly payload: TPayload;
}

export interface SimulationIntentSink<TPayload> {
  apply(intent: SimulationIntent<TPayload>): Promise<Result<void, DomainError>>;
}

export class DecisionBeforeEffectCoordinator<TDecision, TPayload> {
  readonly #applied = new Set<EventId>();

  constructor(
    private readonly recorder: EventRecorder,
    private readonly sink: SimulationIntentSink<TPayload>,
  ) {}

  async recordThenApply(
    decision: RecordedDecision<TDecision>,
    createIntent: (decisionEventId: EventId) => SimulationIntent<TPayload>,
  ): Promise<Result<'applied' | 'already-applied', DomainError>> {
    const appended = await this.recorder.append(decision.event);
    if (!appended.ok) {
      return err(
        domainError(
          'DECISION_NOT_RECORDED',
          'Решение не записано, поэтому виртуальный эффект запрещён.',
          {
            retryable: appended.error.retryable,
          },
        ),
      );
    }
    if (this.#applied.has(decision.event.eventId)) return ok('already-applied');
    const applied = await this.sink.apply(createIntent(decision.event.eventId));
    if (!applied.ok) return applied;
    this.#applied.add(decision.event.eventId);
    return ok('applied');
  }
}
