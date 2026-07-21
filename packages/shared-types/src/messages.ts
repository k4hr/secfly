import type { CausationId, CorrelationId, MessageId, RunId } from './identifiers.js';
import type { Instant } from './clock.js';

export interface SchemaVersion {
  readonly major: number;
  readonly minor: number;
}

export interface MessageEnvelope<T> {
  readonly messageId: MessageId;
  readonly messageType: string;
  readonly schemaVersion: SchemaVersion;
  readonly runId: RunId;
  readonly sequence: number;
  readonly timestamp: Instant;
  readonly correlationId: CorrelationId;
  readonly causationId: CausationId;
  readonly payload: T;
}
