"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Trash2, Plus } from "lucide-react";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
}

interface Props {
  authToken?: string;
}

export default function TodoPanel({ authToken }: Props) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const headers = { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) };

  useEffect(() => {
    fetch("/api/todos", { headers })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTodos(data); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function addTodo() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const res = await fetch("/api/todos", { method: "POST", headers, body: JSON.stringify({ text }) });
    const todo = await res.json();
    if (todo.id) setTodos(prev => [...prev, todo]);
    inputRef.current?.focus();
  }

  async function toggleTodo(todo: Todo) {
    const updated = { ...todo, completed: !todo.completed };
    setTodos(prev => prev.map(t => t.id === todo.id ? updated : t));
    await fetch(`/api/todos/${todo.id}`, { method: "PATCH", headers, body: JSON.stringify({ completed: updated.completed }) });
  }

  async function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
    await fetch(`/api/todos/${id}`, { method: "DELETE", headers });
  }

  const filtered = todos.filter(t =>
    filter === "all" ? true : filter === "active" ? !t.completed : t.completed
  );
  const doneCount = todos.filter(t => t.completed).length;

  return (
    <div className="max-w-xl">
      <div className="flex gap-2 mb-4">
        {(["all", "active", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === f ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {{ all: "すべて", active: "未完了", done: "完了" }[f]}
            <span className="ml-1 opacity-70 text-xs">
              ({f === "all" ? todos.length : f === "active" ? todos.length - doneCount : doneCount})
            </span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addTodo()}
          placeholder="Todoを入力してEnter..."
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={addTodo}
          disabled={!input.trim()}
          className="flex items-center gap-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          追加
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">Todoがありません</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map(todo => (
            <li
              key={todo.id}
              className="flex items-center gap-3 bg-white rounded-xl border px-4 py-3 group"
            >
              <button onClick={() => toggleTodo(todo)} className="flex-shrink-0 text-blue-500 hover:text-blue-700">
                {todo.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5 text-gray-400" />}
              </button>
              <span className={`flex-1 text-sm ${todo.completed ? "line-through text-gray-400" : "text-gray-800"}`}>
                {todo.text}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {doneCount > 0 && filter !== "active" && (
        <button
          onClick={async () => {
            const doneTodos = todos.filter(t => t.completed);
            setTodos(prev => prev.filter(t => !t.completed));
            await Promise.all(doneTodos.map(t => fetch(`/api/todos/${t.id}`, { method: "DELETE", headers })));
          }}
          className="mt-4 text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          完了済みをすべて削除
        </button>
      )}
    </div>
  );
}
