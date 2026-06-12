import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);

  const query = supabase
    .from("app_settings")
    .select("value")
    .eq("key", "google_access_token");

  if (userId) query.eq("user_id", userId);
  else query.is("user_id", null);

  const { data } = await query.single();
  return NextResponse.json({ connected: !!data?.value });
}
