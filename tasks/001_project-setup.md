# Task 001: プロジェクト初期セットアップ

## ステータス
- [ ] 完了

## 概要
Next.js 15 (App Router) + TypeScript のプロジェクトを初期化し、基本的な開発環境を構築する。

## やること
- [ ] `pnpm create next-app` でプロジェクト作成 (TypeScript, App Router, Tailwind CSS v4)
- [ ] ESLint / Prettier の設定
- [ ] shadcn/ui の初期化
- [ ] Framer Motion のインストール
- [ ] Drizzle ORM + better-sqlite3 のインストール
- [ ] Zod のインストール
- [ ] ディレクトリ構成の作成 (DESIGN.md に準拠)
  - `src/app/(board)/`, `src/app/(dashboard)/`, `src/app/api/`
  - `src/components/board/templates/`, `src/components/dashboard/`, `src/components/ui/`
  - `src/db/`, `src/lib/`, `src/types/`
- [ ] `tsconfig.json` のパスエイリアス設定 (`@/`)
- [ ] `.gitignore` に `data/`, `public/uploads/` を追加
- [ ] 開発サーバーが正常に起動することを確認

## 完了条件
`pnpm dev` で Next.js 開発サーバーが起動し、空のページが表示される。
