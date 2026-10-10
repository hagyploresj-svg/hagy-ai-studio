
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI servisi yapılandırılmamış." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const message = body?.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return NextResponse.json(
        { error: "Geçerli bir mesaj gönderin." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "Sen Hagy Business platformunun profesyonel Türkçe AI asistanısın. İşletmelere müşteri ilişkileri, görev planlama, satış, pazarlama ve iş süreçlerinde yardımcı ol. Bilmediğin işletme verilerini uydurma. Kısa, açık ve faydalı yanıtlar ver.",
          input: message.trim(),
          max_output_tokens: 600,
        }),
      }
    );

    if (!response.ok) {
      console.error("OpenAI API error:", response.status);

      return NextResponse.json(
        { error: "AI yanıtı alınamadı." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const answer = (data.output ?? [])
      .flatMap((item: any) => item.content ?? [])
      .filter((item: any) => item.type === "output_text")
      .map((item: any) => item.text)
      .join("\n");

    return NextResponse.json({
      reply: answer || "Şu anda yanıt oluşturulamadı.",
    });
  } catch (error) {
    console.error("Hagy AI error:", error);

    return NextResponse.json(
      { error: "Bir hata oluştu." },
      { status: 500 }
    );
  }
}
