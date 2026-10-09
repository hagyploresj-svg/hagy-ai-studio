
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SPACE_URL =
  "https://saravutw-wan2-2-i2v-lightning-4-8step-custom.hf.space";

export async function GET() {
  try {
    const response = await fetch(
      `${SPACE_URL}/gradio_api/info`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        connected: false,
        status: response.status,
        message: "Wan API yanit vermedi.",
      });
    }

    const info = await response.json();

    const generateEndpoint =
      info?.named_endpoints?.["/generate_video"];

    return NextResponse.json({
      connected: Boolean(generateEndpoint),
      model: "Wan 2.2 Lightning",
      endpoint: "/generate_video",
      publicAPI:
        generateEndpoint?.api_visibility === "public",
      message: generateEndpoint
        ? "Wan API erisilebilir."
        : "Video uretim endpointi bulunamadi.",
    });
  } catch (error) {
    return NextResponse.json({
      connected: false,
      message:
        error instanceof Error
          ? error.message
          : "Baglanti hatasi.",
    });
  }
}
