"use client";

import { useState, useEffect } from "react";
import { Search, BookOpen, Plus, Trash2, Loader2, ExternalLink, Tag, FolderOpen, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

interface Paper {
  id?: string;
  pubmed_id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  abstract: string;
  doi: string;
  url: string;
  collection: string;
  status: "unread" | "reading" | "done";
  memo: string;
  tags: string[];
}

interface Props {
  authToken?: string;
}

const STATUS_LABEL = { unread: "未読", reading: "読中", done: "読了" };
const STATUS_COLOR = {
  unread: "bg-gray-100 text-gray-600",
  reading: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
};

export default function PapersPanel({ authToken }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("relevance");
  const [retmax, setRetmax] = useState("20");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Paper[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [library, setLibrary] = useState<Paper[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<Paper | null>(null);
  const [activeTab, setActiveTab] = useState<"search" | "library">("search");
  const [expandedAbstract, setExpandedAbstract] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [collections, setCollections] = useState<string[]>(["未分類"]);
  const [filterCollection, setFilterCollection] = useState("all");

  const headers = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  });

  useEffect(() => {
    fetchLibrary();
    const stored = localStorage.getItem("paper_search_history");
    if (stored) setSearchHistory(JSON.parse(stored));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  const fetchLibrary = async () => {
    const res = await fetch("/api/papers", { headers: headers() });
    const data = await res.json();
    if (Array.isArray(data)) {
      setLibrary(data);
      const cols = Array.from(new Set(["未分類", ...data.map((p: Paper) => p.collection)]));
      setCollections(cols);
    }
  };

  const handleSearch = async (q?: string) => {
    const searchQuery = q ?? query;
    if (!searchQuery.trim()) return;
    if (q) setQuery(q);
    setShowHistory(false);
    setSearching(true);
    setResults([]);

    // 検索履歴に追加（重複除去・最大20件）
    const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 20);
    setSearchHistory(newHistory);
    localStorage.setItem("paper_search_history", JSON.stringify(newHistory));

    const res = await fetch(`/api/papers/search?q=${encodeURIComponent(searchQuery)}&sort=${sort}&retmax=${retmax}`);
    const data = await res.json();
    setResults(data.papers ?? []);
    setSearching(false);
  };

  const handleDeleteHistory = (item: string) => {
    const newHistory = searchHistory.filter(h => h !== item);
    setSearchHistory(newHistory);
    localStorage.setItem("paper_search_history", JSON.stringify(newHistory));
  };

  const handleSave = async (paper: Paper) => {
    setSaving(true);
    const res = await fetch("/api/papers", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        pubmed_id: paper.pubmed_id,
        title: paper.title,
        authors: paper.authors,
        journal: paper.journal,
        year: paper.year,
        abstract: paper.abstract,
        doi: paper.doi,
        url: paper.url,
        collection: "未分類",
        status: "unread",
        memo: "",
        tags: [],
      }),
    });
    const saved = await res.json();
    if (saved.id) {
      setLibrary((prev) => [saved, ...prev]);
      alert("ライブラリに保存しました！");
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string, updates: Partial<Paper>) => {
    const res = await fetch(`/api/papers/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(updates),
    });
    const updated = await res.json();
    setLibrary((prev) => prev.map((p) => (p.id === id ? updated : p)));
    if (selectedPaper?.id === id) setSelectedPaper(updated);
    const cols = Array.from(new Set(["未分類", ...library.map((p) => p.collection), updated.collection]));
    setCollections(cols);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この論文をライブラリから削除しますか？")) return;
    await fetch(`/api/papers/${id}`, { method: "DELETE", headers: headers() });
    setLibrary((prev) => prev.filter((p) => p.id !== id));
    if (selectedPaper?.id === id) setSelectedPaper(null);
  };

  const isInLibrary = (pubmedId: string) => library.some((p) => p.pubmed_id === pubmedId);

  const filteredLibrary = filterCollection === "all"
    ? library
    : library.filter((p) => p.collection === filterCollection);

  return (
    <div className="flex gap-4 h-[680px]">
      {/* 左パネル */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-2">
        {/* タブ */}
        <div className="flex gap-1 bg-white border rounded-xl p-1">
          <button
            onClick={() => setActiveTab("search")}
            className={clsx("flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
              activeTab === "search" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <Search className="w-3.5 h-3.5" />論文検索
          </button>
          <button
            onClick={() => setActiveTab("library")}
            className={clsx("flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
              activeTab === "library" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />マイライブラリ
            {library.length > 0 && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 rounded-full">{library.length}</span>}
          </button>
        </div>

        {activeTab === "search" ? (
          <div className="flex-1 bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setShowHistory(true)}
                    onBlur={() => setTimeout(() => setShowHistory(false), 150)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="キーワード・タイトルで検索"
                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => handleSearch()}
                    disabled={searching || !query.trim()}
                    className="bg-blue-600 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </button>
                </div>
                {/* 検索履歴ドロップダウン */}
                {showHistory && searchHistory.length > 0 && (
                  <div className="absolute top-full left-0 right-10 bg-white border rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                    <div className="px-3 py-1.5 border-b flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-medium">検索履歴</span>
                      <button
                        onClick={() => { setSearchHistory([]); localStorage.removeItem("paper_search_history"); }}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        全削除
                      </button>
                    </div>
                    {searchHistory.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer group"
                      >
                        <Search className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <span
                          className="flex-1 text-sm text-gray-700 truncate"
                          onClick={() => handleSearch(item)}
                        >
                          {item}
                        </span>
                        <button
                          onClick={() => handleDeleteHistory(item)}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="flex-1 border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="relevance">関連度順</option>
                  <option value="pub_date">新しい順</option>
                  <option value="cited">引用数順</option>
                  <option value="pubdate">発行日順</option>
                </select>
                <select
                  value={retmax}
                  onChange={(e) => setRetmax(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="10">10件</option>
                  <option value="20">20件</option>
                  <option value="50">50件</option>
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {results.length === 0 && !searching && (
                <div className="text-center py-8 text-gray-400 text-sm px-4">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  キーワードを入力して検索
                </div>
              )}
              {results.map((paper) => (
                <div
                  key={paper.pubmed_id}
                  onClick={() => setSelectedPaper(paper)}
                  className={clsx("px-3 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                    selectedPaper?.pubmed_id === paper.pubmed_id && "bg-blue-50 border-l-2 border-l-blue-600"
                  )}
                >
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{paper.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{paper.year} · {paper.journal}</p>
                  {isInLibrary(paper.pubmed_id) && (
                    <span className="text-xs text-green-600 font-medium">✓ 保存済み</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-3 border-b">
              <select
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">すべてのコレクション ({library.length})</option>
                {collections.map((c) => (
                  <option key={c} value={c}>{c} ({library.filter(p => p.collection === c).length})</option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredLibrary.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm px-4">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  論文を検索して保存しましょう
                </div>
              ) : (
                filteredLibrary.map((paper) => (
                  <div
                    key={paper.id}
                    onClick={() => setSelectedPaper(paper)}
                    className={clsx("px-3 py-3 border-b cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedPaper?.id === paper.id && "bg-blue-50 border-l-2 border-l-blue-600"
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">{paper.title}</p>
                      <span className={clsx("text-xs px-1.5 py-0.5 rounded-full flex-shrink-0", STATUS_COLOR[paper.status])}>
                        {STATUS_LABEL[paper.status]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{paper.year} · {paper.journal}</p>
                    {paper.collection !== "未分類" && (
                      <span className="text-xs text-blue-600 flex items-center gap-0.5 mt-0.5">
                        <FolderOpen className="w-3 h-3" />{paper.collection}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* 右パネル：論文詳細 */}
      <div className="flex-1 bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {selectedPaper ? (
          <>
            <div className="p-5 border-b">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-gray-900 leading-snug">{selectedPaper.title}</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedPaper.authors}</p>
                  <p className="text-sm text-gray-500">{selectedPaper.journal}{selectedPaper.year ? ` (${selectedPaper.year})` : ""}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a href={selectedPaper.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-600 border border-blue-200 rounded-lg px-2 py-1.5 hover:bg-blue-50 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />PubMed
                  </a>
                  {!isInLibrary(selectedPaper.pubmed_id) ? (
                    <button
                      onClick={() => handleSave(selectedPaper)}
                      disabled={saving}
                      className="flex items-center gap-1 text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      保存
                    </button>
                  ) : selectedPaper.id && (
                    <button
                      onClick={() => handleDelete(selectedPaper.id!)}
                      className="flex items-center gap-1 text-xs text-red-500 border border-red-200 rounded-lg px-2 py-1.5 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />削除
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* アブスト */}
              {selectedPaper.abstract && (
                <div>
                  <button
                    onClick={() => setExpandedAbstract(expandedAbstract === selectedPaper.pubmed_id ? null : selectedPaper.pubmed_id)}
                    className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2"
                  >
                    {expandedAbstract === selectedPaper.pubmed_id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    アブストラクト
                  </button>
                  {expandedAbstract === selectedPaper.pubmed_id && (
                    <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-xl p-4">{selectedPaper.abstract}</p>
                  )}
                </div>
              )}

              {/* ライブラリ保存済みの場合のみ編集可 */}
              {selectedPaper.id && (
                <>
                  {/* ステータス */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">読了ステータス</p>
                    <div className="flex gap-2">
                      {(["unread", "reading", "done"] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdate(selectedPaper.id!, { status: s })}
                          className={clsx("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            selectedPaper.status === s ? STATUS_COLOR[s] + " ring-2 ring-offset-1 ring-current" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          )}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* コレクション */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <FolderOpen className="w-4 h-4" />コレクション
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        defaultValue={selectedPaper.collection}
                        onBlur={(e) => handleUpdate(selectedPaper.id!, { collection: e.target.value || "未分類" })}
                        className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="コレクション名を入力"
                        list="collections-list"
                      />
                      <datalist id="collections-list">
                        {collections.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* タグ */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                      <Tag className="w-4 h-4" />タグ
                    </p>
                    <input
                      type="text"
                      defaultValue={(selectedPaper.tags ?? []).join(", ")}
                      onBlur={(e) => handleUpdate(selectedPaper.id!, {
                        tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean)
                      })}
                      className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="タグをカンマ区切りで入力"
                    />
                  </div>

                  {/* メモ */}
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">メモ</p>
                    <textarea
                      defaultValue={selectedPaper.memo}
                      onBlur={(e) => handleUpdate(selectedPaper.id!, { memo: e.target.value })}
                      rows={5}
                      className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="この論文についてのメモを書いてください..."
                    />
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">論文を検索して選択してください</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
