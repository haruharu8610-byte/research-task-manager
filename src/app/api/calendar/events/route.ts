import { NextRequest, NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/google-calendar";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

async function getAccessToken(userId: string | null): Promise<string | null> {
  let query = supabase.from("app_settings").select("key, value");
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
      await supabase.from("app_settings").upsert([
        { ...base, key: "google_access_token", value: refreshed.access_token },
        { ...base, key: "google_token_expiry", value: String(Date.now() + refreshed.expires_in * 1000) },
      ], { onConflict: "user_id,key" });
      return refreshed.access_token;
    }
  }
  return accessToken ?? null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  const accessToken = await getAccessToken(userId);
  if (!accessToken) return NextResponse.json({ error: "未連携" }, { status: 401 });

  const year = req.nextUrl.searchParams.get("year");
  const month = req.nextUrl.searchParams.get("month");

  const now = new Date();
  const y = year ? parseInt(year) : now.getFullYear();
  const m = month ? parseInt(month) - 1 : now.getMonth();

  const timeMin = new Date(y, m, 1).toISOString();
  const timeMax = new Date(y, m + 1, 0, 23, 59, 59).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await res.json();
  return NextResponse.json({ events: data.items ?? [] });
}
