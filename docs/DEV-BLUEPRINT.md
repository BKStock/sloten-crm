# 🎰 Sloten CRM — B2B SaaS 開発ブループリント
### 既存機能を最大限活かした実装レベル計画書
**作成日:** 2026年4月13日
**作成:** TechLead + APIアーキテクト チーム

---

# Part 1: 既存資産の棚卸し

## 既存API（5本）

| # | エンドポイント | メソッド | 状態 | 改修内容 |
|---|---|---|---|---|
| 1 | `/api/customers` | GET | ✅稼働中 | +JWT認証 +tenant_idフィルタ +ページネーション |
| 2 | `/api/send-email` | POST | ✅稼働中 | +JWT認証 +レート制限 +送信ログDB保存 |
| 3 | `/api/customers/bq-sync` | POST | ✅稼働中 | +JWT認証 +テナント別BQ設定 +非同期ジョブ化 |
| 4 | `/api/customers/import` | POST | ✅稼働中 | +JWT認証 +ファイルサイズ制限 |
| 5 | `/api/email/send-test` | POST | ✅稼働中 | +JWT認証 |

## 既存フロントエンド（9画面）

| # | 画面 | 状態 | B2B化で必要な変更 |
|---|---|---|---|
| 1 | ダッシュボード | ✅ KPI+グラフ+施策効果 | テナント別データ表示 |
| 2 | アラート | ✅ 3段階+一括対応 | テナント別フィルタ |
| 3 | CJ自動メール | ✅ 35タスクLIVE | テナント別CJ管理 |
| 4 | ジャーニー | ✅ 検索+プレビュー | テナント別 |
| 5 | VIP管理 | ✅ 離脱予測+TG連携 | テナント別 |
| 6 | プッシュ通知 | ✅ 6トリガー+セグメント | テナント別 |
| 7 | 競合監視 | ✅ 5サイト+自動アクション | テナント別設定 |
| 8 | 設定 | ✅ BQ/SendGrid/SNS連携 | テナント別接続情報 |
| 9 | KPI管理 | ✅ FTD/GGR/入金 | テナント別目標 |

## 既存DBテーブル（推定7テーブル）

```
customers / alerts / email_templates / journeys /
push_segments / kpi_targets / cj_sendgrid_templates
```

---

# Part 2: 新規API設計（全約80本）

## 🔴 Phase 1: 認証+テナント基盤（30本）

### 認証 API（7本）
```
POST   /api/auth/register         テナント新規登録+14日トライアル
POST   /api/auth/login            ログイン（JWT発行）
POST   /api/auth/logout           ログアウト（JWT無効化）
POST   /api/auth/refresh          トークンリフレッシュ
POST   /api/auth/forgot-password  パスワードリセット要求
POST   /api/auth/reset-password   パスワードリセット実行
GET    /api/auth/me               現在のユーザー情報
```

### テナント管理 API（4本）
```
GET    /api/tenants/me            自テナント情報
PUT    /api/tenants/me            テナント更新（ブランド設定等）
GET    /api/tenants/me/usage      使用量（顧客数/メール数/API数）
GET    /api/tenants/me/plan       現在プラン
```

### ユーザー管理 API（5本）
```
GET    /api/users                 テナント内ユーザー一覧
POST   /api/users                 招待
PUT    /api/users/:id             更新
DELETE /api/users/:id             削除
PUT    /api/users/:id/role        ロール変更（admin/operator/viewer）
```

### 課金 API（6本）
```
POST   /api/billing/subscribe     プラン購読
POST   /api/billing/cancel        キャンセル
PUT    /api/billing/upgrade       アップグレード
GET    /api/billing/invoices      請求書一覧
GET    /api/billing/portal        Stripe Customerポータル
POST   /api/webhooks/stripe       Stripe Webhook受信
```

### アラート API（4本）— 既存改修
```
GET    /api/alerts                一覧（+tenant_id）
POST   /api/alerts/:id/resolve   対応済み
POST   /api/alerts/:id/memo      メモ追加
PUT    /api/alerts/bulk-resolve   一括対応
```

### KPI API（3本）— 既存改修
```
GET    /api/kpi                   一覧（+tenant_id）
PUT    /api/kpi/:id               目標値更新
GET    /api/kpi/history           推移履歴
```

### 監査ログ API（1本）
```
GET    /api/audit-logs            操作ログ一覧
```

## 🟡 Phase 2: Growth機能（35本）

### ジャーニーエディタ API（9本）
```
GET    /api/journeys              一覧
POST   /api/journeys              作成
GET    /api/journeys/:id          詳細（ノード/エッジ含む）
PUT    /api/journeys/:id          更新（フロー保存）
DELETE /api/journeys/:id          削除
POST   /api/journeys/:id/activate 有効化
POST   /api/journeys/:id/pause    一時停止
GET    /api/journeys/:id/stats    統計
POST   /api/journeys/:id/duplicate 複製
```

### A/Bテスト API（6本）
```
GET    /api/ab-tests              一覧
POST   /api/ab-tests              作成
PUT    /api/ab-tests/:id          更新
POST   /api/ab-tests/:id/start    開始
POST   /api/ab-tests/:id/conclude 勝者決定
GET    /api/ab-tests/:id/results  結果
```

### セグメント API（4本）
```
GET    /api/segments              一覧
POST   /api/segments              作成（条件ビルダー）
GET    /api/segments/:id/count    対象人数（リアルタイム）
POST   /api/segments/:id/export   CSVエクスポート
```

### Gamification API（6本）
```
GET    /api/gamification/missions   ミッション一覧
POST   /api/gamification/missions   ミッション作成
GET    /api/gamification/rewards    報酬一覧
POST   /api/gamification/rewards    報酬作成
GET    /api/gamification/leaderboard リーダーボード
POST   /api/gamification/events     ゲームイベント受信
```

### Webhook API（5本）
```
GET    /api/webhooks              設定一覧
POST   /api/webhooks              登録
PUT    /api/webhooks/:id          更新
DELETE /api/webhooks/:id          削除
POST   /api/webhooks/:id/test     テスト送信
```

### GDPR API（5本）
```
POST   /api/gdpr/export           データエクスポート（DSAR）
POST   /api/gdpr/delete           データ削除（Right to Erasure）
GET    /api/gdpr/consents         同意管理
PUT    /api/gdpr/consents/:id     同意更新
GET    /api/gdpr/audit            GDPR監査レポート
```

## 🟢 Phase 3: Scale機能（15本）

### AI予測 API（4本）
```
GET    /api/ai/churn-predictions    離脱予測一覧
GET    /api/ai/ltv-predictions      LTV予測
POST   /api/ai/recommendations      アクション推奨
GET    /api/ai/anomaly-detection    異常検知
```

### ホワイトラベル API（3本）
```
GET    /api/whitelabel/config       ブランド設定取得
PUT    /api/whitelabel/config       ブランド設定更新
POST   /api/whitelabel/domain       カスタムドメイン設定
```

### マーケットプレイス API（4本）
```
GET    /api/marketplace/templates   テンプレート一覧
POST   /api/marketplace/publish     テンプレート公開
GET    /api/marketplace/installed   インストール済み
POST   /api/marketplace/:id/install インストール
```

### Super Admin API（4本）
```
GET    /api/admin/tenants           全テナント一覧
GET    /api/admin/tenants/:id       テナント詳細
GET    /api/admin/metrics           SaaS全体メトリクス
POST   /api/admin/tenants/:id/suspend テナント停止
```

---

# Part 3: DBスキーマ変更

## 新規テーブル（Phase 1: 8テーブル）

```sql
tenants            テナント管理（plan/status/stripe_id/settings）
users              CRM操作ユーザー（email/password_hash/role）
sessions           JWTセッション管理
invitations        ユーザー招待
plans              プラン定義（Starter $799〜）
usage_records      月次使用量記録
tenant_integrations テナント別接続設定（BQ/SendGrid/SNS暗号化保存）
audit_logs         監査ログ（全操作記録）
```

## 既存テーブル変更

```sql
-- 全テーブルに追加
ALTER TABLE customers ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE alerts ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE journeys ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE email_templates ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE push_segments ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE kpi_targets ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'legacy';

-- インデックス追加（全テーブル）
CREATE INDEX idx_{table}_tenant ON {table}(tenant_id);
```

## 新規テーブル（Phase 2: 6テーブル）

```sql
journey_flows      ジャーニーエディタ（ノード/エッジJSON）
ab_tests           A/Bテスト定義
ab_test_variants   A/Bバリアント
segments_dynamic   動的セグメント（条件JSON）
gamification_missions ミッション定義
webhook_endpoints  Webhook設定
```

---

# Part 4: Phase別 週単位開発タスク

## 🔴 Phase 1: MVP SaaS（12週間）

### Week 1-2: 認証基盤
```
タスク                              工数    依存    既存再利用
─────────────────────────────────────────────────────────────
tenants/users/sessions テーブル作成   1日    なし    新規
Clerk or 自前JWT認証ミドルウェア     3日    テーブル  新規
_middleware.ts（全API認証強制）      1日    JWT     新規
POST /auth/register                 1日    テーブル  新規
POST /auth/login + /refresh         2日    JWT     新規
GET /auth/me                        0.5日  JWT     新規
パスワードリセット（SendGrid利用）    1日    既存    ✅ SendGrid再利用
```

### Week 3-4: テナント分離 + 既存API改修
```
タスク                              工数    依存    既存再利用
─────────────────────────────────────────────────────────────
全既存テーブルにtenant_id追加       1日    Week1-2  ALTER TABLE
GET /api/customers 改修             1日    認証    ✅ 既存クエリ+tenant_id
  → ページネーション追加(cursor)    1日    —      新規
POST /api/send-email 改修          0.5日  認証    ✅ 既存ロジック再利用
POST /api/customers/bq-sync 改修   1日    認証    ✅ BQ同期ロジック再利用
POST /api/customers/import 改修    0.5日  認証    ✅ インポートロジック再利用
POST /api/email/send-test 改修     0.5日  認証    ✅ 既存再利用
tenant_integrations テーブル        1日    —      新規（暗号化保存）
テナント別BQ/SendGrid設定画面      2日    —      ✅ 設定画面を改修
```

### Week 5-6: 監査ログ + PII暗号化
```
タスク                              工数    依存    既存再利用
─────────────────────────────────────────────────────────────
audit_logs テーブル作成             0.5日  —      新規
監査ログミドルウェア（全書込み記録）  2日    —      新規
GET /api/audit-logs                 1日    認証    新規
PII暗号化（WebCrypto AES-256-GCM）  2日    —      新規
  → email, phone フィールド暗号化
  → テナント別暗号化キー管理（KV）
既存アラートAPI テナント対応         1日    —      ✅ 既存アラート再利用
既存KPI API テナント対応            1日    —      ✅ 既存KPI再利用
```

### Week 7-8: 課金 + メールビルダー
```
タスク                              工数    依存    既存再利用
─────────────────────────────────────────────────────────────
plans テーブル + usage_records      1日    —      新規
Stripe連携（Customer/Subscription） 3日    —      新規
POST /billing/subscribe等 6本       2日    Stripe  新規
Stripe Webhook受信                  1日    —      新規
使用量チェックミドルウェア          1日    plans   新規
Beefree SDK メールビルダー統合      3日    —      ✅ 既存テンプレ5種を移行
配信制限ルール（Communication Policy）2日   —      新規
```

### Week 9-10: オンボーディング + フロントエンド
```
タスク                              工数    依存    既存再利用
─────────────────────────────────────────────────────────────
ログイン画面                        2日    認証    新規
サインアップフロー（14日トライアル） 2日    Stripe  新規
オンボーディングウィザード（5ステップ）3日  —      新規
サンドボックスデモデータ生成        2日    —      新規
既存8画面にテナント分離反映        3日    —      ✅ 全画面そのまま+認証ガード
```

### Week 11-12: テスト + セキュリティ
```
タスク                              工数    依存    既存再利用
─────────────────────────────────────────────────────────────
クロステナントセキュリティテスト     2日    全API   新規
E2Eテスト（Playwright）            3日    —      新規
パフォーマンステスト（35,000件）     1日    —      新規
セキュリティスキャン（OWASP Top10）  1日    —      新規
Stagingデプロイ + 本番デプロイ手順  2日    CI/CD   新規
ドキュメント整備                    2日    全API   新規
```

---

## 🟡 Phase 2: Growth（9ヶ月）

### Q2（Month 4-6）
```
Week 13-16: ジャーニービジュアルエディタ
  → React Flow統合（4日）
  → ノードタイプ6種実装（6日）
  → journey_flows テーブル + API 9本（5日）
  → 既存35タスクの自動変換ツール（3日） ✅ 既存CJデータ再利用

Week 17-20: A/Bテスト
  → ab_tests テーブル + API 6本（4日）
  → ジャーニー内A/B分岐ノード（3日）
  → 結果表示ダッシュボード（3日）
  → 既存施策効果テーブルと統合（2日） ✅ 既存ROI追跡を再利用

Week 21-24: GDPR対応
  → GDPR API 5本（3日）
  → 同意管理UI（3日）
  → データ削除フロー（D1+BQ+KV）（3日）
  → Privacy Policy / Cookie Banner（2日）
  → DPA テンプレート自動生成（1日）
```

### Q3（Month 7-9）
```
Week 25-28: Gamification
  → missions テーブル + API 6本（4日）
  → Spin the Wheel コンポーネント（4日）
  → Scratch Card コンポーネント（3日）
  → ミッション管理UI（3日）

Week 29-32: PAM連携 + Integration Hub
  → SoftSwiss API統合（5日）
  → EveryMatrix API統合（5日）
  → 汎用Webhook API 5本（3日）
  → Zapier/Make テンプレート（2日）
```

### Q4（Month 10-12）
```
Week 33-36: 分析強化
  → コホート分析（4日）
  → カスタムレポートビルダー（5日）
  → 週次レポート自動送信（2日）
  → i18n（en/ja/zh-TW）（5日）

Week 37-40: フロントエンド移行
  → 132KB HTML → Vite+TS 分割（5日） ✅ 全CSS/JSをそのまま移行
  → コンポーネントライブラリ構築（5日）
  → テーブル仮想スクロール実装（2日）
  → EChartsダッシュボード刷新（3日） ✅ 既存グラフを拡張
```

---

## 🟢 Phase 3: Scale（12ヶ月）— 概要のみ

```
Month 13-15: AI予測（Churn/LTV）+ API 4本
Month 16-18: ホワイトラベル + カスタムドメイン + API 3本
Month 19-21: マーケットプレイス + API 4本 + パートナープログラム
Month 22-24: Super Admin + ISO 27001準備 + API 4本
```

---

# Part 5: 認証フロー設計

## JWT設計
```json
{
  "sub": "user_abc123",
  "tid": "tenant_xyz789",
  "role": "admin",
  "plan": "growth",
  "exp": 1700000900
}
```

```
accessToken:  15分有効
refreshToken: 7日有効（Remember Me: 30日）
ローテーション: 使用ごとに自動更新
盗難検知: 旧世代トークン使用 → 全セッション無効化
```

## RBAC

| ロール | Dashboard | アラート | CJ | VIP | 設定 | 課金 |
|---|---|---|---|---|---|---|
| **Admin** | ✅ | ✅編集 | ✅編集 | ✅編集 | ✅編集 | ✅ |
| **Operator** | ✅ | ✅編集 | ✅編集 | ✅閲覧 | ❌ | ❌ |
| **Viewer** | ✅ | ✅閲覧 | ✅閲覧 | ✅閲覧 | ❌ | ❌ |

## ページネーション（統一設計）
```
GET /api/customers?limit=50&cursor=eyJpZCI6MTIzfQ==&sort=deposit_amount&order=desc
GET /api/customers?filter[is_vip]=true&filter[deposit_amount][gte]=100000&q=john
```

## レートリミット

| プラン | 一般API/分 | メール/時 | Push/時 | BQ同期/時 |
|---|---|---|---|---|
| Starter | 100 | 500 | 1,000 | 1 |
| Growth | 500 | 5,000 | 10,000 | 6 |
| Scale | 2,000 | 50,000 | 100,000 | 24 |

---

# Part 6: インフラ・DevOps

## CI/CD パイプライン

```yaml
# GitHub Actions
on push:
  1. TypeScript型チェック
  2. ESLint（tenant_idリーク検出含む）
  3. ユニットテスト（Vitest）
  4. 統合テスト（Miniflare）
  5. クロステナントセキュリティテスト
  6. develop → Staging自動デプロイ
  7. main → 本番デプロイ（手動承認）
```

## 環境分離

```
Staging:  staging.sloten-crm.pages.dev  + D1 staging DB
Production: app.sloten.io               + D1 production DB
```

## モニタリング

```
Cloudflare Analytics  → リクエスト数/エラー率/レイテンシ
Sentry               → エラー追跡
Better Uptime         → 死活監視（SLA 99.9%）
Stripe Dashboard      → MRR/チャーン/請求状態
```

---

# 📊 全体サマリー

| 指標 | 数値 |
|---|---|
| 既存API | **5本（全て再利用）** |
| 新規API | **約80本** |
| 既存画面 | **9画面（全て再利用+テナント対応）** |
| 新規画面 | **4画面**（ログイン/サインアップ/オンボーディング/Admin） |
| 既存テーブル | **7（全て再利用+tenant_id追加）** |
| 新規テーブル | **Phase1: 8 / Phase2: 6 / Phase3: 4 = 計18** |
| Phase 1 工数 | **12週間（BK 1人+AI）** |
| Phase 2 工数 | **28週間** |
| Phase 3 工数 | **48週間** |

---

> **「既存の5 API・9画面・7テーブルは全て再利用。新規開発は全てその上に積み上げる形。壊さない、活かす、拡張する。」**
