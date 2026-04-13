/**
 * BigQuery → D1 sync endpoint
 *
 * Authoritative source: Sloten BO (via BigQuery sloten_native.bo_user_list + aggregates).
 * POST body: { rows: BqRow[], authKey?: string }
 *
 * Keyed on bq_user_id (primary) with email_norm/phone_e164 as secondary match.
 * BO data OVERWRITES existing columns (BO is source of truth).
 * Only fields explicitly present in the row are updated.
 */
export interface Env {
  DB: D1Database;
  BQ_SYNC_KEY?: string;
}

type BqRow = {
  bqUserId: number | string;
  email?: string | null;
  phone?: string | null;
  nickname?: string | null;
  level?: number | null;
  userGroupName?: string | null;
  balance?: number | null;
  rebateBalance?: number | null;
  regAt?: string | null;
  loginAt?: string | null;
  lastPlayDate?: string | null;
  totalBetAmount?: number | null;
  winAmount?: number | null;
  playedGames?: string[] | null;
  depositAmount?: number | null;
  withdrawAmount?: number | null;
  ftdCount?: number | null;
  firstDepositDate?: string | null;
  depositCountTag?: string | null;
  isVip?: boolean | null;
  bqScrapedAt?: string | null;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Sync-Key'
    }
  });

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,X-Sync-Key'
    }
  });

const normalizeEmail = (email?: string | null) => {
  if (!email) return null;
  const v = email.trim().toLowerCase();
  return v || null;
};

const normalizePhone = (phone?: string | null) => {
  if (phone === null || phone === undefined) return null;
  const s = String(phone).trim();
  if (!s) return null;
  const cleaned = s.startsWith('+') ? '+' + s.slice(1).replace(/\D/g, '') : s.replace(/\D/g, '');
  if (!cleaned) return null;
  return cleaned.startsWith('+') ? cleaned : '+' + cleaned;
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Auth (optional)
  if (context.env.BQ_SYNC_KEY) {
    const key = context.request.headers.get('X-Sync-Key');
    if (key !== context.env.BQ_SYNC_KEY) return json({ error: 'unauthorized' }, 401);
  }

  const body = await context.request.json().catch(() => null) as null | { rows?: BqRow[] };
  if (!body?.rows || !Array.isArray(body.rows)) return json({ error: 'rows is required' }, 400);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const now = new Date().toISOString();

  try {
  for (const row of body.rows) {
    if (!row || row.bqUserId == null) {
      skipped++;
      continue;
    }
    // BO user IDs exceed JS Number.MAX_SAFE_INTEGER; D1 rejects BigInt binding,
    // so we bind as string and rely on SQLite INTEGER column affinity.
    const bqUserIdBig = String(row.bqUserId);
    if (!/^-?\d+$/.test(bqUserIdBig)) { skipped++; continue; }

    const email_raw = row.email || null;
    const phone_raw = row.phone != null ? String(row.phone) : null;
    const email_norm = normalizeEmail(email_raw);
    const phone_e164 = normalizePhone(phone_raw);
    const playedGamesJson = row.playedGames ? JSON.stringify(row.playedGames) : null;

    // Match priority: bq_user_id > email_norm > phone_e164
    let existing: any = await context.env.DB
      .prepare('SELECT id FROM customers WHERE bq_user_id = ? LIMIT 1')
      .bind(bqUserIdBig)
      .first();

    if (!existing && email_norm) {
      existing = await context.env.DB
        .prepare('SELECT id FROM customers WHERE email_norm = ? LIMIT 1')
        .bind(email_norm)
        .first();
    }
    if (!existing && phone_e164) {
      existing = await context.env.DB
        .prepare('SELECT id FROM customers WHERE phone_e164 = ? LIMIT 1')
        .bind(phone_e164)
        .first();
    }

    const values = [
      bqUserIdBig,
      row.nickname ?? null,
      email_raw,
      email_norm,
      phone_raw,
      phone_e164,
      row.level ?? null,
      row.userGroupName ?? null,
      Math.round(Number(row.balance ?? 0)),
      Math.round(Number(row.rebateBalance ?? 0)),
      row.regAt ?? null,
      row.loginAt ?? null,
      row.lastPlayDate ?? null,
      Math.round(Number(row.totalBetAmount ?? 0)),
      Math.round(Number(row.winAmount ?? 0)),
      playedGamesJson,
      Math.round(Number(row.depositAmount ?? 0)),
      Math.round(Number(row.withdrawAmount ?? 0)),
      Math.max(0, Math.round(Number(row.ftdCount ?? 0))),
      (row.ftdCount ?? 0) > 0 ? 1 : 0,
      row.firstDepositDate ?? null,
      row.depositCountTag ?? null,
      row.isVip ? 1 : 0,
      row.bqScrapedAt ?? null,
      now,
      // mirror reg/login to legacy columns
      row.regAt ?? null,
      row.loginAt ?? null
    ];

    if (existing?.id) {
      await context.env.DB
        .prepare(
          `UPDATE customers SET
            bq_user_id = ?,
            nickname = COALESCE(?, nickname),
            email_raw = COALESCE(?, email_raw),
            email_norm = COALESCE(?, email_norm),
            phone_raw = COALESCE(?, phone_raw),
            phone_e164 = COALESCE(?, phone_e164),
            level = COALESCE(?, level),
            user_group_name = COALESCE(?, user_group_name),
            balance = ?,
            rebate_balance = ?,
            reg_at = COALESCE(?, reg_at),
            login_at = COALESCE(?, login_at),
            last_play_date = COALESCE(?, last_play_date),
            total_bet_amount = ?,
            win_amount = ?,
            played_games = COALESCE(?, played_games),
            deposit_amount = ?,
            withdraw_amount = ?,
            ftd_count = ?,
            ftd = ?,
            first_deposit_date = COALESCE(?, first_deposit_date),
            deposit_count_tag = COALESCE(?, deposit_count_tag),
            is_vip = ?,
            bq_scraped_at = COALESCE(?, bq_scraped_at),
            last_synced_at = ?,
            registration_date = COALESCE(?, registration_date),
            last_login_date = COALESCE(?, last_login_date),
            updated_at = (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
          WHERE id = ?`
        )
        .bind(...values, existing.id)
        .run();
      updated++;
    } else {
      await context.env.DB
        .prepare(
          `INSERT INTO customers(
            bq_user_id, nickname, email_raw, email_norm, phone_raw, phone_e164,
            level, user_group_name, balance, rebate_balance,
            reg_at, login_at, last_play_date,
            total_bet_amount, win_amount, played_games,
            deposit_amount, withdraw_amount, ftd_count, ftd,
            first_deposit_date, deposit_count_tag, is_vip,
            bq_scraped_at, last_synced_at,
            registration_date, last_login_date
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(...values)
        .run();
      inserted++;
    }
  }
  } catch (e: any) {
    return json({ error: 'sync failed', message: String(e?.message || e), stack: String(e?.stack || '').slice(0, 1000), inserted, updated, skipped }, 500);
  }

  return json({ ok: true, inserted, updated, skipped, errors, syncedAt: now });
};
