"use client";

import { useState, useRef, useEffect } from "react";
import { Task, ChatMessage } from "@/types";
import { Send, Bot, User, Loader2, Trash2, Mic, MicOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { getApiHeaders } from "@/lib/api";

interface Props {
  tasks: Task[];
  userId?: string;
  authToken?: string;
}

export default function ChatPanel({ tasks, authToken }: Props) {
  const authHeaders = (): HeadersInit => ({
    ...getApiHeaders() as Record<string, string>,
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listening, setListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("お使いのブラウザは音声入力に対応していません。Chromeをお試しください。");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setInput((prev) => prev + transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  // 履歴をDBから読み込む
  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch("/api/ai/chat", { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMessages(data);
      } else {
        setMessages([{
          id: "init",
          role: "assistant",
          content: "こんにちは！研究のリサーチアシスタントです。実験デザイン、データ解析手法、統計処理、論文執筆など、何でもご相談ください。",
          created_at: new Date().toISOString(),
        }]);
      }
      setInitialLoading(false);
    };
    fetchHistory();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const history = [...messages, userMsg]
      .filter((m) => m.id !== "init")
      .map((m) => ({ role: m.role, content: m.content }));

    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: history, tasks }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + "_ai",
        role: "assistant",
        content: data.content,
        created_at: new Date().toISOString(),
      },
    ]);
    setLoading(false);
  };

  const handleClear = async () => {
    if (!confirm("チャット履歴を全て削除しますか？")) return;
    await fetch("/api/ai/chat", { method: "DELETE", headers: authHeaders() });
    setMessages([{
      id: "init",
      role: "assistant",
      content: "こんにちは！研究のリサーチアシスタントです。実験デザイン、データ解析手法、統計処理、論文執筆など、何でもご相談ください。",
      created_at: new Date().toISOString(),
    }]);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-white" />
            <h2 className="text-white font-semibold">研究アシスタント (Claude)</h2>
          </div>
          <button
            onClick={handleClear}
            className="text-blue-200 hover:text-white transition-colors"
            title="履歴を削除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <p className="text-blue-100 text-xs mt-0.5">現在のタスク{tasks.length}件を把握しています・履歴は自動保存</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {initialLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div
                className={clsx(
                  "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                  msg.role === "assistant" ? "bg-blue-600" : "bg-gray-200"
                )}
              >
                {msg.role === "assistant" ? (
                  <Bot className="w-4 h-4 text-white" />
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </div>

              <div
                className={clsx(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  msg.role === "assistant"
                    ? "bg-gray-100 text-gray-900 rounded-tl-sm"
                    : "bg-blue-600 text-white rounded-tr-sm"
                )}
              >
                {msg.role === "assistant" ? (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      code: ({ children }) => (
                        <code className="bg-white/50 px-1 rounded text-xs">{children}</code>
                      ),
                      ul: ({ children }) => <ul className="list-disc list-inside space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside space-y-1">{children}</ol>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={listening ? "🎤 話してください..." : "研究について質問・議論しましょう..."}
            className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${listening ? "border-red-400 bg-red-50" : ""}`}
          />
          <button
            onClick={handleVoiceInput}
            className={`rounded-xl px-3 py-2 transition-colors ${listening ? "bg-red-500 text-white animate-pulse" : "border text-gray-500 hover:bg-gray-50"}`}
            title={listening ? "音声入力中（クリックで停止）" : "音声入力"}
          >
            {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white rounded-xl px-3 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
