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
import LoginModal from "@/components/LoginModal";
import PapersPanel from "@/components/PapersPanel";
import ExperimentScheduler from "@/components/ExperimentScheduler";
import CalendarPanel from "@/components/CalendarPanel";
import MessagesPanel from "@/components/MessagesPanel";
import { useAuth } from "@/contexts/AuthContext";
import { getApiHeaders } from "@/lib/api";
import { Plus, FlaskConical, CalendarDays, MessageSquare, List, BookOpen, BarChart2, Search, Wallet, Key, LogOut, User, Library, TestTube, Mail } from "lucide-react";

type Tab = "tasks" | "suggest" | "chat" | "notes" | "dashboard" | "papers" | "experiment" | "calendar" | "messages";

export default function Home() {
  const { user, session, loading, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notesList, setNotesList] = useState<{ id: string; title: string; content: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [noteTask, setNoteTask] = useState<Task | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [highlightTaskId, setHighlightTaskId] = useState<string | null>(null);
  const [highlightNoteId, setHighlightNoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("tasks");
  const [filterStatus, setFilterStatus] = useState<Task["status"] | "all">("all");
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const authHeaders = useCallback((): HeadersInit => {
    const base = getApiHeaders() as Record<string, string>;
    if (session?.access_token) {
      base["Authorization"] = `Bearer ${session.access_token}`;
    }
    return base;
  }, [session]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

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

  const fetchTasks = useCallback(async () => {
    if (!session) return;
    const res = await fetch("/api/tasks", { headers: authHeaders() });
    const data = await res.json();
    setTasks(Array.isArray(data) ? data : []);
  }, [session, authHeaders]);

  useEffect(() => {
    if (!session) return;
    fetchTasks();
    fetch("/api/calendar/status", { headers: authHeaders() })
      .then((r) => r.json())
      .then((d) => setCalendarConnected(d.connected));

    fetch("/api/notes", { headers: authHeaders() })
      .then(r => r.json())
      .then(d => setNotesList(Array.isArray(d) ? d.map((n: { id: string; title: string; content: string }) => ({ id: n.id, title: n.title, content: n.content })) : []));

    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      setCalendarConnected(true);
      showToast("Googleカレンダーと連携しました！");
      window.history.replaceState({}, "", "/");
    }
  }, [session, fetchTasks, authHeaders]);

  const handleAddTask = async (
    task: Omit<Task, "id" | "created_at" | "updated_at" | "calendar_event_id">
  ) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: authHeaders(),
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
      headers: authHeaders(),
      body: JSON.stringify({ status }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const handleEdit = async (id: string, updates: Partial<Task>) => {
    const res = await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)));
    setEditingTask(null);
    showToast("タスクを更新しました");
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/tasks/${id}`, { method: "DELETE", headers: authHeaders() });
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
      headers: authHeaders(),
      body: JSON.stringify({
        taskId: task.id,
        title: task.title,
        description: task.description,
        dueDate: task.due_date,
      }),
    });
    if (res.status === 401) {
      window.location.href = `/api/calendar/connect?token=${session?.access_token}`;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <LoginModal />;

  const filteredTasks =
    filterStatus === "all" ? tasks : tasks.filter((t) => t.status === filterStatus);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "ダッシュボード", icon: <BarChart2 className="w-4 h-4" /> },
    { id: "tasks", label: "タスク一覧", icon: <List className="w-4 h-4" /> },
    { id: "suggest", label: "AI提案", icon: <FlaskConical className="w-4 h-4" /> },
    { id: "chat", label: "AI議論", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "notes", label: "研究ノート", icon: <BookOpen className="w-4 h-4" /> },
    { id: "papers", label: "論文管理", icon: <Library className="w-4 h-4" /> },
    { id: "experiment", label: "実験スケジュール", icon: <TestTube className="w-4 h-4" /> },
    { id: "calendar", label: "カレンダー", icon: <CalendarDays className="w-4 h-4" /> },
    { id: "messages", label: "メッセージ", icon: <Mail className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">研究タスクマネージャー</h1>
          </div>
          <div className="flex items-center gap-3">
            {!calendarConnected ? (
              <a
                href={`/api/calendar/connect?token=${session?.access_token}`}
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
            <div className="flex items-center gap-2 border-l pl-3">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 max-w-[120px] truncate">{user.email}</span>
              <button
                onClick={signOut}
                className="text-gray-400 hover:text-red-500 transition-colors"
                title="ログアウト"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <StatsBar tasks={tasks} />

        <div className="flex gap-1 mt-6 bg-white border rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {activeTab === "tasks" && (
            <div>
              <div className="flex gap-2 mb-4">
                {(["all", "todo", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filterStatus === s ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"
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
              <ChatPanel tasks={tasks} userId={user.id} authToken={session?.access_token} />
            </div>
          )}

          {activeTab === "notes" && (
            <NotesPanel initialNoteId={highlightNoteId} userId={user.id} authToken={session?.access_token} />
          )}

          {activeTab === "dashboard" && <DashboardPanel tasks={tasks} />}

          {activeTab === "papers" && (
            <PapersPanel authToken={session?.access_token} />
          )}

          {activeTab === "experiment" && (
            <ExperimentScheduler authToken={session?.access_token} />
          )}

          {activeTab === "calendar" && (
            <CalendarPanel authToken={session?.access_token} />
          )}

          {activeTab === "messages" && (
            <MessagesPanel userId={user.id} authToken={session?.access_token} notes={notesList} />
          )}
        </div>
      </main>

      {showAddModal && <AddTaskModal onAdd={handleAddTask} onClose={() => setShowAddModal(false)} />}
      {editingTask && <EditTaskModal task={editingTask} onSave={handleEdit} onClose={() => setEditingTask(null)} />}
      {noteTask && <TaskNoteModal task={noteTask} onClose={() => setNoteTask(null)} userId={user.id} authToken={session?.access_token} />}
      {showApiKey && <ApiKeyModal onClose={() => setShowApiKey(false)} />}
      {showSearch && <SearchModal onClose={() => setShowSearch(false)} onNavigate={handleNavigate} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
