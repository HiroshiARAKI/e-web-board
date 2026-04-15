# Keinage — CLAUDE.md

> **最終更新: 2026-04-14**

## アプリ概要

Keinage はカスタマイズ可能なデジタルサイネージ Web アプリ。  
**表示画面（ボード）** と **管理画面（ダッシュボード）** の 2 ビュー構成で、管理画面の操作が SSE 経由でボードにリアルタイム反映される。

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| フレームワーク | Next.js 16 (App Router, standalone output) |
| 言語 | TypeScript (strict) |
| UI | React 19, Tailwind CSS v4, shadcn/ui |
| アニメーション | Framer Motion |
| DB | Drizzle ORM + SQLite (better-sqlite3, WAL mode) |
| リアルタイム | Server-Sent Events (SSE) |
| バリデーション | Zod |
| 認証 | 6桁 PIN (SHA-256 hash, cookie session) |
| メール | nodemailer (SMTP, PIN リセット用) |
| 画像処理 | sharp |
| パッケージマネージャ | pnpm |
| コンテナ | Docker (multi-stage build) |

## ソースの構成

```
src/
├── app/
│   ├── (board)/           # 表示画面 — /[boardId] でボード表示
│   ├── (dashboard)/       # 管理画面 — /boards, /settings 等
│   │   └── layout.tsx     # PIN 認証ゲート
│   ├── api/               # REST API Routes
│   │   ├── boards/        # ボード CRUD
│   │   ├── media/         # メディア CRUD (画像/動画アップロード)
│   │   ├── messages/      # メッセージ CRUD (外部連携用)
│   │   ├── auth/pin/      # PIN 認証 (setup/verify/change/forgot/reset/logout)
│   │   ├── settings/      # KV 設定
│   │   ├── sse/           # SSE エンドポイント
│   │   └── weather/       # 天気情報プロキシ
│   └── pin/               # PIN 認証ページ (login/setup/forgot/reset)
├── components/
│   ├── board/             # ボード表示コンポーネント
│   │   └── templates/     # テンプレート実装 (Simple, PhotoClock, Retro, Message, CallNumber)
│   ├── dashboard/         # 管理画面コンポーネント
│   │   └── config-editors/ # テンプレート別設定エディタ
│   └── ui/                # shadcn/ui コンポーネント
├── db/
│   ├── schema.ts          # Drizzle スキーマ (boards, mediaItems, messages, settings, pinResetTokens, pinAttempts)
│   └── index.ts           # DB 接続 (lazy proxy)
├── hooks/
│   └── useSSE.ts          # SSE 購読フック
├── lib/
│   ├── fonts.ts           # Google Fonts 定義
│   ├── image.ts           # 画像リサイズ・サムネイル生成
│   ├── mail.ts            # SMTP メール送信
│   ├── pin.ts             # PIN ハッシュ・セッション管理
│   ├── sse.ts             # SSE チャネル管理
│   ├── templates.ts       # テンプレートレジストリ
│   ├── validators.ts      # Zod スキーマ
│   └── utils.ts           # ユーティリティ
└── types/
    └── index.ts           # 共通型定義
```

その他:
- `drizzle/` — マイグレーション SQL
- `docker/` — Dockerfile, entrypoint.sh, migrate.cjs
- `public/uploads/` — アップロードファイル
- `scripts/seed.ts` — DB シードスクリプト

## アーキテクチャ・設計思想

- **テンプレートシステム**: `BoardTemplate` インターフェースを実装するプラグイン方式。テンプレート追加は `src/components/board/templates/` に実装し `src/lib/templates.ts` に登録するだけ。
- **リアルタイム更新**: API mutation 後に `emitSSE(boardId, event)` を呼び出し → 表示画面の `useSSE` フックでイベント受信 → データ再取得。
- **DB 接続**: Lazy proxy パターンで初回アクセス時に接続。Next.js ビルド時の並行モジュール評価による SQLITE_BUSY を回避。
- **設定 (Settings)**: KV ストア (`settings` テーブル) で管理。PIN ハッシュやメールアドレスなどもここに保存。
- **認証**: ダッシュボードは PIN 認証で保護。IP ベースのレート制限 (5回/24h)、セッション Cookie (24h TTL)。
- **ファイルストレージ**: ローカルファイルシステム (`public/uploads/`)。アップロード時に自動リサイズ + サムネイル生成。

## テスト方針

- 現時点ではテストフレームワーク未導入。
- API ルートの動作確認は手動テストおよび `curl` で実施。
- `pnpm build` が通ることをデプロイ前の最低限のチェックとする。
- `pnpm lint` (ESLint) でコード品質を担保。
