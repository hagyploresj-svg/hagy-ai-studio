
"use client";

import {
  Suspense,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Download,
  Play,
  UserRound,
  Clapperboard,
  Gift,
  Megaphone,
  ArrowLeft,
} from "lucide-react";
import {
  templates,
  studios,
  effects,
  durations,
  ratios,
  type Studio,
} from "@/lib/data";
import { useI18n } from "@/lib/i18n";

type Status = "idle" | "rendering" | "done" | "error";

const MAX_FILE_SIZE = 3 * 1024 * 1024;

const studioIcons = {
  character: UserRound,
  cinematic: Clapperboard,
  gift: Gift,
  advertisement: Megaphone,
};

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

type Particle = {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
};

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    x: ((i * 73.7) % 100) / 100,
    y: ((i * 41.3) % 100) / 100,
    size: 1 + ((i * 7) % 4),
    speed: 0.15 + ((i * 13) % 10) / 20,
    phase: i * 1.73,
  }));
}

const particles = makeParticles(85);

function Creator() {
  const { t, lang } = useI18n();
  const params = useSearchParams();

  const requestedTemplate = templates.find(
    (item) => item.id === params.get("template")
  );

  const [studio, setStudio] = useState<Studio | null>(
    requestedTemplate?.studio ?? null
  );
  const [tplId, setTplId] = useState(
    requestedTemplate?.id ?? templates[0].id
  );
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState(effects[0]);
  const [seconds, setSeconds] = useState(10);
  const [ratio, setRatio] = useState("9:16");
  const [captionText, setCaptionText] = useState("");
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

  const filteredTemplates = templates.filter(
    (item) => item.studio === studio
  );

  const activeStudio = studios.find(
    (item) => item.id === studio
  );

  function chooseStudio(id: Studio) {
    const firstTemplate = templates.find(
      (item) => item.studio === id
    );
    setStudio(id);
    setTplId(firstTemplate?.id ?? templates[0].id);
    setError("");
  }

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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (renderingRef.current) return;

    if (!studio) {
      setError("Önce bir stüdyo seç.");
      return;
    }

    if (!file) {
      setError(t("cr.err.file"));
      return;
    }

    if (
      !["image/jpeg", "image/png", "image/webp"].includes(
        file.type
      )
    ) {
      setError("JPG, PNG veya WebP fotoğraf seç.");
      return;
    }

    if (!captionText.trim()) {
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
      setError("Tarayıcın WebM kaydını desteklemiyor.");
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
        throw new Error("Video motoru başlatılamadı.");
      }

      const width = canvas.width;
      const height = canvas.height;
      const duration = Math.max(1, Number(seconds));
      const caption = captionText.trim();
      const selectedStyle = style;

      function drawFrame(elapsed: number) {
        if (!ctx) return;

        const p = Math.min(elapsed / (duration * 1000), 1);
        const time = elapsed / 1000;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = "#09090F";
        ctx.fillRect(0, 0, width, height);

        // Sinematik kamera hareketi
        const zoom =
          selectedStyle === "Minimal"
            ? 1.02 + p * 0.04
            : 1.06 + p * 0.12;

        const scale =
          Math.max(
            width / image.width,
            height / image.height
          ) * zoom;

        const drawW = image.width * scale;
        const drawH = image.height * scale;

        const moveX =
          Math.sin(p * Math.PI * 2) *
          width *
          (selectedStyle === "Minimal" ? 0.006 : 0.02);

        const moveY =
          Math.sin(p * Math.PI) *
          height *
          0.012;

        ctx.save();
        ctx.drawImage(
          image,
          (width - drawW) / 2 + moveX,
          (height - drawH) / 2 + moveY,
          drawW,
          drawH
        );
        ctx.restore();

        // Genel sinematik renk katmanı
        if (selectedStyle !== "Minimal") {
          const shade = ctx.createLinearGradient(
            0,
            0,
            0,
            height
          );
          shade.addColorStop(0, "rgba(0,0,0,0.12)");
          shade.addColorStop(0.55, "rgba(0,0,0,0.08)");
          shade.addColorStop(1, "rgba(0,0,0,0.78)");
          ctx.fillStyle = shade;
          ctx.fillRect(0, 0, width, height);
        }

        // CINEMATIC: hareketli ışık huzmesi
        if (selectedStyle === "Cinematic") {
          const lightX =
            width * (-0.2 + p * 1.4);

          const light = ctx.createLinearGradient(
            lightX - width * 0.35,
            0,
            lightX + width * 0.35,
            height
          );

          light.addColorStop(
            0,
            "rgba(255,255,255,0)"
          );
          light.addColorStop(
            0.5,
            "rgba(255,220,170,0.22)"
          );
          light.addColorStop(
            1,
            "rgba(255,255,255,0)"
          );

          ctx.fillStyle = light;
          ctx.fillRect(0, 0, width, height);

          const vignette = ctx.createRadialGradient(
            width / 2,
            height / 2,
            width * 0.1,
            width / 2,
            height / 2,
            width * 0.8
          );

          vignette.addColorStop(
            0,
            "rgba(0,0,0,0)"
          );
          vignette.addColorStop(
            1,
            "rgba(0,0,0,0.5)"
          );

          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, width, height);
        }

        // NEON: renkli parlama ve ışık çizgileri
        if (selectedStyle === "Neon") {
          const pulse =
            0.16 + Math.sin(time * 5) * 0.07;

          const glow = ctx.createRadialGradient(
            width * 0.5,
            height * 0.5,
            0,
            width * 0.5,
            height * 0.5,
            width * 0.8
          );

          glow.addColorStop(
            0,
            `rgba(168,85,247,${pulse})`
          );
          glow.addColorStop(
            1,
            "rgba(0,200,255,0.04)"
          );

          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, width, height);

          ctx.save();
          ctx.strokeStyle = "#a855f7";
          ctx.shadowColor = "#a855f7";
          ctx.shadowBlur = 25;
          ctx.lineWidth = Math.max(3, width * 0.006);

          const offset =
            Math.sin(time * 2) * width * 0.025;

          ctx.strokeRect(
            width * 0.07 + offset,
            height * 0.055,
            width * 0.86 - offset * 2,
            height * 0.89
          );

          ctx.restore();
        }

        // SMOKE: hareketli yarı saydam sis bulutları
        if (selectedStyle === "Smoke") {
          ctx.save();

          for (let i = 0; i < 13; i++) {
            const x =
              ((i * 0.19 + time * 0.018) % 1.4 -
                0.2) *
              width;

            const y =
              height *
              (0.35 +
                ((i * 0.113) % 0.65) -
                time * 0.008);

            const radius =
              width * (0.18 + (i % 4) * 0.045);

            const fog = ctx.createRadialGradient(
              x,
              y,
              0,
              x,
              y,
              radius
            );

            fog.addColorStop(
              0,
              "rgba(205,195,235,0.11)"
            );
            fog.addColorStop(
              1,
              "rgba(205,195,235,0)"
            );

            ctx.fillStyle = fog;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        // SPARKS: uçuşan kıvılcımlar
        if (selectedStyle === "Sparks") {
          ctx.save();
          ctx.globalCompositeOperation = "screen";

          for (const particle of particles) {
            const x =
              (particle.x +
                Math.sin(time + particle.phase) *
                  0.025) *
              width;

            const y =
              (((particle.y -
                time * particle.speed * 0.12) %
                1) +
                1) %
              1 *
              height;

            const r =
              particle.size * (width / 540);

            ctx.beginPath();
            ctx.fillStyle =
              "rgba(255,190,70,0.9)";
            ctx.shadowColor = "#ff9d00";
            ctx.shadowBlur = 12;
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        }

        // Metin animasyonu
        const fadeIn = Math.min(p * 8, 1);
        const fadeOut = Math.min((1 - p) * 8, 1);

        ctx.save();
        ctx.globalAlpha = Math.max(
          0,
          Math.min(fadeIn, fadeOut)
        );

        const fontSize = Math.round(width * 0.065);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#FFFFFF";

        if (selectedStyle === "Neon") {
          ctx.shadowColor = "#c084fc";
          ctx.shadowBlur = 35;
        } else if (selectedStyle === "Sparks") {
          ctx.shadowColor = "#f59e0b";
          ctx.shadowBlur = 24;
        } else if (selectedStyle !== "Minimal") {
          ctx.shadowColor = "#8B5CF6";
          ctx.shadowBlur = 20;
        }

        const maxWidth = width * 0.84;
        const words = caption.split(/\s+/);
        const lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
          const candidate = currentLine
            ? `${currentLine} ${word}`
            : word;

          if (
            ctx.measureText(candidate).width >
              maxWidth &&
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

        ctx.restore();

        ctx.save();
        ctx.textAlign = "center";
        ctx.font = `bold ${Math.round(
          width * 0.023
        )}px Arial`;
        ctx.fillStyle = "rgba(255,255,255,0.75)";
        ctx.fillText(
          "HAGY AI CREATIVE STUDIO",
          width / 2,
          height * 0.95
        );
        ctx.restore();
      }

      stream = canvas.captureStream(30);

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 2_500_000,
      });

      const chunks: BlobPart[] = [];

      const completed = new Promise<Blob>(
        (resolve, reject) => {
          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          recorder.onerror = () => {
            reject(
              new Error(
                "Video kaydı sırasında hata oluştu."
              )
            );
          };

          recorder.onstop = () => {
            if (chunks.length === 0) {
              reject(
                new Error("Video kaydı boş oluşturuldu.")
              );
              return;
            }

            resolve(
              new Blob(chunks, {
                type: "video/webm",
              })
            );
          };
        }
      );

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

  if (!studio) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold">
            {lang === "tr"
              ? "Stüdyonu Seç"
              : "Choose Your Studio"}
          </h2>
          <p className="mt-2 text-white/60">
            {lang === "tr"
              ? "Ne tür bir video hazırlamak istiyorsun?"
              : "What kind of video would you like to create?"}
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {studios.map((item) => {
            const Icon = studioIcons[item.id];

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => chooseStudio(item.id)}
                className="card group p-7 text-left transition-all hover:border-violet hover:bg-violet/10"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet/20 text-violet">
                  <Icon size={28} />
                </div>
                <h3 className="text-xl font-bold">
                  {item.name[lang]}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/60">
                  {item.desc[lang]}
                </p>
                <span className="mt-5 inline-block text-sm font-semibold text-violet">
                  {lang === "tr"
                    ? "Stüdyoya Gir →"
                    : "Enter Studio →"}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-7 text-center text-xs text-white/50">
          {lang === "tr"
            ? "Stüdyolar şu anda tarayıcı tabanlı efekt motorunu kullanır. Gerçek AI video üretimi henüz aktif değildir."
            : "Studios currently use browser-based effects. Real AI video generation is not active yet."}
        </p>
      </div>
    );
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
    <div className="mx-auto max-w-xl">
      <button
        type="button"
        onClick={() => setStudio(null)}
        className="mb-5 flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft size={16} />
        {lang === "tr"
          ? "Stüdyo Seçimine Dön"
          : "Back to Studios"}
      </button>

      <div className="mb-5 rounded-xl border border-violet/30 bg-violet/10 p-4">
        <h2 className="font-bold">
          {activeStudio?.name[lang]}
        </h2>
        <p className="mt-1 text-xs text-white/60">
          {activeStudio?.desc[lang]}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="card space-y-5 p-6"
      >
        <p className="rounded-lg border border-violet/40 bg-violet/10 p-3 text-xs text-white/80">
          {lang === "tr"
            ? "Sinematik efekt motoru aktif. Fotoğrafına seçtiğin stile göre ışık, sis, neon veya kıvılcım efektleri uygulanır. Gerçek AI karakter animasyonu henüz aktif değildir."
            : "Cinematic effects engine is active. Lighting, fog, neon or sparks are applied to your photo. Real AI character animation is not active yet."}
        </p>

        <div>
          <label className="label" htmlFor="f">
            {t("cr.upload")}
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/70 hover:border-violet">
            <Upload size={18} />
            <span className="break-all">
              {file
                ? file.name
                : "JPG, PNG, WebP — Maksimum 3 MB"}
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
            {filteredTemplates.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name[lang]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="label">{t("cr.style")}</span>
          <Pills
            items={effects}
            value={style}
            set={setStyle}
          />
        </div>

        <div>
          <span className="label">
            {t("cr.duration")}
          </span>
          <Pills
            items={durations}
            value={seconds}
            set={setSeconds}
          />
        </div>

        <div>
          <span className="label">{t("cr.ratio")}</span>
          <Pills
            items={ratios}
            value={ratio}
            set={setRatio}
          />
        </div>

        <div>
          <label className="label" htmlFor="x">
            {t("cr.text")}
          </label>
          <input
            id="x"
            className="input"
            value={captionText}
            onChange={(e) => setCaptionText(e.target.value)}
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
    </div>
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
