
"use client";

import { useState, type FormEvent } from "react";

export default function WanTestPage() {
  const [image, setImage] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState(3);
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");

  async function generateVideo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!image || !prompt.trim()) {
      setError("Lütfen fotoğraf ve prompt gir.");
      return;
    }

    setLoading(true);
    setError("");
    setVideoUrl("");

    try {
      const form = new FormData();
      form.append("image", image);
      form.append("prompt", prompt);
      form.append("duration", String(duration));

      const response = await fetch("/api/wan-generate", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (!response.ok || !data.success || !data.videoUrl) {
        throw new Error(
          data.error || "Video oluşturulamadı."
        );
      }

      setVideoUrl(data.videoUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Beklenmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090f",
        color: "white",
        padding: "50px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 650, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>
          HAGY AI Video Studio
        </h1>

        <p style={{ color: "#aaa", marginBottom: 30 }}>
          Wan 2.2 Lightning — AI Video Generation
        </p>

        <form
          onSubmit={generateVideo}
          style={{ display: "grid", gap: 22 }}
        >
          <div>
            <label
              htmlFor="character-image"
              style={{ display: "block", marginBottom: 10 }}
            >
              Karakter Fotoğrafı
            </label>

            <input
              id="character-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) =>
                setImage(e.target.files?.[0] || null)
              }
              style={{ width: "100%" }}
            />

            <p style={{ color: "#888", fontSize: 13 }}>
              JPG, PNG veya WebP. En fazla 3 MB.
            </p>
          </div>

          <div>
            <label
              htmlFor="video-prompt"
              style={{ display: "block", marginBottom: 10 }}
            >
              Video Prompt
            </label>

            <textarea
              id="video-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the cinematic video..."
              rows={5}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #444",
                background: "#171720",
                color: "white",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label
              htmlFor="video-duration"
              style={{ display: "block", marginBottom: 10 }}
            >
              Video Süresi
            </label>

            <select
              id="video-duration"
              value={duration}
              onChange={(e) =>
                setDuration(Number(e.target.value))
              }
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #444",
                background: "#171720",
                color: "white",
              }}
            >
              <option value={3}>3 saniye — Hızlı Test</option>
              <option value={5}>5 saniye — Kısa Video</option>
              <option value={8}>8 saniye — Sinematik</option>
              <option value={10}>10 saniye — Uzun Video</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: 16,
              background: loading ? "#555" : "#793cff",
              color: "white",
              border: "none",
              borderRadius: 12,
              fontSize: 17,
              fontWeight: "bold",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading
              ? "AI Video Oluşturuluyor..."
              : "Generate AI Video"}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            style={{ color: "#ff7777", marginTop: 24 }}
          >
            {error}
          </p>
        )}

        {videoUrl && (
          <section style={{ marginTop: 35 }}>
            <h2>Oluşturulan Video</h2>

            <video
              src={videoUrl}
              controls
              playsInline
              style={{
                width: "100%",
                borderRadius: 12,
                marginTop: 15,
              }}
            />

            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: 20,
                padding: "12px 20px",
                background: "#793cff",
                color: "white",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Videoyu Aç / İndir
            </a>
          </section>
        )}
      </div>
    </main>
  );
}
