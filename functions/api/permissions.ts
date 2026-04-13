export interface Env {
  DB: D1Database;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    }
  });

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
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

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  admin: {
    push_send: true, push_settings: true,
    promo_post: true, promo_approve: true,
    sms_send: true, sms_settings: true,
    email_send: true, email_settings: true,
    sns_settings: true, telegram_settings: true,
    competitor_monitor: true, competitor_action: true,
    segment_create: true, segment_delete: true,
    template_edit: true, template_delete: true,
    staff_manage: true, staff_create: true,
    audit_view: true, settings_edit: true,
    cj_execute: true, cj_edit: true,
    vip_manage: true, kpi_edit: true,
    ab_test: true, journey_edit: true,
    export_csv: true, bigquery_settings: true,
  },
  editor: {
    push_send: true, push_settings: false,
    promo_post: true, promo_approve: false,
    sms_send: true, sms_settings: false,
    email_send: true, email_settings: false,
    sns_settings: false, telegram_settings: false,
    competitor_monitor: true, competitor_action: true,
    segment_create: true, segment_delete: false,
    template_edit: true, template_delete: false,
    staff_manage: false, staff_create: false,
    audit_view: true, settings_edit: false,
    cj_execute: false, cj_edit: true,
    vip_manage: true, kpi_edit: false,
    ab_test: true, journey_edit: true,
    export_csv: true, bigquery_settings: false,
  },
  viewer: {
    push_send: false, push_settings: false,
    promo_post: false, promo_approve: false,
    sms_send: false, sms_settings: false,
    email_send: false, email_settings: false,
    sns_settings: false, telegram_settings: false,
    competitor_monitor: true, competitor_action: false,
    segment_create: false, segment_delete: false,
    template_edit: false, template_delete: false,
    staff_manage: false, staff_create: false,
    audit_view: false, settings_edit: false,
    cj_execute: false, cj_edit: false,
    vip_manage: false, kpi_edit: false,
    ab_test: false, journey_edit: false,
    export_csv: false, bigquery_settings: false,
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT role, permissions FROM crm_permissions'
    ).all();

    if (results && results.length > 0) {
      const matrix: Record<string, any> = {};
      for (const row of results) {
        matrix[row.role as string] = JSON.parse(row.permissions as string);
      }
      return json({ permissions: matrix });
    }

    // Return defaults if no custom permissions stored
    return json({ permissions: DEFAULT_PERMISSIONS });
  } catch {
    // Table may not exist yet, return defaults
    return json({ permissions: DEFAULT_PERMISSIONS });
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const user = parseToken(context.request);
  if (!user) return json({ error: 'Unauthorized' }, 401);
  if (user.role !== 'admin') return json({ error: 'Admin only' }, 403);

  const body = await context.request.json() as any;
  const { permissions } = body;

  if (!permissions || typeof permissions !== 'object') {
    return json({ error: 'Invalid permissions data' }, 400);
  }

  try {
    for (const role of ['admin', 'editor', 'viewer']) {
      if (permissions[role]) {
        await context.env.DB.prepare(
          "INSERT OR REPLACE INTO crm_permissions (role, permissions, updated_at) VALUES (?, ?, datetime('now'))"
        ).bind(role, JSON.stringify(permissions[role])).run();
      }
    }

    // Audit log
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    const ip = context.request.headers.get('cf-connecting-ip') || 'unknown';
    await context.env.DB.prepare(
      "INSERT INTO crm_audit_log (id, staff_id, staff_name, action, target, details, ip) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(logId, user.id, user.name, 'update_permissions', 'permissions', 'Permission matrix updated', ip).run();

    return json({ success: true });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
