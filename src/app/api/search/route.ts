import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ tasks: [], notes: [], messages: [] });

  const [{ data: tasks }, { data: notes }, { data: messages }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .or(`title.ilike.%${q}%,description.ilike.%${q}%,research_theme.ilike.%${q}%`)
      .limit(10),
    supabase
      .from("research_notes")
      .select("id, title, content, note_type, updated_at")
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(10),
    supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .ilike("content", `%${q}%`)
      .eq("role", "assistant")
      .limit(5),
  ]);

  return NextResponse.json({
    tasks: tasks ?? [],
    notes: notes ?? [],
    messages: messages ?? [],
  });
}
