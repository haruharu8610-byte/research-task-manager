"use client";

import { useState } from "react";
import {
  HelpCircle, List, BarChart2, FlaskConical, MessageSquare, BookOpen,
  Library, TestTube, CalendarDays, Mail, ChevronDown, ChevronUp,
  Key, Search, Plus, Share2, FolderOpen, Wallet
} from "lucide-react";

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  items: { q: string; a: string }[];
}

const sections: Section[] = [
  {
    id: "start",
    icon: <HelpCircle className="w-4 h-4" />,
    title: "はじめに",
    color: "blue",
    items: [
      {
        q: "このアプリでできることは？",
        a: "研究に必要なタスク管理・実験スケジュール・論文管理・研究ノート・AI支援・メンバー間のメッセージ共有をまとめて行えるツールです。",
      },
      {
        q: "まず何をすればいい？",
        a: "① Googleカレンダー連携（ヘッダーのボタン）→ ② AI機能を使う場合はAnthropicのAPIキーを登録（🔑 APIキーボタン）→ ③ タスクを追加して研究を始めましょう。",
      },
      {
        q: "AI機能を使うには？",
        a: "Anthropicのサイト（console.anthropic.com）でクレジットを購入し、APIキーを発行してください。右上の「🔑 APIキー」ボタンから登録すると、AI提案・AI議論・AIレポート生成が利用できます。",
      },
    ],
  },
  {
    id: "tasks",
    icon: <List className="w-4 h-4" />,
    title: "タスク管理",
    color: "indigo",
    items: [
      {
        q: "タスクを追加するには？",
        a: "右上の「＋ タスク追加」ボタンから追加できます。タイトル・優先度・期限・タグを設定できます。実験タスクの場合は実験日時も入力すると自動でスケジュールが作成されます。",
      },
      {
        q: "タスクをカレンダーに追加するには？",
        a: "タスクカードの「📅」ボタンをクリックします。Googleカレンダー連携済みの場合、自動で予定が追加されます。実験タスクはP注射・H注射・実験の3件が一度に登録されます。",
      },
      {
        q: "進捗グラフや統計はどこで見る？",
        a: "タスク一覧タブの上部に統計カード・進捗バー・優先度グラフが表示されています。AIレポート生成も同タブ内の「📄 AIレポート」ボタンから利用できます。",
      },
    ],
  },
  {
    id: "suggest",
    icon: <FlaskConical className="w-4 h-4" />,
    title: "AI提案 / AI議論",
    color: "purple",
    items: [
      {
        q: "AI提案とは？",
        a: "研究テーマを入力するとAIが必要なタスクを自動提案します。提案されたタスクは「＋」ボタンでそのままタスク一覧に追加できます。音声入力にも対応しています。",
      },
      {
        q: "AI議論とは？",
        a: "研究アシスタントとチャット形式で議論できます。実験デザイン・データ解析・論文執筆など何でも相談できます。会話履歴はサーバーに自動保存されます。",
      },
      {
        q: "AIレポートはどこで生成できる？",
        a: "タスク一覧タブ内の「📄 AIレポート」セクションで週次・月次レポートを生成できます。指導教員への報告書としても利用できます。",
      },
    ],
  },
  {
    id: "notes",
    icon: <BookOpen className="w-4 h-4" />,
    title: "研究ノート",
    color: "green",
    items: [
      {
        q: "ノートの種類は？",
        a: "「自由」ノートと「実験記録」テンプレートの2種類があります。実験記録テンプレートには目的・実験条件・手順・結果・考察の欄があらかじめ用意されています。",
      },
      {
        q: "参考文献を追加するには？",
        a: "ノート編集画面下部の参考文献欄にDOIまたはURLを入力して「追加」ボタンをクリックします。DOIを入力するとCrossRefから著者・年・タイトルが自動取得されます。",
      },
      {
        q: "共有ノートとは？",
        a: "他のメンバーからメッセージで共有されたノートが「共有ノート」タブに表示されます。読み取り専用ですが印刷・PDF保存ができ、参考文献はマイライブラリにも保存できます。",
      },
    ],
  },
  {
    id: "papers",
    icon: <Library className="w-4 h-4" />,
    title: "論文管理",
    color: "yellow",
    items: [
      {
        q: "論文を検索・保存するには？",
        a: "「論文検索」タブでキーワードを入力するとPubMedから検索できます。論文詳細画面の「保存」ボタンでマイライブラリに追加されます。",
      },
      {
        q: "コレクションで仕分けするには？",
        a: "マイライブラリタブのコレクション欄の「フォルダ＋」アイコンで新しいコレクションを作成できます。各論文カードのドロップダウンでコレクションを選択して仕分けできます。コレクション名はホバーで表示されるペンアイコンから変更可能です。",
      },
      {
        q: "共有ノートの参考文献を保存するには？",
        a: "共有ノートの参考文献一覧に表示される「ライブラリへ」ボタンをクリックするとマイライブラリに保存されます。",
      },
    ],
  },
  {
    id: "experiment",
    icon: <TestTube className="w-4 h-4" />,
    title: "実験スケジュール",
    color: "teal",
    items: [
      {
        q: "実験スケジュールはどう登録する？",
        a: "実験スケジュールタブから直接追加するか、タスク追加時に「実験タスク」にチェックを入れて実験日時を入力すると自動登録されます。",
      },
      {
        q: "P注射・H注射とは？",
        a: "実験前の処置スケジュールです。H注射は実験の16時間前、P注射はH注射の2日前に自動設定されます。カレンダー追加で3件まとめてGoogleカレンダーに登録されます。",
      },
      {
        q: "もらった予定とは？",
        a: "他のメンバーからメッセージで共有された実験スケジュールが表示されます。「カレンダーに追加」ボタンで自分のGoogleカレンダーに追加できます。実験日を過ぎたものは自動的に非表示になります。",
      },
    ],
  },
  {
    id: "messages",
    icon: <Mail className="w-4 h-4" />,
    title: "メッセージ",
    color: "pink",
    items: [
      {
        q: "何を送れる？",
        a: "研究ノート・保存した論文・実験スケジュールの3種類を他のメンバーに共有できます。送信時に「📓ノート」「📄論文」「🔬実験」タブで送る内容を選択します。",
      },
      {
        q: "未読件数はどこで確認できる？",
        a: "タブ一覧の「メッセージ」タブに赤いバッジで未読件数が表示されます。メッセージタブを開くとバッジがリセットされます。",
      },
      {
        q: "受け取ったノートを削除するには？",
        a: "研究ノートの「共有ノート」タブで削除ボタン、またはメッセージ一覧の削除ボタンから削除できます。",
      },
    ],
  },
  {
    id: "calendar",
    icon: <CalendarDays className="w-4 h-4" />,
    title: "カレンダー連携",
    color: "orange",
    items: [
      {
        q: "Googleカレンダーと連携するには？",
        a: "ヘッダーの「Googleカレンダー連携」ボタンをクリックしてGoogleアカウントで認証します。連携後はタスクや実験スケジュールをカレンダーに追加できます。",
      },
      {
        q: "カレンダービューは？",
        a: "「カレンダー」タブで月・週・日単位のカレンダービューが確認できます。タスクの期限や実験スケジュールが一覧で表示されます。",
      },
    ],
  },
];

const COLOR_MAP: Record<string, { header: string; badge: string; bullet: string }> = {
  blue:   { header: "bg-blue-50 text-blue-700 border-blue-100",   badge: "bg-blue-100 text-blue-700",   bullet: "text-blue-400" },
  indigo: { header: "bg-indigo-50 text-indigo-700 border-indigo-100", badge: "bg-indigo-100 text-indigo-700", bullet: "text-indigo-400" },
  purple: { header: "bg-purple-50 text-purple-700 border-purple-100", badge: "bg-purple-100 text-purple-700", bullet: "text-purple-400" },
  green:  { header: "bg-green-50 text-green-700 border-green-100",  badge: "bg-green-100 text-green-700",  bullet: "text-green-400" },
  yellow: { header: "bg-yellow-50 text-yellow-700 border-yellow-100", badge: "bg-yellow-100 text-yellow-700", bullet: "text-yellow-500" },
  teal:   { header: "bg-teal-50 text-teal-700 border-teal-100",    badge: "bg-teal-100 text-teal-700",    bullet: "text-teal-400" },
  pink:   { header: "bg-pink-50 text-pink-700 border-pink-100",    badge: "bg-pink-100 text-pink-700",    bullet: "text-pink-400" },
  orange: { header: "bg-orange-50 text-orange-700 border-orange-100", badge: "bg-orange-100 text-orange-700", bullet: "text-orange-400" },
};

export default function HelpPanel() {
  const [openSection, setOpenSection] = useState<string | null>("start");

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      <div className="bg-white rounded-2xl border p-5 mb-2">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">使い方ガイド</h2>
        </div>
        <p className="text-sm text-gray-500">カテゴリをクリックして詳細を確認できます。</p>
      </div>

      {sections.map((section) => {
        const colors = COLOR_MAP[section.color];
        const isOpen = openSection === section.id;
        return (
          <div key={section.id} className="bg-white rounded-2xl border overflow-hidden">
            <button
              onClick={() => setOpenSection(isOpen ? null : section.id)}
              className={`w-full flex items-center justify-between px-5 py-4 border-b transition-colors ${isOpen ? colors.header : "hover:bg-gray-50"}`}
            >
              <div className="flex items-center gap-2">
                {section.icon}
                <span className="font-semibold text-sm">{section.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                  {section.items.length}項目
                </span>
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {isOpen && (
              <div className="divide-y">
                {section.items.map((item, idx) => (
                  <div key={idx} className="px-5 py-4">
                    <p className="text-sm font-semibold text-gray-800 mb-1.5 flex items-start gap-2">
                      <span className={`mt-0.5 flex-shrink-0 ${colors.bullet}`}>Q.</span>
                      {item.q}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed pl-5">{item.a}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-5 mt-4">
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600"><Key className="w-4 h-4 text-purple-500" /><span>AIキー登録：右上「🔑 APIキー」</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Wallet className="w-4 h-4 text-purple-500" /><span>残高確認：右上「残高確認」</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Search className="w-4 h-4 text-gray-500" /><span>全文検索：右上「検索」</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Plus className="w-4 h-4 text-blue-500" /><span>タスク追加：右上「＋ タスク追加」</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Share2 className="w-4 h-4 text-indigo-500" /><span>ノート共有：メッセージタブから送信</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><FolderOpen className="w-4 h-4 text-yellow-500" /><span>論文仕分け：マイライブラリ→コレクション</span></div>
        </div>
      </div>
    </div>
  );
}
