import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q.trim()) return NextResponse.json([]);

  const { data } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", `%${q}%`)
    .neq("id", userId)
    .limit(10);

  return NextResponse.json(data ?? []);
}
