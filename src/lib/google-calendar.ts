const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export function getGoogleAuthUrl(stateToken: string = ""): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state: stateToken,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeCodeForTokens(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "";
  console.log("Token exchange - client_id:", clientId.slice(0, 20) + "...", "redirect_uri:", redirectUri, "secret_length:", clientSecret.length);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  return res.json();
}

export async function createCalendarEvent(
  accessToken: string,
  title: string,
  description: string,
  startDate: string,
  isDateTime = false,
  endDate?: string
): Promise<{ eventId?: string; error?: string; status?: number }> {
  let startEntry, endEntry;
  if (isDateTime) {
    startEntry = { dateTime: startDate, timeZone: "Asia/Tokyo" };
    endEntry = { dateTime: endDate ?? startDate, timeZone: "Asia/Tokyo" };
  } else {
    // 終日イベントはend.dateを翌日にしないとGoogle Calendar APIに弾かれる
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);
    startEntry = { date: startDate };
    endEntry = { date: endDate ?? nextDayStr };
  }

  const event = {
    summary: title,
    description,
    start: startEntry,
    end: endEntry,
    reminders: {
      useDefault: false,
      overrides: [{ method: "popup", minutes: 30 }],
    },
  };

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  const data = await res.json();
  if (!res.ok) {
    return { error: JSON.stringify(data), status: res.status };
  }
  return { eventId: data.id };
}

export async function deleteCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
