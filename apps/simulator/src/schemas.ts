import type { SyntheticVehicleConfig } from '@secfly/config';
import type { SyntheticPosition, SyntheticRoute, SyntheticWaypoint } from '@secfly/shared-types';
import { instant } from '@secfly/shared-types';
import { z } from 'zod';

const finiteNumber = z.number().finite();
const russianName = z
  .string()
  .trim()
  .min(1, 'Название обязательно.')
  .max(100, 'Название слишком длинное.')
  .regex(/[А-Яа-яЁё]/, 'Название должно содержать русский текст.');

export const syntheticPositionSchema = z
  .object({ x: finiteNumber, y: finiteNumber, altitude: finiteNumber.nonnegative() })
  .strict();

export const syntheticWaypointSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
    name: russianName,
    position: syntheticPositionSchema,
    acceptanceRadius: finiteNumber.positive(),
    sequence: z.number().finite().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  })
  .strict();

const routeBaseSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
    name: russianName,
    homePosition: syntheticPositionSchema,
    safePosition: syntheticPositionSchema,
    waypoints: z.array(syntheticWaypointSchema).min(1),
    createdAt: z.string().datetime({ offset: true }),
    schemaVersion: z
      .object({ major: z.literal(1), minor: z.number().int().nonnegative() })
      .strict(),
  })
  .strict();

export function parseSyntheticPosition(input: unknown): SyntheticPosition {
  return Object.freeze(syntheticPositionSchema.parse(input));
}

export function parseSyntheticRoute(
  input: unknown,
  config: SyntheticVehicleConfig,
): SyntheticRoute {
  const parsed = routeBaseSchema
    .superRefine((route, context) => {
      if (route.waypoints.length > config.maximumRoutePoints) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['waypoints'],
          message: 'Маршрут содержит слишком много точек.',
        });
      }
      const ids = new Set<string>();
      const sequences = new Set<number>();
      for (const [index, waypoint] of route.waypoints.entries()) {
        if (ids.has(waypoint.id))
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['waypoints', index, 'id'],
            message: 'Идентификаторы точек должны быть уникальны.',
          });
        if (sequences.has(waypoint.sequence))
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['waypoints', index, 'sequence'],
            message: 'Порядковые номера точек должны быть уникальны.',
          });
        if (waypoint.acceptanceRadius < config.minimumWaypointAcceptanceRadius)
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['waypoints', index, 'acceptanceRadius'],
            message: 'Радиус достижения точки слишком мал.',
          });
        ids.add(waypoint.id);
        sequences.add(waypoint.sequence);
      }
    })
    .parse(input);
  const waypoints: readonly SyntheticWaypoint[] = Object.freeze(
    [...parsed.waypoints]
      .sort((left, right) => left.sequence - right.sequence)
      .map((waypoint) =>
        Object.freeze({ ...waypoint, position: Object.freeze({ ...waypoint.position }) }),
      ),
  );
  return Object.freeze({
    ...parsed,
    createdAt: instant(parsed.createdAt),
    homePosition: Object.freeze({ ...parsed.homePosition }),
    safePosition: Object.freeze({ ...parsed.safePosition }),
    schemaVersion: Object.freeze({ ...parsed.schemaVersion }),
    waypoints,
  });
}

export const createRunSchema = z
  .object({
    runId: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/),
    initialPosition: syntheticPositionSchema,
    virtualTimeStart: z.string().datetime({ offset: true }),
  })
  .strict();

export const prepareRunSchema = z.object({ route: routeBaseSchema }).strict();
export const emptyCommandSchema = z.object({}).strict();
