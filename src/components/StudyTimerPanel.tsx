"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Square, Clock, BookOpen, Trophy, TrendingUp } from "lucide-react";

type Session = {
  duration_minutes: number;
  subject: string | null;
  created_at: string;
};

type Props = {
  authToken?: string;
};

const GOLD_PER_MINUTE = 1; // 1G/分
const TIMER_KEY = "study_timer_start";
const TIMER_SUBJECT_KEY = "study_timer_subject";
const MAX_SECONDS = 12 * 60 * 60; // 12時間で自動ストップ

function fmt(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function StudyTimerPanel({ authToken }: Props) {
  const [running, setRunning]       = useState(false);
  const [elapsed, setElapsed]       = useState(0);
  const [subject, setSubject]       = useState("");
  const [totalMinutes, setTotal]    = useState(0);
  const [todayMinutes, setToday]    = useState(0);
  const [sessions, setSessions]     = useState<Session[]>([]);
  const [toast, setToast]           = useState<string | null>(null);
  const [saving, setSaving]         = useState(false);
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null);

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };

  const showToast = (msg: string) => {
    setToast(msg); setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = useCallback(async () => {
    if (!authToken) return;
    const res = await fetch("/api/study-sessions", { headers });
    if (!res.ok) return;
    const data = await res.json();
    setTotal(data.totalMinutes ?? 0);
    setToday(data.todayMinutes ?? 0);
    setSessions(data.sessions ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  // マウント時: localStorage に進行中タイマーがあれば復元
  useEffect(() => {
    const saved = localStorage.getItem(TIMER_KEY);
    if (saved) {
      const startMs = parseInt(saved, 10);
      const elapsedNow = Math.floor((Date.now() - startMs) / 1000);

      // 6時間超で放置されていた場合は自動ストップ（保存はしない）
      if (elapsedNow >= MAX_SECONDS) {
        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(TIMER_SUBJECT_KEY);
        showToast("6時間以上の放置が検出されたため、自動でストップしました");
      } else {
        setElapsed(elapsedNow);
        setSubject(localStorage.getItem(TIMER_SUBJECT_KEY) ?? "");
        setRunning(true);
        intervalRef.current = setInterval(() => {
          const e = Math.floor((Date.now() - startMs) / 1000);
          if (e >= MAX_SECONDS) {
            // 計測中に6時間到達
            clearInterval(intervalRef.current!);
            localStorage.removeItem(TIMER_KEY);
            localStorage.removeItem(TIMER_SUBJECT_KEY);
            setRunning(false);
            setElapsed(0);
            showToast("6時間以上の放置が検出されたため、自動でストップしました");
          } else {
            setElapsed(e);
          }
        }, 1000);
      }
    }
    fetchStats();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // subject が変わったらlocalStorageも同期
  useEffect(() => {
    if (running) localStorage.setItem(TIMER_SUBJECT_KEY, subject);
  }, [subject, running]);

  function startTimer() {
    const startMs = Date.now();
    localStorage.setItem(TIMER_KEY, String(startMs));
    localStorage.setItem(TIMER_SUBJECT_KEY, subject);
    setElapsed(0);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const e = Math.floor((Date.now() - startMs) / 1000);
      if (e >= MAX_SECONDS) {
        clearInterval(intervalRef.current!);
        localStorage.removeItem(TIMER_KEY);
        localStorage.removeItem(TIMER_SUBJECT_KEY);
        setRunning(false);
        setElapsed(0);
        showToast("6時間以上の放置が検出されたため、自動でストップしました");
      } else {
        setElapsed(e);
      }
    }, 1000);
  }

  async function stopTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    localStorage.removeItem(TIMER_KEY);
    localStorage.removeItem(TIMER_SUBJECT_KEY);
    setRunning(false);
    const minutes = Math.floor(elapsed / 60);
    if (minutes < 1) {
      showToast("1分未満のセッションは記録されません");
      setElapsed(0);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/study-sessions", {
        method: "POST",
        headers,
        body: JSON.stringify({ duration_minutes: minutes, subject: subject.trim() || null }),
      });
      if (res.ok) {
        const earned = minutes * GOLD_PER_MINUTE;
        showToast(`${minutes}分記録！ Research RPGで ${earned}G 獲得予定 🎉`);
        await fetchStats();
      } else {
        showToast("保存に失敗しました");
      }
    } finally {
      setSaving(false);
      setElapsed(0);
    }
  }

  const earnedGold = totalMinutes * GOLD_PER_MINUTE;
  const todayGold  = todayMinutes * GOLD_PER_MINUTE;

  // 直近7日の勉強時間集計
  const last7: { date: string; minutes: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const mins = sessions
      .filter(s => s.created_at?.startsWith(dateStr))
      .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);
    last7.push({ date: dateStr.slice(5), minutes: mins });
  }
  const maxMins = Math.max(...last7.map(d => d.minutes), 1);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* タイマーカード */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-800">自習タイマー</h2>
          {running && (
            <span className="ml-auto flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              計測中
            </span>
          )}
        </div>

        {/* 科目入力 */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1.5">科目・内容（任意）</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={running}
            placeholder="例: 論文読み込み、実験データ解析..."
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* タイマー表示 */}
        <div className="flex items-center justify-center my-6">
          <div className={`text-6xl font-mono font-bold tabular-nums transition-colors ${running ? "text-blue-600" : "text-gray-300"}`}>
            {fmt(elapsed)}
          </div>
        </div>

        {/* ボタン */}
        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={startTimer}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 font-medium transition-colors"
            >
              <Play className="w-5 h-5" />
              スタート
            </button>
          ) : (
            <button
              onClick={stopTimer}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white rounded-xl py-3 font-medium transition-colors disabled:opacity-60"
            >
              <Square className="w-5 h-5" />
              {saving ? "保存中..." : "ストップ & 保存"}
            </button>
          )}
        </div>

        {running && (
          <p className="text-center text-xs text-gray-400 mt-3">
            ストップすると記録されます（1分未満は記録なし）
          </p>
        )}
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">今日</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {Math.floor(todayMinutes / 60) > 0
              ? `${Math.floor(todayMinutes / 60)}h ${todayMinutes % 60}m`
              : `${todayMinutes}分`}
          </div>
          <div className="text-xs text-blue-600 mt-1">+ {todayGold}G 獲得</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border border-yellow-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-semibold text-yellow-700 uppercase tracking-wide">累計</span>
          </div>
          <div className="text-3xl font-bold text-yellow-800">
            {Math.floor(totalMinutes / 60) > 0
              ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
              : `${totalMinutes}分`}
          </div>
          <div className="text-xs text-yellow-600 mt-1">累計 {earnedGold}G 獲得</div>
        </div>
      </div>

      {/* 7日グラフ */}
      <div className="bg-white rounded-2xl border shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">過去7日間の自習時間</h3>
        </div>
        <div className="flex items-end gap-2 h-24">
          {last7.map(({ date, minutes }) => (
            <div key={date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full rounded-t-md bg-blue-500 transition-all duration-300 min-h-[2px]"
                style={{ height: `${(minutes / maxMins) * 80}px` }}
                title={`${minutes}分`}
              />
              <span className="text-[10px] text-gray-400">{date}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-gray-400 text-right">
          1G / 分 → Research RPGのゴールドに変換
        </div>
      </div>

      {/* 直近セッション履歴 */}
      {sessions.length > 0 && (
        <div className="bg-white rounded-2xl border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">最近のセッション</h3>
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="text-sm text-gray-700">{s.subject ?? "（科目未設定）"}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(s.created_at).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-gray-700">{s.duration_minutes}分</span>
                  <span className="text-xs text-yellow-600 ml-1.5">+{s.duration_minutes}G</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  );
}
