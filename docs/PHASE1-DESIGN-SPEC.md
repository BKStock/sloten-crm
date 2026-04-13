# Sloten CRM Phase 1 設計書
**文書番号:** SLT-DS-001
**版数:** 1.0
**作成日:** 2026年4月13日
**ステータス:** 承認待ち

---

## 1. 文書概要

### 1.1 目的
本設計書は、Sloten CRM Phase 1（自社サービス即組込み）の技術設計を定義する。
本書に基づき、任意の開発者がPhase 1の実装・テスト・デプロイを遂行できることを目的とする。

### 1.2 対象範囲
- Phase 1（28日間 / Sprint 4回）の全機能
- スロット天国（既存カジノサイト）への組込み
- SMS / メール / Push通知の自動配信基盤
- CJタスク45本 + NBAエンジン v0.1

### 1.3 対象外
- マルチテナント化（Phase 2）
- ビジュアルジャーニーエディタ（Phase 2）
- Stripe課金（Phase 2）
- Gamification（Phase 2）
- AI/ML予測モデル（Phase 3）

### 1.4 前提条件
- スロット天国が稼働中であること
- BigQuery VPS APIが利用可能であること
- Laaffic / SendGrid のAPIキーが取得済みであること

### 1.5 用語定義

| 用語 | 定義 |
|---|---|
| CJ | Customer Journey（カスタマージャーニー） |
| NBA | Next Best Action（次の最適アクション提案） |
| RFM | Recency / Frequency / Monetary の行動スコア |
| LTV | Life Time Value（顧客生涯価値） |
| RG | Responsible Gambling（責任あるギャンブル） |
| FTD | First Time Deposit（初回入金） |
| GGR | Gross Gaming Revenue（総ゲーミング収益） |

---

## 2. システム構成

### 2.1 全体アーキテクチャ

```
┌──────────────────────────────────────────────────────────────┐
│                        利用者（CRM担当者）                     │
│                     https://sloten-crm.pages.dev              │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                   Cloudflare Pages                            │
│               既存フロントエンド（index.html）                  │
│               + 既存API（/api/*）互換維持                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                   Supabase（新規）                             │
│  ┌─────────────┐ ┌───────────────┐ ┌──────────────────────┐ │
│  │   Auth       │ │ PostgreSQL    │ │  Edge Functions      │ │
│  │ （認証/RLS） │ │ （7テーブル）  │ │ （10 Functions）     │ │
│  └─────────────┘ └───────────────┘ └──────────────────────┘ │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐
│ スロット天国  │  │  BigQuery    │  │    外部サービス       │
│ （カジノ）    │  │ （VPS API）  │  │ Laaffic / SendGrid  │
│  Webhook送信  │  │  データソース │  │ / OneSignal          │
└──────────────┘  └──────────────┘  └──────────────────────┘
```

### 2.2 技術スタック

| レイヤー | 技術 | バージョン | 選定理由 |
|---|---|---|---|
| フロントエンド | 既存HTML（Cloudflare Pages） | — | Phase 1では変更なし |
| バックエンド | Supabase Edge Functions | Deno | サーバーレス + DB統合 |
| データベース | PostgreSQL（Supabase） | 15+ | ネイティブRLS + JSONB |
| 認証 | Supabase Auth | — | DB統合 + MFA対応 |
| SMS | Laaffic API | — | iGaming特化 |
| メール | SendGrid API | v3 | 既存継続 |
| プッシュ | OneSignal API | — | 無料枠 + セグメント |
| データソース | BigQuery（VPS API経由） | — | 既存継続 |
| ホスティング | Cloudflare Pages | — | 既存継続 |
| CI/CD | GitHub Actions | — | 新規構築 |
| バージョン管理 | GitHub（Private） | — | — |

### 2.3 既存システムとの互換性

| 既存コンポーネント | Phase 1での扱い |
|---|---|
| index.html（132KB） | **そのまま維持**。機能追加はHTMLに追記 |
| /api/customers（GET） | **互換維持**。Supabase経由に段階移行 |
| /api/send-email（POST） | **互換維持**。並行稼働 |
| /api/customers/bq-sync（POST） | **互換維持**。Supabase版を新規追加 |
| /api/customers/import（POST） | **互換維持** |
| /api/email/send-test（POST） | **互換維持** |
| Cloudflare D1 | **読み取り継続**。書き込みはSupabaseに移行 |
| BigQuery VPS API | **そのまま維持** |
| cj_sendgrid_templates.json | **tasks.jsonに統合** |

---

## 3. データベース設計

### 3.1 ER図（概要）

```
tenants ──1:N── customers
tenants ──1:N── cj_tasks
tenants ──1:N── notification_logs
tenants ──1:N── rfm_scores
tenants ──1:N── ltv_calculations
tenants ──1:N── audit_logs
tenants ──1:N── rg_alerts

customers ──1:N── notification_logs
customers ──1:1── rfm_scores
customers ──1:1── ltv_calculations
cj_tasks  ──1:N── notification_logs
```

### 3.2 テーブル定義

#### 3.2.1 tenants（テナント）

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| name | TEXT | NOT NULL | — | テナント名 |
| slug | TEXT | NOT NULL | — | URLスラッグ（UNIQUE） |
| plan | TEXT | NOT NULL | 'internal' | プラン種別 |
| status | TEXT | NOT NULL | 'active' | active/suspended |
| settings | JSONB | NOT NULL | '{}' | テナント設定 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NOT NULL | NOW() | 更新日時 |

**初期データ:**
```sql
INSERT INTO tenants (name, slug, plan)
VALUES ('スロット天国', 'sloten', 'internal');
```

#### 3.2.2 customers（顧客）— 既存拡張

既存カラム（30+フィールド）に以下を追加：

| 追加カラム | 型 | 説明 |
|---|---|---|
| tenant_id | UUID FK | テナント参照（NOT NULL） |

**RLSポリシー:**
```sql
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = auth.jwt()->>'tid');
```

**インデックス:**
```sql
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_tenant_vip ON customers(tenant_id, is_vip);
CREATE INDEX idx_customers_tenant_login ON customers(tenant_id, last_login_date);
CREATE INDEX idx_customers_tenant_segment ON customers(tenant_id, segment);
```

#### 3.2.3 cj_tasks（CJタスク）

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| tenant_id | UUID FK | NOT NULL | — | テナント参照 |
| task_id | TEXT | NOT NULL | — | タスクID（P1, P2等） |
| name | TEXT | NOT NULL | — | タスク名 |
| description | TEXT | NULL | — | 説明 |
| trigger_condition | JSONB | NOT NULL | — | トリガー条件 |
| channel | TEXT | NOT NULL | — | sms/email/push/multi |
| template_id | TEXT | NULL | — | SendGridテンプレートID |
| priority | INTEGER | NOT NULL | 50 | 優先度（低い=高優先） |
| cooldown_hours | INTEGER | NOT NULL | 168 | 再送信禁止期間 |
| is_active | BOOLEAN | NOT NULL | true | 有効/無効 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

**UNIQUE制約:** (tenant_id, task_id)

**trigger_condition JSONスキーマ:**
```json
{
  "conditions": [
    {
      "field": "is_vip",
      "operator": "eq|neq|gt|gte|lt|lte|in|between",
      "value": true
    },
    {
      "field": "days_since_login",
      "operator": "gte",
      "value": 5
    }
  ],
  "logic": "AND|OR"
}
```

#### 3.2.4 notification_logs（送信ログ）

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| tenant_id | UUID FK | NOT NULL | — | テナント参照 |
| customer_id | INTEGER | NOT NULL | — | 顧客ID |
| cj_task_id | TEXT | NULL | — | CJタスクID |
| channel | TEXT | NOT NULL | — | sms/email/push |
| provider | TEXT | NOT NULL | — | laaffic/sendgrid/onesignal |
| status | TEXT | NOT NULL | 'queued' | queued/sent/delivered/failed/bounced |
| external_id | TEXT | NULL | — | プロバイダー側の送信ID |
| template_id | TEXT | NULL | — | テンプレートID |
| message_preview | TEXT | NULL | — | 送信内容プレビュー（先頭100文字） |
| cost_usd | DECIMAL(10,6) | NULL | — | 送信コスト |
| error_message | TEXT | NULL | — | エラー詳細 |
| sent_at | TIMESTAMPTZ | NULL | — | 送信日時 |
| delivered_at | TIMESTAMPTZ | NULL | — | 到達日時 |
| opened_at | TIMESTAMPTZ | NULL | — | 開封日時 |
| clicked_at | TIMESTAMPTZ | NULL | — | クリック日時 |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 作成日時 |

#### 3.2.5 rfm_scores（RFMスコア）

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| tenant_id | UUID FK | NOT NULL | — | テナント参照 |
| customer_id | INTEGER | NOT NULL | — | 顧客ID |
| recency_days | INTEGER | NULL | — | 最終ログインからの日数 |
| frequency_30d | INTEGER | NULL | — | 過去30日セッション数 |
| monetary_90d | DECIMAL(12,2) | NULL | — | 過去90日GGR |
| r_score | INTEGER | NOT NULL | — | 1-5 |
| f_score | INTEGER | NOT NULL | — | 1-5 |
| m_score | INTEGER | NOT NULL | — | 1-5 |
| rfm_total | DECIMAL(3,1) | NOT NULL | — | R×0.3 + F×0.3 + M×0.4 |
| segment | TEXT | NOT NULL | — | VIP/HighRegular/Regular/AtRisk/Dormant/New |
| calculated_at | TIMESTAMPTZ | NOT NULL | NOW() | 算出日時 |

**UNIQUE制約:** (tenant_id, customer_id)

**セグメント判定ロジック:**
```
RFM ≥ 4.0 → VIP
3.5 - 3.9 → HighRegular
2.5 - 3.4 → Regular
1.5 - 2.4 → AtRisk
1.0 - 1.4 → Dormant
登録7日以内 → New
```

#### 3.2.6 ltv_calculations（LTV計算）

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| tenant_id | UUID FK | NOT NULL | — | テナント参照 |
| customer_id | INTEGER | NOT NULL | — | 顧客ID |
| historical_ltv | DECIMAL(12,2) | NULL | — | 過去実績LTV |
| predicted_ltv | DECIMAL(12,2) | NULL | — | 予測LTV |
| churn_probability | DECIMAL(5,4) | NULL | — | 離脱確率 0.0000-1.0000 |
| ltv_segment | TEXT | NOT NULL | — | high/medium/low |
| rfm_multiplier | DECIMAL(3,1) | NULL | — | RFM補正係数 |
| calculated_at | TIMESTAMPTZ | NOT NULL | NOW() | 算出日時 |

**UNIQUE制約:** (tenant_id, customer_id)

**LTV算出式:**
```
historical_ltv = Σ(月次GGR) - Σ(ボーナスコスト)
predicted_ltv = (月次平均GGR / churn_rate) × rfm_multiplier
churn_probability = 1 - (直近30日アクティブ日数 / 30)
```

#### 3.2.7 audit_logs（監査ログ）

| カラム | 型 | NULL | デフォルト | 説明 |
|---|---|---|---|---|
| id | UUID | NOT NULL | gen_random_uuid() | PK |
| tenant_id | UUID FK | NOT NULL | — | テナント参照 |
| user_id | UUID | NULL | — | 操作者ID |
| action | TEXT | NOT NULL | — | create/update/delete/send/login等 |
| resource_type | TEXT | NOT NULL | — | customer/cj_task/notification等 |
| resource_id | TEXT | NULL | — | 対象リソースID |
| details | JSONB | NOT NULL | '{}' | 変更内容 |
| ip_address | INET | NULL | — | 操作者IP |
| created_at | TIMESTAMPTZ | NOT NULL | NOW() | 操作日時 |

**保持期間:** 365日（日次バッチで古いログをアーカイブ）

---

## 4. 外部サービス連携設計

### 4.1 Laaffic SMS

| 項目 | 値 |
|---|---|
| API Base URL | https://api.laaffic.com/v1 |
| 認証方式 | API Key + API Secret（ヘッダー） |
| Application ID | Ib1IdTVc |
| 送信制限 | 自社Phase: 100通/日上限（段階拡大） |
| 文字コード | UTF-8 |
| 送達レポート | Webhook受信（POST /api/callbacks/laaffic） |

**送信フロー:**
```
CJエンジン → notification_logs(queued) → send-sms Function
→ Laaffic API → 送達Webhook → notification_logs(delivered)
```

**オプトアウト処理:**
```
顧客がSTOPと返信 → Laaffic Webhook → customers.sms_opt_out = true
→ 以降のSMS送信を自動スキップ
```

### 4.2 SendGrid メール

| 項目 | 値 |
|---|---|
| API Version | v3 |
| 送信元 | support@slotenpromotion.com |
| 送信元名 | スロット天国 サポート |
| テンプレート | Dynamic Templates（既存25テンプレ + 新規20） |
| 配信追跡 | Event Webhook（open/click/bounce/unsubscribe） |

**認証設定（必須）:**
```
SPF: v=spf1 include:sendgrid.net ~all
DKIM: SendGrid自動生成CNAME
DMARC: v=DMARC1; p=none; rua=mailto:dmarc@sloten.com（Phase 1）
```

### 4.3 OneSignal プッシュ

| 項目 | 値 |
|---|---|
| 対象 | Web Push（Chrome/Firefox/Safari） |
| セグメント | VIP / 休眠 / 高額入金者 / CSV Import |
| リッチ通知 | 画像 + ボタン対応 |
| 配信追跡 | OneSignal Dashboard + API取得 |

### 4.4 BigQuery（既存維持）

| 項目 | 値 |
|---|---|
| 接続方式 | VPS API経由（既存） |
| 同期頻度 | 日次 03:00 JST |
| 取得データ | 全プレイヤーの日次統計 |
| Phase 1対応 | tenant_idカラム付与してSupabaseに書き込み |

---

## 5. Edge Functions 設計

### 5.1 一覧

| # | Function名 | トリガー | 説明 |
|---|---|---|---|
| 1 | webhook-casino | HTTP POST | カジノからのWebhook受信 |
| 2 | cj-engine | Cron（毎日10:00 JST） | CJタスク評価+送信キュー投入 |
| 3 | nba-engine | Cron（毎日11:00 JST） | NBA提案生成 |
| 4 | send-sms | キュー消費 | Laaffic API呼出し |
| 5 | send-email | キュー消費 | SendGrid API呼出し |
| 6 | send-push | キュー消費 | OneSignal API呼出し |
| 7 | bq-sync | Cron（毎日03:00 JST） | BigQuery→Supabase同期 |
| 8 | rfm-calculate | Cron（毎日04:00 JST） | RFMスコア算出 |
| 9 | ltv-calculate | Cron（毎日05:00 JST） | LTV算出 |
| 10 | rg-check | Cron（毎日06:00 JST） | RGチェック |

### 5.2 cj-engine（CJエンジン）処理フロー

```
1. cj_tasksテーブルから is_active=true のタスクを全取得
2. 各タスクについて:
   a. trigger_condition を解析
   b. customersテーブルに対してSQLクエリ生成・実行
   c. 対象ユーザーリスト取得
   d. 重複排除:
      - notification_logsで直近cooldown_hours以内に同タスク送信済み→除外
      - 本日の送信数が2通以上→除外
   e. RGチェック:
      - customers.self_excluded = true → 除外
      - 月間損失 > $500 かつ rg_alert未送信 → rg-checkに委譲
   f. チャネル選択:
      - channel='sms' → send-sms キュー投入
      - channel='email' → send-email キュー投入
      - channel='push' → send-push キュー投入
      - channel='multi' → 全チャネル投入
   g. notification_logs にstatus='queued'で記録
   h. audit_logs に実行記録
3. 完了サマリーをログ出力
```

**ドライランモード:**
```
環境変数 CJ_DRYRUN=true の場合:
  - 全処理を実行するが、実際の送信（Step 2f）をスキップ
  - notification_logs に status='dryrun' で記録
  - ダッシュボードに「ドライランモード」表示
```

### 5.3 nba-engine（NBAエンジン v0.1）処理フロー

```
Phase 1 ルール（5本）:

Rule 1: DORMANT_VIP_RECOVERY
  IF days_since_login >= 7 AND rfm_segment IN ('VIP', 'HighRegular')
  THEN → SMS: VIP専用復活オファー

Rule 2: DEPOSIT_FAILED_RECOVERY
  IF deposit_failed_event (最新) AND retry_count < 3
  THEN → Email: 代替決済案内（15分後送信）

Rule 3: BONUS_EXPIRY_REMINDER
  IF bonus_expiry < 48h AND bonus_balance > 0
  THEN → Push: ボーナス消化リマインド

Rule 4: VIP_THRESHOLD_HIT
  IF cumulative_deposit が閾値突破（直近24h）
  THEN → SMS + Email: VIP昇格通知

Rule 5: FTD_WELCOME_SEQUENCE
  IF first_deposit = true（直近24h）
  THEN → Email: ウェルカムシーケンス開始
```

### 5.4 webhook-casino 受信設計

**エンドポイント:** `POST /functions/v1/webhook-casino`

**署名検証:**
```typescript
const signature = request.headers.get('X-Casino-Signature');
const timestamp = request.headers.get('X-Casino-Timestamp');
const body = await request.text();
const expected = HMAC_SHA256(secret, `${timestamp}.${body}`);
if (signature !== expected) return new Response('Unauthorized', { status: 401 });
```

**冪等性:**
```
event_id をユニークキーとして保存
重複event_id → 200を返すが処理スキップ
```

**Phase 1 対応イベント（10種）:**

| # | イベント | 処理内容 |
|---|---|---|
| 1 | player.registered | customers INSERT |
| 2 | kyc.approved | customers UPDATE + CJトリガー |
| 3 | deposit.completed | customers UPDATE + FTD判定 |
| 4 | deposit.failed | CJトリガー（入金失敗リカバリー） |
| 5 | game.session_ended | customers UPDATE（プレイ統計） |
| 6 | withdrawal.completed | customers UPDATE |
| 7 | session.login | customers UPDATE（lastLoginDate） |
| 8 | player.self_excluded | customers UPDATE + **全CJ即時停止** |
| 9 | bonus.claimed | customers UPDATE |
| 10 | player.limit_set | customers UPDATE + RGログ記録 |

---

## 6. CJタスク定義（45本）

### 6.1 タスク一覧

| ID | 名前 | トリガー条件 | チャネル | 優先度 |
|---|---|---|---|---|
| P0 | 登録完了メール | 新規登録時 | email | 5 |
| P1 | 赤アラート | VIP+5日未ログイン | sms | 10 |
| P2 | オレンジアラート | 3日未ログイン+BET50%減 | email | 15 |
| P3 | 大負け後フォロー | 前日GGR -5万以上 | email | 20 |
| P4 | FTDおめでとう | FTD直後 | multi | 5 |
| P5 | FTDフォロー | FTD+1日 | email | 10 |
| P6 | ステップ訴求 | FTD+3日 ステップ未参加 | email | 15 |
| P6.5 | ステップ2リマインド | FTD+6日 ステップ2未実施 | email | 20 |
| P6.6 | ステップ3訴求 | 入金2回 HS6000プラン | email | 20 |
| P7 | FTD特別(出金なし) | FTD+7日 出金なし | email | 20 |
| P8 | FTD特別(出金あり) | FTD+7日 出金あり | email | 20 |
| P9 | NDBリマインド | 登録+1日 NDB未使用 | email | 15 |
| P9.5 | 決済方法案内 | 登録2日目+未入金 | email | 15 |
| P10 | 48h限定ボーナス | 登録+2日 | email | 15 |
| P11 | ステップアップHS | 登録+3日 | email | 20 |
| P11.5 | ステップアップR1 | 登録5日目+未入金 | email | 20 |
| P11.6 | ステップアップR2 | 登録7日目+未入金 | email | 20 |
| P12 | NDB最終リマインド | 登録+5日 | email | 15 |
| P12.5 | 最終特別オファー | 21日経過+未入金 | email | 25 |
| P13 | NDB消滅リマインド | 有効期限2日前 | email | 10 |
| P14 | コンビニ入金案内 | 3回以上入金者 | email | 25 |
| P15 | VIPランクアップ | VIPレベル上昇時 | multi | 5 |
| P15.5 | VIPランクUP(2回目+) | VIPレベル3+上昇時 | multi | 10 |
| P16 | 誕生日(高) | GGR 100万+ | email | 15 |
| P17 | 誕生日(中) | GGR 30万〜100万 | email | 15 |
| P18 | 誕生日(低) | GGR 30万未満 | email | 20 |
| P19 | 友達紹介 | 月1回ローテ | email | 30 |
| P20 | 連続7日 | 7日連続ベット | email | 25 |
| P21 | 連続15日 | 15日連続ベット | email | 25 |
| P22 | 連続30日 | 30日連続ベット | email | 25 |
| P23 | 黄色アラート | BET頻度50%減 | email | 15 |
| P24 | 7日休眠 | 7日BETなし | sms | 15 |
| P25 | 14日休眠 | 14日BETなし | multi | 10 |
| P26 | 30日休眠 | 30日BETなし | multi | 10 |
| P-SMS | 番号認証 | SMS未認証ユーザー | sms | 5 |
| P36 | ゲームセッション離脱検知 | 途中離脱 | push | 20 |
| P37 | 連続負け検知 | 3回以上連続負け | email | 15 |
| P38 | 月次プレイサマリー | 月初 | email | 30 |
| P39 | 誕生日特典自動配布 | 誕生日当日 | multi | 10 |
| P40 | 出金完了フォロー | 出金完了後3日 | email | 20 |
| P41 | 新ゲームリリース通知 | 新ゲーム追加時 | push | 25 |
| P42 | ボーナス有効期限リマインド | 期限48h前 | push | 10 |
| P43 | KYC未完了ナッジ | 30日経過+KYC未完了 | sms | 15 |
| P44 | リファラル招待促進 | 月1回 | email | 30 |
| P45 | RG月次確認 | 月間損失$500超 | email | 5 |

---

## 7. 非機能要件

### 7.1 性能要件

| 項目 | 要件 |
|---|---|
| CJエンジン処理時間 | 35,000ユーザー判定を5分以内 |
| Webhook応答時間 | 200ms以内（ACK返却） |
| SMS送信速度 | 100通/分（Laaffic上限に準拠） |
| メール送信速度 | 1,000通/分（SendGrid上限に準拠） |
| ダッシュボード表示 | 3秒以内 |

### 7.2 可用性

| 項目 | 要件 |
|---|---|
| 稼働率 | 99.5%（Phase 1、自社利用） |
| バックアップ | Supabase日次自動バックアップ |
| リカバリ | RPO: 24時間 / RTO: 4時間 |

### 7.3 セキュリティ

| 項目 | 要件 |
|---|---|
| 認証 | Supabase Auth（JWT + MFA対応） |
| データ分離 | PostgreSQL RLS |
| 通信暗号化 | TLS 1.3（Supabase/Cloudflare標準） |
| PII暗号化 | pgcryptoでemail/phone暗号化 |
| APIキー管理 | Supabase Vault（環境変数） |
| 監査ログ | 全書込み操作を記録 |
| Webhook検証 | HMAC-SHA256署名 |

### 7.4 Responsible Gambling

| 項目 | 要件 |
|---|---|
| 自己排除検知 | player.self_excluded → 全CJ即時停止 |
| 損失アラート | 月間損失$500超 → RGチェックメール |
| ボーナス除外 | RGフラグ=true → ボーナス系CJ自動除外 |
| 監査記録 | RG関連の全操作をaudit_logsに記録 |

---

## 8. テスト計画

### 8.1 テスト種別

| 種別 | ツール | 対象 | 合格基準 |
|---|---|---|---|
| ユニットテスト | Deno Test | Edge Functions | カバレッジ80%+ |
| 統合テスト | Supabase CLI | DB + Functions | 全CJタスク動作確認 |
| E2Eテスト | Playwright | ダッシュボード | 主要画面表示確認 |
| セキュリティ | OWASP ZAP | 全API | Critical/High 0件 |

### 8.2 テストデータ

```
テスト用テナント: test_tenant
テスト用顧客: 100件（VIP 10 / Regular 40 / AtRisk 20 / Dormant 20 / New 10）
テスト用CJタスク: 45件全て
```

---

## 9. デプロイ・運用

### 9.1 環境

| 環境 | URL | DB | 用途 |
|---|---|---|---|
| Local | localhost:54321 | Supabase CLI | 開発 |
| Staging | staging.sloten-crm.pages.dev | Supabase Staging | テスト |
| Production | sloten-crm.pages.dev | Supabase Production | 本番 |

### 9.2 デプロイフロー

```
develop ブランチ → GitHub Actions → テスト → Staging自動デプロイ
main ブランチ → GitHub Actions → テスト → 本番デプロイ（手動承認）
```

### 9.3 Cronスケジュール（本番）

| 時刻（JST） | Function | 説明 |
|---|---|---|
| 03:00 | bq-sync | BigQuery→Supabase同期 |
| 04:00 | rfm-calculate | RFMスコア再算出 |
| 05:00 | ltv-calculate | LTV再算出 |
| 06:00 | rg-check | RGチェック |
| 10:00 | cj-engine | CJタスク評価+送信 |
| 11:00 | nba-engine | NBA提案生成 |

### 9.4 モニタリング

| 項目 | ツール |
|---|---|
| エラー監視 | Supabase Logs + Sentry |
| 稼働監視 | Uptime Robot（1分間隔） |
| 送信監視 | notification_logs 日次サマリー |
| コスト監視 | Laaffic/SendGrid ダッシュボード |

---

## 10. 承認

| 役割 | 氏名 | 日付 | 署名 |
|---|---|---|---|
| 設計者 | | | |
| レビュアー | | | |
| 承認者 | | | |

---

**— 以上 —**
