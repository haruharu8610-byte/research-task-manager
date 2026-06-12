"use client";

import { Task } from "@/types";
import { CheckCircle2, Clock, Circle, AlertTriangle } from "lucide-react";

interface Props {
  tasks: Task[];
}

export default function StatsBar({ tasks }: Props) {
  const todo = tasks.filter((t) => t.status === "todo").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const done = tasks.filter((t) => t.status === "done").length;
  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== "done" && new Date(t.due_date) < new Date()
  ).length;

  return (
    <div className="grid grid-cols-4 gap-3">
      {[
        { label: "未着手", value: todo, icon: <Circle className="w-4 h-4" />, color: "text-gray-500 bg-gray-50" },
        { label: "進行中", value: inProgress, icon: <Clock className="w-4 h-4" />, color: "text-blue-600 bg-blue-50" },
        { label: "完了", value: done, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 bg-green-50" },
        { label: "期限超過", value: overdue, icon: <AlertTriangle className="w-4 h-4" />, color: overdue > 0 ? "text-red-600 bg-red-50" : "text-gray-400 bg-gray-50" },
      ].map(({ label, value, icon, color }) => (
        <div key={label} className={`rounded-xl p-3 flex items-center gap-2 ${color}`}>
          {icon}
          <div>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-xs opacity-70">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
