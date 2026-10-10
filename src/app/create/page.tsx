
"use client";

import {
  Suspense,
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
  type Studio,
} from "@/lib/data";

import { useI18n } from "@/lib/i18n";

type Status = "idle" | "rendering" | "done" | "error";

const MAX_FILE_SIZE = 3 * 1024 * 1024;

const VIDEO_DURATIONS = [3, 5] as const;

const studioIcons = {
  character: UserRound,
  cinematic: Clapperboard,
  gift: Gift,
  advertisement: Megaphone,
};

function normalizeDuration(seconds: number): number {
  return seconds === 3 ? 3 : 5;
}

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
    requestedTemplate?.id ?? templates[0]?.id ?? ""
  );

  const [file, setFile] = useState<File | null>(null);

  const [seconds, setSeconds] = useState(
    normalizeDuration(requestedTemplate?.seconds ?? 3)
  );

  const [prompt, setPrompt] = useState(
    requestedTemplate?.prompt ?? ""
  );

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const renderingRef = useRef(false);

  const filteredTemplates = templates.filter(
    (item) => item.studio === studio
  );

  const activeStudio = studios.find(
    (item) => item.id === studio
  );

  const activeTemplate = templates.find(
    (item) => item.id === tplId
  );

  function chooseStudio(id: Studio) {
    const firstTemplate = templates.find(
      (item) => item.studio === id
    );

    setStudio(id);
    setTplId(firstTemplate?.id ?? "");
    setPrompt(firstTemplate?.prompt ?? "");
    setSeconds(
      normalizeDuration(firstTemplate?.seconds ?? 3)
    );

    setFile(null);
    setVideoUrl("");
    setError("");
    setStatus("idle");
  }

  function chooseTemplate(id: string) {
    const selectedTemplate = templates.find(
      (item) => item.id === id && item.studio === studio
    );

    if (!selectedTemplate) return;

    setTplId(selectedTemplate.id);
    setPrompt(selectedTemplate.prompt);
    setSeconds(
      normalizeDuration(selectedTemplate.seconds)
    );
    setError("");
  }

  function reset() {
    setVideoUrl("");
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
      setError("Lütfen bir fotoğraf yükle.");
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

    if (
      file.size === 0 ||
      file.size > MAX_FILE_SIZE
    ) {
      setError("Fotoğraf en fazla 3 MB olabilir.");
      return;
    }

    if (!prompt.trim()) {
      setError("Lütfen video promptu yaz.");
      return;
    }

    if (seconds !== 3 && seconds !== 5) {
      setError("Video süresi 3 veya 5 saniye olmalı.");
      return;
    }

    renderingRef.current = true;
    setStatus("rendering");
    setError("");
    setVideoUrl("");

    try {
      const form = new FormData();

      form.append("image", file);
      form.append("prompt", prompt.trim());
      form.append("duration", String(seconds));

      const response = await fetch("/api/wan-generate", {
        method: "POST",
        body: form,
      });

      const data = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.videoUrl
      ) {
        throw new Error(
          data.error || "AI video oluşturulamadı."
        );
      }

      setVideoUrl(data.videoUrl);
      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Video oluşturulurken bir hata oluştu."
      );

      setStatus("error");
    } finally {
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
              ? "Ne tür bir AI video hazırlamak istiyorsun?"
              : "What kind of AI video would you like to create?"}
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
          Wan 2.2 Lightning AI Video Engine • 3–5s
        </p>
      </div>
    );
  }

  if (status === "rendering") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <Loader2
          size={36}
          className="mx-auto animate-spin text-violet"
        />

        <h2 className="mt-4 text-xl font-bold">
          AI Video Oluşturuluyor...
        </h2>

        <p className="mt-3 text-sm text-white/60">
          Wan 2.2 görüntünü işliyor.
          Lütfen bu sekmeyi açık tut.
        </p>

        <p className="mt-5 text-sm text-violet">
          Seçilen süre: {seconds} saniye
        </p>

        <p className="mt-2 text-xs text-white/50">
          Ücretsiz AI sunucusunda işlem süresi değişebilir.
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="card mx-auto max-w-xl p-6 text-center">
        <CheckCircle2
          size={36}
          className="mx-auto text-green-400"
        />

        <h2 className="mt-3 text-xl font-bold">
          AI Videon Hazır!
        </h2>

        <p className="mt-2 text-sm text-white/60">
          Wan 2.2 Lightning • {seconds} saniye seçildi
        </p>

        {videoUrl && (
          <>
            <video
              src={videoUrl}
              controls
              playsInline
              className="mt-5 w-full rounded-xl"
            />

            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary mt-5 flex w-full items-center justify-center gap-2"
            >
              <Download size={18} />
              Videoyu Aç / İndir
            </a>
          </>
        )}

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
        <AlertTriangle
          size={36}
          className="mx-auto text-pink"
        />

        <h2 className="mt-3 text-lg font-bold">
          Video Oluşturulamadı
        </h2>

        <p className="mt-3 break-words text-sm text-white/70">
          {error}
        </p>

        <button
          type="button"
          className="btn-primary mt-5"
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
        onClick={() => {
          reset();
          setStudio(null);
        }}
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
          Gerçek AI video motoru: Wan 2.2 Lightning.
          Hazır şablon seç veya kendi promptunu yaz.
        </p>

        <div>
          <label className="label" htmlFor="ai-image">
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
              id="ai-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
              }}
            />
          </label>

          {file && (
            <p className="mt-2 text-xs text-green-400">
              Fotoğraf seçildi: {file.name}
            </p>
          )}
        </div>

        <div>
          <label
            className="label"
            htmlFor="ai-template"
          >
            {t("cr.template")}
          </label>

          <select
            id="ai-template"
            className="input"
            value={tplId}
            onChange={(e) =>
              chooseTemplate(e.target.value)
            }
          >
            {filteredTemplates.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name[lang]}
              </option>
            ))}
          </select>

          {activeTemplate && (
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-violet">
                {activeTemplate.name[lang]}
              </p>

              <p className="mt-1 text-xs leading-5 text-white/60">
                {activeTemplate.desc[lang]}
              </p>

              <p className="mt-2 text-xs text-green-400">
                AI prompt otomatik yüklendi.
              </p>
            </div>
          )}
        </div>

        <div>
          <label
            className="label"
            htmlFor="ai-prompt"
          >
            Video Prompt
          </label>

          <textarea
            id="ai-prompt"
            className="input min-h-36 w-full resize-y"
            value={prompt}
            onChange={(e) =>
              setPrompt(e.target.value)
            }
            placeholder="Describe the motion, lighting and camera movement..."
            maxLength={2000}
            required
          />

          <p className="mt-2 text-xs text-white/50">
            Şablonun hazır promptu otomatik gelir.
            İstersen karakteri, hareketleri ve
            atmosferi kendine göre değiştirebilirsin.
          </p>

          {activeTemplate && (
            <button
              type="button"
              onClick={() =>
                setPrompt(activeTemplate.prompt)
              }
              className="mt-3 text-xs font-semibold text-violet hover:text-white"
            >
              Şablon Promptunu Geri Yükle
            </button>
          )}
        </div>

        <div>
          <span className="label">
            {t("cr.duration")}
          </span>

          <div className="flex flex-wrap gap-2">
            {VIDEO_DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() =>
                  setSeconds(duration)
                }
                className={`rounded-full border px-5 py-2 text-sm ${
                  seconds === duration
                    ? "border-violet bg-violet/20 text-white"
                    : "border-white/10 text-white/70"
                }`}
              >
                {duration} saniye
              </button>
            ))}
          </div>

          <p className="mt-2 text-xs text-white/50">
            3 ve 5 saniyelik AI video üretimi.
            Daha uzun süreler şimdilik devre dışı.
          </p>
        </div>

        {error && (
          <p
            role="alert"
            className="text-sm text-pink"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <Play size={18} />
          Generate AI Video
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
