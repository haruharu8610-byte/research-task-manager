"use client";

import { useState } from "react";
import { Task } from "@/types";
import { FileText, Loader2, Download, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format, isAfter, isBefore, addDays } from "date-fns";
import { ja } from "date-fns/locale/ja";
import { getApiHeaders } from "@/lib/api";

interface Props {
  tasks: Task[];
}

export default function DashboardPanel({ tasks }: Props) {
  const [report, setReport] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [period, setPeriod] = useState<"week" | "month">("week");

  const today = new Date();
  const done = tasks.filter((t) => t.status === "done");
  const inProgress = tasks.filter((t) => t.status === "in_progress");
  const todo = tasks.filter((t) => t.status === "todo");
  const overdue = tasks.filter(
    (t) => t.due_date && t.status !== "done" && isBefore(new Date(t.due_date), today)
  );
  const dueSoon = tasks.filter(
    (t) =>
      t.due_date &&
      t.status !== "done" &&
      isAfter(new Date(t.due_date), today) &&
      isBefore(new Date(t.due_date), addDays(today, 7))
  );

  const completionRate = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;

  const priorityCount = {
    high: tasks.filter((t) => t.priority === "high" && t.status !== "done").length,
    medium: tasks.filter((t) => t.priority === "medium" && t.status !== "done").length,
    low: tasks.filter((t) => t.priority === "low" && t.status !== "done").length,
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    const res = await fetch("/api/ai/report", {
      method: "POST",
      headers: getApiHeaders(),
      body: JSON.stringify({ period }),
    });
    const data = await res.json();
    setReport(data.content);
    setReportLoading(false);
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `研究レポート_${format(today, "yyyy-MM-dd")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "全タスク", value: tasks.length, color: "bg-gray-50 text-gray-700" },
          { label: "完了率", value: `${completionRate}%`, color: "bg-green-50 text-green-700" },
          { label: "期限超過", value: overdue.length, color: overdue.length > 0 ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-400" },
          { label: "今週期限", value: dueSoon.length, color: dueSoon.length > 0 ? "bg-yellow-50 text-yellow-700" : "bg-gray-50 text-gray-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl p-4 ${color}`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm opacity-70 mt-0.5 whitespace-nowrap">{label}</p>
          </div>
        ))}
      </div>

      {/* 進捗バー */}
      <div className="bg-white rounded-2xl border p-5">
        <h3 className="font-semibold text-gray-900 mb-4">タスク進捗</h3>
        <div className="flex h-6 rounded-full overflow-hidden gap-0.5 mb-3">
          {done.length > 0 && (
            <div
              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(done.length / tasks.length) * 100}%` }}
            >
              {done.length}
            </div>
          )}
          {inProgress.length > 0 && (
            <div
              className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${(inProgress.length / tasks.length) * 100}%` }}
            >
              {inProgress.length}
            </div>
          )}
          {todo.length > 0 && (
            <div
              className="bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-medium"
              style={{ width: `${(todo.length / tasks.length) * 100}%` }}
            >
              {todo.length}
            </div>
          )}
        </div>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-500 inline-block" />完了</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />進行中</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />未着手</span>
        </div>
      </div>

      {/* 優先度別・期限が近いタスク */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3 whitespace-nowrap">優先度別（未完了）</h3>
          <div className="space-y-2">
            {[
              { label: "高", count: priorityCount.high, color: "bg-red-100 text-red-700" },
              { label: "中", count: priorityCount.medium, color: "bg-yellow-100 text-yellow-700" },
              { label: "低", count: priorityCount.low, color: "bg-green-100 text-green-700" },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-8 text-center ${color}`}>{label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${color.includes("red") ? "bg-red-400" : color.includes("yellow") ? "bg-yellow-400" : "bg-green-400"}`}
                    style={{ width: tasks.length > 0 ? `${(count / tasks.length) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">今週期限</h3>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-gray-400">今週期限のタスクはありません</p>
          ) : (
            <div className="space-y-2">
              {dueSoon.map((t) => (
                <div key={t.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400 text-xs w-12">
                    {t.due_date ? format(new Date(t.due_date), "M/d", { locale: ja }) : ""}
                  </span>
                  <span className="text-gray-700 truncate">{t.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AIレポート生成 */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100 p-5">
        <div className="flex flex-nowrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900 whitespace-nowrap">AI進捗レポート</h3>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "week" | "month")}
              className="border bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="week">週次</option>
              <option value="month">月次</option>
            </select>
            <button
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="bg-indigo-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              生成
            </button>
            {report && (
              <button
                onClick={handleDownload}
                className="border bg-white rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                保存
              </button>
            )}
          </div>
        </div>

        {report ? (
          <div className="bg-white rounded-xl p-5 text-sm prose prose-sm max-w-none">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            「生成」ボタンを押すと、タスクとノートの内容をもとにAIが進捗レポートを自動作成します。
            指導教員への報告書としてもご利用いただけます。
          </p>
        )}
      </div>
    </div>
  );
}
