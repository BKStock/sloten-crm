export interface Env {
  DB: D1Database;
}

type CustomerRow = {
  name?: string;
  email?: string;
  phone?: string;
  segment?: string;
  depositAmount?: number;
  registrationDate?: string;
  lastLoginDate?: string;
  ftd?: boolean;
  smsAuthFailed?: boolean;
  betHistory?: number;
  withdrawHistory?: number;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

const normalizeEmail = (email?: string | null) => {
  if (!email) return null;
  const v = email.trim().toLowerCase();
  if (!v) return null;
  return v;
};

// Minimal E.164-ish normalizer (assumes input already mostly +..)
const normalizePhoneE164 = (phone?: string | null) => {
  if (!phone) return null;
  const v = phone.trim();
  if (!v) return null;
  // keep leading +, digits only
  const cleaned = v.startsWith('+')
    ? '+' + v.slice(1).replace(/\D/g, '')
    : v.replace(/\D/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
};

const coalesceUpdate = (newVal: any, oldVal: any) => {
  // Do not overwrite with null/empty string
  if (newVal === undefined || newVal === null) return oldVal;
  if (typeof newVal === 'string' && newVal.trim() === '') return oldVal;
  return newVal;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json().catch(() => null) as null | {
      sourceFile?: string;
      rows?: CustomerRow[];
    };

    if (!body?.rows || !Array.isArray(body.rows)) {
      return json({ error: 'rows is required' }, 400);
    }

    const sourceFile = body.sourceFile || 'upload';

    let inserted = 0;
    let updated = 0;
    let conflicted = 0;

    // Process sequentially (avoid large batches in one SQL for now)
    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i] || {};
      const email_raw = row.email?.trim() || null;
      const phone_raw = row.phone?.trim() || null;
      const email_norm = normalizeEmail(email_raw);
      const phone_e164 = normalizePhoneE164(phone_raw);

      // Find by email then phone
      const byEmail = email_norm
        ? await context.env.DB.prepare('SELECT * FROM customers WHERE email_norm = ? LIMIT 1').bind(email_norm).first()
        : null;
      const byPhone = !byEmail && phone_e164
        ? await context.env.DB.prepare('SELECT * FROM customers WHERE phone_e164 = ? LIMIT 1').bind(phone_e164).first()
        : null;

      // Detect collision: email matches one user, phone matches another
      if (email_norm && phone_e164) {
        const e = await context.env.DB.prepare('SELECT id FROM customers WHERE email_norm = ? LIMIT 1').bind(email_norm).first();
        const p = await context.env.DB.prepare('SELECT id FROM customers WHERE phone_e164 = ? LIMIT 1').bind(phone_e164).first();
        if (e?.id && p?.id && e.id !== p.id) {
          conflicted++;
          await context.env.DB.prepare(
            'INSERT INTO import_conflicts(source_file,row_number,email_norm,phone_e164,reason,payload_json) VALUES (?,?,?,?,?,?)'
          ).bind(sourceFile, i + 1, email_norm, phone_e164, 'EMAIL_PHONE_POINT_TO_DIFFERENT_USERS', JSON.stringify(row)).run();
          continue;
        }
      }

      const existing = byEmail || byPhone;

      if (existing?.id) {
        // Update: keep old values when CSV value is empty
        const next = {
          name: coalesceUpdate(row.name, existing.name),
          segment: coalesceUpdate(row.segment, existing.segment),
          deposit_amount: coalesceUpdate(row.depositAmount, existing.deposit_amount),
          registration_date: coalesceUpdate(row.registrationDate, existing.registration_date),
          last_login_date: coalesceUpdate(row.lastLoginDate, existing.last_login_date),
          ftd: coalesceUpdate(row.ftd === undefined ? undefined : (row.ftd ? 1 : 0), existing.ftd),
          sms_auth_failed: coalesceUpdate(row.smsAuthFailed === undefined ? undefined : (row.smsAuthFailed ? 1 : 0), existing.sms_auth_failed),
          bet_history: coalesceUpdate(row.betHistory, existing.bet_history),
          withdraw_history: coalesceUpdate(row.withdrawHistory, existing.withdraw_history),
          email_raw: coalesceUpdate(email_raw, existing.email_raw),
          email_norm: coalesceUpdate(email_norm, existing.email_norm),
          phone_raw: coalesceUpdate(phone_raw, existing.phone_raw),
          phone_e164: coalesceUpdate(phone_e164, existing.phone_e164)
        };

        await context.env.DB.prepare(
          `UPDATE customers SET
            name = ?,
            segment = ?,
            deposit_amount = ?,
            registration_date = ?,
            last_login_date = ?,
            ftd = ?,
            sms_auth_failed = ?,
            bet_history = ?,
            withdraw_history = ?,
            email_raw = ?,
            email_norm = ?,
            phone_raw = ?,
            phone_e164 = ?,
            updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
          WHERE id = ?`
        )
          .bind(
            next.name,
            next.segment,
            Number(next.deposit_amount || 0),
            next.registration_date,
            next.last_login_date,
            Number(next.ftd || 0),
            Number(next.sms_auth_failed || 0),
            Number(next.bet_history || 0),
            Number(next.withdraw_history || 0),
            next.email_raw,
            next.email_norm,
            next.phone_raw,
            next.phone_e164,
            existing.id
          )
          .run();
        updated++;
      } else {
        // Insert new
        try {
          await context.env.DB.prepare(
            `INSERT INTO customers(
              name, email_raw, email_norm, phone_raw, phone_e164, segment,
              deposit_amount, registration_date, last_login_date, ftd, sms_auth_failed,
              bet_history, withdraw_history
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
          )
            .bind(
              row.name || null,
              email_raw,
              email_norm,
              phone_raw,
              phone_e164,
              row.segment || null,
              Number(row.depositAmount || 0),
              row.registrationDate || null,
              row.lastLoginDate || null,
              row.ftd ? 1 : 0,
              row.smsAuthFailed ? 1 : 0,
              Number(row.betHistory || 0),
              Number(row.withdrawHistory || 0)
            )
            .run();
          inserted++;
        } catch (e: any) {
          conflicted++;
          await context.env.DB.prepare(
            'INSERT INTO import_conflicts(source_file,row_number,email_norm,phone_e164,reason,payload_json) VALUES (?,?,?,?,?,?)'
          ).bind(sourceFile, i + 1, email_norm, phone_e164, 'UNIQUE_CONSTRAINT_OR_OTHER', JSON.stringify({ row, error: String(e?.message || e) })).run();
        }
      }
    }

    return json({ ok: true, inserted, updated, conflicted });
  } catch (e: any) {
    return json({ error: 'import failed', details: String(e?.message || e) }, 500);
  }
};
