export const SYSTEM_MODES = [
  'PREFLIGHT',
  'MANUAL_CONTROL',
  'ASSISTED_CONTROL',
  'LINK_DEGRADED',
  'AUTONOMOUS_HOLD',
  'RETURN_TO_HOME',
  'SAFE_WAYPOINT',
  'CONTROLLED_LANDING',
  'LANDED',
  'RECOVERY_PENDING',
  'FAULT',
  'EMERGENCY_STOP',
] as const;

export type SystemMode = (typeof SYSTEM_MODES)[number];

export const COMPONENT_STATES = [
  'STARTING',
  'RUNNING',
  'DEGRADED',
  'STOPPED',
  'FAILED',
  'UNKNOWN',
] as const;
export type ComponentState = (typeof COMPONENT_STATES)[number];

export const SEVERITY_LEVELS = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];
