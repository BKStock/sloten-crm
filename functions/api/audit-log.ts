export interface Env {
  DB: D1Database;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
  });

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
  });

function parseToken(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    return JSON.parse(atob(authHeader.replace('Bearer ', '')));
  } catch { return null; }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(context.request.url);
  const staffId = url.searchParams.get('staff_id');
  const action = url.searchParams.get('action');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');
  const limit = parseInt(url.searchParams.get('limit') || '100');

  let query = 'SELECT * FROM crm_audit_log WHERE 1=1';
  const params: any[] = [];

  if (staffId) { query += ' AND staff_id = ?'; params.push(staffId); }
  if (action) { query += ' AND action = ?'; params.push(action); }
  if (dateFrom) { query += ' AND created_at >= ?'; params.push(dateFrom); }
  if (dateTo) { query += ' AND created_at <= ?'; params.push(dateTo); }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const stmt = context.env.DB.prepare(query);
  const { results } = await stmt.bind(...params).all();

  return json({ logs: results });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const body = await context.request.json() as any;
  const id = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const ip = context.request.headers.get('cf-connecting-ip') || context.request.headers.get('x-forwarded-for') || 'unknown';

  await context.env.DB.prepare(
    "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, user.id, user.name, body.action, body.target || null, body.details || null, ip).run();

  return json({ success: true, id });
};
