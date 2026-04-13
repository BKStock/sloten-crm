# 🎰 Sloten CRM — Phase 1 開発工程書
### 最短スタート → 引き継ぎ可能な開発ドキュメント
**作成日:** 2026年4月13日
**想定開発者:** 1名 + AI（Claude Code / OpenClaw）
**期間:** 28日（4 Sprint × 7日）

---

## 📌 Phase 1 のゴール

> **スロット天国の実ユーザーに対して、SMS/メール/Pushで自動CJ施策が動いている状態**

### 完了条件チェックリスト
```
□ Supabase（PostgreSQL + Auth + RLS）稼働
□ Laaffic SMS テスト送信成功
□ SendGrid メール認証完了 + テスト送信成功
□ カジノWebhook 10イベント以上受信成功
□ CJタスク 45本が自動判定動作
□ NBAエンジン v0.1（5ルール）動作
□ RFMスコア + LTV計算が日次バッチ動作
□ 施策効果ダッシュボード表示
□ Responsible Gambling チェック動作
□ スロット天国で本番稼働
```

---

## 🏗️ 技術スタック（確定）

| レイヤー | 技術 | 理由 |
|---|---|---|
| DB | **Supabase（PostgreSQL）** | ネイティブRLS、Auth付属、無料枠大 |
| 認証 | **Supabase Auth** | DB統合、MFA対応 |
| API | **Supabase Edge Functions（Deno）** | サーバーレス、Supabase統合 |
| フロント | **既存HTML（132KB）→ 段階的Vite移行** | Phase 1はHTMLそのまま |
| SMS | **Laaffic** | iGaming特化、APIキー取得済 |
| メール | **SendGrid** | 既存、APIキー取得済 |
| Push | **OneSignal** | 無料枠あり、iGaming実績 |
| データソース | **BigQuery（VPS API経由）** | 既存維持 |
| ホスティング | **Cloudflare Pages** | 既存維持 |
| CI/CD | **GitHub Actions** | 新規構築 |

---

## 📁 リポジトリ構成（Phase 1 完了時）

```
sloten-crm/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + Test + Type check
│       └── deploy.yml          # Staging/Production デプロイ
├── supabase/
│   ├── migrations/             # DBマイグレーション
│   │   ├── 001_tenants.sql
│   │   ├── 002_customers_tenant.sql
│   │   ├── 003_audit_logs.sql
│   │   ├── 004_cj_tasks.sql
│   │   ├── 005_notification_logs.sql
│   │   ├── 006_rfm_scores.sql
│   │   └── 007_ltv_calculations.sql
│   ├── functions/              # Edge Functions
│   │   ├── webhook-casino/     # カジノWebhook受信
│   │   ├── cj-engine/          # CJ自動判定エンジン
│   │   ├── nba-engine/         # Next Best Action
│   │   ├── send-sms/           # Laaffic SMS送信
│   │   ├── send-email/         # SendGrid メール送信
│   │   ├── send-push/          # OneSignal Push送信
│   │   ├── bq-sync/            # BigQuery同期
│   │   ├── rfm-calculate/      # RFMスコア日次バッチ
│   │   ├── ltv-calculate/      # LTV日次バッチ
│   │   └── rg-check/           # Responsible Gambling
│   ├── seed.sql                # テスト用シードデータ
│   └── config.toml             # Supabase設定
├── public/
│   └── index.html              # 既存132KB HTML（Phase 1はそのまま）
├── functions/                  # Cloudflare Functions（既存API維持）
│   └── api/                    # 既存5 API（互換性維持）
├── cj-templates/               # CJテンプレート定義
│   ├── tasks.json              # 45タスク定義
│   └── sendgrid-templates.json # SendGridテンプレID紐付き
├── docs/
│   ├── ARCHITECTURE.md         # アーキテクチャ概要
│   ├── API.md                  # API仕様
│   ├── WEBHOOK-EVENTS.md       # Webhook受信イベント仕様
│   ├── CJ-TASKS.md             # CJタスク一覧と条件
│   └── RUNBOOK.md              # 運用手順書
├── .env.example                # 環境変数テンプレート
├── wrangler.toml               # Cloudflare設定（既存）
├── package.json
└── README.md
```

---

## 🔑 環境変数（.env.example）

```env
# === Supabase ===
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# === Laaffic SMS ===
LAAFFIC_APP_ID=Ib1IdTVc
LAAFFIC_API_KEY=jdgghPMe
LAAFFIC_API_SECRET=mketwjtX
LAAFFIC_SANDBOX=true          # ⚠️ 本番時にfalseに変更

# === SendGrid ===
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=support@slotenpromotion.com
SENDGRID_FROM_NAME=スロット天国 サポート

# === OneSignal ===
ONESIGNAL_APP_ID=
ONESIGNAL_REST_API_KEY=

# === BigQuery ===
BQ_PROJECT_ID=
BQ_DATASET=
BQ_VPS_API_URL=

# === Cloudflare ===
CF_D1_DATABASE_ID=591ed0cd-d16f-422b-bf79-55acb0c78c93

# === カジノWebhook ===
CASINO_WEBHOOK_SECRET=          # HMAC署名検証用
```

---

## 🗄️ DBマイグレーション

### 001_tenants.sql
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'internal',
  status TEXT DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自社テナント即時作成
INSERT INTO tenants (name, slug, plan) 
VALUES ('スロット天国', 'sloten', 'internal');
```

### 002_customers_tenant.sql
```sql
-- 既存D1からの移行: tenant_id追加
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
UPDATE customers SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sloten');
ALTER TABLE customers ALTER COLUMN tenant_id SET NOT NULL;

-- RLSポリシー
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON customers
  USING (tenant_id = auth.jwt()->>'tid');

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_tenant_vip ON customers(tenant_id, is_vip);
CREATE INDEX idx_customers_tenant_login ON customers(tenant_id, last_login_date);
```

### 003_audit_logs.sql
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tenant_time ON audit_logs(tenant_id, created_at DESC);
```

### 004_cj_tasks.sql
```sql
CREATE TABLE cj_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  task_id TEXT NOT NULL,           -- P1, P2, P-SMS等
  name TEXT NOT NULL,
  description TEXT,
  trigger_condition JSONB NOT NULL, -- トリガー条件JSON
  channel TEXT NOT NULL,            -- sms/email/push/multi
  template_id TEXT,                 -- SendGridテンプレートID
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, task_id)
);

CREATE INDEX idx_cj_tenant_active ON cj_tasks(tenant_id, is_active);
```

### 005_notification_logs.sql
```sql
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id INTEGER NOT NULL,
  cj_task_id TEXT,
  channel TEXT NOT NULL,            -- sms/email/push
  provider TEXT NOT NULL,           -- laaffic/sendgrid/onesignal
  status TEXT DEFAULT 'queued',     -- queued/sent/delivered/failed/bounced
  external_id TEXT,                 -- プロバイダー側ID
  template_id TEXT,
  cost_usd DECIMAL(10,6),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notif_tenant_time ON notification_logs(tenant_id, created_at DESC);
CREATE INDEX idx_notif_customer ON notification_logs(customer_id, created_at DESC);
CREATE INDEX idx_notif_task ON notification_logs(cj_task_id, created_at DESC);
```

### 006_rfm_scores.sql
```sql
CREATE TABLE rfm_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id INTEGER NOT NULL,
  recency_days INTEGER,             -- 最終ログインからの日数
  frequency_30d INTEGER,            -- 過去30日のセッション数
  monetary_90d DECIMAL(12,2),       -- 過去90日のGGR
  r_score INTEGER CHECK (r_score BETWEEN 1 AND 5),
  f_score INTEGER CHECK (f_score BETWEEN 1 AND 5),
  m_score INTEGER CHECK (m_score BETWEEN 1 AND 5),
  rfm_total DECIMAL(3,1),          -- 加重平均
  segment TEXT,                     -- VIP/High Regular/Regular/At-Risk/Dormant/New
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_rfm_segment ON rfm_scores(tenant_id, segment);
```

### 007_ltv_calculations.sql
```sql
CREATE TABLE ltv_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id INTEGER NOT NULL,
  historical_ltv DECIMAL(12,2),     -- 過去実績LTV
  predicted_ltv DECIMAL(12,2),      -- 予測LTV
  churn_probability DECIMAL(5,4),   -- 離脱確率（0.0000-1.0000）
  ltv_segment TEXT,                 -- high/medium/low
  rfm_multiplier DECIMAL(3,1),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, customer_id)
);

CREATE INDEX idx_ltv_segment ON ltv_calculations(tenant_id, ltv_segment);
```

---

## ⚡ CJエンジン仕様

### cj-engine（Edge Function）

```typescript
// 処理フロー
// 1. 全CJタスク取得（is_active=true）
// 2. 各タスクの条件をBigQueryデータで評価
// 3. 対象ユーザーリスト生成
// 4. 重複排除（1ユーザー/日 最大2通）
// 5. RGチェック（自己排除者除外）
// 6. チャネル選択（SMS/Email/Push）
// 7. 送信キュー投入
// 8. notification_logsに記録

// 実行スケジュール: 毎日 10:00 JST（Supabase Cron）
// ドライラン: DRYRUN=true で実際の送信をスキップ
```

### 45タスク定義フォーマット（tasks.json）

```json
{
  "P1": {
    "task_id": "P1",
    "name": "赤アラート",
    "description": "VIP+5日ログインなし",
    "trigger": {
      "conditions": [
        { "field": "is_vip", "operator": "eq", "value": true },
        { "field": "days_since_login", "operator": "gte", "value": 5 }
      ],
      "logic": "AND"
    },
    "channel": "sms",
    "template_id": "d-60a986409f3244a08c5a7da1e57d96c6",
    "priority": 10,
    "cooldown_hours": 168
  }
}
```

---

## 📊 Sprint 別タスク一覧

### Sprint 1（Day 1-7）: 基盤構築

| # | タスク | 工数 | 成果物 | 依存 |
|---|---|---|---|---|
| S1-1 | Supabaseプロジェクト作成 + ローカル環境 | 2h | supabase/config.toml | — |
| S1-2 | DBマイグレーション 001-007 適用 | 4h | 7マイグレーションファイル | S1-1 |
| S1-3 | Supabase Auth設定 + RLSポリシー | 4h | 認証動作確認 | S1-2 |
| S1-4 | Laaffic SMS テスト送信（自分の番号のみ） | 4h | send-sms/ Function | S1-1 |
| S1-5 | SendGrid ドメイン認証 + テスト送信 | 4h | send-email/ Function | S1-1 |
| S1-6 | カジノWebhook受信エンドポイント | 8h | webhook-casino/ Function | S1-2 |
| S1-7 | CJエンジン基盤 + タスク3本 | 8h | cj-engine/ Function | S1-2 |
| S1-8 | GitHub Actions CI/CD | 4h | .github/workflows/ | S1-1 |
| S1-9 | Sprint 1 統合テスト | 4h | テスト結果レポート | 全タスク |
| | **Sprint 1 合計** | **42h** | | |

### Sprint 2（Day 8-14）: CJタスク量産 + 計測基盤

| # | タスク | 工数 | 成果物 | 依存 |
|---|---|---|---|---|
| S2-1 | CJタスク #4-14 実装 | 16h | tasks.json 14タスク | S1-7 |
| S2-2 | 追加CJタスク #36-45 実装 | 12h | tasks.json 45タスク | S2-1 |
| S2-3 | RFMスコア日次バッチ | 6h | rfm-calculate/ Function | S1-2 |
| S2-4 | LTV計算日次バッチ | 6h | ltv-calculate/ Function | S2-3 |
| S2-5 | テストアカウント50件で動作確認 | 4h | テスト結果レポート | S2-1 |
| | **Sprint 2 合計** | **44h** | | |

### Sprint 3（Day 15-21）: NBAエンジン + レポート強化

| # | タスク | 工数 | 成果物 | 依存 |
|---|---|---|---|---|
| S3-1 | NBAエンジン v0.1（5ルール） | 12h | nba-engine/ Function | S2-3 |
| S3-2 | 施策効果ダッシュボード強化 | 8h | index.html更新 | S1-7 |
| S3-3 | 期間フィルター + チャネル別比較 | 6h | index.html更新 | S3-2 |
| S3-4 | コホート分析画面 | 6h | index.html更新 | S2-4 |
| S3-5 | Responsible Gambling チェック | 4h | rg-check/ Function | S1-2 |
| S3-6 | 送信ログCSVエクスポート | 2h | API追加 | S1-7 |
| S3-7 | Sprint 3 統合テスト | 4h | テスト結果レポート | 全タスク |
| | **Sprint 3 合計** | **42h** | | |

### Sprint 4（Day 22-28）: 本番投入 + 安定化

| # | タスク | 工数 | 成果物 | 依存 |
|---|---|---|---|---|
| S4-1 | 本番環境構築（Production Supabase） | 4h | 本番URL | S1-1 |
| S4-2 | D1→Supabase データ完全移行 | 6h | 移行完了確認 | S4-1 |
| S4-3 | ドライラン→本番切替 | 4h | 本番稼働確認 | S4-2 |
| S4-4 | A/Bテスト開始（2パターン） | 4h | A/Bテスト稼働 | S4-3 |
| S4-5 | 初回効果計測（3日分） | 4h | ROIレポート | S4-4 |
| S4-6 | バグ修正 + パフォーマンス最適化 | 8h | 安定稼働 | S4-3 |
| S4-7 | ドキュメント完成 | 6h | docs/ 5ファイル | 全タスク |
| S4-8 | Phase 1 完了レビュー | 2h | レビューレポート | 全タスク |
| | **Sprint 4 合計** | **38h** | | |

---

## 📚 引き継ぎドキュメント一覧

### docs/ARCHITECTURE.md
```
- システム全体図（カジノ→CRM→外部サービス）
- データフロー図
- 技術スタック一覧
- 環境変数の説明
```

### docs/API.md
```
- 既存5 API（/api/customers等）の仕様
- 新規Edge Functions の仕様
- 認証方式（Supabase Auth JWT）
- リクエスト/レスポンス例
```

### docs/WEBHOOK-EVENTS.md
```
- カジノから受信する22イベントの定義
- 各イベントのペイロード例
- 署名検証方式
- エラーハンドリング
```

### docs/CJ-TASKS.md
```
- 45タスクの一覧表（ID/名前/条件/チャネル/テンプレート）
- トリガー条件の書式
- 優先度ルール
- クールダウン設定
```

### docs/RUNBOOK.md
```
- 日次運用チェックリスト
- 障害時対応手順（P1/P2/P3）
- ログの場所と見方
- Laaffic/SendGrid/OneSignal の管理画面URL
- エスカレーションフロー
- ドライラン↔本番切替手順
```

---

## ✅ Phase 1 完了判定基準

| # | 基準 | 確認方法 |
|---|---|---|
| 1 | 45 CJタスクが全て自動判定動作 | Supabase Logsで確認 |
| 2 | SMS/Email/Pushの3チャネルで送信成功 | notification_logsテーブル |
| 3 | RFMスコアが全ユーザーに付与 | rfm_scoresテーブル |
| 4 | LTVが全セグメントで算出 | ltv_calculationsテーブル |
| 5 | NBAエンジンが5ルールで提案生成 | ログ確認 |
| 6 | 施策効果ダッシュボードにデータ表示 | 画面確認 |
| 7 | RGチェックが動作（$500超アラート） | audit_logs確認 |
| 8 | 引き継ぎドキュメント5ファイル完成 | docs/確認 |
| 9 | CI/CDが動作（push→テスト→デプロイ） | GitHub Actions確認 |
| 10 | スロット天国で3日以上安定稼働 | エラーゼロ確認 |

---

## 🔜 Phase 2 への引き継ぎ事項

Phase 1完了後、Phase 2で着手すべき項目：

```
□ マルチテナント化（他カジノ接続可能に）
□ Stripe課金フロー
□ ビジュアルジャーニーエディタ（React Flow）
□ A/Bテスト本格化
□ NBAエンジン v1.0（30ルール）
□ 132KB HTML → Vite+TS 移行
□ GDPR対応
□ Gamification
```

---

> **このドキュメントがあれば、BK以外の開発者でもPhase 1の継続・保守が可能。**
