# e-Web Board v2 — Hosted (SaaS) 版 設計書

## 背景・目的

e-Web Board のセルフホスト版 (v1) は Docker や Node.js の知識が必要であり、技術に明るくないユーザーにとってはハードルが高い。  
v2 では**デプロイ済みのホスティング版**を提供し、ブラウザだけで掲示板を作成・運用できるサービスとして展開する。

**基本方針:**  
シンプルなテンプレート + 画像 2 枚までは **無料**。それ以上の利用は有料プランで提供する。

---

## プラン設計

| | Free | Paid |
|---|---|---|
| 月額 | **¥0** | **未定** |
| ボード数 | 1 | 無制限 |
| 利用可能テンプレート | `simple` のみ | 全テンプレート |
| メディアアップロード | 画像 **2 枚**まで | 上限未定 (画像・動画) |
| ストレージ | 50 MB | 未定 |
| メッセージ API | - | ✅ |
| カスタムドメイン | - | 未定 |
| ロゴ非表示 (ホワイトラベル) | - | ✅ |
| サポート | コミュニティ | 未定 |

> **Note:** Paid プランの価格・上限値は今後決定する。

---

## 無料プランの制約詳細

- テンプレートは `simple` (シンプル電子掲示板) のみ利用可能
- アップロード可能な画像は **2 枚**まで (JPEG / PNG / WebP、1 枚あたり 5 MB 以内)
- 動画アップロード不可
- ボード表示画面のフッターに「Powered by e-Web Board」のウォーターマークを表示
- メッセージ API (外部連携) は利用不可
- SSE によるリアルタイム更新は利用可能

---

## アーキテクチャ (v1 からの変更点)

### マルチテナント化

v1 のシングルテナント構成から、マルチテナント型 SaaS へ拡張する。

```
┌──────────────────────────────┐
│       e-Web Board Cloud      │
├──────────────────────────────┤
│                              │
│  ┌──────────┐  ┌──────────┐ │     ┌──────────────┐
│  │ Tenant A │  │ Tenant B │ │ ◄── │   認証/課金   │
│  │ (Free)   │  │ (Paid)   │ │     │   Gateway     │
│  └──────────┘  └──────────┘ │     └──────────────┘
│                              │
│  ┌────────────────────────┐  │
│  │   共有インフラ          │  │
│  │   PostgreSQL / S3      │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

### 技術スタック差分

| カテゴリ | v1 (セルフホスト) | v2 (Hosted) |
|---------|------------------|-------------|
| DB | SQLite | **PostgreSQL** (マルチテナント対応) |
| ファイルストレージ | ローカルファイルシステム | **S3 互換ストレージ** (R2 / MinIO) |
| 認証 | なし | **NextAuth.js** (Google / GitHub / Email) |
| 課金 | なし | **Stripe** |
| ホスティング | セルフ (Docker) | **Vercel** or **Fly.io** |
| CDN | なし | **Cloudflare** |
| メール | なし | **Resend** |

> v1 のコードベースを共有しつつ、環境変数で動作モード (`self-hosted` / `cloud`) を切り替える設計とする。

---

## データモデル拡張

v1 のスキーマに以下を追加する。

```
Tenant
├── id: string (UUID)
├── name: string                  # 組織名
├── plan: "free" | "paid"
├── stripeCustomerId: string | null
├── stripeSubscriptionId: string | null
├── createdAt: datetime
└── updatedAt: datetime

User
├── id: string (UUID)
├── tenantId: string (FK → Tenant)
├── email: string
├── name: string
├── role: "owner" | "admin" | "editor"
├── createdAt: datetime
└── updatedAt: datetime

UsageRecord
├── id: string (UUID)
├── tenantId: string (FK → Tenant)
├── month: string                 # "2026-04" 形式
├── mediaCount: number
├── mediaBytes: number
├── apiCallCount: number
├── createdAt: datetime
└── updatedAt: datetime
```

既存の `Board` / `MediaItem` / `Message` テーブルには `tenantId` カラムを追加し、テナント分離を行う。

---

## プラン制限の実装方針

### ミドルウェアによるゲーティング

```typescript
// 簡略化した制限チェックの例
async function checkPlanLimits(tenantId: string, action: PlanAction) {
  const tenant = await getTenant(tenantId);
  const usage = await getCurrentUsage(tenantId);
  const limits = PLAN_LIMITS[tenant.plan];

  switch (action) {
    case "create_board":
      if (usage.boardCount >= limits.maxBoards) {
        throw new PlanLimitError("ボード数の上限に達しました");
      }
      break;
    case "upload_media":
      if (usage.mediaCount >= limits.maxMedia) {
        throw new PlanLimitError("メディアアップロード数の上限に達しました");
      }
      break;
    case "use_template":
      if (!limits.allowedTemplates.includes(templateId)) {
        throw new PlanLimitError("このテンプレートは現在のプランでは利用できません");
      }
      break;
  }
}
```

### プラン別定数定義

```typescript
const PLAN_LIMITS = {
  free: {
    maxBoards: 1,
    maxMedia: 2,
    maxStorageBytes: 50 * 1024 * 1024,      // 50 MB
    maxApiCalls: 0,
    allowedTemplates: ["simple"],
    showWatermark: true,
    customDomain: false,
  },
  paid: {
    maxBoards: Infinity,                     // TODO: 上限未定
    maxMedia: Infinity,                      // TODO: 上限未定
    maxStorageBytes: Infinity,               // TODO: 上限未定
    maxApiCalls: Infinity,                   // TODO: 上限未定
    allowedTemplates: ["simple", "photo-clock", "retro", "message"],
    showWatermark: false,
    customDomain: true,                      // TODO: 未定
  },
} as const;
```

---

## 課金フロー (Stripe)

```
ユーザー                  e-Web Board              Stripe
  │                          │                       │
  ├── プランアップグレード ──►│                       │
  │                          ├── Checkout Session ──►│
  │  ◄── リダイレクト ───────┤                       │
  │                          │                       │
  │  (決済完了)              │  ◄── Webhook ─────────┤
  │                          │     (checkout.session  │
  │                          │      .completed)       │
  │                          ├── Tenant.plan 更新     │
  │  ◄── 完了通知 ──────────┤                       │
```

- **Stripe Checkout** で決済画面を生成 (PCI DSS 準拠を Stripe 側に委任)
- **Webhook** でサブスクリプションの状態変更を受信し DB に反映
- プランのダウングレード時は次回請求サイクルの末日に反映

---

## 認証・認可

| 項目 | 方式 |
|------|------|
| 認証 | NextAuth.js (OAuth: Google, GitHub / Magic Link: Email) |
| セッション管理 | JWT (短命) + Refresh Token (DB) |
| 認可 | テナント内ロールベース (Owner / Admin / Editor) |
| API キー | メッセージ API 用。テナント単位で発行、ダッシュボードで管理 |

---

## ボード公開 URL 設計

| プラン | URL パターン |
|--------|-------------|
| Free | `https://board.e-web-board.com/{tenantSlug}/{boardSlug}` |
| Paid (カスタムドメイン) | `https://info.example.com/{boardSlug}` |

- テナントスラグはサインアップ時に設定 (変更可能)
- カスタムドメインは CNAME 設定 + TLS 自動発行 (Cloudflare for SaaS)

---

## デプロイ構成

```
                   ┌─────────────┐
                   │ Cloudflare  │
          CDN /    │ (DNS, WAF,  │
          TLS      │  R2 Storage)│
                   └──────┬──────┘
                          │
                   ┌──────▼──────┐
                   │   Vercel    │
                   │  (Next.js)  │
                   └──────┬──────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
       ┌──────▼──┐  ┌────▼────┐  ┌──▼──────┐
       │ Neon    │  │ Stripe  │  │ Resend  │
       │ (PgSQL) │  │ (課金)  │  │ (メール) │
       └─────────┘  └─────────┘  └─────────┘
```

### 候補技術

| コンポーネント | 選択肢 | 備考 |
|--------------|--------|------|
| アプリホスティング | Vercel / Fly.io | Vercel は Next.js との親和性が高い。Fly.io はコンテナベースで自由度が高い |
| DB | Neon / Supabase (PostgreSQL) | サーバーレス PostgreSQL。接続プール内蔵 |
| ファイルストレージ | Cloudflare R2 | S3 互換かつエグレス無料 |
| CDN / DNS | Cloudflare | カスタムドメインの TLS 自動化にも対応 |
| メール配信 | Resend | 開発者フレンドリーなメール API |

---

## マイグレーション戦略 (v1 → v2)

セルフホスト版 (v1) とクラウド版 (v2) のコードベースは共有し、環境変数で分岐する。

```typescript
// src/lib/config.ts
const isCloud = process.env.DEPLOYMENT_MODE === "cloud";

export const config = {
  isCloud,
  storage: isCloud ? "r2" : "local",
  database: isCloud ? "postgresql" : "sqlite",
  auth: isCloud ? "nextauth" : "none",
};
```

- v1 ユーザーは引き続きセルフホスト版を無料で利用可能 (OSS 維持)
- v2 のクラウド版は v1 の全機能を包含した上位互換

---

## ロードマップ

### Phase 1: MVP (v2.0)

- [ ] マルチテナント対応 (PostgreSQL 移行)
- [ ] NextAuth.js による認証
- [ ] Stripe Checkout によるサブスクリプション課金
- [ ] Free / Paid プランの実装
- [ ] S3 互換ストレージへのメディアアップロード
- [ ] テナント別ボード公開 URL
- [ ] ウォーターマーク表示 (Free プラン)

### Phase 2: 安定化 (v2.1)

- [ ] カスタムドメイン対応 (Pro プラン)
- [ ] 利用量ダッシュボード (使用状況の可視化)
- [ ] API キー管理画面
- [ ] Webhook による外部通知 (Slack 等)
- [ ] メール通知 (プラン上限接近、請求)

### Phase 3: グロース (v2.2+)

- [ ] チームメンバー招待・権限管理
- [ ] テンプレートマーケットプレイス (コミュニティ製テンプレート)
- [ ] アナリティクス (ボード閲覧数、表示時間)
- [ ] 年間プラン割引
- [ ] Enterprise プラン (専用インフラ、SSO、監査ログ)
