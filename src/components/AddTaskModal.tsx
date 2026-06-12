"use client";

import { useState } from "react";
import { Task } from "@/types";
import { X } from "lucide-react";

interface Props {
  onAdd: (task: Omit<Task, "id" | "created_at" | "updated_at" | "calendar_event_id">, isExperiment?: boolean, experimentTime?: string) => void;
  onClose: () => void;
}

export default function AddTaskModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const [researchTheme, setResearchTheme] = useState("");
  const [isExperiment, setIsExperiment] = useState(false);
  const [experimentTime, setExperimentTime] = useState("09:00");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const experimentDatetime = isExperiment && dueDate ? `${dueDate}T${experimentTime}` : undefined;
    onAdd({
      title: title.trim(),
      description: description.trim(),
      priority,
      status: "todo",
      due_date: dueDate || null,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      research_theme: researchTheme.trim(),
    }, isExperiment, experimentDatetime);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">タスクを追加</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タスク名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: DNA抽出データの収集"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">詳細</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="タスクの詳細・方法など"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">優先度</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task["priority"])}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">期限</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">研究テーマ</label>
            <input
              type="text"
              value={researchTheme}
              onChange={(e) => setResearchTheme(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: タンパク質折り畳み解析"
            />
          </div>

          <div className="border rounded-lg p-3 space-y-3 bg-orange-50">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isExperiment}
                onChange={e => setIsExperiment(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              <span className="text-sm font-medium text-orange-700">🔬 実験タスク（P・H注射スケジュールを自動登録）</span>
            </label>
            {isExperiment && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">実験開始時刻（期限日の何時に実験を行うか）</label>
                <input
                  type="time"
                  value={experimentTime}
                  onChange={e => setExperimentTime(e.target.value)}
                  className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                {dueDate && (
                  <p className="text-xs text-orange-600 mt-1">
                    実験日: {dueDate} {experimentTime} → H注射: 16時間前・P注射: 64時間前に自動登録
                  </p>
                )}
                {!dueDate && <p className="text-xs text-gray-400 mt-1">※ 期限を設定すると注射スケジュールが自動登録されます</p>}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例: 実験, データ収集, 解析"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              追加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
