import { domainError, err, ok, type DomainError, type Result } from '@secfly/shared-types';
import { z } from 'zod';

const environmentSchema = z
  .object({
    SECFLY_ENVIRONMENT: z.enum(['development', 'test', 'production']).default('development'),
    SECFLY_VERSION: z.string().min(1).default('0.1.0'),
    SECFLY_LOG_LEVEL: z.enum(['debug', 'info', 'warning', 'error']).default('info'),
    SECFLY_DIAGNOSTICS_ENABLED: z.enum(['true', 'false']).default('false'),
    SECFLY_GROUND_CONTROL_PORT: z.coerce.number().int().min(1024).max(65_535).default(3000),
    SECFLY_ONBOARD_CORE_PORT: z.coerce.number().int().min(1024).max(65_535).default(4101),
    SECFLY_SIMULATOR_PORT: z.coerce.number().int().min(1024).max(65_535).default(4102),
    SECFLY_TELEMETRY_GATEWAY_PORT: z.coerce.number().int().min(1024).max(65_535).default(4103),
    SECFLY_SCHEMA_MAJOR: z.coerce.number().int().nonnegative().default(1),
    SECFLY_SCHEMA_MAX_MINOR: z.coerce.number().int().nonnegative().default(0),
  })
  .strip();

export interface SecFlyConfig {
  readonly applicationName: 'SecFly';
  readonly environment: 'development' | 'test' | 'production';
  readonly version: string;
  readonly logLevel: 'debug' | 'info' | 'warning' | 'error';
  readonly diagnosticsEnabled: boolean;
  readonly ports: Readonly<{
    groundControl: number;
    onboardCore: number;
    simulator: number;
    telemetryGateway: number;
  }>;
  readonly schemaCompatibility: Readonly<{ supportedMajor: number; maximumMinor: number }>;
}

export function loadConfig(
  environment: Readonly<Record<string, string | undefined>>,
): Result<SecFlyConfig, DomainError> {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    return err(domainError('CONFIGURATION_ERROR', 'Параметры запуска SecFly заданы неверно.'));
  }
  const value = parsed.data;
  return ok(
    Object.freeze({
      applicationName: 'SecFly',
      environment: value.SECFLY_ENVIRONMENT,
      version: value.SECFLY_VERSION,
      logLevel: value.SECFLY_LOG_LEVEL,
      diagnosticsEnabled: value.SECFLY_DIAGNOSTICS_ENABLED === 'true',
      ports: Object.freeze({
        groundControl: value.SECFLY_GROUND_CONTROL_PORT,
        onboardCore: value.SECFLY_ONBOARD_CORE_PORT,
        simulator: value.SECFLY_SIMULATOR_PORT,
        telemetryGateway: value.SECFLY_TELEMETRY_GATEWAY_PORT,
      }),
      schemaCompatibility: Object.freeze({
        supportedMajor: value.SECFLY_SCHEMA_MAJOR,
        maximumMinor: value.SECFLY_SCHEMA_MAX_MINOR,
      }),
    }),
  );
}
