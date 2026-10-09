import { NextResponse } from "next/server";
import { getProvider, JobRequest } from "@/lib/provider";

export async function POST(req: Request) {
  const b = (await req.json().catch(() => null)) as Partial<JobRequest> | null;
  if (!b || !b.templateId || !b.text?.trim() || !b.fileName) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await getProvider().submit(b as JobRequest);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Provider error" }, { status: 502 });
  }
}
