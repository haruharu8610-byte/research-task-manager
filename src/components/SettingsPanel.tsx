"use client";

import { useState, useEffect } from "react";
import { Key, ExternalLink, CheckCircle2, Wallet } from "lucide-react";

export default function SettingsPanel() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [savedAnthropic, setSavedAnthropic] = useState(false);

  useEffect(() => {
    setAnthropicKey(localStorage.getItem("anthropic_api_key") ?? "");
  }, []);

  const saveAnthropic = () => {
    localStorage.setItem("anthropic_api_key", anthropicKey.trim());
    setSavedAnthropic(true);
    setTimeout(() => setSavedAnthropic(false), 2000);
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Anthropic */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-purple-600" />
          <h2 className="font-semibold text-gray-800">Anthropic APIキー</h2>
          <span className="text-xs text-gray-400">（AI解析・チャット・提案）</span>
        </div>

        <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-800 space-y-1">
          <p className="font-medium">取得方法</p>
          <ol className="list-decimal list-inside text-blue-700 space-y-0.5 text-xs">
            <li>下のリンクからAnthropicにアクセス</li>
            <li>「API Keys」→「Create Key」</li>
            <li>表示されたキーを貼り付けて保存</li>
          </ol>
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 mt-1 text-blue-600 hover:underline font-medium text-xs">
            <ExternalLink className="w-3 h-3" />Anthropic Console を開く
          </a>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">APIキー（sk-ant-...）</label>
          <input type="password" value={anthropicKey} onChange={e => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>

        <div className="flex items-center gap-3">
          <button onClick={saveAnthropic} disabled={!anthropicKey.trim()}
            className="flex items-center gap-2 bg-purple-600 text-white rounded-lg px-5 py-2 text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors">
            {savedAnthropic ? <><CheckCircle2 className="w-4 h-4" />保存しました</> : "保存"}
          </button>
          <a href="https://console.anthropic.com/settings/billing" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 rounded-lg px-4 py-2 hover:bg-purple-50 transition-colors">
            <Wallet className="w-4 h-4" />残高確認
          </a>
          {anthropicKey && (
            <button onClick={() => { localStorage.removeItem("anthropic_api_key"); setAnthropicKey(""); }}
              className="text-sm text-red-400 hover:text-red-600 transition-colors">削除</button>
          )}
        </div>
        <p className="text-xs text-gray-400">💡 $5チャージで数百回以上使えます。キーはこのブラウザにのみ保存されます。</p>
      </div>
    </div>
  );
}
