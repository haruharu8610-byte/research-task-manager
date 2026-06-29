import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("tasks")
    .select("status, priority")
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const tasks = data ?? [];
  const completedTasks = tasks.filter((t) => t.status === "done");

  // 優先度でポイントを加重
  const pointsMap: Record<string, number> = { low: 10, medium: 20, high: 30 };
  const totalPoints = completedTasks.reduce(
    (sum, t) => sum + (pointsMap[t.priority] ?? 10),
    0
  );

  return NextResponse.json({
    totalTasks: tasks.length,
    completedTasks: completedTasks.length,
    totalPoints,
  });
}
