import {
  causationId,
  correlationId,
  domainError,
  err,
  instant,
  messageId,
  ok,
  runId,
  type DomainError,
  type MessageEnvelope,
  type Result,
} from '@secfly/shared-types';
import { z } from 'zod';

export const identifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
export const schemaVersionSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
});
export const timestampSchema = z.string().datetime({ offset: true });
export const sequenceSchema = z.number().int().nonnegative();

const envelopeBaseSchema = z
  .object({
    messageId: identifierSchema,
    messageType: z.string().min(1).max(128),
    schemaVersion: schemaVersionSchema,
    runId: identifierSchema,
    sequence: sequenceSchema,
    timestamp: timestampSchema,
    correlationId: identifierSchema,
    causationId: identifierSchema,
    payload: z.unknown(),
  })
  .strict();

export interface SchemaCompatibilityPolicy {
  readonly supportedMajor: number;
  readonly maximumMinor: number;
  readonly acceptedMessageTypes: readonly string[];
}

export function parseMessageEnvelope<T>(
  input: unknown,
  payloadSchema: z.ZodType<T>,
  policy: SchemaCompatibilityPolicy,
): Result<MessageEnvelope<T>, DomainError> {
  const base = envelopeBaseSchema.safeParse(input);
  if (!base.success) {
    return err(domainError('VALIDATION_ERROR', 'Сообщение не прошло проверку структуры.'));
  }
  const value = base.data;
  if (value.schemaVersion.major !== policy.supportedMajor) {
    return err(
      domainError('UNSUPPORTED_SCHEMA_VERSION', 'Основная версия сообщения не поддерживается.', {
        details: { receivedMajor: value.schemaVersion.major },
      }),
    );
  }
  if (value.schemaVersion.minor > policy.maximumMinor) {
    return err(
      domainError('UNSUPPORTED_SCHEMA_VERSION', 'Дополнительная версия сообщения не разрешена.', {
        details: { receivedMinor: value.schemaVersion.minor },
      }),
    );
  }
  if (!policy.acceptedMessageTypes.includes(value.messageType)) {
    return err(domainError('VALIDATION_ERROR', 'Тип сообщения не поддерживается.'));
  }
  const payload = payloadSchema.safeParse(value.payload);
  if (!payload.success) {
    return err(domainError('VALIDATION_ERROR', 'Содержимое сообщения не прошло проверку.'));
  }

  return ok({
    messageId: messageId(value.messageId),
    messageType: value.messageType,
    schemaVersion: value.schemaVersion,
    runId: runId(value.runId),
    sequence: value.sequence,
    timestamp: instant(new Date(value.timestamp).toISOString()),
    correlationId: correlationId(value.correlationId),
    causationId: causationId(value.causationId),
    payload: payload.data,
  });
}
