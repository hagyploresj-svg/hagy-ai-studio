
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOST = "https://www.myinstants.com";

function errorResponse(
  message: string,
  status = 500
) {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (
    !slug ||
    !/^[a-z0-9-]{1,120}$/.test(slug)
  ) {
    return errorResponse("Geçersiz ses kimliği.", 400);
  }

  const source = `${HOST}/en/instant/${slug}/`;

  try {
    const response = await fetch(source, {
      cache: "no-store",
      headers: {
        Accept: "text/html",
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return errorResponse(
        `Kaynak sayfası açılamadı (${response.status}).`,
        502
      );
    }

    const html = await response.text();

    // Kaynak sayfasında yer alan gerçek ses dosyasını bul.
    const normalized = html
      .replace(/&amp;/g, "&")
      .replace(/&#x2F;/gi, "/")
      .replace(/&#47;/g, "/")
      .replace(/\\\//g, "/");

    const match = normalized.match(
      /\/media\/sounds\/[^\s"'<>\\)]+?\.(?:mp3|wav|ogg)(?:\?[^"'<>\\)\s]*)?/i
    );

    if (!match) {
      return errorResponse(
        "Kaynak sayfasında ses dosyası bulunamadı.",
        404
      );
    }

    const url = new URL(match[0], HOST);

    if (
      url.hostname !== "www.myinstants.com" ||
      !url.pathname.startsWith("/media/sounds/")
    ) {
      return errorResponse(
        "Güvenilir ses bağlantısı bulunamadı.",
        400
      );
    }

    return NextResponse.json(
      {
        url: url.toString(),
        source,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch {
    return errorResponse(
      "Ses kaynağına erişilemedi. Daha sonra tekrar deneyin.",
      502
    );
  }
}
