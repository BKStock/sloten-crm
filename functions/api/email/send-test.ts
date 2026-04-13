/**
 * POST /api/email/send-test
 *
 * Sends a dry-run test email for a CJ task. The CJ task HTML is either:
 *   (1) fetched from task.url (promo-factory.pages.dev) and sent as raw HTML, or
 *   (2) referenced via a pre-registered SendGrid dynamic template_id.
 *
 * Body: { taskId: "P20", to: "koni.tanaka@gmail.com" }
 */
export interface Env {
  SENDGRID_API_KEY?: string;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });

// DISABLED FOR TESTING - DO NOT SEND REAL EMAILS
const SENDGRID_KEY_FALLBACK = 'DISABLED_FOR_TESTING';
const CJ_URL = 'https://metabase.slotenpromotion.com/cj-results.json';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json().catch(() => null) as null | {
    taskId?: string;
    to?: string;
  };

  if (!body?.taskId) return json({ error: 'taskId is required' }, 400);
  const to = body.to || 'koni.tanaka@gmail.com';

  // Fetch cj-results.json to resolve task details
  let cj: any;
  try {
    const res = await fetch(CJ_URL, { headers: { 'User-Agent': 'sloten-crm/1.0' } });
    cj = await res.json();
  } catch (e) {
    return json({ error: 'failed to fetch cj-results.json' }, 502);
  }

  const task = (cj.tasks || []).find((t: any) => t.id === body.taskId);
  if (!task) return json({ error: `task ${body.taskId} not found` }, 404);

  // Fetch HTML from task.url
  let html: string;
  try {
    const r = await fetch(task.url, { redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    html = await r.text();
  } catch (e: any) {
    return json({ error: `failed to fetch template: ${e.message}` }, 502);
  }

  const apiKey = context.env.SENDGRID_API_KEY || SENDGRID_KEY_FALLBACK;
  const subject = `【スロット天国】${task.name} - ${task.desc}`;

  const payload = {
    personalizations: [
      {
        to: [{ email: to }],
        subject,
      },
    ],
    from: { email: 'noreply@sloten.promo', name: 'スロット天国' },
    reply_to: { email: 'noreply@sloten.promo', name: 'スロット天国サポート' },
    content: [{ type: 'text/html', value: html }],
    tracking_settings: {
      click_tracking: { enable: true },
      open_tracking: { enable: true },
    },
    categories: ['sloten-crm', 'cj-test', `CJ-${task.id}`],
  };

  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (sgRes.status === 202) {
    return json({
      ok: true,
      message: `送信成功: ${task.id} ${task.name} → ${to}`,
      taskId: task.id,
      subject,
    });
  }

  const errorText = await sgRes.text();
  return json(
    {
      error: `SendGrid error ${sgRes.status}`,
      details: errorText.slice(0, 500),
    },
    sgRes.status,
  );
};
