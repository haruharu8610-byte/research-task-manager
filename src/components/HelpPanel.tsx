"use client";

import { useState } from "react";
import {
  HelpCircle, List, BarChart2, FlaskConical, MessageSquare, BookOpen,
  Library, TestTube, CalendarDays, Mail, ChevronDown, ChevronUp,
  Key, Search, Plus, Share2, FolderOpen, Wallet, Mic, Settings, Timer, Sword
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
    title: "はじめに・準備",
    color: "blue",
    items: [
      {
        q: "このアプリでできることは？",
        a: "研究に必要な機能をひとまとめにしたツールです。タスク管理・AI提案・AI議論・研究ノート・論文管理・実験スケジュール・カレンダー連携・メンバー間メッセージ・会議メモ自動整理・自習タイマーなど、研究活動をトータルでサポートします。自習タイマーは別アプリ「Research RPG」とも連携しています。",
      },
      {
        q: "最初にやることは？",
        a: "① ヘッダーの「Googleカレンダー連携」でカレンダーを接続 → ② 設定タブでAnthropicのAPIキーを登録 → ③ タスクを追加して研究を始めましょう。会議メモ機能も同じAPIキーで使えます。",
      },
      {
        q: "APIキーはどこで登録する？",
        a: "タブ右側の「設定」タブから登録できます。AnthropicのAPIキー（sk-ant-...）を入力して保存するだけです。キーはブラウザに保存されるので、再ログイン後も入力不要です。",
      },
      {
        q: "課金は必要ですか？",
        a: "AI機能（AI提案・AI議論・会議メモ解析）にはAnthropicのクレジットが必要です。console.anthropic.com でクレジットを購入（最低$5〜）してAPIキーを取得してください。1回の会議解析は約$0.01〜$0.05程度です。文字起こし（Groq）は無料でサーバー側で設定済みのため、ユーザーの設定不要です。",
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
        a: "タスクタブ内の「＋ タスク追加」ボタンから追加できます。タイトル・優先度・期限・タグを設定できます。実験タスクの場合は実験日時も入力すると自動でスケジュールが作成されます。",
      },
      {
        q: "タスクをカレンダーに追加するには？",
        a: "タスクカードの「📅」ボタンをクリックします。Googleカレンダー連携済みの場合、自動で予定が追加されます。実験タスクはP注射・H注射・実験の3件が一度に登録されます。",
      },
      {
        q: "進捗グラフや統計はどこで見る？",
        a: "タスクタブの右側に統計カード・進捗バー・優先度グラフが表示されています。AIレポート生成も同タブ内の「📄 AIレポート」ボタンから利用できます。",
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
        a: "研究テーマを入力するとAIが必要なタスクを自動提案します。提案されたタスクは「＋」ボタンでそのままタスク一覧に追加できます。音声入力にも対応しています。※Anthropic APIキーが必要です。",
      },
      {
        q: "AI議論とは？",
        a: "研究アシスタントとチャット形式で議論できます。実験デザイン・データ解析・論文執筆など何でも相談できます。会話履歴はサーバーに自動保存されます。※Anthropic APIキーが必要です。",
      },
      {
        q: "AIレポートはどこで生成できる？",
        a: "タスクタブ内の「📄 AIレポート」セクションで週次・月次レポートを生成できます。指導教員への報告書としても利用できます。※Anthropic APIキーが必要です。",
      },
    ],
  },
  {
    id: "meetings",
    icon: <Mic className="w-4 h-4" />,
    title: "会議メモ自動整理",
    color: "rose",
    items: [
      {
        q: "会議メモ機能とは？",
        a: "会議や打ち合わせの音声を録音またはファイルでアップロードすると、AIが自動で文字起こし・要点まとめ・アクションアイテム・決定事項を整理してくれる機能です。",
      },
      {
        q: "使い方は？",
        a: "① 会議メモタブを開く → ② 会議タイトルを入力 → ③「ファイルをアップロード」で音声ファイルを選択（またはリアルタイム録音）→ ④ 自動で文字起こし・解析が始まります → ⑤ 完了後「完了」ボタンで履歴に保存されます。",
      },
      {
        q: "対応しているファイル形式は？",
        a: "MP3・MP4・M4A・WAV・WebM など主要な音声・動画形式に対応しています。長時間の録音も30秒チャンクに自動分割して処理するため、制限なく使えます。",
      },
      {
        q: "課金は必要ですか？",
        a: "文字起こし（Groq Whisper）は無料・設定不要です。ただし解析（要点・アクション抽出）にはAnthropicのAPIキーとクレジットが必要です。設定タブからAPIキーを登録し、console.anthropic.com でクレジットを購入（$5〜）してください。1回の解析は約$0.01〜$0.05程度です。",
      },
      {
        q: "履歴はどこで確認できる？",
        a: "会議メモタブの「履歴」ボタンから過去の会議メモを一覧で確認できます。検索・タグ絞り込み・編集・削除・Word/PDFダウンロード・印刷も可能です。",
      },
      {
        q: "解析結果を編集できますか？",
        a: "はい。履歴から過去のメモを開き「編集」ボタンで要点・アクションアイテム・決定事項・タグを自由に修正できます。",
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
        a: "「論文」タブでキーワードを入力するとPubMedから検索できます。論文詳細画面の「保存」ボタンでマイライブラリに追加されます。",
      },
      {
        q: "コレクションで仕分けするには？",
        a: "マイライブラリタブのコレクション欄の「フォルダ＋」アイコンで新しいコレクションを作成できます。各論文カードのドロップダウンでコレクションを選択して仕分けできます。",
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
        a: "実験タブから直接追加するか、タスク追加時に「実験タスク」にチェックを入れて実験日時を入力すると自動登録されます。",
      },
      {
        q: "P注射・H注射とは？",
        a: "実験前の処置スケジュールです。H注射は実験の16時間前、P注射はH注射の2日前に自動設定されます。カレンダー追加で3件まとめてGoogleカレンダーに登録されます。",
      },
      {
        q: "もらった予定とは？",
        a: "他のメンバーからメッセージで共有された実験スケジュールが表示されます。「カレンダーに追加」ボタンで自分のGoogleカレンダーに追加できます。",
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
    id: "study",
    icon: <Timer className="w-4 h-4" />,
    title: "自習タイマー / Research RPG連携",
    color: "violet",
    items: [
      {
        q: "自習タイマーとは？",
        a: "「自習」タブでスタート/ストップするだけの簡単な勉強・作業時間計測機能です。科目や内容を入力しておくと記録に残ります。1分未満のセッションは記録されません。",
      },
      {
        q: "Research RPGとは？",
        a: "本アプリと連携する別アプリのRPGゲームです。自習タイマーで記録した時間が1分＝1ゴールド（G）としてResearch RPG側に反映され、ゲーム内で装備購入やダンジョン攻略に使えます。研究・学習のモチベーション維持を目的とした連携機能です。",
      },
      {
        q: "ゴールドはどうやって貯まる？",
        a: "自習タイマーをストップして記録するたびに「分数×1G」が貯まります。「今日」「累計」のゴールド数は自習タブの統計カードで確認できます。",
      },
      {
        q: "放置していたらどうなる？",
        a: "計測開始から12時間（または6時間表示の警告後）放置すると自動的にタイマーが停止し、その回はゴールドとして記録されません。離席する際はこまめにストップしてください。",
      },
      {
        q: "過去の記録は確認できる？",
        a: "自習タブ下部に過去7日間のグラフと直近セッション履歴が表示されます。科目別の振り返りに使えます。",
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
  {
    id: "settings",
    icon: <Settings className="w-4 h-4" />,
    title: "設定",
    color: "gray",
    items: [
      {
        q: "設定タブでできることは？",
        a: "Anthropic APIキーの登録・変更・削除ができます。登録したキーはブラウザにのみ保存されます（サーバーには送信されません）。残高確認ボタンからAnthropicの課金ページに直接アクセスできます。",
      },
      {
        q: "APIキーはどこで取得できる？",
        a: "console.anthropic.com にアクセス → 「API Keys」→「Create Key」でキーを発行できます。使用には事前にクレジットの購入が必要です（$5〜）。設定タブ内のリンクから直接アクセスできます。",
      },
    ],
  },
];

const COLOR_MAP: Record<string, { header: string; badge: string; bullet: string }> = {
  blue:   { header: "bg-blue-50 text-blue-700 border-blue-100",     badge: "bg-blue-100 text-blue-700",     bullet: "text-blue-400" },
  indigo: { header: "bg-indigo-50 text-indigo-700 border-indigo-100", badge: "bg-indigo-100 text-indigo-700", bullet: "text-indigo-400" },
  purple: { header: "bg-purple-50 text-purple-700 border-purple-100", badge: "bg-purple-100 text-purple-700", bullet: "text-purple-400" },
  rose:   { header: "bg-rose-50 text-rose-700 border-rose-100",     badge: "bg-rose-100 text-rose-700",     bullet: "text-rose-400" },
  green:  { header: "bg-green-50 text-green-700 border-green-100",   badge: "bg-green-100 text-green-700",   bullet: "text-green-400" },
  yellow: { header: "bg-yellow-50 text-yellow-700 border-yellow-100", badge: "bg-yellow-100 text-yellow-700", bullet: "text-yellow-500" },
  teal:   { header: "bg-teal-50 text-teal-700 border-teal-100",     badge: "bg-teal-100 text-teal-700",     bullet: "text-teal-400" },
  pink:   { header: "bg-pink-50 text-pink-700 border-pink-100",     badge: "bg-pink-100 text-pink-700",     bullet: "text-pink-400" },
  orange: { header: "bg-orange-50 text-orange-700 border-orange-100", badge: "bg-orange-100 text-orange-700", bullet: "text-orange-400" },
  gray:   { header: "bg-gray-50 text-gray-700 border-gray-100",     badge: "bg-gray-100 text-gray-700",     bullet: "text-gray-400" },
  violet: { header: "bg-violet-50 text-violet-700 border-violet-100", badge: "bg-violet-100 text-violet-700", bullet: "text-violet-400" },
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

      {/* Quick start banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl border border-purple-100 p-4">
        <p className="text-xs font-semibold text-purple-700 mb-2">⚡ クイックスタート</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-700">
          <div className="flex items-start gap-1.5"><span className="font-bold text-purple-600 flex-shrink-0">①</span>設定タブ → Anthropic APIキーを登録</div>
          <div className="flex items-start gap-1.5"><span className="font-bold text-purple-600 flex-shrink-0">②</span>console.anthropic.com でクレジット購入（$5〜）</div>
          <div className="flex items-start gap-1.5"><span className="font-bold text-purple-600 flex-shrink-0">③</span>タスク追加・会議メモ・AI議論を使い始める</div>
          <div className="flex items-start gap-1.5"><span className="font-bold text-purple-600 flex-shrink-0">④</span>自習タブでタイマーを回してResearch RPGのゴールドを貯める</div>
        </div>
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
        <p className="text-xs font-semibold text-gray-500 mb-3">よく使う操作</p>
        <div className="flex flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-gray-600"><Key className="w-4 h-4 text-purple-500" /><span>APIキー登録：設定タブ</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Wallet className="w-4 h-4 text-purple-500" /><span>残高確認：設定タブ内ボタン</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Mic className="w-4 h-4 text-rose-500" /><span>会議メモ：会議メモタブ</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Search className="w-4 h-4 text-gray-500" /><span>全文検索：右上「検索」</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Plus className="w-4 h-4 text-blue-500" /><span>タスク追加：タスクタブ内</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Share2 className="w-4 h-4 text-indigo-500" /><span>ノート共有：メッセージタブ</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><FolderOpen className="w-4 h-4 text-yellow-500" /><span>論文仕分け：マイライブラリ→コレクション</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Timer className="w-4 h-4 text-violet-500" /><span>自習タイマー：自習タブ</span></div>
          <div className="flex items-center gap-1.5 text-gray-600"><Sword className="w-4 h-4 text-violet-500" /><span>ゴールド獲得：自習タイマー停止時に自動加算</span></div>
        </div>
      </div>
    </div>
  );
}
