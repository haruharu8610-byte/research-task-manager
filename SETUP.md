# セットアップ手順

## 1. Node.js のインストール

```bash
# Homebrew がない場合はまずインストール
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js をインストール
brew install node
```

## 2. 依存パッケージのインストール

```bash
cd ~/research-task-manager
npm install
```

## 3. Supabase のセットアップ

1. https://supabase.com でアカウント作成・新規プロジェクト作成
2. 「SQL Editor」で `src/lib/supabase-schema.sql` の内容を実行
3. Settings > API から `Project URL` と `anon public key` をコピー

## 4. Claude API キーの取得

1. https://console.anthropic.com でアカウント作成
2. API Keys ページでキーを生成

## 5. Google Calendar OAuth のセットアップ

1. https://console.cloud.google.com でプロジェクト作成
2. 「APIとサービス」>「ライブラリ」で `Google Calendar API` を有効化
3. 「認証情報」>「OAuth 2.0 クライアント ID」を作成
   - アプリケーションの種類: ウェブアプリケーション
   - 承認済みリダイレクト URI: `http://localhost:3000/api/calendar/callback`
4. クライアントID とシークレットをコピー

## 6. 環境変数の設定

```bash
cp .env.local.example .env.local
# .env.local を編集して各値を設定
```

## 7. 起動

```bash
npm run dev
# → http://localhost:3000 でアクセス
```

## デプロイ（Vercel）

```bash
npm install -g vercel
vercel
# 環境変数を Vercel ダッシュボードで設定
# GOOGLE_REDIRECT_URI を本番URLに変更
```
