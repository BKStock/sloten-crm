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
  try {
    await context.env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_staff (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'viewer', is_active INTEGER DEFAULT 1, last_login TEXT, created_at TEXT DEFAULT (datetime('now')))").run();

    await context.env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_audit_log (id TEXT PRIMARY KEY, staff_id TEXT, staff_name TEXT, action TEXT NOT NULL, target TEXT, details TEXT, ip TEXT, created_at TEXT DEFAULT (datetime('now')))").run();

    await context.env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_shared_data (id TEXT PRIMARY KEY, type TEXT NOT NULL, data TEXT NOT NULL, created_by TEXT, created_at TEXT DEFAULT (datetime('now')))").run();

    await context.env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_permissions (role TEXT PRIMARY KEY, permissions TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))").run();

    await context.env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_approvals (id TEXT PRIMARY KEY, action_type TEXT NOT NULL, action_data TEXT NOT NULL, requester_id TEXT NOT NULL, requester_name TEXT, status TEXT DEFAULT 'pending', reviewer_id TEXT, reviewer_name TEXT, review_note TEXT, created_at TEXT DEFAULT (datetime('now')), reviewed_at TEXT)").run();

    // Seed default permissions
    const defaultPermissions: Record<string, Record<string, boolean>> = {
      admin: {
        push_send: true, push_settings: true, promo_post: true, promo_approve: true,
        sms_send: true, sms_settings: true, email_send: true, email_settings: true,
        sns_settings: true, telegram_settings: true, competitor_monitor: true, competitor_action: true,
        segment_create: true, segment_delete: true, template_edit: true, template_delete: true,
        staff_manage: true, staff_create: true, audit_view: true, settings_edit: true,
        cj_execute: true, cj_edit: true, vip_manage: true, kpi_edit: true,
        ab_test: true, journey_edit: true, export_csv: true, bigquery_settings: true,
      },
      editor: {
        push_send: true, push_settings: false, promo_post: true, promo_approve: false,
        sms_send: true, sms_settings: false, email_send: true, email_settings: false,
        sns_settings: false, telegram_settings: false, competitor_monitor: true, competitor_action: true,
        segment_create: true, segment_delete: false, template_edit: true, template_delete: false,
        staff_manage: false, staff_create: false, audit_view: true, settings_edit: false,
        cj_execute: false, cj_edit: true, vip_manage: true, kpi_edit: false,
        ab_test: true, journey_edit: true, export_csv: true, bigquery_settings: false,
      },
      viewer: {
        push_send: false, push_settings: false, promo_post: false, promo_approve: false,
        sms_send: false, sms_settings: false, email_send: false, email_settings: false,
        sns_settings: false, telegram_settings: false, competitor_monitor: true, competitor_action: false,
        segment_create: false, segment_delete: false, template_edit: false, template_delete: false,
        staff_manage: false, staff_create: false, audit_view: false, settings_edit: false,
        cj_execute: false, cj_edit: false, vip_manage: false, kpi_edit: false,
        ab_test: false, journey_edit: false, export_csv: false, bigquery_settings: false,
      }
    };

    for (const role of ['admin', 'editor', 'viewer']) {
      await context.env.DB.prepare(
        "INSERT OR IGNORE INTO crm_permissions (role, permissions) VALUES (?, ?)"
      ).bind(role, JSON.stringify(defaultPermissions[role])).run();
    }

    // Default users
    await context.env.DB.prepare(
      "INSERT OR IGNORE INTO crm_staff (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)"
    ).bind('staff_1', 'admin@sloten.io', 'Admin', 'sloten2026', 'admin').run();

    await context.env.DB.prepare(
      "INSERT OR IGNORE INTO crm_staff (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)"
    ).bind('staff_2', 'support@sloten.io', 'Support', 'support2026', 'editor').run();

    return json({ success: true, message: 'Auth tables created and seeded' });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
};
