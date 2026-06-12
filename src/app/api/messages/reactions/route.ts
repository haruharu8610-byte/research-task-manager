import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message_id, emoji } = await req.json();

  // すでに同じリアクションがあれば削除（トグル）
  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id, emoji")
    .eq("message_id", message_id)
    .eq("user_id", userId)
    .single();

  if (existing) {
    if (existing.emoji === emoji) {
      await supabase.from("message_reactions").delete().eq("id", existing.id);
      return NextResponse.json({ removed: true });
    } else {
      const { data } = await supabase
        .from("message_reactions")
        .update({ emoji })
        .eq("id", existing.id)
        .select()
        .single();
      return NextResponse.json(data);
    }
  }

  const { data, error } = await supabase
    .from("message_reactions")
    .insert({ message_id, user_id: userId, emoji })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
