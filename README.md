# e-Web Board

> Web 上で動作する、カスタマイズ可能な電子掲示板ツール

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

<!-- TODO: スクリーンショット -->

メイン領域で画像や動画をスライドショー形式で表示し、下部にテキストメッセージをティッカー (横スクロール) で流すデザインです。  
店舗のプロモーション表示や施設案内に最適です。

### レトロな掲示板

<!-- TODO: スクリーンショット -->

駅の案内板を模した、ドットマトリクス風のクラシックなデザインです。  
独特のレトロな雰囲気で、カフェやイベント会場などの掲示に映えます。

### フォトクロック掲示板

<!-- TODO: スクリーンショット -->

画像のスライドショーを全画面で表示しつつ、現在の日付と時刻を常時オーバーレイ表示するデザインです。  
オフィスのロビーやエントランス、ホテルのラウンジなどに最適です。

### メッセージ掲示板

<!-- TODO: スクリーンショット -->

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

ブラウザで http://localhost:3000 にアクセスしてください。

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

http://localhost:3000 で管理画面、http://localhost:3000/board/[id] でボード表示画面を確認できます。

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

## ロードマップ

- [ ] シンプル掲示板テンプレート
- [ ] フォトクロック掲示板テンプレート
- [ ] レトロ掲示板テンプレート
- [ ] メッセージ掲示板テンプレート
- [ ] 管理画面 (ボード作成・編集)
- [ ] メディアアップロード機能
- [ ] 外部連携 REST API
- [ ] Docker イメージ公開
- [ ] テンプレートのスケジュール制御 (時間帯別切り替え)
- [ ] ユーザー認証

---

## コントリビューション

Issue や Pull Request は歓迎します。  
バグ報告や機能リクエストは GitHub Issues よりお願いいたします。

---

## ライセンス

<!-- TODO: ライセンスを決定する -->