import type { NextRequest } from 'next/server';

const simulatorUrl = process.env['SECFLY_SIMULATOR_URL'] ?? 'http://127.0.0.1:4102';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const target = `${simulatorUrl}/api/simulation/${path.join('/')}`;
  try {
    const body = request.method === 'GET' ? undefined : await request.text();
    const response = await fetch(target, {
      method: request.method,
      ...(body ? { headers: { 'content-type': 'application/json' }, body } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    return new Response(response.body, {
      status: response.status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Сервис синтетической модели недоступен. Повторите действие позже.',
        },
      },
      { status: 503 },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
