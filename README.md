# Keinage

> Open Source Signage — カスタマイズ可能なデジタルサイネージ

病院の待合室、スーパーマーケット、飲食店など、あらゆる場所で情報を掲示するためのフリーツールです。  
管理画面からコンテンツを登録するだけで、表示用の画面がリアルタイムに更新されます。

---

## 特徴

- **テンプレートベース** — 用途に合わせて複数のデザインテンプレートから選択可能
- **リアルタイム更新** — 管理画面や外部 API からの変更が即座にボードへ反映
- **外部連携 API** — REST API を通じて外部システムからメッセージを送信可能
- **かんたんデプロイ** — Docker Compose で 1 コマンド起動。外部 DB サーバー不要 (SQLite)
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
| フレームワーク | Next.js 15 (App Router) |
| スタイリング | Tailwind CSS v4 |
| UI コンポーネント | shadcn/ui |
| アニメーション | Framer Motion |
| ORM / DB | Drizzle ORM + SQLite |
| リアルタイム通信 | Server-Sent Events (SSE) |
| バリデーション | Zod |
| コンテナ | Docker |

詳しいアーキテクチャ設計は [DESIGN.md](DESIGN.md) を参照してください。

---

## クイックスタート

### 必要環境

- **Node.js** 20 以上
- **pnpm** 9 以上
- (オプション) **Docker** & **Docker Compose**

### Docker Compose で起動

```bash
git clone https://github.com/HiroshiARAKI/e-web-board.git
cd e-web-board
docker compose up -d
```

ブラウザで http://localhost:3000 にアクセスし、初回は管理者 PIN (6桁) を登録してください。

#### SMTP 設定 (任意)

PIN リセット時にメールで初期化リンクを送信したい場合は、`docker-compose.yml` の環境変数を設定してください。

```yaml
environment:
  - SMTP_HOST=smtp.example.com
  - SMTP_PORT=587
  - SMTP_USER=noreply@example.com
  - SMTP_PASS=your-password-here
  - SMTP_FROM=noreply@example.com
```

> **Note:** SMTP 未設定でもリセットリンクは画面に直接表示されます。

```bash
# 停止
docker compose down

# 停止 + データ削除
docker compose down -v
```

> **Note:** データ (SQLite DB、アップロードファイル) は Docker ボリュームに永続化されます。`docker compose down` ではデータは保持され、`-v` オプションを付けるとボリュームごと削除されます。

### ローカル開発

```bash
git clone https://github.com/HiroshiARAKI/e-web-board.git
cd e-web-board
pnpm install
pnpm db:migrate   # データベースのセットアップ
pnpm dev           # 開発サーバー起動
```

http://localhost:3000 にアクセスし、初回は管理者 PIN (6桁) を登録してください。

SMTP を設定する場合は `.env.example` をコピーして `.env` を作成してください。

```bash
cp .env.example .env
# .env を編集して SMTP 情報を入力
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

詳しい API 仕様は [DESIGN.md](DESIGN.md) を参照してください。

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
├── public/uploads/       # アップロードファイル
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