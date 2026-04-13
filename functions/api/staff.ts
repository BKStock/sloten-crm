export interface Env {
  DB: D1Database;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
  });

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
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

  const { results } = await context.env.DB.prepare(
    'SELECT id, email, name, role, is_active, last_login, created_at FROM crm_staff ORDER BY created_at ASC'
  ).all();

  return json({ staff: results });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);

  const body = await context.request.json() as any;
  const id = 'staff_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  await context.env.DB.prepare(
    "INSERT INTO crm_staff (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)"
  ).bind(id, body.email, body.name, body.password, body.role || 'viewer').run();

  // Audit log
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
  await context.env.DB.prepare(
    "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(logId, user.id, user.name, 'create_staff', body.email, 'ロール: ' + (body.role || 'viewer'), ip).run();

  return json({ success: true, id });
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);

  const body = await context.request.json() as any;

  const updates: string[] = [];
  const params: any[] = [];

  if (body.name !== undefined) { updates.push('name = ?'); params.push(body.name); }
  if (body.role !== undefined) { updates.push('role = ?'); params.push(body.role); }
  if (body.is_active !== undefined) { updates.push('is_active = ?'); params.push(body.is_active ? 1 : 0); }
  if (body.password !== undefined) { updates.push('password = ?'); params.push(body.password); }

  if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

  params.push(body.id);
  await context.env.DB.prepare(
    'UPDATE crm_staff SET ' + updates.join(', ') + ' WHERE id = ?'
  ).bind(...params).run();

  // Audit log
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
  await context.env.DB.prepare(
    "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(logId, user.id, user.name, 'update_staff', body.id, JSON.stringify(body), ip).run();

  return json({ success: true });
};
