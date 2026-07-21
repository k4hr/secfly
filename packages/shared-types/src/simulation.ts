import type { Instant } from './clock.js';
import type { RunId } from './identifiers.js';

export const SIMULATION_STATUSES = [
  'CREATED',
  'READY',
  'RUNNING',
  'PAUSED',
  'STOPPED',
  'COMPLETED',
  'RESET',
  'FAILED',
] as const;

export type SimulationStatus = (typeof SIMULATION_STATUSES)[number];

export interface SyntheticPosition {
  readonly x: number;
  readonly y: number;
  readonly altitude: number;
}

export interface SyntheticWaypoint {
  readonly id: string;
  readonly name: string;
  readonly position: SyntheticPosition;
  readonly acceptanceRadius: number;
  readonly sequence: number;
}

export interface SyntheticRoute {
  readonly id: string;
  readonly name: string;
  readonly homePosition: SyntheticPosition;
  readonly safePosition: SyntheticPosition;
  readonly waypoints: readonly SyntheticWaypoint[];
  readonly createdAt: Instant;
  readonly schemaVersion: Readonly<{ major: number; minor: number }>;
}

export interface SyntheticVelocity {
  readonly x: number;
  readonly y: number;
  readonly vertical: number;
}

export interface VirtualVehicleState {
  readonly runId: RunId;
  readonly status: SimulationStatus;
  readonly position: SyntheticPosition;
  readonly velocity: SyntheticVelocity;
  readonly groundSpeed: number;
  readonly verticalSpeed: number;
  readonly headingDegrees: number;
  readonly batteryPercent: number;
  readonly currentWaypointIndex: number;
  readonly routeProgressPercent: number;
  readonly homePosition: SyntheticPosition;
  readonly safePosition: SyntheticPosition;
  readonly simulationTime: number;
  readonly lastUpdatedAt: Instant;
  readonly isMoving: boolean;
  readonly isPaused: boolean;
  readonly isCompleted: boolean;
}
