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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const authHeader = context.request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return json({ error: 'No token provided' }, 401);
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = JSON.parse(atob(token));

    // Verify the user still exists and is active
    const staff = await context.env.DB.prepare(
      'SELECT id, email, name, role, is_active FROM crm_staff WHERE id = ? AND is_active = 1'
    ).bind(decoded.id).first();

    if (!staff) {
      return json({ error: 'User not found or inactive' }, 401);
    }

    return json({ user: { id: staff.id, email: staff.email, name: staff.name, role: staff.role } });
  } catch (e) {
    return json({ error: 'Invalid token' }, 401);
  }
};
