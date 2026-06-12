import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { data, error } = await supabase
    .rpc("get_task_note", { p_task_id: params.taskId });

  if (error) {
    // RPCがなければ通常クエリにフォールバック
    const { data: rows } = await supabase
      .from("task_notes")
      .select("content")
      .eq("task_id", params.taskId as unknown as string);

    const content = rows?.[0]?.content ?? "";
    return NextResponse.json({ content });
  }

  return NextResponse.json({ content: data?.[0]?.content ?? "" });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { content } = await req.json();

  // まず既存レコードを確認
  const { data: rows } = await supabase
    .from("task_notes")
    .select("id")
    .eq("task_id", params.taskId as unknown as string);

  if (rows && rows.length > 0) {
    const { data, error } = await supabase
      .from("task_notes")
      .update({ content })
      .eq("task_id", params.taskId as unknown as string)
      .select();
    if (error) {
      console.error("update error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] ?? { content });
  } else {
    const { data, error } = await supabase
      .from("task_notes")
      .insert({ task_id: params.taskId, content })
      .select();
    if (error) {
      console.error("insert error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] ?? { content });
  }
}
