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

// POST: Submit action for approval
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const body = await context.request.json() as any;
  const { action_type, action_data } = body;

  if (!action_type) {
    return json({ error: 'action_type is required' }, 400);
  }

  const id = 'appr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  try {
    await context.env.DB.prepare(
      "INSERT INTO crm_approvals (id, action_type, action_data, requester_id, requester_name, status) VALUES (?, ?, ?, ?, ?, 'pending')"
    ).bind(id, action_type, JSON.stringify(action_data || {}), user.id, user.name).run();

    // Audit log
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
    await context.env.DB.prepare(
      "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(logId, user.id, user.name, 'submit_approval', action_type, JSON.stringify(action_data || {}), ip).run();

    return json({ success: true, id });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};

// GET: List approvals
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const url = new URL(context.request.url);
  const status = url.searchParams.get('status') || 'pending';

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT * FROM crm_approvals WHERE status = ? ORDER BY created_at DESC LIMIT 100'
    ).bind(status).all();

    return json({ approvals: results || [] });
  } catch {
    return json({ approvals: [] });
  }
};

// PUT: Approve or reject
export const onRequestPut: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);

  const body = await context.request.json() as any;
  const { id, action, review_note } = body;

  if (!id || !action || !['approve', 'reject'].includes(action)) {
    return json({ error: 'id and action (approve/reject) are required' }, 400);
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  try {
    await context.env.DB.prepare(
      "UPDATE crm_approvals SET status = ?, reviewer_id = ?, reviewer_name = ?, review_note = ?, reviewed_at = datetime('now') WHERE id = ?"
    ).bind(newStatus, user.id, user.name, review_note || null, id).run();

    // Audit log
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
    await context.env.DB.prepare(
      "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(logId, user.id, user.name, action + '_approval', id, review_note || '', ip).run();

    return json({ success: true, status: newStatus });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
