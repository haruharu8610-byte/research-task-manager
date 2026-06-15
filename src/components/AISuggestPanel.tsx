"use client";

import { useState } from "react";
import { Task } from "@/types";
import { Sparkles, Plus, Loader2, Mic, MicOff } from "lucide-react";
import { addDays, format } from "date-fns";
import clsx from "clsx";
import { getApiHeaders } from "@/lib/api";

interface Suggestion {
  title: string;
  description: string;
  priority: Task["priority"];
  days_until_due: number;
  tags: string[];
}

interface Props {
  existingTasks: Task[];
  onAddTask: (task: Omit<Task, "id" | "created_at" | "updated_at" | "calendar_event_id">) => void;
}

export default function AISuggestPanel({ existingTasks, onAddTask }: Props) {
  const hasApiKey = typeof window !== "undefined" && !!localStorage.getItem("anthropic_api_key");
  if (!hasApiKey) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
        <Sparkles className="w-14 h-14 text-gray-300" />
        <p className="text-lg font-semibold text-gray-700">AI提案を利用できません</p>
        <p className="text-sm text-gray-500 max-w-sm">APIキーが設定されていません。右上の「🔑 APIキー」ボタンからAnthropicのAPIキーを登録してください。</p>
      </div>
    );
  }

  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const handleVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("お使いのブラウザは音声入力に対応していません。Chromeをお試しください。");
      return;
    }
    if (listening) { setListening(false); return; }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      setTheme((prev) => prev + e.results[0][0].transcript);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognition.start();
    setListening(true);
  };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [reasoning, setReasoning] = useState("");
  const [added, setAdded] = useState<Set<number>>(new Set());

  const handleSuggest = async () => {
    if (!theme.trim()) return;
    setLoading(true);
    setSuggestions([]);
    setAdded(new Set());

    const res = await fetch("/api/ai/suggest", {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({
        theme,
        existingTasks: existingTasks.map((t) => t.title),
      }),
    });

    const data = await res.json();
    setSuggestions(data.suggestions ?? []);
    setReasoning(data.reasoning ?? "");
    setLoading(false);
  };

  const handleAdd = (s: Suggestion, idx: number) => {
    const dueDate = format(addDays(new Date(), s.days_until_due), "yyyy-MM-dd");
    onAddTask({
      title: s.title,
      description: s.description,
      priority: s.priority,
      status: "todo",
      due_date: dueDate,
      tags: s.tags,
      research_theme: theme,
    });
    setAdded((prev) => new Set(Array.from(prev).concat(idx)));
  };

  const priorityLabel = { high: "高", medium: "中", low: "低" };
  const priorityColor = {
    high: "text-red-600 bg-red-50",
    medium: "text-yellow-600 bg-yellow-50",
    low: "text-green-600 bg-green-50",
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold text-gray-900">AI タスク提案</h2>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        研究テーマを入力すると、必要なデータ収集・実験タスクをAIが自動提案します。
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSuggest()}
          placeholder={listening ? "🎤 話してください..." : "例: 光合成効率の環境応答メカニズム解析"}
          className={`flex-1 border bg-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${listening ? "border-red-400 bg-red-50" : ""}`}
        />
        <button
          onClick={handleVoiceInput}
          className={`rounded-lg px-3 py-2 text-sm transition-colors ${listening ? "bg-red-500 text-white animate-pulse" : "border bg-white text-gray-500 hover:bg-gray-50"}`}
          title={listening ? "音声入力中（クリックで停止）" : "音声入力"}
        >
          {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          onClick={handleSuggest}
          disabled={loading || !theme.trim()}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          提案する
        </button>
      </div>

      {reasoning && (
        <div className="mt-4 bg-white/80 rounded-lg p-3 text-sm text-gray-700">
          <strong>AIの考察:</strong> {reasoning}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">提案されたタスク（クリックで追加）</p>
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className={clsx(
                "bg-white rounded-xl border p-3 transition-all",
                added.has(idx) ? "opacity-50" : "hover:shadow-sm cursor-pointer hover:border-blue-300"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">{s.title}</span>
                    <span className={clsx("text-xs px-1.5 py-0.5 rounded-full font-medium", priorityColor[s.priority])}>
                      優先度: {priorityLabel[s.priority]}
                    </span>
                    <span className="text-xs text-gray-500">~{s.days_until_due}日後</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {s.tags.map((tag) => (
                      <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => !added.has(idx) && handleAdd(s, idx)}
                  disabled={added.has(idx)}
                  className="flex-shrink-0 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
