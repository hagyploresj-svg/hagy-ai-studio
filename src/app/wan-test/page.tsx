
"use client";

import { useState, type FormEvent } from "react";

export default function WanTestPage() {
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState(
    "A cinematic warrior slowly walks forward with a majestic lion beside him. Realistic motion, dramatic smoke, epic lighting."
  );
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  async function generate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!image || loading) return;

    setLoading(true);
    setError("");
    setVideoUrl("");

    try {
      const form = new FormData();
      form.append("image", image);
      form.append("prompt", prompt);

      const response = await fetch("/api/wan-generate", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok || !result.videoUrl) {
        throw new Error(
          result.error || "Video uretilemedi."
        );
      }

      setVideoUrl(result.videoUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Bilinmeyen bir hata olustu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090f] px-5 py-14 text-white">
      <div className="mx-auto max-w-2xl space-y-7">
        <div>
          <p className="text-sm text-purple-400">
            HAGY AI CREATIVE STUDIO
          </p>
          <h1 className="mt-2 text-3xl font-bold">
            Wan 2.2 AI Video Test
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Gercek AI video uretimini test ediyoruz.
          </p>
        </div>

        <form
          onSubmit={generate}
          className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Karakter Fotografı
            </label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              required
              onChange={(e) =>
                setImage(e.target.files?.[0] || null)
              }
              className="block w-full text-sm"
            />
            <p className="text-xs text-zinc-400">
              JPG, PNG veya WebP. En fazla 3 MB.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Video Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              required
              className="w-full rounded-xl border border-white/15 bg-black/40 p-3 text-sm outline-none focus:border-purple-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !image || !prompt.trim()}
            className="w-full rounded-xl bg-purple-600 px-5 py-3 font-semibold transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "AI video olusturuluyor, bekle..."
              : "Generate AI Video"}
          </button>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </form>

        {loading && (
          <p className="text-center text-sm text-zinc-400">
            Wan 2.2 modeli islem yapiyor. ZeroGPU sirasi
            veya Vercel zaman siniri nedeniyle islem
            basarisiz olabilir.
          </p>
        )}

        {videoUrl && (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">
              Olusturulan Video
            </h2>
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full rounded-xl"
            />
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block rounded-xl bg-white px-5 py-3 font-semibold text-black"
            >
              Videoyu Ac / Indir
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
