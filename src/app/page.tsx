"use client";

import { useEffect, useState, useCallback } from "react";
import { Task } from "@/types";
import TaskCard from "@/components/TaskCard";
import AddTaskModal from "@/components/AddTaskModal";
import EditTaskModal from "@/components/EditTaskModal";
import TaskNoteModal from "@/components/TaskNoteModal";
import NotesPanel from "@/components/NotesPanel";
import DashboardPanel from "@/components/DashboardPanel";
import SearchModal from "@/components/SearchModal";
import AISuggestPanel from "@/components/AISuggestPanel";
import ChatPanel from "@/components/ChatPanel";
import StatsBar from "@/components/StatsBar";
import ApiKeyModal from "@/components/ApiKeyModal";
import { Plus, FlaskConical, CalendarDays, MessageSquare, List, BookOpen, BarChart2, Search, PowerOff, Wallet, Key } from "lucide-react";

type Tab = "tasks" | "suggest" | "chat" | "notes" | "dashboard";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [noteTask, setNoteTask] = useState<Task | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);

  const handleNavigate = (tab: string, id?: string) => {
    setActiveTab(tab as Tab);
    if (tab === "tasks" && id) {
      setFilterStatus("all");
      setHighlightTaskId(id);
      setTimeout(() => {
        document.getElementById(`task-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
      setTimeout(() => setHighlightTaskId(null), 3000);
    }
    if (tab === "notes" && id) {
      setHighlightNoteId(id);
      setTimeout(() => setHighlightNoteId(null), 3000);
    }
  };
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [filterStatus, setFilterStatus] = useState<Task["status"] | "all">("all");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
  }, []);

  useEffect(() => {
    fetchTasks();
    // カレンダー連携状態をSupabaseから確認
    fetch("/api/calendar/status")
      .then((r) => r.json())
      .then((d) => setCalendarConnected(d.connected));

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      setCalendarConnected(true);
      showToast("Googleカレンダーと連携しました！");
      window.history.replaceState({}, "", "/");
    }
  }, [fetchTasks]);

  const handleAddTask = async (
    task: Omit<Task, "id" | "created_at" | "updated_at" | "calendar_event_id">
  ) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
    setShowAddModal(false);
    showToast("タスクを追加しました");
  };

  const handleStatusChange = async (id: string, status: Task["status"]) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleEdit = async (id: string, updates: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setEditingTask(null);
    showToast("タスクを更新しました");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== id));
    showToast("タスクを削除しました");
  };

  const handleSyncCalendar = async (task: Task) => {
    if (!task.due_date) {
      showToast("期限を設定してからカレンダーに追加してください");
      return;
    }
    const res = await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
      }),
    });
    if (res.status === 401) {
      window.location.href = "/api/calendar/connect";
      return;
    }
    const data = await res.json();
    if (data.eventId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, calendar_event_id: data.eventId } : t))
      );
      showToast("Googleカレンダーに追加しました");
    }
  };

  const filteredTasks =
    filterStatus === "all" ? tasks : tasks.filter((t) => t.status === filterStatus);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "ダッシュボード", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "tasks", label: "タスク一覧", icon: <List className="w-4 h-4" /> },
    { id: "suggest", label: "AI提案", icon: <FlaskConical className="w-4 h-4" /> },
    { id: "chat", label: "AI議論", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "notes", label: "研究ノート", icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">研究タスクマネージャー</h1>
          </div>
          <div className="flex items-center gap-3">
            {!calendarConnected ? (
              <a
                href="/api/calendar/connect"
                className="flex items-center gap-1.5 text-sm text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
              >
                <CalendarDays className="w-4 h-4" />
                Googleカレンダー連携
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-green-600">
                <CalendarDays className="w-4 h-4" />
                カレンダー連携中
              </span>
            )}
            <button
              onClick={() => setShowApiKey(true)}
              className="flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors"
            >
              <Key className="w-4 h-4" />
              APIキー
            </button>
            <a
              href="https://console.anthropic.com/settings/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-purple-600 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors"
            >
              <Wallet className="w-4 h-4" />
              残高確認
            </a>
            <button
              onClick={async () => {
                if (confirm("アプリを終了しますか？")) {
                  await fetch("/api/shutdown", { method: "POST" });
                  window.close();
                }
              }}
              className="flex items-center gap-1.5 text-sm text-red-500 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              <PowerOff className="w-4 h-4" />
              終了
            </button>
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1.5 text-sm text-gray-600 border rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
            >
              <Search className="w-4 h-4" />
              検索
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              タスク追加
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <StatsBar tasks={tasks} />

        {/* Tabs */}
        <div className="flex gap-1 mt-6 bg-white border rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-4">
          {activeTab === "tasks" && (
            <div>
              {/* Filter */}
              <div className="flex gap-2 mb-4">
                {(["all", "todo", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filterStatus === s
                        ? "bg-blue-600 text-white"
                        : "bg-white border text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {{ all: "すべて", todo: "未着手", in_progress: "進行中", done: "完了" }[s]}
                    <span className="ml-1 opacity-70 text-xs">
                      ({s === "all" ? tasks.length : tasks.filter((t) => t.status === s).length})
                    </span>
                  </button>
                ))}
              </div>

              {filteredTasks.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>タスクがありません。「AI提案」タブで自動生成するか、追加ボタンから手動で追加できます。</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTasks.map((task) => (
                    <div
                      key={task.id}
                      id={`task-${task.id}`}
                      className={highlightTaskId === task.id ? "ring-2 ring-blue-400 rounded-xl transition-all" : ""}
                    >
                      <TaskCard
                        task={task}
                        onStatusChange={handleStatusChange}
                        onDelete={handleDelete}
                        onSyncCalendar={handleSyncCalendar}
                        onEdit={(task) => setEditingTask(task)}
                        onNote={(task) => setNoteTask(task)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "suggest" && (
            <AISuggestPanel existingTasks={tasks} onAddTask={handleAddTask} />
          )}

          {activeTab === "chat" && (
            <div className="h-[600px]">
              <ChatPanel tasks={tasks} />
            </div>
          )}

          {activeTab === "notes" && <NotesPanel initialNoteId={highlightNoteId} />}

          {activeTab === "dashboard" && <DashboardPanel tasks={tasks} />}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <AddTaskModal onAdd={handleAddTask} onClose={() => setShowAddModal(false)} />
      )}

      {/* Edit Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={handleEdit}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* Task Note Modal */}
      {noteTask && (
        <TaskNoteModal
          task={noteTask}
          onClose={() => setNoteTask(null)}
        />
      )}

      {/* API Key Modal */}
      {showApiKey && <ApiKeyModal onClose={() => setShowApiKey(false)} />}

      {/* Search Modal */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onNavigate={handleNavigate}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm shadow-lg animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
