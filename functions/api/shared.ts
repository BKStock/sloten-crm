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
  const type = url.searchParams.get('type');

  let query = 'SELECT * FROM crm_shared_data';
  const params: any[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const stmt = context.env.DB.prepare(query);
  const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();

  return json({ data: results });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role === 'viewer') return json({ error: 'Editors and admins only' }, 403);

  const body = await context.request.json() as any;
  const id = 'shared_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  await context.env.DB.prepare(
    "INSERT INTO crm_shared_data (id, type, data, created_by) VALUES (?, ?, ?, ?)"
  ).bind(id, body.type, JSON.stringify(body.data), user.id).run();

  return json({ success: true, id });
};
