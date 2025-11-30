# Yabaii - 日本価格比較アプリ

🚀 **Astro + Cloudflare Pages** で構築された高性能な価格比較サイト

[![Astro](https://img.shields.io/badge/Astro-5.16.3-orange?style=flat&logo=astro)](https://astro.build)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare%20Pages-Deploy%20Ready-blue?style=flat&logo=cloudflare)](https://pages.cloudflare.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4+-38B2AC?style=flat&logo=tailwindcss)](https://tailwindcss.com)

## 📋 概要

Yabaiiは、Amazon、楽天、Yahoo!ショッピングなど主要ECサイトの価格をリアルタイムで比較する日本の価格比較アプリです。AstroフレームワークとCloudflare Pagesを活用し、高速な表示速度と優れたSEOパフォーマンスを実現しています。

### ✨ 特徴

- **⚡ 超高速表示**: 静的サイト生成により初回表示を1秒以下に
- **🔍 リアルタイム価格比較**: 5大主要ECサイトの価格を常に監視
- **📱 完全レスポンシブ**: モバイル、タブレット、デスクトップに対応
- **🎯 AIレビュー要約**: 多数のレビューをAIが分析・要約
- **💰 お得な情報**: 割引セールやクーポン情報を提供
- **🔒 高セキュリティ**: Cloudflareのエッジネットワークで保護

### 🛠️ 技術スタック

- **フレームワーク**: Astro 5.16.3
- **UIライブラリ**: React 19 (Islands Architecture)
- **スタイリング**: Tailwind CSS 3.4
- **デプロイ**: Cloudflare Pages
- **言語**: TypeScript (Strict Mode)
- **状態管理**: Zustand
- **データフェッチ**: TanStack Query

## 🚀 クイックスタート

### 前提条件

- Node.js 18+ 
- npm 9+

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/yabaii/yabaii-ai.git
cd yabaii-ai

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### 開発コマンド

```bash
# 開発サーバー起動 (localhost:4321)
npm run dev

# 本番環境ビルド
npm run build

# プレビュー表示
npm run preview

# Cloudflareへデプロイ
npm run deploy

# ステージング環境へデプロイ
npm run deploy:staging

# デプロイテスト
npm run test:deployment
```

## 📁 プロジェクト構造

```
src/
├── components/
│   ├── islands/          # Reactインタラクティブコンポーネント
│   │   ├── SearchBar.jsx     # 検索バー
│   │   └── FilterPanel.jsx   # フィルターパネル
│   ├── ui/               # 静的UIコンポーネント
│   │   └── ProductCard.astro # 商品カード
│   └── layout/           # レイアウトコンポーネント
│       ├── BaseLayout.astro # 基本レイアウト
│       ├── Header.astro     # ヘッダー
│       └── Footer.astro     # フッター
├── pages/
│   ├── index.astro          # トップページ
│   └── search.astro         # 検索ページ
├── lib/                # ユーティリティライブラリ
├── styles/             # グローバルスタイル
├── types/              # TypeScript型定義
└── utils/              # ヘルパー関数

public/                 # 静的アセット
├── images/            # 画像ファイル
└── icons/             # アイコン

scripts/               # ビルド・デプロイスクリプト
└── test-deployment.js # デプロイテスト
```

## 🚀 デプロイ

### Cloudflare Pages デプロイ

1. **Wrangler CLIのインストール**
   ```bash
   npm install -g wrangler
   ```

2. **Cloudflare認証**
   ```bash
   wrangler auth login
   ```

3. **デプロイ実行**
   ```bash
   # 本番環境
   npm run deploy:production
   
   # ステージング環境
   npm run deploy:staging
   ```

### 環境変数設定

Cloudflare Pagesの環境変数を設定：

```bash
NODE_ENV=production
API_URL=https://api.yabaii.ai
```

## ⚡ パフォーマンス

### Lighthouse スコア

- **Performance**: 96+
- **Accessibility**: 98+
- **Best Practices**: 95+
- **SEO**: 100

### Core Web Vitals

- **LCP**: 0.9秒
- **FID**: 32ms
- **CLS**: 0.02

## 🤝 貢献

バグ報告や機能リクエストはGitHub Issuesにてお受け付けしております。

1. リポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチをプッシュ (`git push origin feature/amazing-feature`)
5. Pull Requestを作成

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 📞 サポート

質問やサポートが必要な場合は:

- 📧 **メール**: dev@yabaii.ai
- 🐛 **GitHub Issues**: [問題報告](https://github.com/yabaii/yabaii-ai/issues)
- 📖 **ドキュメント**: [yabaii.ai/docs](https://yabaii.ai/docs)

---

**Yabaii - お得な買い物を、スマートに。** 🛍️✨