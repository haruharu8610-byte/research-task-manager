import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { period } = await req.json();
  const apiKey = req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey });

  const since = new Date();
  since.setDate(since.getDate() - (period === "month" ? 30 : 7));

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .gte("updated_at", since.toISOString());

  const { data: notes } = await supabase
    .from("research_notes")
    .select("title, content, note_type, updated_at")
    .gte("updated_at", since.toISOString());

  const completedTasks = tasks?.filter((t) => t.status === "done") ?? [];
  const inProgressTasks = tasks?.filter((t) => t.status === "in_progress") ?? [];
  const todoTasks = tasks?.filter((t) => t.status === "todo") ?? [];

  const prompt = `以下の研究活動データをもとに、${period === "month" ? "月次" : "週次"}レポートを作成してください。

## 期間: 過去${period === "month" ? "30" : "7"}日間

## タスク状況
- 完了: ${completedTasks.length}件
${completedTasks.map((t) => `  - ${t.title}`).join("\n")}
- 進行中: ${inProgressTasks.length}件
${inProgressTasks.map((t) => `  - ${t.title}（期限: ${t.due_date ?? "未設定"}）`).join("\n")}
- 未着手: ${todoTasks.length}件

## 作成・更新したノート
${notes?.map((n) => `- [${n.note_type === "experiment" ? "実験記録" : "ノート"}] ${n.title}`).join("\n") ?? "なし"}

以下の形式で日本語でレポートを作成してください：

# 研究進捗レポート（${period === "month" ? "月次" : "週次"}）

## 今期の成果

## 進行中の取り組み

## 課題・懸念点

## 来週/来月の予定

## 指導教員へのコメント（任意）
`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ content });
}
