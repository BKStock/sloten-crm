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
