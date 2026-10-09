
import { NextRequest, NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE =
  "https://saravutw-wan2-2-i2v-lightning-4-8step-custom.hf.space";

const ALLOWED_DURATIONS = [3, 5];

type VideoFile = {
  url?: string;
  path?: string;
  video?: {
    url?: string;
    path?: string;
  };
};

function getVideoUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const file = value as VideoFile;

  const candidate = file.url || file.video?.url;

  if (!candidate) {
    return null;
  }

  try {
    const parsed = new URL(candidate);

    if (
      parsed.protocol !== "https:" &&
      parsed.protocol !== "http:"
    ) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

async function checkVideoUrl(url: string | null) {
  if (!url) {
    return {
      available: false,
      status: null as number | null,
    };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Range: "bytes=0-1023",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    await response.body?.cancel();

    return {
      available: response.ok,
      status: response.status,
    };
  } catch {
    return {
      available: false,
      status: null,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();

    const image = form.get("image");
    const prompt = String(form.get("prompt") || "").trim();
    const duration = Number(form.get("duration") || 3);

    if (!(image instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "Lütfen bir fotoğraf yükle.",
        },
        { status: 400 }
      );
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        image.type
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "JPG, PNG veya WEBP yüklemelisin.",
        },
        { status: 400 }
      );
    }

    if (
      image.size === 0 ||
      image.size > 3 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Fotoğraf en fazla 3 MB olabilir.",
        },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: "Video açıklaması yazmalısın.",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_DURATIONS.includes(duration)) {
      return NextResponse.json(
        {
          success: false,
          error: "Sadece 3 veya 5 saniye seçebilirsin.",
        },
        { status: 400 }
      );
    }

    // Gradio dosyalarını otomatik indirmeyi kapat.
    const client = await Client.connect(SPACE, {
      download_files: false,
    });

    // Wan 2.2 Lightning ile video oluştur.
    const result = await client.predict("/generate_video", {
      input_image: await handle_file(image),
      last_image: null,
      prompt,
      steps: 4,
      negative_prompt:
        "blurry, low quality, deformed, watermark, bad anatomy, shaky camera",
      duration_seconds: duration,
      guidance_scale: 1,
      guidance_scale_2: 1,
      seed: 42,
      randomize_seed: true,
      quality: 5,
      scheduler: "UniPCMultistep",
      flow_shift: 3,
      frame_multiplier: 16,
      safe_mode: false,
      video_component: true,
    });

    const data = result.data as unknown[];

    // İlk çıktı: video oynatıcı
    const generatedVideoUrl = getVideoUrl(data?.[0]);

    // İkinci çıktı: indirilebilir video
    const downloadVideoUrl = getVideoUrl(data?.[1]);

    const [generatedCheck, downloadCheck] =
      await Promise.all([
        checkVideoUrl(generatedVideoUrl),
        checkVideoUrl(downloadVideoUrl),
      ]);

    const workingUrl = downloadCheck.available
      ? downloadVideoUrl
      : generatedCheck.available
        ? generatedVideoUrl
        : null;

    if (!workingUrl) {
      return NextResponse.json(
        {
          success: false,
          model: "Wan 2.2 Lightning",
          error:
            "AI video oluşturulmuş olabilir ancak Hugging Face dosyaya erişim izni vermiyor. Lütfen tekrar dene.",
          generatedVideo: {
            url: generatedVideoUrl,
            ...generatedCheck,
          },
          downloadVideo: {
            url: downloadVideoUrl,
            ...downloadCheck,
          },
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      model: "Wan 2.2 Lightning",
      duration,
      videoUrl: workingUrl,
      generatedVideo: {
        url: generatedVideoUrl,
        ...generatedCheck,
      },
      downloadVideo: {
        url: downloadVideoUrl,
        ...downloadCheck,
      },
    });
  } catch (error) {
    console.error("WAN GENERATE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Video oluşturulurken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
