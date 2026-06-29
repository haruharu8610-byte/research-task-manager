import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserFromRequest } from "@/lib/auth";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  const db = getServiceClient();

  let query = db
    .from("app_settings")
    .select("value")
    .eq("key", "google_access_token");

  if (userId) query = query.eq("user_id", userId);
  else query = query.is("user_id", null);

  const { data } = await query.single();
  return NextResponse.json({ connected: !!data?.value });
}
