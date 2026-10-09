// Server-side integration layer. Add real providers (AI video API, Python/FFmpeg/Remotion worker) here.
export interface JobRequest { templateId: string; style: string; seconds: number; ratio: string; text: string; fileName: string; }
export interface JobResult { jobId: string; mode: "demo" | "live"; status: "queued" | "completed"; videoUrl: string | null; }
export interface VideoProvider { submit(req: JobRequest): Promise<JobResult>; }

const demo: VideoProvider = {
  async submit() {
    return { jobId: `demo_${Date.now().toString(36)}`, mode: "demo", status: "completed", videoUrl: null };
  },
};

export function getProvider(): VideoProvider {
  switch (process.env.VIDEO_PROVIDER ?? "demo") {
    // case "custom-worker": POST to process.env.EDIT_WORKER_URL (Python analysis -> FFmpeg -> Remotion)
    default: return demo;
  }
}
