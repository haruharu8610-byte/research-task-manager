"use client";

import { useState, useEffect } from "react";
import { Task } from "@/types";
import { X, Save, Loader2 } from "lucide-react";

interface Props {
  task: Task;
  onClose: () => void;
  userId?: string;
  authToken?: string;
}

export default function TaskNoteModal({ task, onClose, authToken }: Props) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const headers = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  useEffect(() => {
    const fetchNote = async () => {
      const res = await fetch(`/api/task-notes/${task.id}`, { headers: headers() });
      const data = await res.json();
      setContent(data.content ?? "");
      setLoading(false);
    };
    fetchNote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id]);

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/task-notes/${task.id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ content }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col" style={{ height: "70vh" }}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold">タスクメモ</h2>
            <p className="text-sm text-gray-500 mt-0.5">{task.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="このタスクに関するメモを書いてください"
            />
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-3">
          <button onClick={onClose} className="border rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            閉じる
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? "保存しました！" : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
