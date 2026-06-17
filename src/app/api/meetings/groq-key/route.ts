import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "Groq APIキーが設定されていません" }, { status: 500 });

  return NextResponse.json({ key });
}
