"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, FileText, FlaskConical, BookOpen, Link, X, Printer, Share2 } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale/ja";

interface Ref {
  url: string;
  title: string;
  authors?: string;
  year?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  note_type: string;
  refs: Ref[];
  created_at: string;
  updated_at: string;
}

const EXPERIMENT_TEMPLATE = `## 実験記録

**実験日:** ${new Date().toLocaleDateString("ja-JP")}
**実験者:**

---

### 目的


### 実験条件
- 温度:
- 時間:
- 試薬/材料:

### 手順
1.
2.
3.

### 結果


### 考察


### 次のステップ
`;

interface SharedRef {
  url: string;
  title: string;
  authors?: string;
  year?: string;
}

interface SharedNote {
  id: string;
  note_title: string;
  note_content: string;
  refs?: SharedRef[];
  created_at: string;
  sender: { username: string };
}

interface NotesPanelProps {
  initialNoteId?: string | null;
  userId?: string;
  authToken?: string;
}

export default function NotesPanel({ initialNoteId, authToken, userId }: NotesPanelProps) {
  const [tab, setTab] = useState<"my" | "shared">("my");
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [selectedShared, setSelectedShared] = useState<SharedNote | null>(null);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [refUrl, setRefUrl] = useState("");
  const [refLoading, setRefLoading] = useState(false);

  const headers = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  useEffect(() => {
    fetchNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const fetchNotes = async () => {
    const res = await fetch("/api/notes", { headers: headers() });
    const data = await res.json();
    setNotes(data);
    setLoading(false);
    if (initialNoteId) {
      const target = data.find((n: Note) => n.id === initialNoteId);
      if (target) setSelectedNote(target);
    }
  };

  const fetchSharedNotes = async () => {
    setSharedLoading(true);
    const res = await fetch("/api/messages", { headers: headers() });
    const data = await res.json();
    const received = (Array.isArray(data) ? data : []).filter(
      (m: { receiver_id: string; note_title?: string }) => m.receiver_id === userId && m.note_title
    );
    setSharedNotes(received);
    setSharedLoading(false);
  };

  useEffect(() => {
    if (tab === "shared") fetchSharedNotes();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleNew = async (type: "free" | "experiment") => {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        title: type === "experiment" ? "実験記録 " + new Date().toLocaleDateString("ja-JP") : "無題のノート",
        content: type === "experiment" ? EXPERIMENT_TEMPLATE : "",
        tags: type === "experiment" ? ["実験記録"] : [],
        note_type: type,
        refs: [],
      }),
    });
    const newNote = await res.json();
    if (!newNote.id) return;
    setNotes((prev) => [newNote, ...prev]);
    setSelectedNote(newNote);
  };

  const handleSave = async () => {
    if (!selectedNote) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${selectedNote.id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({
        title: selectedNote.title,
        content: selectedNote.content,
        tags: selectedNote.tags,
        note_type: selectedNote.note_type,
        refs: selectedNote.refs ?? [],
      }),
    });
    const updated = await res.json();
    setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    setSelectedNote(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このノートを削除しますか？")) return;
    await fetch(`/api/notes/${id}`, { method: "DELETE", headers: headers() });
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNote?.id === id) setSelectedNote(null);
  };

  const updateSelected = (updates: Partial<Note>) => {
    if (!selectedNote) return;
    setSelectedNote({ ...selectedNote, ...updates });
  };

  // DOI/URLから文献情報を取得
  const handleAddRef = async () => {
    if (!refUrl.trim() || !selectedNote) return;
    setRefLoading(true);

    let ref: Ref = { url: refUrl.trim(), title: refUrl.trim() };

    // DOIの場合はCrossRef APIで情報取得
    const doiMatch = refUrl.match(/10\.\d{4,}\/\S+/);
    if (doiMatch) {
      try {
        const res = await fetch(`https://api.crossref.org/works/${doiMatch[0]}`);
        const data = await res.json();
        const work = data.message;
        ref = {
          url: refUrl.trim(),
          title: work.title?.[0] ?? refUrl,
          authors: work.author?.slice(0, 3).map((a: {family: string; given: string}) => `${a.family} ${a.given}`).join(", ") ?? "",
          year: work.published?.["date-parts"]?.[0]?.[0]?.toString() ?? "",
        };
      } catch {
        // 取得失敗時はURLをそのまま使用
      }
    }

    const newRefs = [...(selectedNote.refs ?? []), ref];
    updateSelected({ refs: newRefs });
    setRefUrl("");
    setRefLoading(false);
  };

  const handleRemoveRef = (idx: number) => {
    if (!selectedNote) return;
    const newRefs = selectedNote.refs.filter((_, i) => i !== idx);
    updateSelected({ refs: newRefs });
  };

  const handlePrint = () => {
    if (!selectedNote) return;
    const refs = (selectedNote.refs ?? []).map((r, i) =>
      `<div style="margin-bottom:6px;font-size:12px;">
        <span style="color:#555;">[${i + 1}]</span>
        <strong>${r.title}</strong>
        ${r.authors ? `<span style="color:#666;"> — ${r.authors}${r.year ? ` (${r.year})` : ""}</span>` : ""}
        <br/><a href="${r.url}" style="color:#2563eb;">${r.url}</a>
      </div>`
    ).join("");

    const html = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>${selectedNote.title}</title>
      <style>
        body { font-family: sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
        h1 { font-size: 22px; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
        .meta { color: #888; font-size: 12px; margin-bottom: 20px; }
        .tags span { background: #dbeafe; color: #1d4ed8; border-radius: 999px; padding: 2px 8px; font-size: 11px; margin-right: 4px; }
        pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.8; }
        .refs { border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 12px; }
        .refs h2 { font-size: 15px; color: #374151; margin-bottom: 10px; }
        @media print { body { margin: 20px; } }
      </style>
    </head><body>
      <h1>${selectedNote.title}</h1>
      <div class="meta">
        ${selectedNote.note_type === "experiment" ? "🔬 実験記録" : "📓 研究ノート"}
        　更新日: ${selectedNote.updated_at ? new Date(selectedNote.updated_at).toLocaleDateString("ja-JP") : ""}
      </div>
      ${selectedNote.tags?.length ? `<div class="tags">${selectedNote.tags.map(t => `<span>${t}</span>`).join("")}</div><br/>` : ""}
      <pre>${selectedNote.content}</pre>
      ${refs ? `<div class="refs"><h2>参考文献</h2>${refs}</div>` : ""}
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[620px]">
      {/* ノート一覧 */}
      <div className="w-64 flex-shrink-0 bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 mb-3">研究ノート</h2>
          {/* タブ */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
            <button
              onClick={() => setTab("my")}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-colors ${tab === "my" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <FileText className="w-3 h-3" />マイノート
            </button>
            <button
              onClick={() => setTab("shared")}
              className={`flex-1 flex items-center justify-center gap-1 rounded-md py-1 text-xs font-medium transition-colors ${tab === "shared" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              <Share2 className="w-3 h-3" />共有ノート
            </button>
          </div>
          {tab === "my" && <div className="flex gap-2">
            <button
              onClick={() => handleNew("free")}
              className="flex-1 flex items-center justify-center gap-1 bg-blue-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-blue-700 transition-colors"
              title="自由ノート"
            >
              <Plus className="w-3.5 h-3.5" />
              自由
            </button>
            <button
              onClick={() => handleNew("experiment")}
              className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white rounded-lg py-1.5 text-xs font-medium hover:bg-green-700 transition-colors"
              title="実験記録テンプレート"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              実験
            </button>
          </div>}
        </div>

        <div className="flex-1 overflow-y-auto">
          {tab === "my" ? (
            notes.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm px-4">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                ノートがありません
              </div>
            ) : (
              notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                    selectedNote?.id === note.id ? "bg-blue-50 border-l-2 border-l-blue-600" : ""
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {note.note_type === "experiment" ? (
                      <FlaskConical className="w-3 h-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <BookOpen className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    )}
                    <p className="font-medium text-sm text-gray-900 truncate">{note.title}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5 ml-4">
                    {note.updated_at ? format(new Date(note.updated_at), "M月d日 HH:mm", { locale: ja }) : ""}
                  </p>
                </button>
              ))
            )
          ) : sharedLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : sharedNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm px-4">
              <Share2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              共有されたノートはありません
            </div>
          ) : (
            sharedNotes.map((msg) => (
              <button
                key={msg.id}
                onClick={() => setSelectedShared(msg)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition-colors ${
                  selectedShared?.id === msg.id ? "bg-purple-50 border-l-2 border-l-purple-500" : ""
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Share2 className="w-3 h-3 text-purple-500 flex-shrink-0" />
                  <p className="font-medium text-sm text-gray-900 truncate">{msg.note_title}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 ml-4">
                  @{msg.sender?.username} · {format(new Date(msg.created_at), "M月d日 HH:mm", { locale: ja })}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ノート編集エリア */}
      <div className="flex-1 bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
        {tab === "shared" && selectedShared ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b flex items-center gap-3">
              <Share2 className="w-4 h-4 text-purple-500" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{selectedShared.note_title}</h3>
                <p className="text-xs text-gray-400">@{selectedShared.sender?.username} より · {format(new Date(selectedShared.created_at), "M月d日 HH:mm", { locale: ja })}</p>
              </div>
              <button
                onClick={() => {
                  const content = selectedShared.note_content?.replace(/<[^>]+>/g, "") ?? "";
                  const refs = (selectedShared.refs ?? []).map((r, i) =>
                    `<div style="margin-bottom:6px;font-size:12px;">
                      <span style="color:#555;">[${i + 1}]</span>
                      <strong>${r.title}</strong>
                      ${r.authors ? `<span style="color:#666;"> — ${r.authors}${r.year ? ` (${r.year})` : ""}</span>` : ""}
                      <br/><a href="${r.url}" style="color:#2563eb;">${r.url}</a>
                    </div>`
                  ).join("");
                  const html = `<!DOCTYPE html><html><head>
                    <meta charset="utf-8"/>
                    <title>${selectedShared.note_title}</title>
                    <style>
                      body { font-family: sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
                      h1 { font-size: 22px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; }
                      .meta { color: #888; font-size: 12px; margin-bottom: 20px; }
                      pre { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.8; }
                      .refs { border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 12px; }
                      .refs h2 { font-size: 15px; color: #374151; margin-bottom: 10px; }
                      @media print { body { margin: 20px; } }
                    </style>
                  </head><body>
                    <h1>${selectedShared.note_title}</h1>
                    <div class="meta">共有元: @${selectedShared.sender?.username} · ${format(new Date(selectedShared.created_at), "M月d日 HH:mm", { locale: ja })}</div>
                    <pre>${content}</pre>
                    ${refs ? `<div class="refs"><h2>参考文献</h2>${refs}</div>` : ""}
                  </body></html>`;
                  const win = window.open("", "_blank");
                  if (!win) return;
                  win.document.write(html);
                  win.document.close();
                  win.focus();
                  setTimeout(() => { win.print(); }, 500);
                }}
                className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                title="PDFとして保存・印刷"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
                {selectedShared.note_content?.replace(/<[^>]+>/g, "") ?? ""}
              </pre>
              {(selectedShared.refs ?? []).length > 0 && (
                <div className="border-t mt-4 pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">参考文献</span>
                  </div>
                  <div className="space-y-1">
                    {(selectedShared.refs ?? []).map((ref, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg px-3 py-2">
                        <p className="text-xs font-medium text-gray-800">{ref.title}</p>
                        {ref.authors && <p className="text-xs text-gray-500">{ref.authors}{ref.year ? ` (${ref.year})` : ""}</p>}
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">{ref.url}</a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : tab === "shared" ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Share2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">左のリストから共有ノートを選んでください</p>
            </div>
          </div>
        ) : selectedNote ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <input
                type="text"
                value={selectedNote.title}
                onChange={(e) => updateSelected({ title: e.target.value })}
                className="flex-1 text-lg font-semibold text-gray-900 focus:outline-none border-b-2 border-transparent focus:border-blue-500 pb-0.5"
                placeholder="ノートのタイトル"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                  title="PDFとして保存"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(selectedNote.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {saved ? "保存済み！" : "保存"}
                </button>
              </div>
            </div>

            <div className="px-4 py-2 border-b">
              <input
                type="text"
                value={(selectedNote.tags ?? []).join(", ")}
                onChange={(e) =>
                  updateSelected({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
                }
                className="w-full text-sm text-gray-500 focus:outline-none"
                placeholder="タグをカンマ区切りで入力"
              />
            </div>

            <textarea
              value={selectedNote.content}
              onChange={(e) => updateSelected({ content: e.target.value })}
              className="flex-1 px-5 py-4 text-sm text-gray-800 focus:outline-none resize-none leading-relaxed"
              placeholder="ここに研究ノートを書いてください..."
            />

            {/* 参考文献セクション */}
            <div className="border-t p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">参考文献</span>
              </div>

              {(selectedNote.refs ?? []).length > 0 && (
                <div className="mb-2 space-y-1">
                  {selectedNote.refs.map((ref, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{ref.title}</p>
                        {ref.authors && <p className="text-xs text-gray-500">{ref.authors}{ref.year ? ` (${ref.year})` : ""}</p>}
                        <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate block">
                          {ref.url}
                        </a>
                      </div>
                      <button onClick={() => handleRemoveRef(idx)} className="text-gray-400 hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={refUrl}
                  onChange={(e) => setRefUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddRef()}
                  placeholder="DOIまたはURLを入力（例: 10.1038/nature12345）"
                  className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddRef}
                  disabled={refLoading || !refUrl.trim()}
                  className="bg-gray-700 text-white rounded-lg px-3 py-1.5 text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {refLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link className="w-3 h-3" />}
                  追加
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">左のリストからノートを選ぶか</p>
              <p className="text-sm">「自由」または「実験」ボタンで新規作成</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

