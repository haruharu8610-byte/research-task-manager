"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginModal() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setError("");

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) setError("メールアドレスまたはパスワードが違います");
    } else {
      const { error } = await signUp(email, password);
      if (error) setError(error);
      else setSignupDone(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          <Image src="/icon.png" alt="アプリアイコン" width={80} height={80} className="rounded-2xl" />
          <h1 className="text-2xl font-bold text-gray-900">研究タスクマネージャー</h1>
        </div>

        {signupDone ? (
          <div className="text-center space-y-3">
            <div className="text-green-600 text-lg font-medium">登録完了！</div>
            <p className="text-sm text-gray-600">
              確認メールを送信しました。メールのリンクをクリックしてからログインしてください。
            </p>
            <button
              onClick={() => { setMode("login"); setSignupDone(false); }}
              className="text-blue-600 hover:underline text-sm"
            >
              ログイン画面に戻る
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "login" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
              >
                ログイン
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${mode === "signup" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
              >
                新規登録
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="6文字以上"
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={loading || !email.trim() || !password.trim()}
                className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "login" ? "ログイン" : "登録する"}
              </button>
            </div>

            {mode === "signup" && (
              <p className="text-xs text-gray-400 text-center mt-4">
                登録後、確認メールが届きます。メールのリンクをクリックしてからログインしてください。
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
