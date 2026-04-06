# Task 007: 管理画面 (ダッシュボード)

## ステータス
- [ ] 完了

## 概要
ボードの作成・編集・削除やメディア管理を行う管理画面 (ダッシュボード) を実装する。

## やること

### ボード管理
- [ ] `src/app/(dashboard)/layout.tsx` — ダッシュボード共通レイアウト (サイドバー + ヘッダー)
- [ ] `src/app/(dashboard)/boards/page.tsx` — ボード一覧画面
  - ボードのカード表示 (名前、テンプレート、ステータス)
  - 新規作成ボタン
- [ ] `src/app/(dashboard)/boards/new/page.tsx` — ボード新規作成画面
  - テンプレート選択
  - ボード名入力
- [ ] `src/app/(dashboard)/boards/[boardId]/page.tsx` — ボード編集画面
  - テンプレート固有の設定 (config) の編集フォーム
  - メディアの追加・並べ替え・削除
  - メッセージの管理
  - ボードプレビュー (別タブで表示)
  - ボードの有効/無効切り替え
  - ボードの削除

### API (内部用)
- [ ] `POST /api/boards` — ボード作成
- [ ] `GET /api/boards` — ボード一覧取得
- [ ] `GET /api/boards/:id` — ボード詳細取得
- [ ] `PATCH /api/boards/:id` — ボード更新
- [ ] `DELETE /api/boards/:id` — ボード削除

## 完了条件
管理画面からボードを作成し、テンプレートと設定を選択・編集できる。ボード表示ページで設定が反映される。
