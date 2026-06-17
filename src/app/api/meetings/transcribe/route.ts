import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import Groq from "groq-sdk";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userId = await getUserFromRequest(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) return NextResponse.json({ error: "Groq APIキーが設定されていません" }, { status: 500 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch (e) {
    return NextResponse.json({ error: "ファイルの読み込みに失敗しました: " + String(e) }, { status: 400 });
  }

  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "ファイルがありません" }, { status: 400 });

  const client = new Groq({ apiKey: groqKey });
  try {
    const response = await client.audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      language: "ja",
    });
    return NextResponse.json({ transcript: response.text });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Transcription error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
