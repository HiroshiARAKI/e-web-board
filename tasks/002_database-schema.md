# Task 002: データベーススキーマ・基盤構築

## ステータス
- [ ] 完了

## 概要
Drizzle ORM で DESIGN.md に定義されたデータモデル (Board / MediaItem / Message) を実装し、マイグレーションの仕組みを整える。

## やること
- [ ] `src/db/schema.ts` に Board / MediaItem / Message テーブルを定義
- [ ] `src/db/index.ts` に DB 接続処理を実装
- [ ] `drizzle.config.ts` の作成
- [ ] マイグレーション生成・適用の npm スクリプト追加
  - `pnpm db:generate` — マイグレーションファイル生成
  - `pnpm db:migrate` — マイグレーション適用
  - `pnpm db:studio` — Drizzle Studio 起動
- [ ] `src/types/index.ts` に Drizzle スキーマから推論した型を export
- [ ] `src/lib/validators.ts` に Zod スキーマ (Board / MediaItem / Message の作成・更新用) を定義
- [ ] 初回マイグレーションを実行し、SQLite DB ファイルが生成されることを確認

## 完了条件
`pnpm db:migrate` でテーブルが作成され、`pnpm db:studio` で Drizzle Studio からテーブル構造を確認できる。
