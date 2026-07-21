import type { SyntheticRoute, VirtualVehicleState } from '@secfly/shared-types';

export function SimulationPlane({
  route,
  state,
}: {
  readonly route: SyntheticRoute | undefined;
  readonly state: VirtualVehicleState | undefined;
}) {
  const points = route
    ? [route.homePosition, route.safePosition, ...route.waypoints.map((point) => point.position)]
    : [{ x: 0, y: 0, altitude: 0 }];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs) - 5;
  const maxX = Math.max(...xs) + 5;
  const minY = Math.min(...ys) - 5;
  const maxY = Math.max(...ys) + 5;
  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);
  const px = (x: number) => ((x - minX) / width) * 100;
  const py = (y: number) => 100 - ((y - minY) / height) * 100;
  const coordinate = (value: number) => String(value);
  const transform = (x: number, y: number) =>
    `translate(${coordinate(px(x))} ${coordinate(py(y))})`;
  const routePoints = route
    ? [route.homePosition, ...route.waypoints.map((point) => point.position)]
    : [];
  const polyline = routePoints
    .map((point) => `${coordinate(px(point.x))},${coordinate(py(point.y))}`)
    .join(' ');
  const travelled =
    state && routePoints.length > 0
      ? [...routePoints.slice(0, state.currentWaypointIndex + 1), state.position]
          .map((point) => `${coordinate(px(point.x))},${coordinate(py(point.y))}`)
          .join(' ')
      : '';

  return (
    <figure className="plane-card">
      <figcaption className="section-title">Синтетическая координатная плоскость</figcaption>
      <svg
        viewBox="0 0 100 100"
        role="img"
        aria-label="Условная сетка синтетического маршрута без географической карты"
        className="simulation-plane"
      >
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.25" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" className="grid" />
        {polyline && <polyline points={polyline} fill="none" className="route-line" />}
        {travelled && <polyline points={travelled} fill="none" className="travelled-line" />}
        {route && (
          <>
            <g transform={transform(route.homePosition.x, route.homePosition.y)}>
              <circle r="2.8" className="home-point" />
              <text x="4" y="-3">
                Домашняя точка
              </text>
            </g>
            <g transform={transform(route.safePosition.x, route.safePosition.y)}>
              <rect x="-2.5" y="-2.5" width="5" height="5" className="safe-point" />
              <text x="4" y="-3">
                Безопасная точка
              </text>
            </g>
            {route.waypoints.map((point, index) => (
              <g key={point.id} transform={transform(point.position.x, point.position.y)}>
                <circle
                  r="2"
                  className={
                    state && index < state.currentWaypointIndex ? 'reached-point' : 'waypoint'
                  }
                />
                <text x="3.5" y="4">
                  {point.name}
                </text>
              </g>
            ))}
          </>
        )}
        {state && (
          <g data-testid="vehicle-marker" transform={transform(state.position.x, state.position.y)}>
            <path
              d="M 0 -4 L 3 3 L 0 2 L -3 3 Z"
              className="vehicle"
              transform={`rotate(${coordinate(state.headingDegrees + 90)})`}
            />
          </g>
        )}
      </svg>
      <p className="plane-note">
        Координаты условны. Географические данные и реальные карты не используются.
      </p>
    </figure>
  );
}
