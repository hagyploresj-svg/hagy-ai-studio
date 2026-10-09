
import { NextRequest, NextResponse } from "next/server";
import { Client, handle_file } from "@gradio/client";

export const runtime = "nodejs";
export const maxDuration = 60;

const SPACE =
  "saravutw/WAN2.2-I2V-LIGHTNING-Video-4-8step-custom";

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

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Gecersiz fotograf formati." },
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
        { error: "Prompt yazmalisin." },
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
        "blurry, low quality, deformed, watermark",
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
    }>;

    const videoUrl = data?.[0]?.url || data?.[1]?.url;

    if (!videoUrl) {
      return NextResponse.json(
        { error: "Video adresi alinamadi." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      videoUrl
    });
  } catch (error) {
    console.error("Wan generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Video uretimi basarisiz."
      },
      { status: 500 }
    );
  }
}
