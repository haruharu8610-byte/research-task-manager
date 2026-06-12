import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { theme, existingTasks } = await req.json();
    const apiKey = req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "APIキーが設定されていません" }, { status: 401 });
    }

    const anthropic = new Anthropic({ apiKey });

    const existingList =
      existingTasks?.length > 0
        ? `\n\n既存タスク:\n${existingTasks.map((t: string) => `- ${t}`).join("\n")}`
        : "";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `あなたは理系研究（実験・データ解析）のサポートAIです。
以下の研究テーマに対して、必要なタスク・収集すべきデータ・実施すべき実験を具体的に5個提案してください。
各提案には優先度（high/medium/low）と推奨期限（今日から何日後か）も含めてください。
${existingList}

研究テーマ: ${theme}

以下のJSON形式のみで返してください。説明文は不要です（日本語）:
{
  "suggestions": [
    {
      "title": "タスク名",
      "description": "具体的な内容",
      "priority": "high",
      "days_until_due": 14,
      "tags": ["タグ1", "タグ2"]
    }
  ],
  "reasoning": "なぜこれらのタスクが必要か"
}`,
        },
      ],
    });

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "AI応答の解析に失敗しました" }, { status: 500 });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (e) {
    console.error("エラー詳細:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
