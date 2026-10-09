
import { NextResponse } from "next/server";
import { getProvider, type JobRequest } from "@/lib/provider";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Dosya yükleme formatı geçersiz." },
        { status: 415 }
      );
    }

    const form = await req.formData();

    const file = form.get("file");
    const templateId = form.get("templateId");
    const style = form.get("style");
    const seconds = Number(form.get("seconds"));
    const ratio = form.get("ratio");
    const text = form.get("text");

    if (
      !(file instanceof File) ||
      typeof templateId !== "string" ||
      !templateId.trim() ||
      typeof style !== "string" ||
      typeof ratio !== "string" ||
      typeof text !== "string" ||
      !text.trim() ||
      !Number.isFinite(seconds) ||
      seconds <= 0
    ) {
      return NextResponse.json(
        { error: "Eksik veya hatalı bilgiler var." },
        { status: 400 }
      );
    }

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      return NextResponse.json(
        { error: "Yalnızca görsel veya video yükleyebilirsin." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Dosya 4 MB'dan küçük ve boş olmamalı." },
        { status: 413 }
      );
    }

    const job: JobRequest = {
      templateId,
      style,
      seconds,
      ratio,
      text: text.trim(),
      fileName: file.name,
    };

    // Test aşaması: Dosyayı doğruluyoruz.
    // Henüz depolamıyoruz veya video üretimine göndermiyoruz.
    const result = await getProvider().submit(job);

    return NextResponse.json({
      ...result,
      uploadValidated: true,
      message: "Dosya doğrulandı. Video motoru henüz bağlı değil.",
    });
  } catch {
    return NextResponse.json(
      { error: "Dosya işlenirken bir hata oluştu." },
      { status: 500 }
    );
  }
}
