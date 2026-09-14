"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Mail } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginModal() {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    const { error } = await sendMagicLink(email.trim());
    if (error) {
      setError("送信に失敗しました。メールアドレスを確認してください。");
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Image src="/icon.png" alt="アプリアイコン" width={80} height={80} className="rounded-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">研究タスクマネージャー</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-gray-900 font-medium text-lg">メールを送信しました</div>
            <p className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{email}</span> に<br />
              ログインリンクを送りました。<br />
              メール内のリンクをクリックしてください。
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-blue-600 hover:underline text-sm"
            >
              別のメールアドレスで試す
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                autoFocus
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={loading || !email.trim()}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              ログインリンクを送る
            </button>

            <p className="text-xs text-gray-400 text-center">
              初めての方も同じ手順で登録できます
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
