import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// GET: 累計自習時間（分）を返す
export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const { data, error } = await supabase
    .from("study_sessions")
    .select("duration_minutes, subject, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });

  const sessions = data ?? [];
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  // 今日のセッション
  const today = new Date().toISOString().split("T")[0];
  const todayMinutes = sessions
    .filter(s => s.created_at?.startsWith(today))
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  return NextResponse.json(
    { totalMinutes, todayMinutes, sessions: sessions.slice(0, 30) },
    { headers: corsHeaders }
  );
}

// POST: セッションを保存
export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const body = await req.json();
  const { duration_minutes, subject } = body;

  if (!duration_minutes || duration_minutes < 1)
    return NextResponse.json({ error: "duration_minutes must be >= 1" }, { status: 400, headers: corsHeaders });

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ user_id: userId, duration_minutes, subject: subject ?? null })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });

  return NextResponse.json(data, { status: 201, headers: corsHeaders });
}
