import { domainError, err, ok, type DomainError, type Result } from '@secfly/shared-types';
import { z } from 'zod';

const finiteNonnegative = z.number().finite().nonnegative();

export const syntheticVehicleConfigSchema = z
  .object({
    simulationStepMilliseconds: z.number().finite().int().min(10).max(10_000),
    defaultHorizontalSpeed: finiteNonnegative.max(100),
    defaultVerticalSpeed: finiteNonnegative.max(50),
    maximumHorizontalSpeed: z.number().finite().positive().max(200),
    maximumVerticalSpeed: z.number().finite().positive().max(100),
    initialBatteryPercent: z.number().finite().min(0).max(100),
    idleBatteryDrainPerSecond: finiteNonnegative.max(10),
    movementBatteryDrainPerSecond: finiteNonnegative.max(20),
    minimumWaypointAcceptanceRadius: z.number().finite().positive().max(100),
    maximumRoutePoints: z.number().finite().int().min(1).max(100),
    maximumSimulationDurationSeconds: z.number().finite().positive().max(86_400),
    stepEventLoggingInterval: z.number().finite().int().min(1).max(10_000),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.defaultHorizontalSpeed > value.maximumHorizontalSpeed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultHorizontalSpeed'],
        message: 'Обычная горизонтальная скорость превышает допустимую.',
      });
    }
    if (value.defaultVerticalSpeed > value.maximumVerticalSpeed) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['defaultVerticalSpeed'],
        message: 'Обычная вертикальная скорость превышает допустимую.',
      });
    }
  });

export type SyntheticVehicleConfig = Readonly<z.infer<typeof syntheticVehicleConfigSchema>>;

export const DEFAULT_SYNTHETIC_VEHICLE_CONFIG: SyntheticVehicleConfig = Object.freeze({
  simulationStepMilliseconds: 1_000,
  defaultHorizontalSpeed: 5,
  defaultVerticalSpeed: 2,
  maximumHorizontalSpeed: 20,
  maximumVerticalSpeed: 10,
  initialBatteryPercent: 100,
  idleBatteryDrainPerSecond: 0.01,
  movementBatteryDrainPerSecond: 0.04,
  minimumWaypointAcceptanceRadius: 0.5,
  maximumRoutePoints: 50,
  maximumSimulationDurationSeconds: 7_200,
  stepEventLoggingInterval: 5,
});

export function parseSyntheticVehicleConfig(
  input: unknown,
): Result<SyntheticVehicleConfig, DomainError> {
  const parsed = syntheticVehicleConfigSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message;
    const message =
      issue && /[А-Яа-яЁё]/.test(issue) ? issue : 'Параметры синтетической модели заданы неверно.';
    return err(domainError('CONFIGURATION_ERROR', message));
  }
  return ok(Object.freeze({ ...parsed.data }));
}
