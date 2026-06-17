import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  let query = supabase.from("meetings").select("*").eq("user_id", userId).order("created_at", { ascending: false });
  if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,tags.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, transcript, tags, apiKey } = await req.json();
  const key = apiKey || req.headers.get("x-api-key") || process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: "APIキーが必要です" }, { status: 400 });

  const client = new Anthropic({ apiKey: key });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `以下の会議の文字起こしを解析してください。\n\n文字起こし:\n${transcript}\n\n必ず以下のJSON形式のみで返してください。コードブロック、説明文、前置きは一切不要です。JSONのみ返してください:\n{"summary": "会議の要点を3〜5文で説明", "action_items": ["誰が何をするかのTODO"], "decisions": ["会議で決まったこと"], "speakers": ["話者名：発言内容の要約（不明なら空配列）"]}`,
    }],
  });

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}") + 1;
  let result;
  try {
    result = JSON.parse(raw.slice(start, end));
  } catch {
    return NextResponse.json({ error: "AI解析に失敗しました" }, { status: 500 });
  }

  const { data, error } = await supabase.from("meetings").insert({
    user_id: userId,
    title,
    transcript,
    tags: tags ?? "",
    summary: result.summary,
    action_items: result.action_items ?? [],
    decisions: result.decisions ?? [],
    speakers: result.speakers ?? [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
