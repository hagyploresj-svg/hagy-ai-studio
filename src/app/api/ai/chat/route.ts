
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || !supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Servis yapılandırması eksik." },
        { status: 503 }
      );
    }

    // Kullanıcının oturum token'ını kontrol et
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Oturum açmanız gerekiyor." },
        { status: 401 }
      );
    }

    const token = authorization.slice(7).trim();

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Geçersiz oturum." },
        { status: 401 }
      );
    }

    // Super Admin kontrolü
    const { data: isAdmin, error: adminError } =
      await supabase.rpc("is_business_admin");

    if (adminError) {
      return NextResponse.json(
        { error: "Yetki kontrolü yapılamadı." },
        { status: 503 }
      );
    }

    if (isAdmin !== true) {
      // İşletme başvurusunun onay durumunu kontrol et
      const { data: application, error: applicationError } =
        await supabase
          .from("business_applications")
          .select("status")
          .eq("user_id", user.id)
          .maybeSingle();

      if (applicationError) {
        return NextResponse.json(
          { error: "Başvuru durumu kontrol edilemedi." },
          { status: 503 }
        );
      }

      if (application?.status !== "approved") {
        return NextResponse.json(
          { error: "İşletme hesabınız henüz onaylanmadı." },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => null);
    const message = body?.message;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 2000
    ) {
      return NextResponse.json(
        { error: "Mesaj 1-2000 karakter arasında olmalıdır." },
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
            "Sen Hagy Business platformunun profesyonel Türkçe AI asistanısın. İşletmelere satış, pazarlama, müşteri ilişkileri, görev planlama ve iş süreçlerinde yardımcı ol. Erişimin olmayan işletme verilerini uydurma. Kısa, açık ve faydalı yanıtlar ver.",
          input: message.trim(),
          max_output_tokens: 600,
        }),
      }
    );

    if (!response.ok) {
      console.error("OpenAI API status:", response.status);

      return NextResponse.json(
        { error: "AI yanıtı alınamadı." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const answer = (data.output ?? [])
      .flatMap(
        (item: { content?: Array<{ type: string; text?: string }> }) =>
          item.content ?? []
      )
      .filter(
        (item: { type: string }) =>
          item.type === "output_text"
      )
      .map(
        (item: { text?: string }) =>
          item.text ?? ""
      )
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
