# GlassTask

モバイルファーストのタスク管理アプリ。開いた瞬間にメモが書け、フリックでステータスを動かす。
フロントは React、バックエンドは Cloudflare Workers + D1 + Workers AI、ログインは Google のみ。

```
開く → スケルトン表示中からメモ入力にフォーカス済み → Enter で Todo に追加
カードを右フリック → Todo → Doing → Done
カードを左フリック → 1 つ戻す（Todo で左フリックは削除、トーストから元に戻せる）
カードをタップ → 詳細シート（タイトル・ノート・ステータス・AI・削除）
✦ ボタン → Workers AI がメモをタスク名と次の一手に整える
```

ログインしなくても使える（ブラウザ内に保存）。Google でログインするとその場でクラウドへ移行し、以後は D1 に保存される。

## 技術選定と理由

| 領域 | 採用 | 理由 |
| --- | --- | --- |
| ホスティング / API | **Cloudflare Workers + Static Assets** | 要件が「バックエンドは Cloudflare」。Pages + Functions ではなく Workers 単体に静的アセットを同梱すると、デプロイ単位が 1 つになり、`/api/*` だけ Worker を先に通す (`run_worker_first`) 設定で SPA と API を同一オリジンに置ける。同一オリジンなので CORS も CSRF 対策用の余計なヘッダも不要。 |
| DB | **Cloudflare D1** | タスクは「ユーザー ID で分割された小さな行」で、SQLite の D1 と相性が良い。KV は一覧・更新の整合性が取りにくく、Durable Objects はこの規模では過剰。マイグレーションを `wrangler d1 migrations` で管理できる。 |
| AI | **Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`)** | 要件。日本語の整形品質が高く、fp8 量子化の高速版なので 1 秒前後で返る。旧 `llama-3.1-8b-instruct` は 2026-05 に廃止済み。`response_format: json_schema` で JSON を強制し、失敗時は必ずヒューリスティックへフォールバックして UI を止めない。 |
| API フレームワーク | **Hono** | Workers ネイティブで極小・高速。ルーター、Cookie ヘルパー、型付き Bindings/Variables が揃っていて、D1・AI の型と素直に組み合わせられる。 |
| 認証 | **Google OAuth 2.0 (PKCE) + サーバーセッション** | 要件が「Google 認証のみ」。OAuth クライアントは [`arctic`](https://arcticjs.dev) を採用（Web 標準 API だけで動き、Workers で使える）。セッションは JWT ではなく **D1 のセッション行 + HttpOnly / SameSite=Lax Cookie** にした。即時失効ができ、トークンがクライアントに露出しない。 |
| フロント | **React 19 + Vite 8 + TypeScript** | `@cloudflare/vite-plugin` が Vite の開発サーバー内で Worker を実際に動かすため、フロント・API・D1 を 1 プロセスで開発できる。React 19 は `motion` のレイアウトアニメーションと相性が良く、エコシステムも最大。 |
| アニメーション | **motion (旧 Framer Motion)** | 「フリックでステータス管理」はジェスチャとアニメーションが一体で必要。`drag` / `dragElastic` / `useMotionValue` で引っ張り量に応じたヒント表示、`AnimatePresence` + `layout` でリスト出入りの連動、`layoutId` でタブのインジケータ移動、をすべて同じライブラリで実現できる。 |
| スタイル | **Tailwind CSS v4** | ユーティリティで余計な CSS ファイルを増やさず、Liquid Glass のレイヤー（`backdrop-filter`、二重の inset shadow、擬似要素のハイライト）は `index.css` の `.glass` に集約。v4 は Vite プラグインだけで設定ファイルが不要。 |
| 状態管理 | **自前フック (`useTasks`)** | 状態は「タスク配列」だけ。Redux 等は不要。楽観更新 + 失敗時ロールバック、タスク ID ごとの API 直列化（追加直後のフリックが先に届かないように）、ゲスト (localStorage) / クラウド (D1) の切替をここに閉じ込めた。 |
| テスト | **Playwright（モバイル Chromium + WebKit）** | 実ブラウザでフリック・シート・ログイン・同期を操作して検証する。iPhone 相当は WebKit で動かすことで、Safari 固有のポインタ挙動（本プロジェクトでも 1 件検出）まで拾える。 |
| CI | **GitHub Actions** | 型チェック → ビルド → E2E（D1 はローカルモード）を毎 push で実行。Cloudflare のログインなしで回る構成にしている。 |

### 設計上のこだわり

- **開いた瞬間メモ**: 全画面スケルトンの下で入力欄だけは最初から生きていて自動フォーカス。スケルトン中に打った文字は失われず、そのまま Enter できる。
- **ログイン壁がない**: 未ログインでも使え、ログインした瞬間にブラウザ内のタスクを `/api/tasks/import` で移行する。
- **AI は失敗しない**: Workers AI が使えない環境（ローカル、タイムアウト、パース失敗）でも必ず `source: "fallback"` で応答する。
- **キャッチコピーなし**: 画面上の文字は機能ラベルだけ。E2E テストで宣伝文言が混入しないことも検査している。

## 構成

```
worker/          Hono API（auth / tasks / ai / db）
src/             React アプリ
shared/types.ts  API の型契約（フロント・バック共用）
migrations/      D1 スキーマ
e2e/             Playwright テスト
wrangler.jsonc   Workers / D1 / AI バインディング
```

## ローカル開発

```bash
npm install
cp .dev.vars.example .dev.vars        # DEV_LOGIN=true のままで OK（Google 不要）
npm run db:migrate:local
npm run dev                           # http://localhost:5173
```

`DEV_LOGIN=true` の間はアカウントシートに「開発用ログイン」が出る。本番では設定しない。
Workers AI はローカルでは動かないため、ローカルの AI ボタンはフォールバック応答になる。`wrangler login` 後に `CF_REMOTE_BINDINGS=true npm run dev` とすると実際の Workers AI を使う。

## テスト

```bash
npm run test:e2e
```

Chromium (Pixel 7) と WebKit (iPhone 14) で 11 シナリオずつ実行する。初回は `npx playwright install chromium webkit`。

## デプロイ

1. Cloudflare にログインして D1 を作る。

   ```bash
   npx wrangler login
   npx wrangler d1 create glasstask-db
   ```

   出力された `database_id` を `wrangler.jsonc` の `d1_databases[0].database_id` に書く。

2. Google Cloud Console で OAuth クライアント（ウェブ アプリケーション）を作成し、承認済みリダイレクト URI に
   `https://glasstask.glasstask.workers.dev/api/auth/google/callback` を登録する。

3. シークレットを設定してデプロイする。

   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npm run db:migrate:remote
   npm run deploy
   ```

`wrangler.jsonc` の `vars.APP_URL` を本番 URL に変えておくこと。`DEV_LOGIN` は本番に設定しない。

## API

| Method | Path | 内容 |
| --- | --- | --- |
| GET | `/api/me` | ログイン状態、`devLogin` / `googleEnabled` フラグ |
| GET | `/api/auth/google` | Google 認可へリダイレクト |
| GET | `/api/auth/google/callback` | コールバック。セッション Cookie を発行して `/` へ |
| POST | `/api/auth/logout` | セッション破棄 |
| GET / POST | `/api/tasks` | 一覧 / 作成 |
| PATCH / DELETE | `/api/tasks/:id` | 更新 / 削除 |
| POST | `/api/tasks/import` | ゲストのタスクを一括取り込み |
| POST | `/api/ai/suggest` | メモ → `{ title, steps, source }` |

## License

MIT
