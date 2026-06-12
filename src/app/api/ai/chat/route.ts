import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const { messages, tasks } = await req.json();
  const apiKey = req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 401 });
  }

  const anthropic = new Anthropic({ apiKey });

  const taskContext =
    tasks?.length > 0
      ? `\n\n現在のタスク一覧:\n${tasks
          .map(
            (t: { title: string; status: string; priority: string; due_date: string | null }) =>
              `- [${t.status}] ${t.title}（優先度: ${t.priority}、期限: ${t.due_date ?? "未設定"}）`
          )
          .join("\n")}`
      : "";

  const systemPrompt = `あなたは理系研究（実験・データ解析）の専門的なリサーチアシスタントです。
研究者が抱える問題や疑問について、具体的・論理的に議論・アドバイスしてください。
実験デザイン、統計解析手法、データ収集方法、論文執筆などについて詳しくサポートします。
回答は日本語で、簡潔かつ専門的にしてください。${taskContext}`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 2048,
    system: systemPrompt,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";

  const lastUserMessage = messages[messages.length - 1];
  await supabase.from("chat_messages").insert([
    { role: "user", content: lastUserMessage.content },
    { role: "assistant", content },
  ]);

  return NextResponse.json({ content });
}

export async function DELETE() {
  const { error } = await supabase
    .from("chat_messages")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
