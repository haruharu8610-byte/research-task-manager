import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, refreshAccessToken } from "@/lib/google-calendar";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

async function getAccessToken(userId: string | null): Promise<string | null> {
  const query = supabase
    .from("app_settings")
    .select("key, value");

  if (userId) query.eq("user_id", userId);
  else query.is("user_id", null);

  const { data } = await query.in("key", ["google_access_token", "google_refresh_token", "google_token_expiry"]);
  if (!data || data.length === 0) return null;

  const settings = Object.fromEntries(data.map((d) => [d.key, d.value]));
  const accessToken = settings["google_access_token"];
  const refreshToken = settings["google_refresh_token"];
  const expiry = Number(settings["google_token_expiry"] ?? 0);

  if (Date.now() > expiry - 60000 && refreshToken) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (refreshed.access_token) {
      const base = { updated_at: new Date().toISOString(), user_id: userId };
      await supabase.from("app_settings").upsert([
        { ...base, key: "google_access_token", value: refreshed.access_token },
        { ...base, key: "google_token_expiry", value: String(Date.now() + refreshed.expires_in * 1000) },
      ]);
      return refreshed.access_token;
    }
  }

  return accessToken ?? null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  const { taskId, title, description, dueDate } = await req.json();

  const accessToken = await getAccessToken(userId);
  if (!accessToken) return NextResponse.json({ error: "Google Calendar未連携" }, { status: 401 });

  const eventId = await createCalendarEvent(accessToken, title, description, dueDate);
  await supabase.from("tasks").update({ calendar_event_id: eventId }).eq("id", taskId);

  return NextResponse.json({ eventId });
}
