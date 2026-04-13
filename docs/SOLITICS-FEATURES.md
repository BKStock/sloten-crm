# Solitics 全機能リスト（業界大手CRM）
調査日: 2026-04-13
ソース: ダッシュボード実機確認 + 公式サイト + ドキュメント

---

## A. ダッシュボード & アナリティクス

### A1. メインダッシュボード
- Yesterday FTDs（昨日の初回入金数）
- Monthly messages（月間メッセージ数）
- Monthly read and deposit revenue（月間開封→入金収益）
- Monthly read and deposit count（月間開封→入金件数）
- Financial Overview グラフ（Attributed Revenue / GGR / FTDs / Total Deposits）
- Users Activity グラフ（Registrations / Deposits / FTDs 日別推移）
- Top Performing ランキング（ジャーニー別/プロモ別の収益帰属）
- Communication Metrics（日別 Sent / Failed / チャネル別送信数）
- KPI Performance（KYC / Deposit / Bet / Login 別の達成率）

### A2. Campaign Performance（キャンペーンパフォーマンス）
- プロモーション別パフォーマンス
- ジャーニー別パフォーマンス
- 期間フィルター（Current month / Previous month / 3日 / 7日 / 30日 / 90日 / 1年）

### A3. Reports（レポート）
- Global Target Group vs Control（A/Bテスト全体比較）
- Monthly Conversions（月次コンバージョン推移）
- Active Users（アクティブユーザー推移）
- Attributed Deposits（収益帰属分析）
- カスタムレポート作成

---

## B. KPI管理

### B1. KPI定義
- カスタムKPI作成（イベント、フィールド変更、値の閾値）
- KYC完了率
- Deposit率
- Bet率
- Login率
- 任意のカスタムKPI

### B2. KPI追跡
- リアルタイムKPI達成率表示
- ジャーニー別KPI実績
- Unique members completed / Unique journeys started
- Total value（累計収益）
- Number of times KPI reached
- 日/週/月切り替え表示

### B3. KPI → ジャーニー連動
- KPI達成でジャーニーからユーザーを自動退出
- KPI達成でフォローアップジャーニーをトリガー

---

## C. Gamification（ガミフィケーション）

### C1. Missions（ミッション）
- ゴールベースのミッション設定
- Daily / Weekly / Monthly ミッション
- ミッション達成時の報酬トリガー
- プログレスバー表示

### C2. iGaming Widgets（ミニゲーム）
- Spin the Wheel（ルーレット）
- Pick'em（選択式ゲーム）
- Scratch Cards（スクラッチカード）
- カスタムウィジェットビルダー
- ランダムボーナス機能
- ブランドカスタマイズ
- リアルタイムデータ連動

### C3. Fintech向けゲーミフィケーション
- トレーディング向けチャレンジ
- 取引量ベースのリワード

---

## D. Customer Journey（カスタマージャーニー）

### D1. ジャーニーエディタ
- ビジュアルドラッグ＆ドロップエディタ
- 分岐ロジック（IF/ELSE条件分岐）
- マルチチャネルオーケストレーション
- 待機ノード（時間/条件）
- A/Bテストノード（バリアント分岐）
- ゴールノード（KPI達成で終了）

### D2. トリガー
- リアルタイムイベントトリガー（0.8秒以内に反応）
- 登録/入金/ベット/ログイン/KYC完了 等
- セグメント条件トリガー
- 時間ベーストリガー（スケジュール）
- 外部データトリガー（Market Pulse / In-Game Pulse）

### D3. ジャーニーグループ管理
- Conversion / Engagement / Retention / Promotions / Operational 等のグループ分類
- ジャーニー数 / アクティブジャーニー数の管理
- 検索 / クイックフィルター（Active / Waiting / Draft 等）

### D4. welltreasure アカウントで確認済みのジャーニー例
- FTD to STD（初回入金→2回目入金促進）— $1,428収益
- KYC Verification Reminder — $1,120収益
- Crypto Deposit — $253収益
- KYC Verified with no FTD — $170収益
- Last Deposit date before 14 days back — $165収益
- NBD used, FTD not yet
- Deposit Frequency Drop Journey
- Welcome Login（1ヶ月〜12ヶ月未ログイン＋BET 5000以上に$50ボーナス）
- Encourage KYC first, if done, distribute deposit bonus 20%

### D5. A/Bテスト
- ジャーニー内でのバリアントテスト
- コンテンツ/ターゲット/チャネルのテスト
- 自動トラフィック最適化（勝ちパターンへ自動シフト）

---

## E. Promotions（プロモーション）

### E1. キャンペーン管理
- プロモーション作成・編集
- スケジュール配信
- ターゲットセグメント指定
- マルチチャネル配信

### E2. Target Group vs Control
- コントロールグループ設定
- A/Bテスト結果比較

---

## F. Segments（セグメント）

### F1. セグメント管理
- 条件ベースのセグメント作成（共通属性でグループ化）
- セグメントグループ分類（Birthdays / Conversion / default / Import / Test）
- Active / Deactivated フィルター
- セグメント数 / アクティブセグメント数の管理

### F2. welltreasure アカウントのセグメント
- Birthdays — 2セグメント
- Conversion — 4セグメント
- default — 6セグメント
- Import Segments — 1セグメント
- Test — 11セグメント

---

## G. Content Management（コンテンツ管理）

### G1. Popups（ポップアップ）
- My popups（カスタム作成）
- My templates（保存済みテンプレ）
- Templates catalog（27テンプレート）
- ビジュアルエディタ
- OK/Cancel ボタン設定
- ターゲティング条件設定

### G2. Widgets（ウィジェット）
- Widget Builder（インタラクティブ要素作成）
- ランダムボーナス機能統合
- カスタムデザイン
- リアルタイムデータ連動

### G3. Emails（メール）
- ドラッグ＆ドロップ メールビルダー（コーディング不要）
- テンプレート管理
- 動的プレースホルダ（ユーザー属性埋込み）
- HTMLカスタム編集
- プレビュー / テスト送信

### G4. Placeholders（プレースホルダ）
- 動的変数定義（ユーザー名、残高、最終入金額等）
- 任意のメンバー属性をプレースホルダに変換
- ジャーニー/プロモ/メール/ポップアップで共通利用

### G5. Layouts（レイアウト）
- ポップアップテーマ管理
- ブランドごとのレイアウト設定

---

## H. CRM（顧客関係管理）

### H1. CRM View
- メンバー検索（Email / Phone / Member ID）
- Member Profile（プロフィール詳細）
  - Basic Info（電話、メール）
  - Milestones（マイルストーン達成状況）
  - Member IDs（複数ID管理）
- Audience Tags（オーディエンスタグ）
- Member Activity（行動履歴）
- Recent Messages（最近の配信メッセージ一覧）

---

## I. Communication Channels（配信チャネル）

| # | チャネル | 詳細 |
|---|---|---|
| I1 | Email | パーソナライズ配信、テンプレート、A/Bテスト |
| I2 | SMS | モバイルへのテキスト配信 |
| I3 | Push通知 | デバイスへのリアルタイム通知 |
| I4 | Web Push | ブラウザプッシュ通知 |
| I5 | Popup | サイト上のターゲットポップアップ |
| I6 | WhatsApp | 1:1双方向メッセージング |
| I7 | Social（FB/Instagram） | ソーシャルメディアメッセージング |
| I8 | Voice messaging | 音声メッセージ配信 |
| I9 | Calls | 行動データベースの電話トリガー |
| I10 | Webhook | 外部システムへのHTTPコール |

---

## J. AI / 予測分析

### J1. AI Expert
- AIアシスタント（質問ベースでデータ分析）

### J2. Predictive AI: Churn & LTV
- 離脱予測スコア（日次更新）
- LTV（顧客生涯価値）予測
- カスタムモデル（各オペレーターのデータで個別トレーニング）
- 予測スコア → セグメント/ジャーニーに直接連動

### J3. Market Pulse（リアルタイム市場インサイト）
- ユーザーのポートフォリオ/ウォッチリストに基づく市場変動通知
- 資産価格変動をジャーニートリガーに利用

### J4. In-Game Pulse（ライブスポーツ更新）
- スコア変動/ゴール/キープレイでジャーニートリガー
- インプレイベッティング中のパーソナライズオファー
- Follow Engine（1つのフローで全試合に対応）

---

## K. Settings（設定）

### K1. Data Management
- Events（イベント定義・管理）
- Members（メンバー権限管理）

### K2. Engagement Policy
- Communication Policy（配信頻度制限、時間帯制限等）
- Blocking Rules（特定条件でのブロックルール）

### K3. GDPR
- 個人情報保護設定
- データ削除リクエスト対応
- 同意管理

### K4. Facebook連携
- Facebook広告アカウント接続
- カスタムオーディエンス同期

---

## L. インテグレーション（90+連携）

### L1. 確認済み連携先
- SendGrid（メール）
- Twilio（SMS）
- Facebook / Instagram
- NuxGame（ゲーミングプラットフォーム）
- 90+のデータソース / CRM / ゲーミングプラットフォーム / トレーディングプラットフォーム

### L2. データ取込み
- バックオフィス / DB直接接続
- CRM連携
- Website / Mobile App イベント取込み
- BIツール連携
- サードパーティプロバイダ（スポーツフィード、ゲーミングプラットフォーム、ボーナスエンジン等）

---

## M. セキュリティ & コンプライアンス

| # | 機能 | 詳細 |
|---|---|---|
| M1 | 認証/ログイン | マルチユーザー認証 |
| M2 | Full audit trails | 全操作の監査ログ |
| M3 | Granular access controls | 細粒度アクセス制御 |
| M4 | PII protection modes | 個人情報保護モード |
| M5 | End-to-end encryption | エンドツーエンド暗号化 |
| M6 | Real-time data governance | リアルタイムデータガバナンス |
| M7 | ISO 27001 | 情報セキュリティ認証 |
| M8 | SOC 2 Type II | セキュリティ監査認証 |
| M9 | GDPR準拠 | EU個人情報保護規制対応 |

---

## N. Export / その他

| # | 機能 | 詳細 |
|---|---|---|
| N1 | Export History | エクスポート履歴管理 |
| N2 | Support Center | サポートセンター |
| N3 | Visitor Activation | 匿名ユーザーのリアルタイム転換 |

---

## O. 実績数値（公式）

| 指標 | 数値 |
|---|---|
| Daily events processed | 500M+ |
| Automated personalised messages | 6B+ |
| User retention increase MoM | 86% |
| Engaged users in automation | 100M+ |
| Growth in user activity | 40% |
| Boost in conversion | 75% |
| リアルタイム応答速度 | 0.8秒 |
| 導入期間 | 30日以内（45日保証） |

---

## P. 対応業界

| 業界 | 主な用途 |
|---|---|
| iGaming（カジノ/スポーツベッティング） | プレイヤーリテンション、ガミフィケーション、FTD促進 |
| Trading（FX/暗号/株） | トレーダーエンゲージメント、市場連動通知 |
| Banking | プロダクトアダプション、セキュア通信 |

---

合計機能数: **100+**
最終更新: 2026-04-13
