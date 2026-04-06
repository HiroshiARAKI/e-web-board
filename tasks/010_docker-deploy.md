# Task 010: Docker イメージ・デプロイ構成

## ステータス
- [ ] 完了

## 概要
Docker Compose で 1 コマンドで起動できるデプロイ構成を整備する。

## やること
- [ ] `docker/Dockerfile` の作成
  - マルチステージビルド (deps → build → runner)
  - Node.js 20 slim ベース
  - pnpm でのビルド
  - 最小限のランタイムイメージ
- [ ] `docker-compose.yml` の作成
  - ボリュームマウント (SQLite DB, アップロードファイル)
  - 環境変数の設定
  - ポート 3000 の公開
  - ヘルスチェック設定
- [ ] `.dockerignore` の作成
- [ ] ビルド・起動・停止の動作確認
  - `docker compose up -d` でコンテナが起動する
  - `docker compose down` で停止する
  - データ (DB, アップロードファイル) がボリュームに永続化される
- [ ] README.md の Docker セクションと実際の動作が一致することを確認

## 完了条件
`docker compose up -d` でアプリが起動し、ブラウザからアクセスしてボードの作成・表示ができる。コンテナ再起動後もデータが保持される。
