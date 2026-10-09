
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Play,
} from "lucide-react";
import { templates, effects, durations, ratios } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

type Status = "idle" | "rendering" | "done" | "error";

const MAX_FILE_SIZE = 3 * 1024 * 1024;

function Pills<T extends string | number>({
  items,
  value,
  set,
}: {
  items: readonly T[];
  value: T;
  set: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          onClick={() => set(item)}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            value === item
              ? "border-violet bg-violet/20"
              : "border-white/10 text-white/70"
          }`}
        >
          {item}
          {typeof item === "number" ? "s" : ""}
        </button>
      ))}
    </div>
  );
}

function Creator() {
  const { t, lang } = useI18n();
  const params = useSearchParams();

  const [tplId, setTplId] = useState(
    params.get("template") ?? templates[0].id
  );
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState(effects[0]);
  const [seconds, setSeconds] = useState(10);
  const [ratio, setRatio] = useState("9:16");
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");

  const videoUrlRef = useRef("");
  const renderingRef = useRef(false);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }
    };
  }, []);

  function reset() {
    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
      videoUrlRef.current = "";
    }
    setVideoUrl("");
    setProgress(0);
    setError("");
    setStatus("idle");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (renderingRef.current) return;

    if (!file) {
      setError(t("cr.err.file"));
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "İlk video motorunda yalnızca JPG ve PNG fotoğraf destekleniyor."
      );
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("JPG, PNG veya WebP fotoğraf seç.");
      return;
    }

    if (!text.trim()) {
      setError(t("cr.err.text"));
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Fotoğraf en fazla 3 MB olabilir.");
      return;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setError("Tarayıcın video oluşturmayı desteklemiyor.");
      return;
    }

    const mimeType = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
    ].find((type) => MediaRecorder.isTypeSupported(type));

    if (!mimeType) {
      setError("Tarayıcın WebM video kaydını desteklemiyor.");
      return;
    }

    renderingRef.current = true;
    setError("");
    setProgress(0);
    setStatus("rendering");

    let stream: MediaStream | null = null;
    let frameId = 0;
    let objectUrl = "";

    try {
      const image = new Image();
      objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      await image.decode();

      const canvas = document.createElement("canvas");

      if (ratio === "16:9") {
        canvas.width = 960;
        canvas.height = 540;
      } else if (ratio === "1:1") {
        canvas.width = 720;
        canvas.height = 720;
      } else {
        canvas.width = 540;
        canvas.height = 960;
      }

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Video çizim motoru başlatılamadı.");
      }

      stream = canvas.captureStream(30);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });

      const chunks: BlobPart[] = [];

      const completed = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };

        recorder.onerror = () => {
          reject(new Error("Video kaydı sırasında hata oluştu."));
        };

        recorder.onstop = () => {
          if (chunks.length === 0) {
            reject(new Error("Video kaydı boş oluşturuldu."));
            return;
          }

          resolve(new Blob(chunks, { type: "video/webm" }));
        };
      });

      const duration = Math.max(1, Number(seconds));
      const width = canvas.width;
      const height = canvas.height;
      const caption = text.trim();

      function drawFrame(elapsed: number) {
        if (!ctx) return;

        const p = Math.min(elapsed / (duration * 1000), 1);
        const zoom = 1.05 + p * 0.13;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = "#09090F";
        ctx.fillRect(0, 0, width, height);

        const scale = Math.max(
          width / image.width,
          height / image.height
        ) * zoom;

        const drawW = image.width * scale;
        const drawH = image.height * scale;

        const moveX = Math.sin(p * Math.PI * 2) * width * 0.018;

        ctx.drawImage(
          image,
          (width - drawW) / 2 + moveX,
          (height - drawH) / 2,
          drawW,
          drawH
        );

        const overlay = ctx.createLinearGradient(
          0, 0, 0, height
        );

        overlay.addColorStop(0, "rgba(9,9,15,0.15)");
        overlay.addColorStop(0.55, "rgba(9,9,15,0.12)");
        overlay.addColorStop(1, "rgba(9,9,15,0.85)");

        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          10,
          width * 0.5,
          height * 0.5,
          width * 0.7
        );

        glow.addColorStop(0, "rgba(139,92,246,0.02)");
        glow.addColorStop(1, "rgba(139,92,246,0.25)");

        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        const fadeIn = Math.min(p * 8, 1);
        const fadeOut = Math.min((1 - p) * 8, 1);
        ctx.globalAlpha = Math.max(
          0,
          Math.min(fadeIn, fadeOut)
        );

        const fontSize = Math.round(width * 0.065);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "#8B5CF6";
        ctx.shadowBlur = 22;

        const maxWidth = width * 0.84;
        const words = caption.split(/\s+/);
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const candidate = currentLine
            ? `${currentLine} ${word}`
            : word;

          if (
            ctx.measureText(candidate).width > maxWidth &&
            currentLine
          ) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = candidate;
          }
        }

        if (currentLine) lines.push(currentLine);

        const lineHeight = fontSize * 1.3;
        const startY =
          height * 0.78 -
          ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, index) => {
          ctx.fillText(
            line,
            width / 2,
            startY + index * lineHeight,
            maxWidth
          );
        });

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        ctx.font = `bold ${Math.round(width * 0.023)}px Arial`;
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(
          "HAGY AI CREATIVE STUDIO",
          width / 2,
          height * 0.95
        );
      }

      drawFrame(0);
      recorder.start(250);

      const start = performance.now();

      await new Promise<void>((resolve) => {
        function animate(now: number) {
          const elapsed = Math.min(
            now - start,
            duration * 1000
          );

          drawFrame(elapsed);

          setProgress(
            Math.min(
              99,
              Math.round(
                (elapsed / (duration * 1000)) * 100
              )
            )
          );

          if (elapsed < duration * 1000) {
            frameId = requestAnimationFrame(animate);
          } else {
            resolve();
          }
        }

        frameId = requestAnimationFrame(animate);
      });

      recorder.stop();

      const videoBlob = await completed;
      const url = URL.createObjectURL(videoBlob);

      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }

      videoUrlRef.current = url;
      setVideoUrl(url);
      setProgress(100);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Video oluşturulamadı."
      );
      setStatus("error");
    } finally {
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());

      if (objectUrl) URL.revokeObjectURL(objectUrl);

      renderingRef.current = false;
    }
  }

  if (status === "rendering") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <Loader2 className="mx-auto animate-spin text-violet" />
        <h2 className="mt-4 font-bold">
          HAGY video oluşturuyor...
        </h2>
        <p className="mt-2 text-sm text-white/60">
          İşlem sırasında bu sekmeyi açık tut.
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded bg-white/10">
          <div
            className="h-full bg-violet transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-sm">{progress}%</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="card mx-auto max-w-xl p-6 text-center">
        <CheckCircle2 className="mx-auto text-green-400" />
        <h2 className="mt-3 text-xl font-bold">
          Videon hazır!
        </h2>

        {videoUrl && (
          <video
            src={videoUrl}
            controls
            playsInline
            className="mt-5 w-full rounded-xl"
          />
        )}

        <a
          href={videoUrl}
          download="hagy-video.webm"
          className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
        >
          <Download size={18} />
          Videoyu İndir (WebM)
        </a>

        <button
          type="button"
          className="btn-ghost mt-3 w-full"
          onClick={reset}
        >
          {t("cr.reset")}
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <AlertTriangle className="mx-auto text-pink" />
        <p className="mt-3">{error}</p>
        <button
          type="button"
          className="btn-primary mt-4"
          onClick={reset}
        >
          Tekrar Dene
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card mx-auto max-w-xl space-y-5 p-6"
    >
      <p className="rounded-lg border border-violet/40 bg-violet/10 p-3 text-xs text-white/80">
        Ücretsiz video oluşturma testi — JPG/PNG fotoğraftan
        hareketli video hazırlanır. AI üretimi değildir.
      </p>

      <div>
        <label className="label" htmlFor="f">
          {t("cr.upload")}
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/70 hover:border-violet">
          <Upload size={18} />
          <span className="break-all">
            {file ? file.name : "JPG, PNG, WebP — Maksimum 3 MB"}
          </span>
          <input
            id="f"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError("");
            }}
          />
        </label>
      </div>

      <div>
        <label className="label" htmlFor="t">
          {t("cr.template")}
        </label>
        <select
          id="t"
          className="input"
          value={tplId}
          onChange={(e) => setTplId(e.target.value)}
        >
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name[lang]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <span className="label">{t("cr.style")}</span>
        <Pills items={effects} value={style} set={setStyle} />
      </div>

      <div>
        <span className="label">{t("cr.duration")}</span>
        <Pills
          items={durations}
          value={seconds}
          set={setSeconds}
        />
      </div>

      <div>
        <span className="label">{t("cr.ratio")}</span>
        <Pills items={ratios} value={ratio} set={setRatio} />
      </div>

      <div>
        <label className="label" htmlFor="x">
          {t("cr.text")}
        </label>
        <input
          id="x"
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={40}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-pink">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="btn-primary flex w-full items-center justify-center gap-2"
      >
        <Play size={18} />
        Video Oluştur
      </button>
    </form>
  );
}

export default function Create() {
  const { t } = useI18n();

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">
        {t("cr.title")}
      </h1>
      <Suspense fallback={null}>
        <Creator />
      </Suspense>
    </main>
  );
}
