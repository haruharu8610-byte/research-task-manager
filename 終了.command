#!/bin/bash
kill $(lsof -ti:3000) 2>/dev/null
echo "アプリを終了しました。このウィンドウを閉じてください。"
