// Cloudflare Pages Function for SendGrid email sending

export interface Env {
  SENDGRID_API_KEY: string;
}

interface EmailRequest {
  to: string;
  subject?: string;
  template: string;
  customerName: string;
}

interface SendGridMessage {
  personalizations: Array<{
    to: Array<{ email: string }>;
    subject: string;
  }>;
  from: { email: string; name: string };
  content: Array<{
    type: string;
    value: string;
  }>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { to, subject, template, customerName }: EmailRequest = await context.request.json();

    // SendGrid API Key
    const apiKey = context.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'SendGrid API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // テンプレート別メール内容
    const templates = {
      welcome: {
        subject: '🎉 ようこそスロット天国へ！',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1e40af; font-size: 28px; margin: 0;">🎰 スロット天国</h1>
            </div>
            <h2 style="color: #1e40af;">ようこそ${customerName}様！</h2>
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              この度は、スロット天国にご登録いただき、誠にありがとうございます！
            </p>
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;">
              <h3 style="color: white; margin: 0 0 10px 0;">🎁 特別ボーナス準備完了！</h3>
              <p style="color: white; margin: 0; font-size: 14px;">今すぐプレイを開始して、豪華特典を受け取りましょう</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://getjp.co/NZXTxh" style="background: linear-gradient(45deg, #f59e0b, #d97706); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(217, 119, 6, 0.3);">
                🚀 今すぐボーナスを受け取る
              </a>
            </div>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #6b7280; font-size: 12px; text-align: center;">
              スロット天国 カスタマーサポート<br>
              support@slotenpromotion.com
            </p>
          </div>
        `
      },
      ftd_promotion: {
        subject: '🎯 【限定】初回入金で特別ボーナス獲得のチャンス！',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #dc2626; text-align: center;">🎯 ${customerName}様限定オファー！</h2>
            <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding: 20px; border-radius: 12px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <h3 style="color: #dc2626; margin: 0 0 15px 0;">まだ入金していない方へ特別オファー</h3>
              <ul style="color: #374151; padding-left: 20px; line-height: 1.8;">
                <li><strong>🎁 100%ボーナス</strong> - 最大¥50,000まで</li>
                <li><strong>🎰 フリースピン50回</strong> - 人気スロットで</li>
                <li><strong>⚡ 即時反映</strong> - 入金後すぐに利用可能</li>
                <li><strong>🎫 VIPクーポン</strong> - 次回利用可能</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://getjp.co/NZXTxh" style="background: linear-gradient(45deg, #dc2626, #b91c1c); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
                💰 今すぐ初回入金する
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              ※ オファーは期間限定です。お早めにご利用ください。
            </p>
          </div>
        `
      },
      sms_help: {
        subject: '📱 SMS認証でお困りですか？即座にサポートいたします',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #059669;">📱 ${customerName}様、SMS認証サポート</h2>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 12px; border-left: 4px solid #059669; margin: 20px 0;">
              <p style="color: #374151; margin: 0 0 15px 0; font-size: 16px;">
                SMS認証でお困りのようですね。<br>
                <strong>チャットサポート</strong>で即座に対応いたします！
              </p>
              <ul style="color: #374151; padding-left: 20px; line-height: 1.8;">
                <li>🕐 <strong>24時間対応</strong> - いつでもサポート</li>
                <li>💬 <strong>リアルタイムチャット</strong> - 即座回答</li>
                <li>🔧 <strong>技術サポート</strong> - 専門スタッフが対応</li>
                <li>📞 <strong>電話サポート</strong> - 必要に応じて</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://getjp.co/NZXTxh" style="background: linear-gradient(45deg, #059669, #047857); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                💬 チャットサポートを開く
              </a>
            </div>
            <p style="color: #6b7280; font-size: 13px; text-align: center;">
              問題解決まで、私たちがしっかりサポートいたします
            </p>
          </div>
        `
      }
    };

    const templateData = templates[template as keyof typeof templates] || templates.welcome;

    // SendGrid API Call
    const sendGridMessage: SendGridMessage = {
      personalizations: [
        {
          to: [{ email: to }],
          subject: subject || templateData.subject
        }
      ],
      from: {
        email: 'support@slotenpromotion.com',
        name: 'スロット天国 サポート'
      },
      content: [
        {
          type: 'text/html',
          value: templateData.html
        }
      ]
    };

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sendGridMessage)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SendGrid Error:', errorText);
      throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
    }

    // 送信履歴をログ（実際の実装では DB に保存）
    console.log(`Email sent successfully: ${to}, template: ${template}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent successfully',
      recipient: to,
      template: template,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to send email', 
      details: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};