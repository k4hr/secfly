export const DOMAIN_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNSUPPORTED_SCHEMA_VERSION',
  'DUPLICATE_MESSAGE',
  'STALE_MESSAGE',
  'SEQUENCE_VIOLATION',
  'CONFIGURATION_ERROR',
  'DECISION_NOT_RECORDED',
] as const;

export type DomainErrorCode = (typeof DOMAIN_ERROR_CODES)[number];

export interface DomainError {
  readonly code: DomainErrorCode;
  readonly userMessage: string;
  readonly details: Readonly<Record<string, string | number | boolean>>;
  readonly retryable: boolean;
}

export type ValidationError = DomainError & { readonly code: 'VALIDATION_ERROR' };
export type UnsupportedSchemaVersionError = DomainError & {
  readonly code: 'UNSUPPORTED_SCHEMA_VERSION';
};
export type DuplicateMessageError = DomainError & { readonly code: 'DUPLICATE_MESSAGE' };
export type StaleMessageError = DomainError & { readonly code: 'STALE_MESSAGE' };

export function domainError(
  code: DomainErrorCode,
  userMessage: string,
  options: {
    readonly details?: Readonly<Record<string, string | number | boolean>>;
    readonly retryable?: boolean;
  } = {},
): DomainError {
  return Object.freeze({
    code,
    userMessage,
    details: Object.freeze({ ...(options.details ?? {}) }),
    retryable: options.retryable ?? false,
  });
}
