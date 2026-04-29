# Keinage Design

最終更新: 2026-04-29

## 1. ドキュメントの位置づけ

本書は Keinage の内部設計を整理するためのドキュメントです。ユーザー向け仕様は `docs/SPEC.md`、HTTP エンドポイントは `docs/API.md` を参照してください。

## 2. システム構成

Keinage は Next.js App Router をベースに、表示画面、管理画面、API を単一アプリで提供します。

```text
┌──────────────────────────────────────────────┐
│ Next.js 16 App                               │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Board View   │  │ Dashboard / Call UI  │  │
│  └──────┬───────┘  └──────────┬───────────┘  │
│         │                     │              │
│         └────────────┬────────┘              │
│                      ▼                       │
│               Route Handlers                 │
│          (/api/*, /uploads/[...path])        │
└──────────────────────┬───────────────────────┘
                       │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
    PostgreSQL     uploads/ or         External APIs
    Drizzle ORM    S3-compatible       weather.tsukumijima.net
                     GitHub Releases API
                     SMTP
                     Google OAuth
```

### 2.1 実行モード

- フレームワーク: Next.js 16
- 言語: TypeScript strict
- UI: React 19, Tailwind CSS v4, shadcn/ui, Framer Motion
- DB: PostgreSQL + Drizzle ORM
- パッケージマネージャ: pnpm
- 配布形態: `output: "standalone"` による単体実行イメージ

### 2.2 i18n
言語ごとの文字列は[i18n-messages.ts](../src/lib/i18n-messages.ts) で管理されています。
文字列の追加・削除・更新はこのファイル周辺を編集します。

## 3. ディレクトリ方針

主要ディレクトリの責務は以下です。

| パス | 役割 |
| --- | --- |
| `src/app/(board)` | 表示画面の App Router ルート |
| `src/app/(dashboard)` | PIN/フル認証後の管理画面 |
| `src/app/api` | Route Handler 群 |
| `src/app/call` | 呼び出し番号テンプレート向け運用画面 |
| `src/app/uploads/[...path]` | 動的アップロードファイル配信 |
| `src/components/board/templates` | テンプレート実装 |
| `src/components/dashboard` | 管理画面 UI |
| `src/db` | DB スキーマと接続 |
| `src/lib` | 認証、SSE、画像処理、ストレージ抽象化などの共通ロジック |
| `drizzle/` | SQL マイグレーション |
| `docker/` | Dockerfile、migration runner、entrypoint |
| `uploads/` | S3 未設定時の実アップロードファイル置き場 |

## 4. データモデル

### 4.1 コンテンツ系テーブル

| テーブル | 役割 |
| --- | --- |
| `boards` | ボード本体。テンプレート種別と JSON 設定を保持 |
| `media_items` | ボードに紐づく画像・動画 |
| `messages` | ボードに紐づくメッセージ |
| `settings` | システム共通設定の KV ストア |

### 4.2 認証系テーブル

| テーブル | 役割 |
| --- | --- |
| `users` | ログイン主体。`userId`, `email`, `passwordHash`, `authProvider`, `googleSub`, `pinHash`, `role` を保持 |
| `auth_sessions` | 認証済みセッション |
| `pin_reset_tokens` | PIN リセット用トークン |
| `signup_requests` | Owner 仮登録と登録用トークン |
| `shared_signup_requests` | Shared ユーザー招待と登録用トークン |
| `pin_attempts` | 失敗試行回数の IP ベース記録 |

### 4.3 設計上の特徴

- `boards.config` は JSON で保持し、テンプレート追加時にスキーマ変更を最小化します。
- `settings` は DB 移行を伴わず共通設定を追加しやすい KV ストアです。
- 認証は「ユーザー」単位に再設計されており、旧来の単一管理者 PIN モデルより拡張しやすい構成です。

## 5. 認証設計

### 5.1 二層認証モデル

Keinage の認証は次の 2 段構成です。

1. メールアドレスまたはユーザーID + パスワードによるフル認証
2. Google アカウントによるフル認証
3. 有効期限内に限り利用できる PIN による軽量再認証

`users.authProvider` は `credentials` または `google` です。ユーザーは作成時の認証方式に固定され、Google ユーザーは `passwordHash` を持たず、パスワード変更 API も利用できません。

### 5.2 Owner サインアップ設計

Owner のメールアドレス + パスワード登録は次の 3 段階で進めます。

1. `/signup` で `signup_requests` に仮登録を作成する
2. `/signingup` で登録用 URL の送達待ち状態を扱う
3. `/signup/[token]` でパスワード登録後、一時 `auth-session` を発行して `/pin/setup` へ進める

設計上のポイント:

- 登録用トークンは UUID ベースで、`signup_requests.expiresAt` に 10 分の期限を持たせる
- 再送時は同じ仮登録レコードに新しいトークンを再発行し、古いリンクを失効させる
- `/signingup` は `signup-request-id` Cookie がある場合だけ表示し、直リンク利用を防ぐ
- 登録リンクは `APP_PUBLIC_ORIGIN` を基準に生成し、未認証の direct-link フォールバックはローカル開発用の明示フラグ付きの場合にだけ許可する

Google Owner 登録は `src/app/api/auth/google/start/route.ts` と `src/app/api/auth/google/callback/route.ts` で扱います。OAuth state は `google-oauth-state` Cookie と state パラメータで照合し、Google の userinfo から検証済みメールアドレスと `sub` を取得します。Owner の `userId` はメールアドレスのローカルパートから生成し、重複時は suffix を付与します。

### 5.3 Shared ユーザー招待設計

Shared ユーザーは admin が `/users` から招待します。

1. `POST /api/users` が `shared_signup_requests` に招待レコードを作成する
2. `APP_PUBLIC_ORIGIN` を基準に `/signup/shared?token=<token>` を生成する
3. SMTP が設定されていれば招待メールを送信する
4. SMTP 未設定かつローカルプレビューが有効な場合は `previewUrl` を返す
5. `/signup/shared` でメールアドレス + パスワードまたは Google アカウントを選択してユーザーを作成する

Shared Google 登録では、Google から取得したメールアドレスが招待レコードのメールアドレスと完全一致する必要があります。これにより、招待 URL の転送だけで別 Google アカウントが Shared ユーザーになることを防ぎます。

### 5.4 セッション管理

- Cookie 名: `auth-session`
- 端末認証 Cookie: `device-auth`
- Google OAuth state Cookie: `google-oauth-state`
- 仮登録 Cookie: `signup-request-id`
- セッション本体は `auth_sessions` に保存します。
- フル認証の最終成功時刻は `users.lastFullAuthAt` に保存します。

PIN ハッシュはパスワードと同様にメモリハード KDF で保存します。旧形式の高速ハッシュが残っている場合は、PIN 検証成功時に新形式へ順次再ハッシュします。

`device-auth` に紐づく `device_auth_grants` を持つことで、PIN 入力画面が「どのユーザーの PIN を検証するか」と「PIN ログイン前にフル認証期限が切れていないか」を決定できます。

### 5.5 レート制限

- 失敗試行は `pin_attempts` に記録します。
- メールアドレス + パスワード認証と PIN 認証で同じ試行回数制限を共有します。
- 単純なインメモリ制御ではなく DB 記録にしているため、同一 PostgreSQL を使う単一インスタンス運用では再起動後も履歴を参照できます。

## 6. ボードテンプレート設計

テンプレートはレジストリ方式で管理します。

### 6.1 構成

- テンプレート実装: `src/components/board/templates/*`
- 型: `BoardTemplate`
- レジストリ: `src/lib/templates.ts`

### 6.2 追加手順

新テンプレートを追加する場合は次を満たします。

1. 表示コンポーネントを実装する
2. 既定設定を定義する
3. レジストリへ登録する
4. 必要ならダッシュボード設定エディタを追加する

この構成により、テンプレート追加のために DB スキーマを増やさずに済みます。

## 7. リアルタイム更新設計

Keinage は WebSocket ではなく Server-Sent Events を採用しています。

### 7.1 フロー

1. API がボード・メディア・メッセージを更新する
2. Route Handler が `emitSSE(boardId, event)` を呼ぶ
3. `src/lib/sse.ts` がボード単位の購読者へイベントを配信する
4. `useSSE` を使う画面側が再取得する

### 7.2 採用理由

- 要件がサーバーからクライアントへの片方向通知中心である
- 実装がシンプルで、表示画面の自動再接続とも相性が良い
- クライアントはボード単位のイベントだけを受け取れば十分

### 7.3 制約

- SSE チャンネルはプロセス内メモリで管理します。
- 複数アプリインスタンス間の通知共有は未対応です。

## 8. メディア保存と配信

### 8.1 保存設計

- DB には `/uploads/<filename>` の公開パスを保持します。
- `S3_*` 環境変数を設定すると、S3 互換のあるストレージサービスを利用できます。
- `S3_*` 未設定時は `uploads/` と `uploads/thumbs/` を使うローカル保存が既定動作です。

### 8.2 画像処理

`src/lib/image.ts` で次を担当します。

- 長辺上限に合わせた画像リサイズ
- 600px サムネイル生成
- GIF のサムネイル静止画化

### 8.3 配信設計

Next.js standalone 出力では、ビルド後に追加された `public/` 配下ファイルをそのまま配信できません。そのため Keinage では `src/app/uploads/[...path]/route.ts` を経由し、ローカルディスクまたは S3 互換ストレージ上のオブジェクトを同じ `/uploads/...` URL で返却します。

配信レスポンスには `Cache-Control: public, max-age=31536000, immutable` を付与し、スライドショーの再表示を軽くしています。

## 9. PostgreSQL 接続設計

`src/db/index.ts` は lazy proxy で DB 接続を初期化します。

### 理由

- `DATABASE_URL` の解決とコネクションプール生成を、実際に DB を使うタイミングまで遅らせられる
- import 時点で接続を張らないことで、ビルド時や静的解析時の不要な DB 接続を避けられる

### 実装ポイント

- `pg` の `Pool` を単一インスタンスとして保持する
- Drizzle の query builder / relation API は既存の Route Handler からそのまま利用する
- 時刻カラムは既存 API 互換のため ISO 8601 文字列で保持する

## 10. Docker / デプロイ設計

### 10.1 ビルド

- マルチステージビルドを採用します。
- `deps` ステージで依存関係をインストールします。
- `builder` ステージで `pnpm build` を実行します。
- `runner` ステージでは standalone 出力と静的ファイルだけを持ちます。

### 10.2 起動

`docker/entrypoint.sh` の責務は次の 2 つです。

1. 起動前にマイグレーションを実行する
2. `node server.js` を起動する

Docker Compose では PostgreSQL コンテナの health check 完了後にアプリを起動します。

### 10.3 永続化対象

- PostgreSQL volume : アプリデータ本体
- `uploads/` : 既定のアップロードファイルとサムネイル
- S3-compatible bucket : S3 設定時のアップロードファイルとサムネイル

## 11. 設定・キャッシュ設計

### 11.1 `settings` テーブル

代表的なキー:

- `weatherCityId`
- `imageMaxLongEdge`
- `authExpireDays`

少数の共通設定を柔軟に増やせる一方、設定名の型安全性は呼び出し側に委ねています。

### 11.2 天気キャッシュ

`/api/weather` は 30 分のインメモリキャッシュを持ちます。これも単一プロセス前提の設計です。

## 12. パフォーマンス上の判断

### 12.1 画像先読み

スライドショーでは、低スペック端末での表示品質を優先し、次の画像を事前ロードします。

- 現在表示中に次の最大 2 枚を `new Image()` で先読み
- 画像の `onLoad` 完了まで切り替えタイマーを開始しない
- 動画は `onEnded` ベース遷移を維持しつつ、フォールバックタイマーを分離

### 12.2 モバイル管理画面

ダッシュボードは `DashboardShell` を境に、PC とモバイルでナビゲーションを切り替えます。管理機能の量を維持したまま、狭い画面でも運用できることを優先しています。

## 13. 現時点の前提と限界

- マルチテナントは未対応です。
- S3 互換ストレージサービスを利用する場合は、運用側で別途用意する前提です。
- SSE、天気キャッシュ、ファイル一覧参照は単一インスタンスを前提にしています。
- ダッシュボード内部 API は、認証ゲートをレイアウト側で担保している箇所と、Route Handler 単体で認可している箇所が混在します。
