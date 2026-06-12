"use client";

import { useState } from "react";
import { CalendarDays, Plus, Trash2, FlaskConical, Clock, CheckCircle } from "lucide-react";

interface CalendarEventIds {
  p: string;
  h: string;
  exp: string;
}

interface ExperimentSchedule {
  id: string;
  name: string;
  experimentDateTime: string;
  experimentEndDateTime: string;
  hoursBeforeH: number;
  calendarAdded: boolean;
  calendarEventIds?: CalendarEventIds;
}

interface Props {
  authToken?: string;
}

function calcInjections(experimentDateTime: string, hoursBeforeH: number) {
  const expDate = new Date(experimentDateTime);
  const hDate = new Date(expDate.getTime() - hoursBeforeH * 60 * 60 * 1000);
  const pDate = new Date(hDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  return { hDate, pDate };
}

function formatDateTime(date: Date) {
  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// datetime-local入力用: 指定時刻から指定時間後のdatetime-local文字列を返す
function addHoursToDatetimeLocal(dtLocal: string, hours: number): string {
  if (!dtLocal) return "";
  const d = new Date(dtLocal);
  d.setHours(d.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ExperimentScheduler({ authToken }: Props) {
  const [schedules, setSchedules] = useState<ExperimentSchedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [experimentDateTime, setExperimentDateTime] = useState("");
  const [experimentEndDateTime, setExperimentEndDateTime] = useState("");
  const [hoursBeforeH, setHoursBeforeH] = useState(16);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const authHeaders = (): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h["Authorization"] = `Bearer ${authToken}`;
    return h;
  };

  const handleExperimentStartChange = (value: string) => {
    setExperimentDateTime(value);
    // 終了時刻が未設定または以前の開始時刻から自動設定されていた場合、7時間後をデフォルトにセット
    if (value) {
      setExperimentEndDateTime(addHoursToDatetimeLocal(value, 7));
    } else {
      setExperimentEndDateTime("");
    }
  };

  const handleAdd = () => {
    if (!name.trim() || !experimentDateTime) return;
    const endDt = experimentEndDateTime || addHoursToDatetimeLocal(experimentDateTime, 7);
    const newSchedule: ExperimentSchedule = {
      id: crypto.randomUUID(),
      name: name.trim(),
      experimentDateTime,
      experimentEndDateTime: endDt,
      hoursBeforeH,
      calendarAdded: false,
    };
    setSchedules((prev) => [newSchedule, ...prev]);
    setName("");
    setExperimentDateTime("");
    setExperimentEndDateTime("");
    setHoursBeforeH(16);
    setShowForm(false);
  };

  const handleDelete = async (schedule: ExperimentSchedule) => {
    setDeleting(schedule.id);
    try {
      // カレンダーに登録済みなら削除
      if (schedule.calendarAdded && schedule.calendarEventIds) {
        const { p, h, exp } = schedule.calendarEventIds;
        await Promise.all(
          [p, h, exp].map((eventId) =>
            fetch("/api/calendar/sync", {
              method: "DELETE",
              headers: authHeaders(),
              body: JSON.stringify({ eventId }),
            })
          )
        );
        showToast("スケジュールとGoogleカレンダーの予定を削除しました");
      } else {
        showToast("スケジュールを削除しました");
      }
      setSchedules((prev) => prev.filter((s) => s.id !== schedule.id));
    } finally {
      setDeleting(null);
    }
  };

  const handleAddToCalendar = async (schedule: ExperimentSchedule) => {
    setAdding(true);
    try {
      const { hDate, pDate } = calcInjections(schedule.experimentDateTime, schedule.hoursBeforeH);
      const expDate = new Date(schedule.experimentDateTime);
      const expEndDate = new Date(schedule.experimentEndDateTime);

      const events = [
        {
          key: "p" as const,
          title: `【P注射】${schedule.name}`,
          dateTime: pDate.toISOString(),
          endDateTime: pDate.toISOString(),
          description: `実験「${schedule.name}」のP注射（実験${schedule.hoursBeforeH + 48}時間前）`,
        },
        {
          key: "h" as const,
          title: `【H注射】${schedule.name}`,
          dateTime: hDate.toISOString(),
          endDateTime: hDate.toISOString(),
          description: `実験「${schedule.name}」のH注射（実験${schedule.hoursBeforeH}時間前）`,
        },
        {
          key: "exp" as const,
          title: `【実験】${schedule.name}`,
          dateTime: expDate.toISOString(),
          endDateTime: expEndDate.toISOString(),
          description: `実験「${schedule.name}」`,
        },
      ];

      const eventIds: Partial<CalendarEventIds> = {};
      let allOk = true;

      for (const ev of events) {
        const res = await fetch("/api/calendar/sync", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            title: ev.title,
            description: ev.description,
            dueDate: ev.dateTime,
            endDate: ev.endDateTime,
            isDateTime: true,
          }),
        });
        if (res.status === 401) {
          window.location.href = `/api/calendar/connect?token=${authToken}`;
          return;
        }
        if (res.ok) {
          const data = await res.json();
          eventIds[ev.key] = data.eventId;
        } else {
          allOk = false;
        }
      }

      if (allOk && eventIds.p && eventIds.h && eventIds.exp) {
        setSchedules((prev) =>
          prev.map((s) =>
            s.id === schedule.id
              ? { ...s, calendarAdded: true, calendarEventIds: eventIds as CalendarEventIds }
              : s
          )
        );
        showToast("Googleカレンダーに3件追加しました");
      } else {
        showToast("一部の追加に失敗しました");
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">実験スケジューラー</h2>
          <p className="text-sm text-gray-500 mt-0.5">実験日時を入力するとP・H注射の日時を自動計算します</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          実験を追加
        </button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h3 className="font-medium text-gray-900">新しい実験スケジュール</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">実験名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例：胚盤胞採取 実験A"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">実験開始時刻</label>
              <input
                type="datetime-local"
                value={experimentDateTime}
                onChange={(e) => handleExperimentStartChange(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">実験終了時刻</label>
              <input
                type="datetime-local"
                value={experimentEndDateTime}
                onChange={(e) => setExperimentEndDateTime(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              H注射タイミング（実験開始の何時間前）
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={hoursBeforeH}
                onChange={(e) => setHoursBeforeH(Number(e.target.value))}
                min={1}
                max={72}
                className="w-24 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">時間前（標準: 16時間）</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">P注射はH注射と同じ時刻の2日前（実験の{hoursBeforeH + 48}時間前）</p>
          </div>

          {experimentDateTime && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <p className="text-xs font-medium text-blue-700 mb-2">自動計算結果：</p>
              {(() => {
                const { hDate, pDate } = calcInjections(experimentDateTime, hoursBeforeH);
                const endDt = experimentEndDateTime || addHoursToDatetimeLocal(experimentDateTime, 7);
                return (
                  <>
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
                      <span className="text-gray-700">
                        {formatDateTime(new Date(experimentDateTime))} 〜 {formatDateTime(new Date(endDt))}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setName(""); setExperimentDateTime(""); setExperimentEndDateTime(""); setHoursBeforeH(16); }}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={!name.trim() || !experimentDateTime}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              追加
            </button>
          </div>
        </div>
      )}

      {schedules.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>実験スケジュールがありません。「実験を追加」から登録してください。</p>
        </div>
      )}

      <div className="space-y-3">
        {schedules.map((schedule) => {
          const { hDate, pDate } = calcInjections(schedule.experimentDateTime, schedule.hoursBeforeH);
          const expDate = new Date(schedule.experimentDateTime);
          const expEndDate = new Date(schedule.experimentEndDateTime);
          const now = new Date();
          const isPast = expDate < now;

          return (
            <div key={schedule.id} className={`bg-white border rounded-xl p-5 ${isPast ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">{schedule.name}</h3>
                    {isPast && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">終了</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">H注射: 実験{schedule.hoursBeforeH}時間前</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!schedule.calendarAdded ? (
                    <button
                      onClick={() => handleAddToCalendar(schedule)}
                      disabled={adding}
                      className="flex items-center gap-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition-colors disabled:opacity-50"
                    >
                      <CalendarDays className="w-4 h-4" />
                      カレンダーに追加
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      カレンダー登録済
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(schedule)}
                    disabled={deleting === schedule.id}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1 disabled:opacity-50"
                    title={schedule.calendarAdded ? "スケジュールとカレンダー予定を削除" : "スケジュールを削除"}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-orange-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-orange-700 mb-1">P注射</div>
                  <div className="text-sm font-semibold text-gray-900">{formatDateTime(pDate)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">実験{schedule.hoursBeforeH + 48}時間前</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-purple-700 mb-1">H注射</div>
                  <div className="text-sm font-semibold text-gray-900">{formatDateTime(hDate)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">実験{schedule.hoursBeforeH}時間前</div>
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
