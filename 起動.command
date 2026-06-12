#!/bin/bash
# 既存のサーバーを停止
kill $(lsof -ti:3000) 2>/dev/null
sleep 1

cd ~/research-task-manager
npm run dev > /tmp/research-app.log 2>&1 &

echo "アプリを起動中...（約15秒かかります）"

# サーバーが起動するまで待機
for i in {1..30}; do
  sleep 1
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "起動完了！"
    open http://localhost:3000
    echo "このウィンドウは閉じて大丈夫です。"
    exit 0
  fi
done

echo "起動に時間がかかっています。ブラウザで http://localhost:3000 を開いてください。"
open http://localhost:3000
