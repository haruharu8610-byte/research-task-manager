"use client";

import { useState, useEffect, useCallback } from "react";
import { CalendarDays, Plus, Trash2, FlaskConical, Clock, CheckCircle, Inbox, UserCheck } from "lucide-react";


interface CalendarEventIds {
  p: string;
  h: string;
  exp: string;
}

interface ExperimentSchedule {
  id: string;
  task_id?: string;
  name: string;
  experiment_datetime: string;
  experiment_end_datetime: string;
  hours_before_h: number;
  calendar_added: boolean;
  calendar_event_ids?: CalendarEventIds;
}

interface ReceivedSchedule {
  id: string;
  sender: { username: string };
  share_data: {
    name: string;
    experiment_datetime: string;
    experiment_end_datetime: string;
    hours_before_h: number;
  };
  created_at: string;
}

interface Props {
  authToken?: string;
  userId?: string;
}

function calcInjections(experimentDatetime: string, hoursBeforeH: number) {
  const expDate = new Date(experimentDatetime);
  const hDate = new Date(expDate.getTime() - hoursBeforeH * 60 * 60 * 1000);
  const pDate = new Date(hDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  return { hDate, pDate };
}

function formatDateTime(date: Date) {
  return date.toLocaleString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit",
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });
}

function addHoursToISO(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function isoToDatetimeLocal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToISO(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}

export default function ExperimentScheduler({ authToken, userId }: Props) {
  const [tab, setTab] = useState<"my" | "received">("my");
  const [schedules, setSchedules] = useState<ExperimentSchedule[]>([]);
  const [receivedSchedules, setReceivedSchedules] = useState<ReceivedSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [experimentDateTime, setExperimentDateTime] = useState("");
  const [experimentEndDateTime, setExperimentEndDateTime] = useState("");
  const [hoursBeforeH, setHoursBeforeH] = useState(16);
  const [adding, setAdding] = useState(false);
  const [addingToCalendar, setAddingToCalendar] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [receivedCalendarIds, setReceivedCalendarIds] = useState<Record<string, CalendarEventIds>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const authHeaders = useCallback((): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h["Authorization"] = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/experiment-schedules", { headers: authHeaders() });
    const data = await res.json();
    setSchedules(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [authHeaders]);

  const fetchReceivedSchedules = useCallback(async () => {
    if (!userId) return;
    setReceivedLoading(true);
    const res = await fetch("/api/messages", { headers: authHeaders() });
    const data = await res.json();
    const received = (Array.isArray(data) ? data : []).filter(
      (m: { receiver_id: string; share_type: string; share_data: unknown }) =>
        m.receiver_id === userId && m.share_type === "schedule" && m.share_data
    );
    setReceivedSchedules(received);
    setReceivedLoading(false);
  }, [authHeaders, userId]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);
  useEffect(() => { if (tab === "received") fetchReceivedSchedules(); }, [tab, fetchReceivedSchedules]);

  const handleExperimentStartChange = (value: string) => {
    setExperimentDateTime(value);
    if (value) {
      const end = new Date(value);
      end.setHours(end.getHours() + 7);
      const pad = (n: number) => String(n).padStart(2, "0");
      setExperimentEndDateTime(`${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`);
    } else {
      setExperimentEndDateTime("");
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !experimentDateTime) return;
    const endDt = experimentEndDateTime || (() => {
      const d = new Date(experimentDateTime); d.setHours(d.getHours() + 7);
      return isoToDatetimeLocal(d.toISOString());
    })();
    setAdding(true);
    const res = await fetch("/api/experiment-schedules", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        name: name.trim(),
        experiment_datetime: datetimeLocalToISO(experimentDateTime),
        experiment_end_datetime: datetimeLocalToISO(endDt),
        hours_before_h: hoursBeforeH,
        calendar_added: false,
      }),
    });
    const data = await res.json();
    setAdding(false);
    if (data.error) { showToast(data.error); return; }
    setSchedules(prev => [data, ...prev]);
    setName(""); setExperimentDateTime(""); setExperimentEndDateTime(""); setHoursBeforeH(16);
    setShowForm(false);
    showToast("実験スケジュールを追加しました");
  };

  const handleAddReceivedToCalendar = async (received: ReceivedSchedule) => {
    const s = received.share_data;
    setAddingToCalendar(received.id);
    try {
      const { hDate, pDate } = calcInjections(s.experiment_datetime, s.hours_before_h);
      const expDate = new Date(s.experiment_datetime);
      const expEndDate = new Date(s.experiment_end_datetime);

      const events = [
        { key: "p" as const, title: `【P注射】${s.name}`, dateTime: pDate.toISOString(), endDateTime: pDate.toISOString(), description: `実験「${s.name}」のP注射` },
        { key: "h" as const, title: `【H注射】${s.name}`, dateTime: hDate.toISOString(), endDateTime: hDate.toISOString(), description: `実験「${s.name}」のH注射` },
        { key: "exp" as const, title: `【実験】${s.name}`, dateTime: expDate.toISOString(), endDateTime: expEndDate.toISOString(), description: `実験「${s.name}」` },
      ];

      const eventIds: Partial<CalendarEventIds> = {};
      let allOk = true;
      for (const ev of events) {
        const res = await fetch("/api/calendar/sync", {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ title: ev.title, description: ev.description, dueDate: ev.dateTime, endDate: ev.endDateTime, isDateTime: true }),
        });
        if (res.status === 401) { window.location.href = `/api/calendar/connect?token=${authToken}`; return; }
        if (res.ok) { const d = await res.json(); eventIds[ev.key] = d.eventId; }
        else allOk = false;
      }
      if (allOk && eventIds.p && eventIds.h && eventIds.exp) {
        setReceivedCalendarIds(prev => ({ ...prev, [received.id]: eventIds as CalendarEventIds }));
        showToast("Googleカレンダーに3件追加しました");
      } else {
        showToast("一部の追加に失敗しました");
      }
    } finally {
      setAddingToCalendar(null);
    }
  };

  const handleDeleteReceived = async (received: ReceivedSchedule) => {
    if (!confirm("この共有スケジュールを削除しますか？")) return;
    setDeleting(received.id);
    try {
      const calIds = receivedCalendarIds[received.id];
      if (calIds) {
        await Promise.all([calIds.p, calIds.h, calIds.exp].map(eventId =>
          fetch("/api/calendar/sync", { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ eventId }) })
        ));
        showToast("スケジュールとGoogleカレンダーの予定を削除しました");
      } else {
        showToast("共有スケジュールを削除しました");
      }
      await fetch(`/api/messages/${received.id}`, { method: "DELETE", headers: authHeaders() });
      setReceivedSchedules(prev => prev.filter(r => r.id !== received.id));
    } finally {
      setDeleting(null);
    }
  };

  const handleDelete = async (schedule: ExperimentSchedule) => {
    setDeleting(schedule.id);
    try {
      if (schedule.calendar_added && schedule.calendar_event_ids) {
        const { p, h, exp } = schedule.calendar_event_ids;
        await Promise.all([p, h, exp].map(eventId =>
          fetch("/api/calendar/sync", { method: "DELETE", headers: authHeaders(), body: JSON.stringify({ eventId }) })
        ));
        showToast("スケジュールとGoogleカレンダーの予定を削除しました");
      } else {
        showToast("スケジュールを削除しました");
      }
      await fetch(`/api/experiment-schedules/${schedule.id}`, { method: "DELETE", headers: authHeaders() });
      setSchedules(prev => prev.filter(s => s.id !== schedule.id));
    } finally {
      setDeleting(null);
    }
  };

  const handleAddToCalendar = async (schedule: ExperimentSchedule) => {
    setAddingToCalendar(schedule.id);
    try {
      const { hDate, pDate } = calcInjections(schedule.experiment_datetime, schedule.hours_before_h);
      const expDate = new Date(schedule.experiment_datetime);
      const expEndDate = new Date(schedule.experiment_end_datetime);

      const events = [
        { key: "p" as const, title: `【P注射】${schedule.name}`, dateTime: pDate.toISOString(), endDateTime: pDate.toISOString(), description: `実験「${schedule.name}」のP注射` },
        { key: "h" as const, title: `【H注射】${schedule.name}`, dateTime: hDate.toISOString(), endDateTime: hDate.toISOString(), description: `実験「${schedule.name}」のH注射` },
        { key: "exp" as const, title: `【実験】${schedule.name}`, dateTime: expDate.toISOString(), endDateTime: expEndDate.toISOString(), description: `実験「${schedule.name}」` },
      ];

      const eventIds: Partial<CalendarEventIds> = {};
      let allOk = true;
      for (const ev of events) {
        const res = await fetch("/api/calendar/sync", {
          method: "POST", headers: authHeaders(),
          body: JSON.stringify({ title: ev.title, description: ev.description, dueDate: ev.dateTime, endDate: ev.endDateTime, isDateTime: true }),
        });
        if (res.status === 401) { window.location.href = `/api/calendar/connect?token=${authToken}`; return; }
        if (res.ok) { const d = await res.json(); eventIds[ev.key] = d.eventId; }
        else allOk = false;
      }

      if (allOk && eventIds.p && eventIds.h && eventIds.exp) {
        const updated = { calendar_added: true, calendar_event_ids: eventIds };
        await fetch(`/api/experiment-schedules/${schedule.id}`, {
          method: "PATCH", headers: authHeaders(), body: JSON.stringify(updated),
        });
        setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, ...updated, calendar_event_ids: eventIds as CalendarEventIds } : s));
        showToast("Googleカレンダーに3件追加しました");
      } else {
        showToast("一部の追加に失敗しました");
      }
    } finally {
      setAddingToCalendar(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">実験スケジューラー</h2>
          <p className="text-sm text-gray-500 mt-0.5">実験日時を入力するとP・H注射の日時を自動計算します</p>
        </div>
        {tab === "my" && (
          <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />実験を追加
          </button>
        )}
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setTab("my")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "my" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <FlaskConical className="w-4 h-4" />マイスケジュール
        </button>
        <button
          onClick={() => setTab("received")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === "received" ? "bg-white text-teal-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          <Inbox className="w-4 h-4" />もらった予定
          {receivedSchedules.length > 0 && <span className="bg-teal-500 text-white text-xs rounded-full px-1.5">{receivedSchedules.length}</span>}
        </button>
      </div>

      {/* マイスケジュール */}
      {tab === "my" && (
        <>
          {showForm && (
            <div className="bg-white border rounded-xl p-5 space-y-4">
              <h3 className="font-medium text-gray-900">新しい実験スケジュール</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">実験名</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="例：胚盤胞採取 実験A"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">実験開始時刻</label>
                  <input type="datetime-local" value={experimentDateTime} onChange={e => handleExperimentStartChange(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">実験終了時刻</label>
                  <input type="datetime-local" value={experimentEndDateTime} onChange={e => setExperimentEndDateTime(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">H注射タイミング（実験開始の何時間前）</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={hoursBeforeH} onChange={e => setHoursBeforeH(Number(e.target.value))} min={1} max={72}
                    className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">時間前（標準: 16時間）</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">P注射はH注射と同じ時刻の2日前（実験の{hoursBeforeH + 48}時間前）</p>
              </div>
              {experimentDateTime && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-medium text-blue-700 mb-2">自動計算結果：</p>
                  {(() => {
                    const { hDate, pDate } = calcInjections(experimentDateTime, hoursBeforeH);
                    const endDt = experimentEndDateTime || isoToDatetimeLocal(addHoursToISO(new Date(experimentDateTime).toISOString(), 7));
                    return (<>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium text-xs">P注射</span>
                        <span className="text-gray-700">{formatDateTime(pDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium text-xs">H注射</span>
                        <span className="text-gray-700">{formatDateTime(hDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium text-xs">実験</span>
                        <span className="text-gray-700">{formatDateTime(new Date(experimentDateTime))} 〜 {formatDateTime(new Date(endDt))}</span>
                      </div>
                    </>);
                  })()}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowForm(false); setName(""); setExperimentDateTime(""); setExperimentEndDateTime(""); setHoursBeforeH(16); }}
                  className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">キャンセル</button>
                <button onClick={handleAdd} disabled={adding || !name.trim() || !experimentDateTime}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  {adding ? "追加中..." : "追加"}
                </button>
              </div>
            </div>
          )}

          {schedules.length === 0 && !showForm && (
            <div className="text-center py-16 text-gray-400">
              <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>実験スケジュールがありません。「実験を追加」から登録するか、タスクに実験日を設定すると自動で追加されます。</p>
            </div>
          )}

          <div className="space-y-3">
            {schedules.map(schedule => {
              const { hDate, pDate } = calcInjections(schedule.experiment_datetime, schedule.hours_before_h);
              const expDate = new Date(schedule.experiment_datetime);
              const expEndDate = new Date(schedule.experiment_end_datetime);
              const isPast = expDate < new Date();

              return (
                <div key={schedule.id} className={`bg-white border rounded-xl p-5 ${isPast ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                        {schedule.task_id && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">タスクから自動追加</span>}
                        {isPast && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">終了</span>}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">H注射: 実験{schedule.hours_before_h}時間前</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!schedule.calendar_added ? (
                        <button onClick={() => handleAddToCalendar(schedule)} disabled={addingToCalendar === schedule.id}
                          className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50">
                          <CalendarDays className="w-4 h-4" />カレンダーに追加
                        </button>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-green-600">
                          <CheckCircle className="w-4 h-4" />カレンダー登録済
                        </span>
                      )}
                      <button onClick={() => handleDelete(schedule)} disabled={deleting === schedule.id}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                        title={schedule.calendar_added ? "スケジュールとカレンダー予定を削除" : "スケジュールを削除"}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-orange-700 mb-1">P注射</div>
                      <div className="text-sm font-semibold text-gray-900">{formatDateTime(pDate)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">実験{schedule.hours_before_h + 48}時間前</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-purple-700 mb-1">H注射</div>
                      <div className="text-sm font-semibold text-gray-900">{formatDateTime(hDate)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">実験{schedule.hours_before_h}時間前</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="text-xs font-medium text-blue-700 mb-1">実験（採卵）</div>
                      <div className="text-sm font-semibold text-gray-900">{formatDateTime(expDate)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">〜 {formatDateTime(expEndDate)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* もらった予定 */}
      {tab === "received" && (
        <>
          {receivedLoading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : receivedSchedules.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Inbox className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>共有された実験スケジュールはありません。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedSchedules.map(received => {
                const s = received.share_data;
                const { hDate, pDate } = calcInjections(s.experiment_datetime, s.hours_before_h);
                const expDate = new Date(s.experiment_datetime);
                const expEndDate = new Date(s.experiment_end_datetime);
                const isPast = expDate < new Date();

                return (
                  <div key={received.id} className={`bg-teal-50 border-2 border-teal-200 rounded-xl p-5 ${isPast ? "opacity-60" : ""}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-teal-600" />
                          <h3 className="font-semibold text-gray-900">{s.name}</h3>
                          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />@{received.sender?.username}より
                          </span>
                          {isPast && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">終了</span>}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">H注射: 実験{s.hours_before_h}時間前</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {receivedCalendarIds[received.id] ? (
                          <span className="flex items-center gap-1.5 text-sm text-green-600">
                            <CheckCircle className="w-4 h-4" />カレンダー登録済
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAddReceivedToCalendar(received)}
                            disabled={addingToCalendar === received.id}
                            className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 bg-white rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            <CalendarDays className="w-4 h-4" />{addingToCalendar === received.id ? "追加中..." : "カレンダーに追加"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReceived(received)}
                          disabled={deleting === received.id}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                          title="共有スケジュールを削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-orange-700 mb-1">P注射</div>
                        <div className="text-sm font-semibold text-gray-900">{formatDateTime(pDate)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">実験{s.hours_before_h + 48}時間前</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-xs font-medium text-purple-700 mb-1">H注射</div>
                        <div className="text-sm font-semibold text-gray-900">{formatDateTime(hDate)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">実験{s.hours_before_h}時間前</div>
                      </div>
                      <div className="bg-teal-100 rounded-lg p-3">
                        <div className="text-xs font-medium text-teal-700 mb-1">実験（採卵）</div>
                        <div className="text-sm font-semibold text-gray-900">{formatDateTime(expDate)}</div>
                        <div className="text-xs text-gray-400 mt-0.5">〜 {formatDateTime(expEndDate)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
