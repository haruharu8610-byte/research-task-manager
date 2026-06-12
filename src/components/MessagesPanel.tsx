"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Send, User, Settings, ChevronDown, ChevronUp, FileText } from "lucide-react";

const REACTIONS = ["👍", "👎", "😊", "🎉", "🔬", "❓"];
const HISTORY_KEY = "message_recipient_history";

interface Profile { id: string; username: string; }
interface Reaction { id: string; user_id: string; emoji: string; }
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  note_id?: string;
  note_title?: string;
  note_content?: string;
  created_at: string;
  sender: { username: string };
  receiver: { username: string };
  reactions: Reaction[];
}

interface Props {
  userId: string;
  authToken?: string;
  notes?: { id: string; title: string; content: string }[];
}

export default function MessagesPanel({ userId, authToken, notes = [] }: Props) {
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [selectedReceiver, setSelectedReceiver] = useState<Profile | null>(null);
  const [history, setHistory] = useState<Profile[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedNote, setSelectedNote] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [showNoteSelector, setShowNoteSelector] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const headers = useCallback((): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) h["Authorization"] = `Bearer ${authToken}`;
    return h;
  }, [authToken]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // プロフィール取得
  useEffect(() => {
    fetch("/api/profiles", { headers: headers() })
      .then(r => r.json())
      .then(d => { if (d?.username) setMyProfile(d); });
  }, [headers]);

  // メッセージ取得
  const fetchMessages = useCallback(async () => {
    if (!myProfile) return;
    const res = await fetch("/api/messages", { headers: headers() });
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }, [myProfile, headers]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // 履歴読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored));
    } catch {}
  }, []);

  // 送信相手が選択されたらメッセージ末尾にスクロール
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [selectedReceiver, messages.length]);

  const saveProfile = async () => {
    if (!username.trim()) return;
    setSavingProfile(true);
    const res = await fetch("/api/profiles", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    setSavingProfile(false);
    if (data.error) { showToast(data.error); return; }
    setMyProfile(data);
    setShowProfileEdit(false);
    showToast("ユーザー名を設定しました");
  };

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(q)}`, { headers: headers() });
    const data = await res.json();
    setSearchResults(Array.isArray(data) ? data : []);
  }, [headers]);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchQ), 300);
    return () => clearTimeout(t);
  }, [searchQ, searchUsers]);

  const selectReceiver = (profile: Profile) => {
    setSelectedReceiver(profile);
    setShowSearch(false);
    setSearchQ("");
    setSearchResults([]);
    // 履歴に追加
    const newHistory = [profile, ...history.filter(h => h.id !== profile.id)].slice(0, 10);
    setHistory(newHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  };

  const sendMessage = async () => {
    if (!selectedReceiver) return;
    setSending(true);
    const note = notes.find(n => n.id === selectedNote);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        receiver_id: selectedReceiver.id,
        note_id: note?.id ?? null,
        note_title: note?.title ?? null,
        note_content: note?.content ?? null,
      }),
    });
    const data = await res.json();
    setSending(false);
    if (data.error) { showToast(data.error); return; }
    setMessages(prev => [...prev, data]);
    setSelectedNote("");
    setShowNoteSelector(false);
    showToast("送信しました");
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    const res = await fetch("/api/messages/reactions", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ message_id: messageId, emoji }),
    });
    if (res.ok) fetchMessages();
  };

  const toggleNoteExpand = (id: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // 選択中の相手とのメッセージだけ表示
  const thread = selectedReceiver
    ? messages.filter(m =>
        (m.sender_id === userId && m.receiver_id === selectedReceiver.id) ||
        (m.receiver_id === userId && m.sender_id === selectedReceiver.id)
      )
    : [];

  if (!myProfile && !showProfileEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <User className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">ユーザー名を設定してメッセージ機能を使いましょう</p>
        <button
          onClick={() => setShowProfileEdit(true)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          ユーザー名を設定する
        </button>
      </div>
    );
  }

  if (showProfileEdit) {
    return (
      <div className="max-w-sm mx-auto py-20 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">ユーザー名設定</h2>
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="例: haruto_lab"
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === "Enter" && saveProfile()}
        />
        <p className="text-xs text-gray-400">英数字・アンダースコア推奨。他のユーザーがこの名前であなたを検索できます。</p>
        <div className="flex gap-2">
          {myProfile && (
            <button onClick={() => setShowProfileEdit(false)} className="flex-1 border rounded-lg py-2 text-sm text-gray-600 hover:bg-gray-50">
              キャンセル
            </button>
          )}
          <button
            onClick={saveProfile}
            disabled={savingProfile || !username.trim()}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {savingProfile ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[640px]">
      {/* 左カラム：相手選択 */}
      <div className="w-64 flex-shrink-0 bg-white border rounded-xl flex flex-col overflow-hidden">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500">ログイン中</span>
            <button onClick={() => { setShowProfileEdit(true); setUsername(myProfile?.username ?? ""); }} className="text-gray-400 hover:text-blue-500">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-sm font-semibold text-gray-900">@{myProfile?.username}</p>
        </div>

        <div className="p-3 border-b">
          <button
            onClick={() => setShowSearch(s => !s)}
            className="w-full flex items-center gap-2 text-sm text-gray-600 border rounded-lg px-3 py-2 hover:bg-gray-50"
          >
            <Search className="w-4 h-4" />
            ユーザーを検索
          </button>
          {showSearch && (
            <div className="mt-2 space-y-1">
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="ユーザー名を入力..."
                autoFocus
                className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectReceiver(p)}
                  className="w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-blue-50 text-gray-800"
                >
                  @{p.username}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 履歴 */}
        <div className="flex-1 overflow-y-auto">
          {history.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-gray-400 px-2 mb-1">最近の相手</p>
              {history.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectReceiver(p)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedReceiver?.id === p.id ? "bg-blue-600 text-white" : "hover:bg-gray-100 text-gray-800"
                  }`}
                >
                  @{p.username}
                </button>
              ))}
            </div>
          )}
          {history.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-6 px-4">上の検索からユーザーを探して会話を始めましょう</p>
          )}
        </div>
      </div>

      {/* 右カラム：チャット */}
      <div className="flex-1 bg-white border rounded-xl flex flex-col overflow-hidden">
        {!selectedReceiver ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Send className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">左のリストから相手を選んでください</p>
            </div>
          </div>
        ) : (
          <>
            {/* チャットヘッダー */}
            <div className="px-5 py-3 border-b flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">@{selectedReceiver.username}</span>
            </div>

            {/* メッセージ一覧 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {thread.length === 0 && (
                <p className="text-center text-sm text-gray-400 mt-8">まだメッセージはありません。下からノートを送ってみましょう。</p>
              )}
              {thread.map(msg => {
                const isMine = msg.sender_id === userId;
                const isExpanded = expandedNotes.has(msg.id);
                const reactionCounts: Record<string, { count: number; mine: boolean }> = {};
                for (const r of msg.reactions) {
                  if (!reactionCounts[r.emoji]) reactionCounts[r.emoji] = { count: 0, mine: false };
                  reactionCounts[r.emoji].count++;
                  if (r.user_id === userId) reactionCounts[r.emoji].mine = true;
                }

                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] space-y-1`}>
                      <p className={`text-xs text-gray-400 ${isMine ? "text-right" : "text-left"}`}>
                        @{isMine ? myProfile?.username : msg.sender.username}
                        <span className="ml-2">{new Date(msg.created_at).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </p>

                      <div className={`rounded-2xl px-4 py-3 ${isMine ? "bg-blue-600 text-white rounded-tr-sm" : "bg-gray-100 text-gray-900 rounded-tl-sm"}`}>
                        {msg.note_title && (
                          <div className={`mb-2 pb-2 border-b ${isMine ? "border-blue-400" : "border-gray-300"}`}>
                            <div className="flex items-center gap-1.5 mb-1">
                              <FileText className="w-3.5 h-3.5 opacity-70" />
                              <span className="text-xs font-semibold opacity-90">{msg.note_title}</span>
                            </div>
                            {msg.note_content && (
                              <>
                                <p className={`text-xs opacity-80 ${isExpanded ? "" : "line-clamp-3"}`}>
                                  {msg.note_content.replace(/<[^>]+>/g, "").slice(0, isExpanded ? 2000 : 200)}
                                  {!isExpanded && msg.note_content.length > 200 ? "..." : ""}
                                </p>
                                {msg.note_content.length > 200 && (
                                  <button
                                    onClick={() => toggleNoteExpand(msg.id)}
                                    className={`flex items-center gap-0.5 text-xs mt-1 opacity-70 hover:opacity-100 ${isMine ? "text-blue-100" : "text-gray-500"}`}
                                  >
                                    {isExpanded ? <><ChevronUp className="w-3 h-3" />閉じる</> : <><ChevronDown className="w-3 h-3" />続きを読む</>}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {!msg.note_title && <p className="text-sm">ノートを共有しました</p>}
                      </div>

                      {/* リアクション表示 */}
                      {Object.keys(reactionCounts).length > 0 && (
                        <div className={`flex flex-wrap gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                          {Object.entries(reactionCounts).map(([emoji, { count, mine }]) => (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs border transition-colors ${mine ? "bg-blue-100 border-blue-300 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                            >
                              {emoji} {count}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* リアクションボタン */}
                      <div className={`flex gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                        {REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className="text-sm opacity-30 hover:opacity-100 transition-opacity hover:scale-125"
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* 送信エリア */}
            <div className="border-t p-3 space-y-2">
              {showNoteSelector && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">送るノートを選択</p>
                  {notes.length === 0 ? (
                    <p className="text-xs text-gray-400">研究ノートがありません</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {notes.map(n => (
                        <label key={n.id} className="flex items-center gap-2 cursor-pointer hover:bg-white rounded px-2 py-1">
                          <input
                            type="radio"
                            name="note"
                            value={n.id}
                            checked={selectedNote === n.id}
                            onChange={() => setSelectedNote(n.id)}
                            className="accent-blue-600"
                          />
                          <span className="text-sm text-gray-800 truncate">{n.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowNoteSelector(s => !s)}
                  className={`flex items-center gap-1.5 text-sm border rounded-lg px-3 py-2 transition-colors ${showNoteSelector ? "bg-blue-50 border-blue-300 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <FileText className="w-4 h-4" />
                  ノートを選択
                </button>
                <button
                  onClick={sendMessage}
                  disabled={sending}
                  className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 ml-auto"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "送信中..." : "送信"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full text-sm shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
