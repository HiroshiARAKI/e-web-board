# Keinage API Reference

最終更新: 2026-04-19

## 1. このドキュメントの範囲

本書は Keinage が提供する HTTP エンドポイントを整理するためのドキュメントです。

- `src/app/api/*` の Route Handler
- `src/app/uploads/[...path]/route.ts` によるストレージ上メディア配信

利用者向け仕様は `docs/SPEC.md`、設計方針は `docs/DESIGN.md` を参照してください。

## 2. 利用上の前提

### 2.1 認証 Cookie

| Cookie | 用途 |
| --- | --- |
| `auth-session` | 認証済みセッション識別 |
| `last-user-id` | 次回 PIN 認証対象のユーザー識別 |

### 2.2 認証の考え方

API は大きく 3 種類に分かれます。

| 区分 | 説明 |
| --- | --- |
| 認証前 API | セットアップ、ログイン、PIN 検証など |
| ダッシュボード内部 API | 管理画面から利用する内部向け API |
| 外部連携 API | 外部システムから直接呼ぶことを想定した API |

注意点:

- `users` 系 API は Route Handler 内で認可しています。
- `boards`、`media`、`messages`、`settings` など一部の内部 API は、現状レイアウト側の認証ゲート利用を前提にしており、Route Handler 単体では厳密な認可チェックを入れていないものがあります。
- `POST /api/messages` は外部連携向けです。

## 3. 認証 API

### 3.1 初回セットアップ

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/credentials/setup` | 初回管理者アカウントを作成 | 不要 |
| `POST` | `/api/auth/pin/setup` | 初回管理者 PIN を設定 | 一時セットアップセッション |

#### `POST /api/auth/credentials/setup`

初回のみ実行可能です。ユーザーが 1 件でも存在すると失敗します。

リクエスト例:

```json
{
  "userId": "admin",
  "email": "admin@example.com",
  "password": "changeme123"
}
```

正常時は `setupToken` を返し、15 分有効の一時 `auth-session` Cookie を設定します。

#### `POST /api/auth/pin/setup`

リクエスト例:

```json
{
  "pin": "123456"
}
```

PIN 設定後、正式な 24 時間セッションへ切り替えます。

### 3.2 ログイン / ログアウト

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `POST` | `/api/auth/credentials/login` | メールアドレスまたはユーザーID + パスワードでログイン | 不要 |
| `POST` | `/api/auth/pin/verify` | PIN でクイックログイン | 不要 |
| `POST` | `/api/auth/pin/logout` | セッション削除 | 任意 |
| `GET` | `/api/auth/pin/status` | 現在の対象ユーザー、PIN 設定状態、期限情報を取得 | 不要 |

#### `POST /api/auth/credentials/login`

リクエスト例:

```json
{
  "identifier": "admin@example.com",
  "password": "changeme123"
}
```

仕様:

- `identifier` はメールアドレスまたは `userId`
- 成功時に `auth-session` と `last-user-id` Cookie を設定
- 失敗回数は IP ベースで制限

#### `POST /api/auth/pin/verify`

リクエスト例:

```json
{
  "pin": "123456"
}
```

仕様:

- `last-user-id` があればそのユーザーの PIN を優先検証
- 対象ユーザーに PIN がない場合は `requiresFullAuth: true` を返す
- フル認証期限切れでも `requiresFullAuth: true` を返す

#### `GET /api/auth/pin/status`

レスポンス例:

```json
{
  "userConfigured": true,
  "pinConfigured": true,
  "email": "admin@example.com",
  "userId": "admin",
  "fullAuthExpiry": "2026-05-19T03:00:00.000Z",
  "authExpireDays": 30
}
```

### 3.3 PIN / アカウント情報変更

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `PATCH` | `/api/auth/pin/change` | PIN、メールアドレス、ユーザーIDの変更 | 必要 |
| `PATCH` | `/api/auth/password/change` | パスワード変更 | 必要 |
| `POST` | `/api/auth/pin/forgot` | PIN リセット要求 | 不要 |
| `POST` | `/api/auth/pin/reset` | リセットトークンで PIN 再設定 | 不要 |

#### `PATCH /api/auth/pin/change`

`action` に応じて挙動が変わります。

| `action` | 必須項目 | 内容 |
| --- | --- | --- |
| `verifyCurrentPin` | `currentPin` | 現在 PIN の検証 |
| `changePin` | `currentPin`, `newPin` | PIN 変更 |
| `setupPin` | `newPin` | 未設定ユーザーの初期 PIN 設定 |
| `changeEmail` | `newEmail` | メールアドレス変更 |
| `changeUserId` | `newUserId` | ユーザーID変更 |

リクエスト例:

```json
{
  "action": "changePin",
  "currentPin": "123456",
  "newPin": "654321"
}
```

## 4. ユーザー API

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `GET` | `/api/users` | ユーザー一覧取得 | `admin` |
| `POST` | `/api/users` | ユーザー作成 | `admin` |
| `PATCH` | `/api/users/[id]` | ロール変更 | `admin` |
| `DELETE` | `/api/users/[id]` | ユーザー削除 | `admin` |
| `PATCH` | `/api/users/me` | 自分のテーマ変更 | 必要 |

#### `POST /api/users`

リクエスト例:

```json
{
  "userId": "staff01",
  "email": "staff01@example.com",
  "password": "password123",
  "role": "general"
}
```

#### `PATCH /api/users/[id]`

リクエスト例:

```json
{
  "role": "general"
}
```

#### `PATCH /api/users/me`

現在の実装ではテーマ変更のみを扱います。

```json
{
  "colorTheme": "dark"
}
```

## 5. ボード API

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `GET` | `/api/boards` | ボード一覧取得 | 内部向け |
| `POST` | `/api/boards` | ボード作成 | 内部向け |
| `GET` | `/api/boards/[id]` | ボード詳細取得 | 内部向け |
| `PATCH` | `/api/boards/[id]` | ボード更新 | 内部向け |
| `DELETE` | `/api/boards/[id]` | ボード削除 | 内部向け |
| `GET` | `/api/boards/[id]/messages` | 有効なメッセージ一覧取得 | 表示画面 / 内部向け |
| `DELETE` | `/api/boards/[id]/messages` | ボードのメッセージ全削除 | 内部向け |

#### `POST /api/boards`

```json
{
  "name": "待合室メイン",
  "templateId": "simple",
  "config": {
    "slideInterval": 8
  }
}
```

`config` を省略または空オブジェクトで送ると、テンプレート既定値を適用します。

#### `PATCH /api/boards/[id]`

```json
{
  "name": "待合室サブ",
  "isActive": true,
  "config": {
    "slideInterval": 10
  }
}
```

更新時の補足:

- `board-updated` を発行します。
- `slideInterval` の変更時、既定値のまま残っている画像の `duration` を同期します。

#### `GET /api/boards/[id]`

レスポンスはボード本体に加え、`mediaItems` と `messages` を内包します。

## 6. メディア API

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `GET` | `/api/media` | メディア一覧取得 | 内部向け |
| `POST` | `/api/media` | メディアアップロード | 内部向け |
| `PATCH` | `/api/media` | 表示順更新 | 内部向け |
| `DELETE` | `/api/media` | 全メディア削除 | 内部向け |
| `DELETE` | `/api/media/[id]` | 1 件削除 | 内部向け |
| `PATCH` | `/api/media/[id]` | 1 件の設定更新 | 内部向け |
| `GET` | `/api/media/files` | ストレージ上ファイル一覧取得 | 内部向け |
| `DELETE` | `/api/media/files` | ストレージ上ファイルと参照レコード削除 | 内部向け |

#### `POST /api/media`

`multipart/form-data` を受け付けます。

| フィールド | 必須 | 内容 |
| --- | --- | --- |
| `file` | Yes | 画像または動画 |
| `boardId` | Yes | 対象ボード ID |
| `duration` | No | 画像表示秒数 |

補足:

- 対応 MIME: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `video/mp4`, `video/webm`
- 画像は必要に応じてリサイズとサムネイル生成を行います。
- 画像の既定 `duration` は対象ボードの `slideInterval` を優先します。

#### `PATCH /api/media`

```json
[
  { "id": "<media-id-1>", "displayOrder": 0 },
  { "id": "<media-id-2>", "displayOrder": 1 }
]
```

#### `GET /api/media/files`

ストレージ上の実ファイルを返し、DB 上でどのボードが参照しているかを `boards` 配列で付与します。

#### `DELETE /api/media/files`

```json
{
  "filename": "example.jpg"
}
```

対象ファイル、サムネイル、参照する `media_items` レコードを削除します。

## 7. メッセージ API

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `POST` | `/api/messages` | メッセージ作成 | 外部連携可 |
| `PATCH` | `/api/messages/[id]` | メッセージ更新 | 内部向け |
| `DELETE` | `/api/messages/[id]` | メッセージ削除 | 内部向け |

#### `POST /api/messages`

```json
{
  "boardId": "<board-uuid>",
  "content": "受付 3 番へお越しください",
  "priority": 1,
  "expiresAt": "2026-04-19T12:00:00Z"
}
```

仕様:

- `boardId` は UUID
- `content` は 1〜1000 文字
- `priority` は 0 以上の整数
- `expiresAt` は ISO 8601 datetime または `null`

成功時は `message-updated` を発行します。

## 8. 設定 API

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `GET` | `/api/settings` | KV 設定をまとめて取得 | 内部向け |
| `PATCH` | `/api/settings` | KV 設定を upsert | 内部向け |

#### `PATCH /api/settings`

```json
{
  "weatherCityId": "130010",
  "imageMaxLongEdge": "3840",
  "authExpireDays": "30"
}
```

現在の実装では value は文字列として保存します。

## 9. SSE / 補助 API

| Method | Path | 説明 | 認証 |
| --- | --- | --- | --- |
| `GET` | `/api/sse/[boardId]` | ボード単位の SSE ストリーム | 表示画面 |
| `GET` | `/api/sse` | 誤アクセス時の案内 | なし |
| `GET` | `/api/weather` | 設定地域の天気取得 | 内部向け / 表示向け |
| `GET` | `/api/network` | ローカル IPv4 を返す | 内部向け |
| `GET` | `/api/version` | 現在/最新バージョン情報 | 内部向け |

#### `GET /api/sse/[boardId]`

配信イベント例:

```text
event: media-updated
data: {}
```

#### `GET /api/weather`

- `settings.weatherCityId` を参照します。
- 30 分のインメモリキャッシュを使います。
- 返却内容は外部 API レスポンス互換の JSON です。

#### `GET /api/version`

返却例:

```json
{
  "current": "1.3.0",
  "releaseUrl": "https://github.com/HiroshiARAKI/Keinage/releases/tag/v1.3.0",
  "latest": "1.3.0",
  "latestUrl": "https://github.com/HiroshiARAKI/Keinage/releases/tag/v1.3.0",
  "hasUpdate": false
}
```

## 10. 非 API ルート

| Method | Path | 説明 |
| --- | --- | --- |
| `GET` | `/uploads/[...path]` | ストレージ上メディアの動的配信 |

このルートは standalone 配布時に、ローカル保存と Garage 保存のどちらでも同じ公開 URL で配信できるようにするための補助ルートです。