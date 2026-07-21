export function GET(): Response {
  return Response.json({
    component: 'ground-control',
    status: 'RUNNING',
    message: 'Пользовательский интерфейс работает.',
    simulationOnly: true,
    version: '0.1.0',
  });
}
