
import { NextRequest, NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE =
  "https://saravutw-wan2-2-i2v-lightning-4-8step-custom.hf.space";

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get("image");
    const prompt = String(form.get("prompt") || "").trim();

    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Lütfen bir fotoğraf yükle." },
        { status: 400 }
      );
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type)) {
      return NextResponse.json(
        { error: "JPG, PNG veya WEBP yüklemelisin." },
        { status: 400 }
      );
    }

    if (image.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Fotoğraf en fazla 3 MB olabilir." },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Video açıklaması yazmalısın." },
        { status: 400 }
      );
    }

    const client = await Client.connect(SPACE);

    const result = await client.predict("/generate_video", {
      input_image: await handle_file(image),
      last_image: null,
      prompt,
      steps: 4,
      negative_prompt:
        "blurry, low quality, deformed, watermark, bad anatomy, shaky camera",
      duration_seconds: 3,
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

    const data = result.data as Array<unknown>;

    function getUrl(value: unknown): string | null {
      if (!value || typeof value !== "object") return null;

      const item = value as {
        url?: string;
        video?: { url?: string };
      };

      return item.url || item.video?.url || null;
    }

    const generatedVideoUrl = getUrl(data?.[0]);
    const downloadVideoUrl = getUrl(data?.[1]);

    async function checkUrl(url: string | null) {
      if (!url) {
        return { available: false, status: null };
      }

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: { Range: "bytes=0-1023" },
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

    const [generatedCheck, downloadCheck] = await Promise.all([
      checkUrl(generatedVideoUrl),
      checkUrl(downloadVideoUrl),
    ]);

    const workingUrl = downloadCheck.available
      ? downloadVideoUrl
      : generatedCheck.available
        ? generatedVideoUrl
        : null;

    return NextResponse.json({
      success: Boolean(workingUrl),
      model: "Wan 2.2 Lightning",
      videoUrl: workingUrl,
      generatedVideo: {
        url: generatedVideoUrl,
        ...generatedCheck,
      },
      downloadVideo: {
        url: downloadVideoUrl,
        ...downloadCheck,
      },
      error: workingUrl
        ? null
        : "Video bağlantılarına erişilemiyor. İki çıktı da kontrol edildi.",
    });
  } catch (error) {
    console.error("WAN GENERATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Video oluşturulurken hata oluştu.",
      },
      { status: 500 }
    );
  }
}
