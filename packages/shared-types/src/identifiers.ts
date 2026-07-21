declare const brand: unique symbol;
type Branded<T, Name extends string> = T & { readonly [brand]: Name };

export type RunId = Branded<string, 'RunId'>;
export type EventId = Branded<string, 'EventId'>;
export type MessageId = Branded<string, 'MessageId'>;
export type CommandId = Branded<string, 'CommandId'>;
export type CorrelationId = Branded<string, 'CorrelationId'>;
export type CausationId = Branded<string, 'CausationId'>;
export type ConfigurationVersion = Branded<string, 'ConfigurationVersion'>;

const identifierPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function identifier<Name extends string>(value: string, kind: Name): Branded<string, Name> {
  if (!identifierPattern.test(value)) {
    throw new Error(`Некорректный идентификатор ${kind}.`);
  }
  return value as Branded<string, Name>;
}

export const runId = (value: string): RunId => identifier(value, 'RunId');
export const eventId = (value: string): EventId => identifier(value, 'EventId');
export const messageId = (value: string): MessageId => identifier(value, 'MessageId');
export const commandId = (value: string): CommandId => identifier(value, 'CommandId');
export const correlationId = (value: string): CorrelationId => identifier(value, 'CorrelationId');
export const causationId = (value: string): CausationId => identifier(value, 'CausationId');
export const configurationVersion = (value: string): ConfigurationVersion =>
  identifier(value, 'ConfigurationVersion');
