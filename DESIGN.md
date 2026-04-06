# e-Web Board Architecture

## 概要

e-Web Board は**表示画面（ボード）**と**管理画面（ダッシュボード）**の 2 つのビューで構成されるフルスタック Web アプリケーションです。  
管理画面でコンテンツを登録・編集し、表示画面がリアルタイムに更新される仕組みです。

```
┌──────────────┐   WebSocket / SSE    ┌──────────────────┐
│  表示画面     │ ◄────────────────── │  Next.js Server   │
│  (Board)     │                      │  (API Routes)     │
└──────────────┘                      └────────┬─────────┘
                                               │
┌──────────────┐   REST API / Server Actions   │
│  管理画面     │ ─────────────────────────────┘
│  (Dashboard) │          │
└──────────────┘          ▼
                   ┌──────────────┐
                   │   SQLite     │
                   │  (Database)  │
                   └──────────────┘
```

---

## 言語

- **TypeScript** (フロントエンド・バックエンド共通)

## フレームワーク・ライブラリ

| カテゴリ | 採用技術 | 選定理由 |
|---------|---------|---------|
| フルスタックフレームワーク | **Next.js 15** (App Router) | React ベースのフルスタックフレームワーク。SSR/SSG/API Routes を統合的に扱え、エコシステムが非常に充実している |
| スタイリング | **Tailwind CSS v4** | ユーティリティファーストで高速にUIを構築可能。テンプレートのカスタマイズとの相性が良い |
| UIコンポーネント | **shadcn/ui** | Tailwind ベースの高品質コンポーネント集。管理画面の構築を加速させる |
| アニメーション | **Framer Motion** | ボード表示のスライドショーやテキストスクロールなどリッチなアニメーションを宣言的に記述 |
| ORM / DB | **Drizzle ORM + SQLite** | 軽量で型安全な ORM。SQLite にすることで外部 DB サーバー不要、デプロイが容易 |
| リアルタイム通信 | **Server-Sent Events (SSE)** | 管理画面からの更新を表示画面にプッシュ。WebSocket より軽量で、一方向通知に最適 |
| バリデーション | **Zod** | TypeScript ファーストなスキーマバリデーション。API の入力検証やフォームバリデーションに活用 |
| ファイルストレージ | **ローカルファイルシステム** | 画像・動画のアップロード先。将来的に S3 互換ストレージへの差し替えも可能な設計とする |
| パッケージマネージャ | **pnpm** | 高速かつディスク効率の良い依存管理 |
| コンテナ | **Docker** | 本番環境での一貫したデプロイを実現 |

---

## ディレクトリ構成 (予定)

```
e-web-board/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (board)/            # 表示画面 (Route Group)
│   │   │   ├── [templateId]/   # テンプレート別ボード表示
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/        # 管理画面 (Route Group)
│   │   │   ├── boards/         # ボード一覧・編集
│   │   │   ├── media/          # メディア管理
│   │   │   ├── settings/       # 設定
│   │   │   └── layout.tsx
│   │   ├── api/                # API Routes
│   │   │   ├── boards/
│   │   │   ├── media/
│   │   │   ├── messages/       # 外部連携用メッセージ API
│   │   │   └── sse/            # Server-Sent Events エンドポイント
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── board/              # ボード表示用コンポーネント
│   │   │   ├── templates/      # テンプレート別コンポーネント
│   │   │   │   ├── SimpleBoard.tsx
│   │   │   │   ├── PhotoClockBoard.tsx
│   │   │   │   ├── RetroBoard.tsx
│   │   │   │   └── MessageBoard.tsx
│   │   │   ├── MediaSlider.tsx
│   │   │   └── TickerText.tsx
│   │   ├── dashboard/          # 管理画面用コンポーネント
│   │   └── ui/                 # shadcn/ui コンポーネント
│   ├── db/
│   │   ├── schema.ts           # Drizzle スキーマ定義
│   │   └── index.ts            # DB 接続
│   ├── lib/
│   │   ├── sse.ts              # SSE ユーティリティ
│   │   └── validators.ts       # Zod スキーマ
│   └── types/
│       └── index.ts            # 共通型定義
├── public/
│   └── uploads/                # アップロードファイル
├── drizzle/                    # マイグレーションファイル
├── docker/
│   └── Dockerfile
├── docker-compose.yml
├── tailwind.config.ts
├── next.config.ts
├── drizzle.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## データモデル

```
Board
├── id: string (UUID)
├── name: string              # ボード名
├── templateId: string        # 使用テンプレート ("simple" | "photo-clock" | "retro" | "message")
├── config: JSON              # テンプレート固有の設定 (色、フォント、速度 等)
├── isActive: boolean
├── createdAt: datetime
└── updatedAt: datetime

MediaItem
├── id: string (UUID)
├── boardId: string (FK → Board)
├── type: "image" | "video"
├── filePath: string
├── displayOrder: number
├── duration: number          # 表示秒数 (画像の場合)
├── createdAt: datetime
└── updatedAt: datetime

Message
├── id: string (UUID)
├── boardId: string (FK → Board)
├── content: string           # テキスト内容
├── priority: number          # 表示優先度
├── expiresAt: datetime | null
├── createdAt: datetime
└── updatedAt: datetime
```

---

## テンプレート設計

各テンプレートは共通インターフェースを実装し、プラグイン的に追加可能とする。

```typescript
interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  defaultConfig: Record<string, unknown>;
  component: React.ComponentType<BoardTemplateProps>;
}

interface BoardTemplateProps {
  board: Board;
  mediaItems: MediaItem[];
  messages: Message[];
}
```

### テンプレート一覧

| ID | 名前 | 概要 |
|----|------|------|
| `simple` | シンプル電子掲示板 | メイン領域で画像/動画スライドショー + 下部にティッカーテキスト |
| `photo-clock` | フォトクロック掲示板 | 全画面画像スライドショー + 日付時刻オーバーレイ。ロビーやエントランス向け |
| `retro` | レトロ掲示板 | ドットマトリクス風フォント、駅の案内板を模したクラシックデザイン |
| `message` | メッセージ掲示板 | 外部 API 経由で受信したメッセージをリアルタイム表示。待合室・呼び出し用途 |

---

## API 設計 (外部連携用)

外部システムからメッセージを送信するための REST API。

### `POST /api/messages`

ボードにメッセージを送信する。

```json
{
  "boardId": "uuid",
  "content": "〇〇様、3番窓口へお越しください",
  "priority": 1,
  "expiresAt": "2026-04-06T12:00:00Z"
}
```

### `DELETE /api/messages/:id`

メッセージを削除（表示終了）する。

### `GET /api/boards/:id/messages`

ボードに紐づくアクティブなメッセージ一覧を取得する。

---

## リアルタイム更新フロー

1. 管理画面 or 外部 API でコンテンツを更新
2. サーバーが SSE チャネルにイベントを発行
3. 表示画面は SSE を購読しており、イベントを受信
4. 差分データを取得し、ボード表示を即座に反映

---

## デプロイ

### Docker Compose (推奨)

```yaml
services:
  app:
    build: ./docker
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data          # SQLite DB
      - ./uploads:/app/public/uploads  # アップロードファイル
    environment:
      - DATABASE_URL=file:./data/e-web-board.db
```

### 手動起動

```bash
pnpm install
pnpm build
pnpm start
```

---

## 今後の拡張候補

- テンプレートの追加 (天気表示、ニュースフィード連携 等)
- 複数ボードのスケジュール制御 (時間帯別に表示内容を切り替え)
- ユーザー認証・マルチテナント対応
- S3 互換ストレージへのメディアアップロード
- PWA 対応 (オフラインキャッシュ)
