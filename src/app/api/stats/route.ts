import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });

  const { data, error } = await supabase
    .from("tasks")
    .select("status, priority, research_theme")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = data ?? [];
  const completedTasks = tasks.filter((t) => t.status === "done");

  const pointsMap: Record<string, number> = { low: 10, medium: 20, high: 30 };
  const totalPoints = completedTasks.reduce(
    (sum, t) => sum + (pointsMap[t.priority] ?? 10),
    0
  );

  // タスク数が最多の研究テーマを職業として返す
  const themeCounts: Record<string, number> = {};
  for (const t of tasks) {
    const theme = t.research_theme?.trim();
    if (theme) themeCounts[theme] = (themeCounts[theme] ?? 0) + 1;
  }
  const primaryTheme = Object.entries(themeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // 自習時間の累計
  const { data: studyData } = await supabase
    .from("study_sessions")
    .select("duration_minutes")
    .eq("user_id", userId);
  const studyTotalMinutes = (studyData ?? []).reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  return NextResponse.json(
    { totalTasks: tasks.length, completedTasks: completedTasks.length, totalPoints, primaryTheme, studyTotalMinutes },
    { headers: corsHeaders }
  );
}
