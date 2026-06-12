import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { taskId: string } }) {
  const userId = await getUserFromRequest(req);

  const query = supabase.from("task_notes").select("content").eq("task_id", params.taskId as unknown as string);
  if (userId) query.eq("user_id", userId);

  const { data: rows } = await query;
  return NextResponse.json({ content: rows?.[0]?.content ?? "" });
}

export async function PUT(req: NextRequest, { params }: { params: { taskId: string } }) {
  const userId = await getUserFromRequest(req);
  const { content } = await req.json();

  const query = supabase.from("task_notes").select("id").eq("task_id", params.taskId as unknown as string);
  if (userId) query.eq("user_id", userId);
  const { data: rows } = await query;

  if (rows && rows.length > 0) {
    const upd = supabase.from("task_notes").update({ content }).eq("task_id", params.taskId as unknown as string);
    if (userId) upd.eq("user_id", userId);
    const { data, error } = await upd.select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data?.[0] ?? { content });
  } else {
    const { data, error } = await supabase
      .from("task_notes")
      .insert({ task_id: params.taskId, content, user_id: userId })
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data?.[0] ?? { content });
  }
}
