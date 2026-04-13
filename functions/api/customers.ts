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
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { results } = await context.env.DB
    .prepare(
      `SELECT
        id,
        bq_user_id as bqUserId,
        name,
        nickname,
        email_raw as email,
        phone_raw as phone,
        segment,
        level,
        user_group_name as userGroupName,
        is_vip as isVip,
        deposit_amount as depositAmount,
        balance,
        rebate_balance as rebateBalance,
        total_bet_amount as totalBetAmount,
        withdraw_amount as withdrawalAmount,
        win_amount as winAmount,
        played_games as playedGamesRaw,
        ftd_count as ftdCount,
        ftd,
        first_deposit_date as firstDepositDate,
        registration_date as registrationDate,
        reg_at as regAt,
        last_login_date as lastLoginDate,
        login_at as loginAt,
        last_play_date as lastPlayDate,
        sms_auth_failed as smsAuthFailed,
        bet_history as betHistory,
        withdraw_history as withdrawHistory,
        deposit_count_tag as depositCountTag,
        bq_scraped_at as bqScrapedAt,
        last_synced_at as lastSyncedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM customers
      ORDER BY updated_at DESC, id DESC
      LIMIT 50000`
    )
    .all();

  // SQLite stores booleans as 0/1; normalize. Parse JSON columns.
  const customers = (results as any[]).map((r) => {
    let playedGames: string[] = [];
    if (r.playedGamesRaw) {
      try { playedGames = JSON.parse(r.playedGamesRaw); } catch { playedGames = []; }
    }
    return {
      ...r,
      ftd: Boolean(r.ftd),
      isVip: Boolean(r.isVip),
      smsAuthFailed: Boolean(r.smsAuthFailed),
      playedGames,
      playedGamesRaw: undefined
    };
  });

  return json({ customers });
};
