import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
  return NextResponse.json(data ?? null);
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { username } = await req.json();
  if (!username?.trim()) return NextResponse.json({ error: "ユーザー名を入力してください" }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: username.trim() }, { onConflict: "id" })
    .select()
    .single();

  console.log("profiles upsert:", { userId, username, data, error });

  if (error) {
    if (error.message.includes("unique") || error.code === "23505") {
      return NextResponse.json({ error: "そのユーザー名は既に使われています" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }
  return NextResponse.json(data);
}
