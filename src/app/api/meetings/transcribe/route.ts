import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File;
  const groqKey = form.get("groq_key") as string;

  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });
  if (!groqKey) return NextResponse.json({ error: "Groq APIキーが必要です" }, { status: 400 });

  const client = new Groq({ apiKey: groqKey });
  try {
    const response = await client.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: "ja",
    });
    return NextResponse.json({ transcript: response.text });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
