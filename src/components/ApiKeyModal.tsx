"use client";

import { useState, useEffect } from "react";
import { X, Key, ExternalLink, CheckCircle2 } from "lucide-react";

interface Props {
  onClose: () => void;
}

export default function ApiKeyModal({ onClose }: Props) {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("anthropic_api_key");
    if (stored) setApiKey(stored);
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem("anthropic_api_key", apiKey.trim());
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1500);
  };

  const handleClear = () => {
    localStorage.removeItem("anthropic_api_key");
    setApiKey("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold">Anthropic APIキー設定</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">APIキーの取得方法</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>下のリンクからAnthropicにアクセス</li>
              <li>アカウント作成・ログイン</li>
              <li>「API Keys」→「Create Key」</li>
              <li>表示されたキーをここに貼り付け</li>
            </ol>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 mt-2 text-blue-600 hover:underline font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Anthropic Console を開く
            </a>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              APIキー（sk-ant-...）
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-api03-..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              キーはこのブラウザにのみ保存されます。他の人には見えません。
            </p>
          </div>

          <div className="bg-yellow-50 rounded-xl p-3 text-xs text-yellow-800">
            💡 $5（約750円）チャージすれば数百回以上使えます
          </div>

          <div className="flex gap-3">
            {apiKey && (
              <button
                onClick={handleClear}
                className="border rounded-lg px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                削除
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saved ? <><CheckCircle2 className="w-4 h-4" />保存しました！</> : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
