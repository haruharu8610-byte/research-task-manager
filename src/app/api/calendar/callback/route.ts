import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state") ?? "";

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  if (!code) return NextResponse.redirect(`${origin}/?error=no_code`);

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens.access_token) return NextResponse.redirect(`${origin}/?error=token_failed`);

  // stateにユーザートークンが入っている
  let userId: string | null = null;
  if (state) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: { user } } = await client.auth.getUser(state);
    userId = user?.id ?? null;
  }

  const baseRecord = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  await supabase.from("app_settings").upsert([
    { ...baseRecord, key: "google_access_token", value: tokens.access_token },
    { ...baseRecord, key: "google_token_expiry", value: String(Date.now() + (tokens.expires_in ?? 3600) * 1000) },
  ]);

  if (tokens.refresh_token) {
    await supabase.from("app_settings").upsert([
      { ...baseRecord, key: "google_refresh_token", value: tokens.refresh_token },
    ]);
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  return NextResponse.redirect(`${baseUrl}/?calendar=connected`);
}
