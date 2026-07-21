import {
  domainError,
  err,
  ok,
  type CausationId,
  type CorrelationId,
  type DomainError,
  type EventId,
  type Instant,
  type Result,
  type RunId,
  type SchemaVersion,
} from '@secfly/shared-types';

export interface EventRecord<T = unknown> {
  readonly eventId: EventId;
  readonly runId: RunId;
  readonly sequence: number;
  readonly timestamp: Instant;
  readonly eventType: string;
  readonly schemaVersion: SchemaVersion;
  readonly correlationId: CorrelationId;
  readonly causationId: CausationId;
  readonly payload: T;
  readonly integrityTag: string;
}

export type AppendResult<T> =
  | { readonly status: 'appended'; readonly record: EventRecord<T> }
  | { readonly status: 'duplicate'; readonly record: EventRecord<T> };

export interface EventRecorder {
  append<T>(record: EventRecord<T>): Promise<Result<AppendResult<T>, DomainError>>;
}

export interface EventReader {
  read(runId: RunId): Promise<readonly EventRecord[]>;
}

export type ReplaySource = EventReader;

export class InMemoryEventLog implements EventRecorder, EventReader, ReplaySource {
  readonly #runs = new Map<RunId, EventRecord[]>();
  readonly #events = new Map<EventId, EventRecord>();

  append<T>(record: EventRecord<T>): Promise<Result<AppendResult<T>, DomainError>> {
    const duplicate = this.#events.get(record.eventId);
    if (duplicate) {
      return Promise.resolve(ok({ status: 'duplicate', record: duplicate as EventRecord<T> }));
    }
    const records = this.#runs.get(record.runId) ?? [];
    if (record.sequence !== records.length) {
      return Promise.resolve(
        err(
          domainError('SEQUENCE_VIOLATION', 'Нарушен ожидаемый порядок событий.', {
            details: { expected: records.length, received: record.sequence },
          }),
        ),
      );
    }
    const immutableRecord = Object.freeze({ ...record });
    this.#runs.set(record.runId, [...records, immutableRecord]);
    this.#events.set(record.eventId, immutableRecord);
    return Promise.resolve(ok({ status: 'appended', record: immutableRecord }));
  }

  read(run: RunId): Promise<readonly EventRecord[]> {
    return Promise.resolve(Object.freeze([...(this.#runs.get(run) ?? [])]));
  }
}
