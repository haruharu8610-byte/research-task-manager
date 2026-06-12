import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_access_token")
    .single();

  return NextResponse.json({ connected: !!data?.value });
}
