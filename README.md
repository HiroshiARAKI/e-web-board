# Keinage

> Open Source Signage — カスタマイズ可能なデジタルサイネージ

病院の待合室、スーパーマーケット、飲食店など、あらゆる場所で情報を掲示するためのフリーツールです。  
管理画面からコンテンツを登録するだけで、表示用の画面がリアルタイムに更新されます。

---

## 特徴

- **テンプレートベース** — 用途に合わせて複数のデザインテンプレートから選択可能
- **リアルタイム更新** — 管理画面や外部 API からの変更が即座にボードへ反映
- **外部連携 API** — REST API を通じて外部システムからメッセージを送信可能
- **かんたんデプロイ** — Docker Compose でアプリと PostgreSQL をまとめて起動
- **フルカスタマイズ** — 色、フォント、表示速度などをボードごとに調整

---

## テンプレート

### シンプルな電子掲示板
![Simple Board](./screenshots/e-web-board-simple.png)

メイン領域で画像や動画をスライドショー形式で表示し、下部にテキストメッセージをティッカー (横スクロール) で流すデザインです。  
店舗のプロモーション表示や施設案内に最適です。

### レトロな掲示板
![Retro Board](./screenshots/e-web-board-retro.png)

駅の案内板を模した、ドットマトリクス風のクラシックなデザインです。  
独特のレトロな雰囲気で、カフェやイベント会場などの掲示に映えます。

### フォトクロック掲示板
![Clock Board](./screenshots/e-web-board-clock.png)

画像のスライドショーを全画面で表示しつつ、現在の日付と時刻を常時オーバーレイ表示するデザインです。  
オフィスのロビーやエントランス、ホテルのラウンジなどに最適です。

### メッセージ掲示板
![Message Board](./screenshots/e-web-board-messages.png)

外部システムから API 経由で受信したメッセージをリアルタイムに表示するデザインです。  
病院の待合室での呼び出しや、飲食店の番号呼び出しなどに活用できます。

> **Note:** 情報送信側は本アプリの REST API を叩いて送信できます。送信側ソフトウェアは別途ご用意ください。

---

## 技術スタック

| カテゴリ | 技術 |
|---------|------|
| 言語 | TypeScript |
| フレームワーク | Next.js 16 (App Router) |
| スタイリング | Tailwind CSS v4 |
| UI コンポーネント | shadcn/ui |
| アニメーション | Framer Motion |
| ORM / DB | Drizzle ORM + PostgreSQL |
| リアルタイム通信 | Server-Sent Events (SSE) |
| バリデーション | Zod |
| コンテナ | Docker |

詳しい情報は以下を参照してください。

- [docs/SPEC.md](docs/SPEC.md) — 利用者向け仕様
- [docs/DESIGN.md](docs/DESIGN.md) — アーキテクチャ / 設計
- [docs/API.md](docs/API.md) — HTTP API 一覧

---

## クイックスタート

### 必要環境

- **Node.js** 20 以上
- **pnpm** 9 以上
- (オプション) **Docker** & **Docker Compose**

### Docker Compose で起動

```bash
git clone https://github.com/HiroshiARAKI/Keinage.git
cd Keinage
docker compose up -d
```

`docker compose up -d` でアプリ本体と PostgreSQL コンテナが同時に起動します。

Docker Compose の既定構成では、メディア保存先はローカル `uploads/` ディレクトリです。
必要に応じて、S3 互換のあるストレージサービスを利用できます。

```yaml
environment:
  - S3_ENDPOINT=http://rustfs:9000
  - S3_REGION=us-east-1
  - S3_BUCKET=keinage-media
  - S3_ACCESS_KEY_ID=rustfsadmin
  - S3_SECRET_ACCESS_KEY=rustfsadmin
  - S3_FORCE_PATH_STYLE=true
```

`docker-compose.yml` には rustfs のコメント例を残していますが、alpha 版のため既定では起動しません。

### RustFS に切り替える最短手順

1. `docker-compose.yml` の `rustfs` サービスコメントを外す
2. `.env` で次を有効化する
  `S3_INTERNAL_ENDPOINT=http://rustfs:9000`
  `S3_REGION=us-east-1`
  `S3_BUCKET=keinage-media`
  `S3_ACCESS_KEY_ID=rustfsadmin`
  `S3_SECRET_ACCESS_KEY=rustfsadmin`
  `S3_FORCE_PATH_STYLE=true`
3. `docker compose up -d db rustfs app` を実行する
4. RustFS の Web UI (`http://127.0.0.1:9001/`) で `keinage-media` バケットを作成する

この状態で app は自動的にローカル `uploads/` ではなく RustFS に保存します。Docker Compose 内の app は `S3_INTERNAL_ENDPOINT` を優先して使うため、`127.0.0.1` ではなく `rustfs:9000` へ接続されます。`S3_ACCESS_KEY_ID` と `S3_SECRET_ACCESS_KEY` は、rustfs 側の `RUSTFS_ACCESS_KEY` / `RUSTFS_SECRET_KEY` と同じ値を使ってください。

ブラウザで http://localhost:3000 にアクセスし、初回は管理者アカウント
（ユーザーID・メールアドレス・パスワード）を登録し、そのまま 6 桁 PIN を設定してください。

#### SMTP 設定 (任意)

Owner 登録リンクと PIN リセットリンクをメール送信したい場合は、公開 URL と SMTP を設定してください。

```yaml
environment:
  - APP_PUBLIC_ORIGIN=https://keinage.example.com
  - SMTP_HOST=smtp.example.com
  - SMTP_PORT=587
  - SMTP_USER=noreply@example.com
  - SMTP_PASS=your-password-here
  - SMTP_FROM=noreply@example.com
```

> **Note:** SMTP 未設定時、未認証の Owner signup / PIN reset メールフローは既定で無効です。
> ローカル開発で signup 直リンクのプレビューを使う場合だけ、`.env` に `ALLOW_UNAUTHENTICATED_SIGNUP_PREVIEW=true` を設定し、`APP_PUBLIC_ORIGIN` を `http://localhost:3000` のような localhost origin にしてください。

```bash
# 停止
docker compose down

# 停止 + データ削除
docker compose down -v
```

> **Note:** データ (PostgreSQL DB、アップロードファイル) は Docker ボリュームに永続化されます。`docker compose down` ではデータは保持され、`-v` オプションを付けるとボリュームごと削除されます。

### ローカル開発

```bash
git clone https://github.com/HiroshiARAKI/Keinage.git
cd Keinage
docker compose up -d db
cp .env.example .env
pnpm install
pnpm db:migrate   # データベースのセットアップ
pnpm dev           # 開発サーバー起動
```

開発時の既定 `DATABASE_URL` は `postgresql://postgres:postgres@127.0.0.1:5432/keinage` です。別の PostgreSQL を使う場合は `.env` で上書きしてください。

ローカル開発でも S3 互換のあるストレージサービスを使う場合は `.env` に `S3_*` 設定を追加してください。`pnpm dev` では `S3_ENDPOINT=http://127.0.0.1:9000`、Docker Compose では `S3_INTERNAL_ENDPOINT=http://rustfs:9000` を使い分けます。`.env.example` には rustfs を例にした具体値を入れています。

http://localhost:3000 にアクセスし、初回は管理者アカウント
（ユーザーID・メールアドレス・パスワード）を登録し、そのまま 6 桁 PIN を設定してください。

SMTP を使う場合は `.env` に `APP_PUBLIC_ORIGIN` と `SMTP_*` を追記してください。ローカル開発でのみ signup 直リンクプレビューを許可したい場合は、追加で `ALLOW_UNAUTHENTICATED_SIGNUP_PREVIEW=true` を設定します。

```bash
cp .env.example .env
# .env を編集して S3 / APP_PUBLIC_ORIGIN / SMTP 情報を入力
```

---

## API (外部連携)

外部システムからボードにメッセージを送信するための REST API を提供しています。

### メッセージ送信

```bash
curl -X POST http://localhost:3000/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "boardId": "your-board-id",
    "content": "〇〇様、3番窓口へお越しください",
    "priority": 1
  }'
```

### メッセージ削除

```bash
curl -X DELETE http://localhost:3000/api/messages/{messageId}
```

詳しい API 仕様は [docs/API.md](docs/API.md) を参照してください。

## ドキュメント

- [docs/SPEC.md](docs/SPEC.md) — 利用者向け仕様
- [docs/DESIGN.md](docs/DESIGN.md) — アーキテクチャ / 設計判断
- [docs/API.md](docs/API.md) — Route Handler / 補助ルート一覧

---

## プロジェクト構成

```
e-web-board/
├── src/
│   ├── app/              # Next.js App Router (ページ・API)
│   ├── components/       # React コンポーネント
│   │   ├── board/        #   ボード表示用 (テンプレート含む)
│   │   ├── dashboard/    #   管理画面用
│   │   └── ui/           #   共通 UI (shadcn/ui)
│   ├── db/               # Drizzle スキーマ・DB接続
│   ├── lib/              # ユーティリティ
│   └── types/            # 型定義
├── uploads/              # ローカル保存時のアップロードファイル
├── docker/               # Dockerfile
└── docker-compose.yml
```

---

## 開発コマンド

| コマンド | 説明 |
|---------|------|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | プロダクションビルド |
| `pnpm start` | プロダクションサーバー起動 |
| `pnpm db:migrate` | DB マイグレーション実行 |
| `pnpm db:generate` | Drizzle マイグレーション生成 |
| `pnpm db:studio` | Drizzle Studio (DB GUI) 起動 |
| `pnpm lint` | ESLint 実行 |

---

## コントリビューション

Issue や Pull Request は歓迎します。  
バグ報告や機能リクエストは GitHub Issues よりお願いいたします。

---

## 謝辞

- 天気予報データは [天気予報 API（livedoor 天気互換）](https://weather.tsukumijima.net/) を利用させていただいています。

---

## ライセンス

このプロジェクトは [Apache License 2.0](LICENSE) の下でライセンスされています。

詳しくは [LICENSE](LICENSE) ファイルおよび [NOTICE](NOTICE) ファイルをご参照ください。