"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, CheckCircle2, Clock, Circle, FileText, FlaskConical, MessageSquare } from "lucide-react";
import { Task } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";

interface SearchResult {
  tasks: Task[];
  notes: { id: string; title: string; content: string; note_type: string; updated_at: string }[];
  messages: { id: string; role: string; content: string; created_at: string }[];
}

interface Props {
  onClose: () => void;
  onNavigate: (tab: string, id?: string) => void;
}

const statusIcons = {
  todo: <Circle className="w-3.5 h-3.5 text-gray-400" />,
  in_progress: <Clock className="w-3.5 h-3.5 text-blue-500" />,
  done: <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />,
};

export default function SearchModal({ onClose, onNavigate }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.length < 2) { setResults(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const totalResults = (results?.tasks.length ?? 0) + (results?.notes.length ?? 0) + (results?.messages.length ?? 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* 検索入力 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="タスク・ノート・チャット履歴を検索..."
            className="flex-1 text-base focus:outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 検索結果 */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results && totalResults === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">「{query}」に一致する結果がありません</p>
            </div>
          )}

          {/* タスク */}
          {(results?.tasks.length ?? 0) > 0 && (
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">タスク ({results!.tasks.length})</p>
              <div className="space-y-1">
                {results!.tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => { onNavigate("tasks", task.id); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    {statusIcons[task.status]}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                      {task.description && <p className="text-xs text-gray-500 truncate">{task.description}</p>}
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {format(new Date(task.due_date), "M/d", { locale: ja })}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ノート */}
          {(results?.notes.length ?? 0) > 0 && (
            <div className="p-4 border-b">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">研究ノート ({results!.notes.length})</p>
              <div className="space-y-1">
                {results!.notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => { onNavigate("notes", note.id); onClose(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    {note.note_type === "experiment" ? (
                      <FlaskConical className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{note.title}</p>
                      <p className="text-xs text-gray-500 truncate">{note.content.slice(0, 80)}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {format(new Date(note.updated_at), "M/d", { locale: ja })}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* チャット */}
          {(results?.messages.length ?? 0) > 0 && (
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">AI チャット ({results!.messages.length})</p>
              <div className="space-y-1">
                {results!.messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => { onNavigate("chat"); onClose(); }}
                    className="w-full flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-left"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700 line-clamp-2">{msg.content}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!results && query.length < 2 && (
            <div className="text-center py-10 text-gray-400 text-sm">
              2文字以上入力して検索
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
