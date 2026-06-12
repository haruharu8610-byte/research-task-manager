import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/google-calendar";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=no_code", req.url));
  }

  const tokens = await exchangeCodeForTokens(code);
  console.log("取得したトークン:", JSON.stringify({
    has_access_token: !!tokens.access_token,
    has_refresh_token: !!tokens.refresh_token,
    expires_in: tokens.expires_in,
    error: tokens.error,
  }));

  if (!tokens.access_token) {
    console.error("トークン取得失敗:", tokens);
    return NextResponse.redirect(new URL("/?error=token_failed", req.url));
  }

  const { error: upsertError } = await supabase.from("app_settings").upsert([
    { key: "google_access_token", value: tokens.access_token, updated_at: new Date().toISOString() },
    { key: "google_token_expiry", value: String(Date.now() + (tokens.expires_in ?? 3600) * 1000), updated_at: new Date().toISOString() },
  ]);

  console.log("Supabase保存結果:", upsertError ? upsertError.message : "成功");

  if (tokens.refresh_token) {
    await supabase.from("app_settings").upsert([
      { key: "google_refresh_token", value: tokens.refresh_token, updated_at: new Date().toISOString() },
    ]);
  }

  return NextResponse.redirect(new URL("/?calendar=connected", req.url));
}
