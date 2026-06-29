import { NextRequest, NextResponse } from "next/server";
import { createCalendarEvent, deleteCalendarEvent, refreshAccessToken } from "@/lib/google-calendar";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/auth";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getAccessToken(userId: string | null): Promise<string | null> {
  const db = getServiceClient();
  let query = db
    .from("app_settings")
    .select("key, value");

  if (userId) query = query.eq("user_id", userId);
  else query = query.is("user_id", null);

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
      await db.from("app_settings").upsert([
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
  const { taskId, title, description, dueDate, endDate, isDateTime } = await req.json();

  const accessToken = await getAccessToken(userId);
  if (!accessToken) return NextResponse.json({ error: "Google Calendar未連携" }, { status: 401 });

  const { eventId, error: calError, status: calStatus } = await createCalendarEvent(accessToken, title, description, dueDate, isDateTime, endDate);
  if (calError) {
    console.error("Google Calendar API error:", calError);
    // Googleが401を返した場合はトークン切れ→再連携を促す
    if (calStatus === 401) {
      return NextResponse.json({ error: "token_expired" }, { status: 401 });
    }
    return NextResponse.json({ error: calError }, { status: 500 });
  }
  if (taskId) {
    await getServiceClient().from("tasks").update({ calendar_event_id: eventId }).eq("id", taskId);
  }

  return NextResponse.json({ eventId });
}

export async function DELETE(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  const { eventId } = await req.json();

  const accessToken = await getAccessToken(userId);
  if (!accessToken) return NextResponse.json({ error: "Google Calendar未連携" }, { status: 401 });

  await deleteCalendarEvent(accessToken, eventId);
  return NextResponse.json({ success: true });
}
