import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, refreshAccessToken } from "@/lib/google-calendar";
import { supabase } from "@/lib/supabase";

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["google_access_token", "google_refresh_token", "google_token_expiry"]);

  if (!data || data.length === 0) return null;

  const settings = Object.fromEntries(data.map((d) => [d.key, d.value]));
  const accessToken = settings["google_access_token"];
  const refreshToken = settings["google_refresh_token"];
  const expiry = Number(settings["google_token_expiry"] ?? 0);

  // トークンが期限切れの場合はリフレッシュ
  if (Date.now() > expiry - 60000 && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed.access_token) {
      await supabase.from("app_settings").upsert([
        { key: "google_access_token", value: refreshed.access_token, updated_at: new Date().toISOString() },
        { key: "google_token_expiry", value: String(Date.now() + refreshed.expires_in * 1000), updated_at: new Date().toISOString() },
      ]);
      return refreshed.access_token;
    }
  }

  return accessToken ?? null;
}

export async function POST(req: NextRequest) {
  const { taskId, title, description, dueDate } = await req.json();

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Google Calendar未連携" }, { status: 401 });
  }

  const eventId = await createCalendarEvent(accessToken, title, description, dueDate);

  await supabase
    .from("tasks")
    .update({ calendar_event_id: eventId })
    .eq("id", taskId);

  return NextResponse.json({ eventId });
}
