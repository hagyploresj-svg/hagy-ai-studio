
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
        { error: "Fotograf yuklemelisin." },
        { status: 400 }
      );
    }

    if (
      !["image/png", "image/jpeg", "image/webp"].includes(
        image.type
      )
    ) {
      return NextResponse.json(
        { error: "JPG, PNG veya WebP yuklemelisin." },
        { status: 400 }
      );
    }

    if (image.size > 3 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Fotograf en fazla 3 MB olabilir." },
        { status: 400 }
      );
    }

    if (!prompt) {
      return NextResponse.json(
        { error: "Video promptu yazmalisin." },
        { status: 400 }
      );
    }

    const client = await Client.connect(SPACE);

    const result = await client.predict("/generate_video", {
      input_image: await handle_file(image),
      last_image: null,
      prompt: prompt,
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
      video_component: true
    });

    const data = result.data as Array<{
      url?: string;
      path?: string;
    } | null>;

    const videoUrl =
      data?.[0]?.url || data?.[1]?.url;

    if (!videoUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "AI video olusturdu ancak video adresi alinamadi."
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      model: "Wan 2.2 Lightning",
      videoUrl
    });

  } catch (error) {
    console.error("WAN AI ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "AI video uretimi sirasinda hata olustu."
      },
      { status: 500 }
    );
  }
}
