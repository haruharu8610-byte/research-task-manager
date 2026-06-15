import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("messages")
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(username),
      receiver:profiles!messages_receiver_id_fkey(username),
      reactions:message_reactions(id, user_id, emoji)
    `)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: true });

  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiver_id, note_id, note_title, note_content, refs } = await req.json();
  if (!receiver_id) return NextResponse.json({ error: "送信先が未指定です" }, { status: 400 });

  const { data, error } = await supabase
    .from("messages")
    .insert({ sender_id: userId, receiver_id, note_id, note_title, note_content, refs: refs ?? [] })
    .select(`
      *,
      sender:profiles!messages_sender_id_fkey(username),
      receiver:profiles!messages_receiver_id_fkey(username),
      reactions:message_reactions(id, user_id, emoji)
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
