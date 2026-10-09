
"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { templates, effects, durations, ratios } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

type Status = "idle" | "uploading" | "done" | "error";

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

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!file) {
      setError(t("cr.err.file"));
      return;
    }

    if (!text.trim()) {
      setError(t("cr.err.text"));
      return;
    }

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      setError("Lütfen geçerli bir görsel veya video seç.");
      return;
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      setError("Dosya boş olmamalı ve en fazla 3 MB olabilir.");
      return;
    }

    setError("");
    setStatus("uploading");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("templateId", tplId);
      formData.append("style", style);
      formData.append("seconds", String(seconds));
      formData.append("ratio", ratio);
      formData.append("text", text.trim());

      const response = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Dosya gönderilemedi."
        );
      }

      if (result.uploadValidated !== true) {
        throw new Error("Dosya doğrulaması tamamlanamadı.");
      }

      setStatus("done");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Beklenmeyen bir hata oluştu."
      );
      setStatus("error");
    }
  }

  if (status === "uploading") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <Loader2 className="mx-auto animate-spin text-violet" />
        <p className="mt-4">
          Dosya sunucuya gönderiliyor...
        </p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="card mx-auto max-w-xl p-8 text-center">
        <CheckCircle2 className="mx-auto text-green-400" />

        <h2 className="mt-3 font-bold">
          Dosya başarıyla doğrulandı!
        </h2>

        <p className="mt-3 text-sm text-white/70">
          Dosya sunucu tarafından kontrol edildi.
          Henüz kaydedilmedi ve video oluşturulmadı.
          Video düzenleme motorunu sonraki aşamada bağlayacağız.
        </p>

        <button
          type="button"
          className="btn-primary mt-4 w-full"
          onClick={() => {
            setStatus("idle");
            setError("");
          }}
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

        <p className="mt-3">
          {error || t("cr.fail")}
        </p>

        <button
          type="button"
          className="btn-primary mt-4"
          onClick={() => {
            setStatus("idle");
            setError("");
          }}
        >
          {t("cr.reset")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="card mx-auto max-w-xl space-y-5 p-6"
    >
      <p className="rounded-lg border border-action/40 bg-action/10 p-3 text-xs text-action">
        Ücretsiz test modu — gerçek AI video üretimi henüz aktif değil.
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
              : "PNG, JPG, MP4 — Maksimum 3 MB"}
          </span>

          <input
            id="f"
            type="file"
            accept="image/*,video/*"
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
        <span className="label">
          {t("cr.style")}
        </span>

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
        <span className="label">
          {t("cr.ratio")}
        </span>

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
        className="btn-primary w-full"
      >
        {t("cr.submit")}
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
