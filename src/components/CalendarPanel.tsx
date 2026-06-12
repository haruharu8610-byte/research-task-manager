"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  colorId?: string;
}

interface Props {
  authToken?: string;
}

const EVENT_COLORS: Record<string, string> = {
  "1": "bg-blue-500",
  "2": "bg-green-500",
  "3": "bg-purple-500",
  "4": "bg-red-400",
  "5": "bg-yellow-400",
  "6": "bg-orange-400",
  "7": "bg-teal-500",
  "8": "bg-gray-500",
  "9": "bg-blue-700",
  "10": "bg-green-700",
  "11": "bg-red-600",
};

function getEventColor(event: CalendarEvent): string {
  if (event.colorId && EVENT_COLORS[event.colorId]) return EVENT_COLORS[event.colorId];
  const title = event.summary ?? "";
  if (title.includes("P注射")) return "bg-orange-400";
  if (title.includes("H注射")) return "bg-purple-500";
  if (title.includes("実験")) return "bg-blue-500";
  return "bg-blue-400";
}

function getEventDate(event: CalendarEvent): string {
  return event.start.date ?? event.start.dateTime?.slice(0, 10) ?? "";
}

function formatTime(dt?: string): string {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const MONTHS_JA = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export default function CalendarPanel({ authToken }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [notConnected, setNotConnected] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setNotConnected(false);
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (authToken) (headers as Record<string, string>)["Authorization"] = `Bearer ${authToken}`;
      const res = await fetch(`/api/calendar/events?year=${year}&month=${month}`, { headers });
      if (res.status === 401) { setNotConnected(true); return; }
      const data = await res.json();
      setEvents(data.events ?? []);
    } finally {
      setLoading(false);
    }
  }, [year, month, authToken]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDate(today.toISOString().slice(0, 10));
  };

  // カレンダーグリッド生成
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    const d = getEventDate(ev);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(ev);
  }

  const todayStr = today.toISOString().slice(0, 10);

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] ?? []) : [];

  if (notConnected) {
    return (
      <div className="text-center py-20 text-gray-400">
        <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-medium text-gray-500">Googleカレンダーが未連携です</p>
        <p className="text-sm mt-1">ヘッダーの「Googleカレンダー連携」から連携してください。</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <button
              onClick={goToday}
              className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 font-medium text-gray-700"
            >
              今日
            </button>
            <div className="flex items-center gap-1">
              <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {year}年 {MONTHS_JA[month - 1]}
            </h2>
          </div>
          {loading && (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`py-2 text-center text-xs font-medium ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const dateStr = day ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
            const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const dow = idx % 7;

            return (
              <div
                key={idx}
                onClick={() => day && setSelectedDate(isSelected ? null : dateStr)}
                className={`min-h-[90px] border-b border-r p-1 cursor-pointer transition-colors ${
                  day ? "hover:bg-gray-50" : "bg-gray-50/50"
                } ${isSelected ? "bg-blue-50" : ""}`}
              >
                {day && (
                  <>
                    <div className="flex justify-center mb-1">
                      <span
                        className={`text-sm w-7 h-7 flex items-center justify-center rounded-full font-medium ${
                          isToday
                            ? "bg-blue-600 text-white"
                            : dow === 0
                            ? "text-red-500"
                            : dow === 6
                            ? "text-blue-500"
                            : "text-gray-700"
                        }`}
                      >
                        {day}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className={`${getEventColor(ev)} text-white text-xs rounded px-1 py-0.5 truncate`}
                          title={ev.summary}
                        >
                          {ev.start.dateTime ? `${formatTime(ev.start.dateTime)} ` : ""}
                          {ev.summary}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-400 pl-1">他{dayEvents.length - 3}件</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 選択日の予定詳細 */}
      {selectedDate && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-semibold text-gray-900 mb-3">
            {new Date(selectedDate + "T00:00:00").toLocaleDateString("ja-JP", {
              year: "numeric", month: "long", day: "numeric", weekday: "short",
            })}の予定
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-gray-400">予定はありません</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${getEventColor(ev)}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ev.summary}</p>
                    <p className="text-xs text-gray-400">
                      {ev.start.dateTime
                        ? `${formatTime(ev.start.dateTime)} 〜 ${formatTime(ev.end.dateTime)}`
                        : "終日"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
