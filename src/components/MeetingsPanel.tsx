"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Upload, Edit2, Check, X, Trash2, Download, Printer, FileText } from "lucide-react";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

type Meeting = {
  id: string;
  title: string;
  transcript?: string;
  summary: string;
  action_items: string[];
  decisions: string[];
  speakers?: string[];
  tags: string;
  created_at: string;
};

type Props = { authToken?: string; apiKey?: string };

export default function MeetingsPanel({ authToken, apiKey }: Props) {
  const [view, setView] = useState<"new" | "history">("new");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [transcript, setTranscript] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [result, setResult] = useState<Meeting | null>(null);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Meeting>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const titleRef = useRef(title);
  const tagsRef = useRef(tags);

  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);

  const headers = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(apiKey ? { "x-api-key": apiKey } : {}),
  });

  const compressAudio = async (blob: Blob, filename: string): Promise<{ blob: Blob; name: string }> => {
    const MAX = 4 * 1024 * 1024;
    if (blob.size <= MAX) return { blob, name: filename };

    // Decode audio with Web Audio API then encode to MP3 with lamejs
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    let decoded: AudioBuffer;
    try {
      decoded = await audioCtx.decodeAudioData(arrayBuffer);
    } finally {
      await audioCtx.close();
    }

    // Mix down to mono
    const srcRate = decoded.sampleRate;
    const numChannels = decoded.numberOfChannels;
    const srcLength = decoded.length;
    const monoSrc = new Float32Array(srcLength);
    for (let i = 0; i < srcLength; i++) {
      let sum = 0;
      for (let c = 0; c < numChannels; c++) sum += decoded.getChannelData(c)[i];
      monoSrc[i] = sum / numChannels;
    }

    // Downsample to 16kHz
    const TARGET_RATE = 16000;
    const ratio = srcRate / TARGET_RATE;
    const outLength = Math.floor(srcLength / ratio);
    const monoData = new Float32Array(outLength);
    for (let i = 0; i < outLength; i++) {
      monoData[i] = monoSrc[Math.floor(i * ratio)];
    }
    const numSamples = outLength;

    // Convert float32 to int16
    const int16 = new Int16Array(numSamples);
    for (let i = 0; i < numSamples; i++) {
      const s = Math.max(-1, Math.min(1, monoData[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Encode to MP3 with lamejs at 16kbps mono
    const { Mp3Encoder } = await import("lamejs");
    const encoder = new Mp3Encoder(1, 16000, 16);
    const blockSize = 1152;
    const mp3Parts: Uint8Array[] = [];
    for (let offset = 0; offset < int16.length; offset += blockSize) {
      const chunk = int16.subarray(offset, offset + blockSize);
      const encoded = encoder.encodeBuffer(chunk);
      if (encoded.length > 0) mp3Parts.push(encoded);
    }
    const flushed = encoder.flush();
    if (flushed.length > 0) mp3Parts.push(flushed);

    const mp3Blob = new Blob(mp3Parts.map(p => p.buffer as ArrayBuffer), { type: "audio/mpeg" });
    return { blob: mp3Blob, name: "compressed.mp3" };
  };

  const sendAudio = async (blob: Blob, filename: string) => {
    setTranscribing(true);
    try {
      let compressed: Blob;
      let name: string;
      try {
        const r = await compressAudio(blob, filename);
        compressed = r.blob;
        name = r.name;
      } catch (e: unknown) {
        throw new Error("圧縮失敗: " + (e instanceof Error ? e.message : String(e)));
      }
      const form = new FormData();
      form.append("file", compressed, name);
      let res: Response;
      try {
        res = await fetch("/api/meetings/transcribe", {
          method: "POST",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: form,
        });
      } catch (e: unknown) {
        throw new Error("送信失敗: " + (e instanceof Error ? e.message : String(e)));
      }
      const text = await res.text();
      let data: { transcript?: string; error?: string };
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`サーバーエラー(${res.status}): ${text.slice(0, 200)}`);
      }
      if (!res.ok) throw new Error(`APIエラー(${res.status}): ${data.error}`);
      setTranscript(data.transcript!);
      await analyzeText(data.transcript!);
    } catch (e: unknown) {
      alert("文字起こし失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTranscribing(false);
    }
  };

  const analyzeText = async (text: string) => {
    const t = titleRef.current;
    if (!t || !text) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ title: t, transcript: text, tags: tagsRef.current, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setEditData(data);
    } catch (e: unknown) {
      alert("解析失敗: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRef.current?.stop();
      setRecording(false);
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      await sendAudio(new Blob(chunksRef.current, { type: "audio/webm" }), "recording.webm");
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  };

  const fetchMeetings = async (q = "") => {
    const res = await fetch(`/api/meetings${q ? `?q=${encodeURIComponent(q)}` : ""}`, {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    setMeetings(await res.json());
  };

  const saveEdit = async () => {
    if (!result) return;
    await fetch(`/api/meetings/${result.id}`, { method: "PUT", headers: headers(), body: JSON.stringify(editData) });
    setResult({ ...result, ...editData } as Meeting);
    setEditing(false);
  };

  const deleteMeeting = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE", headers: headers() });
    setMeetings(prev => prev.filter(m => m.id !== id));
  };

  const printReport = (m: Meeting) => {
    const date = new Date(m.created_at).toLocaleDateString("ja-JP");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><title>${m.title}</title>
    <style>body{font-family:"Hiragino Sans","Yu Gothic",sans-serif;max-width:800px;margin:40px auto;padding:0 24px;color:#111}h1{font-size:22px;text-align:center;border-bottom:2px solid #222;padding-bottom:10px}h2{font-size:15px;background:#f4f4f4;border-left:4px solid #333;padding:6px 12px;margin-top:28px}.meta{text-align:right;font-size:12px;color:#666;margin-bottom:24px}p{font-size:14px;line-height:1.9}ol{font-size:14px;line-height:2;padding-left:20px}</style>
    </head><body>
    <h1>会議議事録</h1><div class="meta">${m.title}　作成日：${date}</div>
    <h2>📋 要点</h2><p>${m.summary}</p>
    <h2>✅ アクションアイテム</h2><ol>${m.action_items.map(x => `<li>${x}</li>`).join("")}</ol>
    <h2>🎯 決定事項</h2><ol>${m.decisions.map(x => `<li>${x}</li>`).join("")}</ol>
    ${m.speakers?.length ? `<h2>🗣 話者別</h2><ol>${m.speakers.map(x => `<li>${x}</li>`).join("")}</ol>` : ""}
    </body></html>`);
    win.document.close();
    win.print();
  };

  const downloadDocx = async (m: Meeting) => {
    const date = new Date(m.created_at).toLocaleDateString("ja-JP");
    const doc = new Document({ sections: [{ children: [
      new Paragraph({ text: "会議議事録", heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
      new Paragraph({ children: [new TextRun({ text: `タイトル：${m.title}`, bold: true })], spacing: { after: 100 } }),
      new Paragraph({ children: [new TextRun({ text: `作成日：${date}`, color: "666666" })], spacing: { after: 400 } }),
      new Paragraph({ text: "■ 要点", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
      new Paragraph({ text: m.summary, spacing: { after: 400 } }),
      new Paragraph({ text: "■ アクションアイテム", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
      ...m.action_items.map((item, i) => new Paragraph({ text: `${i + 1}. ${item}`, spacing: { after: 120 } })),
      new Paragraph({ text: "", spacing: { after: 200 } }),
      new Paragraph({ text: "■ 決定事項", heading: HeadingLevel.HEADING_1, spacing: { after: 160 } }),
      ...m.decisions.map((item, i) => new Paragraph({ text: `${i + 1}. ${item}`, spacing: { after: 120 } })),
    ]}]});
    saveAs(await Packer.toBlob(doc), `${m.title}.docx`);
  };

  const downloadPdf = async (m: Meeting) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const date = new Date(m.created_at).toLocaleDateString("ja-JP");
    const w = doc.internal.pageSize.getWidth();
    let y = 20;
    const add = (text: string, size = 11, bold = false) => {
      doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.splitTextToSize(text, w - 30).forEach((l: string) => { if (y > 270) { doc.addPage(); y = 20; } doc.text(l, 15, y); y += size * 0.5; }); y += 3;
    };
    add("会議議事録", 18, true); y += 2; doc.line(15, y, w - 15, y); y += 6;
    add(`タイトル：${m.title}`, 10); add(`作成日：${date}`, 10); y += 4;
    add("■ 要点", 13, true); add(m.summary); y += 4;
    add("■ アクションアイテム", 13, true); m.action_items.forEach((x, i) => add(`${i + 1}. ${x}`)); y += 4;
    add("■ 決定事項", 13, true); m.decisions.forEach((x, i) => add(`${i + 1}. ${x}`));
    doc.save(`${m.title}.pdf`);
  };

  const allTags = Array.from(new Set(meetings.flatMap(m => m.tags.split(",").map(t => t.trim()).filter(Boolean))));

  return (
    <div className="space-y-4">
      {/* タブ切り替え */}
      <div className="flex gap-2">
        <button onClick={() => setView("new")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "new" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
          新規解析
        </button>
        <button onClick={() => { setView("history"); fetchMeetings(); }} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "history" ? "bg-blue-600 text-white" : "bg-white border text-gray-600 hover:bg-gray-50"}`}>
          履歴
        </button>
      </div>

      {view === "new" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">会議タイトル</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例：週次ミーティング"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">タグ（カンマ区切り）</label>
                <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="例：研究,週次"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* 音声 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">音声入力</label>
              <div className="flex gap-2">
                <div onClick={() => !transcribing && fileRef.current?.click()}
                  className="flex-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                  {transcribing ? <p className="text-sm text-blue-600 animate-pulse">文字起こし中...</p> : (
                    <><Upload className="w-5 h-5 mx-auto mb-1 text-gray-400" /><p className="text-xs text-gray-500">ファイルをアップロード</p></>
                  )}
                </div>
                <button onClick={toggleRecording} disabled={transcribing}
                  className={`flex-1 border-2 rounded-lg p-4 text-center transition-colors ${recording ? "border-red-400 bg-red-50" : "border-dashed hover:bg-gray-50"}`}>
                  {recording ? <MicOff className="w-5 h-5 mx-auto mb-1 text-red-500" /> : <Mic className="w-5 h-5 mx-auto mb-1 text-gray-400" />}
                  <p className="text-xs text-gray-500">{recording ? "録音停止" : "リアルタイム録音"}</p>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="audio/*,video/mp4" onChange={e => { const f = e.target.files?.[0]; if (f) sendAudio(f, f.name); }} className="hidden" />
            </div>

            {/* テキスト入力 */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">文字起こし<span className="font-normal ml-1">（自動入力または手入力）</span></label>
              <textarea value={transcript} onChange={e => setTranscript(e.target.value)} rows={6}
                placeholder="会議の内容を貼り付けるか、音声をアップロードしてください..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <button onClick={() => analyzeText(transcript)} disabled={analyzing || !title || !transcript}
              className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {analyzing ? "解析中..." : "AIで整理する"}
            </button>
          </div>

          {/* 結果 */}
          {result && (
            <div className="bg-white rounded-xl border p-5 space-y-5">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-gray-800">解析結果</h3>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <button onClick={saveEdit} className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700"><Check className="w-3 h-3" />保存</button>
                      <button onClick={() => { setEditing(false); setEditData(result); }} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600"><X className="w-3 h-3" />キャンセル</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600"><Edit2 className="w-3 h-3" />編集</button>
                      <button onClick={() => downloadPdf(result)} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600"><FileText className="w-3 h-3" />PDF</button>
                      <button onClick={() => downloadDocx(result)} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600"><Download className="w-3 h-3" />Word</button>
                      <button onClick={() => printReport(result)} className="flex items-center gap-1 text-xs border rounded-lg px-3 py-1.5 hover:bg-gray-50 text-gray-600"><Printer className="w-3 h-3" />印刷</button>
                    </>
                  )}
                </div>
              </div>

              {editing ? (
                <div className="space-y-3">
                  {[["要点", "summary", 4], ["アクションアイテム（1行1項目）", "action_items", 3], ["決定事項（1行1項目）", "decisions", 3]].map(([label, key, rows]) => (
                    <div key={key as string}>
                      <label className="text-xs text-gray-500 mb-1 block">{label as string}</label>
                      <textarea rows={rows as number} value={Array.isArray(editData[key as keyof Meeting]) ? (editData[key as keyof Meeting] as string[]).join("\n") : (editData[key as keyof Meeting] as string) ?? ""}
                        onChange={e => setEditData(prev => ({ ...prev, [key]: Array.isArray(result[key as keyof Meeting]) ? e.target.value.split("\n").filter(Boolean) : e.target.value }))}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <Section emoji="📋" title="要点" content={result.summary} />
                  <Section emoji="✅" title="アクションアイテム" items={result.action_items} />
                  <Section emoji="🎯" title="決定事項" items={result.decisions} />
                  {result.speakers && result.speakers.length > 0 && <Section emoji="🗣" title="話者別サマリー" items={result.speakers} />}
                  {result.tags && (
                    <div className="flex gap-1 flex-wrap">
                      {result.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                        <span key={t} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">{t}</span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!editing && (
                <button onClick={() => { setView("history"); fetchMeetings(); setResult(null); setTitle(""); setTranscript(""); setTags(""); }}
                  className="w-full bg-green-600 text-white rounded-lg py-2.5 font-medium hover:bg-green-700 transition-colors">
                  ✓ 完了 — 履歴に保存して戻る
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border p-4 space-y-3">
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); fetchMeetings(e.target.value); }}
              placeholder="タイトル・要点・タグで検索..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            {allTags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {allTags.map(tag => (
                  <button key={tag} onClick={() => { setSearch(tag); fetchMeetings(tag); }}
                    className="text-xs rounded-full px-3 py-1 border bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {meetings.length === 0 && <p className="text-sm text-gray-400 text-center py-12">記録が見つかりません</p>}

          {meetings.map(m => (
            <div key={m.id} className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-800">{m.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(m.created_at).toLocaleString("ja-JP")}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => downloadPdf(m)} className="text-xs border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 text-gray-600">PDF</button>
                  <button onClick={() => downloadDocx(m)} className="text-xs border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 text-gray-600">Word</button>
                  <button onClick={() => printReport(m)} className="text-xs border rounded-lg px-2.5 py-1.5 hover:bg-gray-50 text-gray-600">印刷</button>
                  <button onClick={() => deleteMeeting(m.id)} className="text-xs border border-red-200 rounded-lg px-2.5 py-1.5 hover:bg-red-50 text-red-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {m.tags && (
                <div className="flex gap-1 flex-wrap">
                  {m.tags.split(",").map(t => t.trim()).filter(Boolean).map(t => (
                    <span key={t} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-full px-2 py-0.5">{t}</span>
                  ))}
                </div>
              )}
              <Section emoji="📋" title="要点" content={m.summary} />
              {m.action_items.length > 0 && <Section emoji="✅" title="アクションアイテム" items={m.action_items} />}
              {m.decisions.length > 0 && <Section emoji="🎯" title="決定事項" items={m.decisions} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ emoji, title, content, items }: { emoji: string; title: string; content?: string; items?: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{emoji} {title}</p>
      {content && <p className="text-sm text-gray-600 leading-relaxed">{content}</p>}
      {items && <ul className="space-y-1">{items.map((item, i) => <li key={i} className="text-sm text-gray-600 flex gap-2"><span className="text-gray-300 shrink-0">{i + 1}.</span><span>{item}</span></li>)}</ul>}
    </div>
  );
}
