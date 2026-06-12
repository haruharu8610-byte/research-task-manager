"use client";

import { Task } from "@/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { Calendar, Trash2, CheckCircle2, Circle, Clock, CalendarPlus, Pencil, StickyNote } from "lucide-react";
import clsx from "clsx";

interface Props {
  task: Task;
  onStatusChange: (id: string, status: Task["status"]) => void;
  onDelete: (id: string) => void;
  onSyncCalendar: (task: Task) => void;
  onEdit: (task: Task) => void;
  onNote: (task: Task) => void;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  high: { label: "高", className: "bg-red-100 text-red-700" },
  medium: { label: "中", className: "bg-yellow-100 text-yellow-700" },
  low: { label: "低", className: "bg-green-100 text-green-700" },
};

const statusIcons = {
  todo: <Circle className="w-5 h-5 text-gray-400" />,
  in_progress: <Clock className="w-5 h-5 text-blue-500" />,
  done: <CheckCircle2 className="w-5 h-5 text-green-500" />,
};

const nextStatus: Record<Task["status"], Task["status"]> = {
  todo: "in_progress",
  in_progress: "done",
  done: "todo",
};

export default function TaskCard({ task, onStatusChange, onDelete, onSyncCalendar, onEdit, onNote }: Props) {
  const isOverdue =
    task.due_date &&
    task.status !== "done" &&
    new Date(task.due_date) < new Date();

  return (
    <div
      className={clsx(
        "bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow",
        task.status === "done" && "opacity-60",
        isOverdue && "border-red-300"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onStatusChange(task.id, nextStatus[task.status])}
          className="mt-0.5 flex-shrink-0"
          title="ステータスを変更"
        >
          {statusIcons[task.status]}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={clsx(
                "font-medium text-gray-900",
                task.status === "done" && "line-through text-gray-500"
              )}
            >
              {task.title}
            </h3>
            <span
              className={clsx(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                (priorityConfig[task.priority] ?? priorityConfig.medium).className
              )}
            >
              {(priorityConfig[task.priority] ?? priorityConfig.medium).label}
            </span>
          </div>

          {task.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {task.due_date && (
              <span
                className={clsx(
                  "flex items-center gap-1 text-xs",
                  isOverdue ? "text-red-600 font-medium" : "text-gray-500"
                )}
              >
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "M月d日(EEE)", { locale: ja })}
                {isOverdue && " ⚠ 期限超過"}
              </span>
            )}

            {task.tags?.map((tag) => (
              <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onNote(task)}
            className="p-1.5 text-gray-400 hover:text-yellow-500 transition-colors"
            title="メモ"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <button
            onClick={() => onEdit(task)}
            className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
            title="編集"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {task.due_date && !task.calendar_event_id && (
            <button
              onClick={() => onSyncCalendar(task)}
              className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors"
              title="Googleカレンダーに追加"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
          )}
          {task.calendar_event_id && (
            <span className="p-1.5 text-green-500" title="Googleカレンダー連携済み">
              <Calendar className="w-4 h-4" />
            </span>
          )}
          <button
            onClick={() => onDelete(task.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
