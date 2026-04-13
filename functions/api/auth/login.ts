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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { email, password } = await context.request.json() as any;

  const staff = await context.env.DB.prepare(
    'SELECT * FROM crm_staff WHERE email = ? AND is_active = 1'
  ).bind(email).first();

  if (!staff || staff.password !== password) {
    return json({ error: 'Invalid credentials' }, 401);
  }

  // Update last_login
  await context.env.DB.prepare(
    "UPDATE crm_staff SET last_login = datetime('now') WHERE id = ?"
  ).bind(staff.id).run();

  // Simple token (in production use JWT)
  const token = btoa(JSON.stringify({ id: staff.id, email: staff.email, role: staff.role, name: staff.name }));

  // Log the login
  const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const ip = context.request.headers.get('cf-connecting-ip') || context.request.headers.get('x-forwarded-for') || 'unknown';
  await context.env.DB.prepare(
    "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(logId, staff.id, staff.name, 'login', 'auth', 'ログイン成功', ip).run();

  return json({ token, user: { id: staff.id, email: staff.email, name: staff.name, role: staff.role } });
};
