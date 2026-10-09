"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Loader2, CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { templates, effects, durations, ratios } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

type Status = "idle" | "submitting" | "processing" | "done" | "error";

function Pills<T extends string | number>({ items, value, set }: { items: T[]; value: T; set: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2">{items.map((i) => (
      <button type="button" key={i} onClick={() => set(i)} className={`rounded-full border px-4 py-1.5 text-sm ${value === i ? "border-violet bg-violet/20" : "border-white/10 text-white/70"}`}>{i}{typeof i === "number" ? "s" : ""}</button>))}</div>
  );
}

function Creator() {
  const { t, lang } = useI18n();
  const params = useSearchParams();
  const [tplId, setTplId] = useState(params.get("template") ?? templates[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [style, setStyle] = useState(effects[0]);
  const [seconds, setSeconds] = useState(10);
  const [ratio, setRatio] = useState("9:16");
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status !== "processing") return;
    const i = setInterval(() => setProgress((p) => Math.min(p + 10, 100)), 300);
    return () => clearInterval(i);
  }, [status]);
  useEffect(() => { if (status === "processing" && progress >= 100) setStatus("done"); }, [progress, status]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return setErr(t("cr.err.file"));
    if (!text.trim()) return setErr(t("cr.err.text"));
    setErr(""); setStatus("submitting"); setProgress(0);
    try {
      const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: tplId, style, seconds, ratio, text, fileName: file.name }) });
      if (!res.ok) throw new Error();
      setStatus("processing");
    } catch { setStatus("error"); }
  }

  if (status === "submitting" || status === "processing") return (
    <div className="card mx-auto max-w-xl p-8 text-center"><Loader2 className="mx-auto animate-spin text-violet" />
      <p className="mt-4">{t("cr.processing")}</p>
      <div className="mt-4 h-2 overflow-hidden rounded bg-white/10"><div className="h-full bg-gradient-to-r from-violet to-pink transition-all" style={{ width: `${progress}%` }} /></div></div>);
  if (status === "done") return (
    <div className="card mx-auto max-w-xl p-8 text-center"><CheckCircle2 className="mx-auto text-green-400" />
      <h2 className="mt-3 font-bold">{t("cr.done")}</h2>
      <p className="mt-3 rounded-lg border border-action/40 bg-action/10 p-3 text-sm text-action">{t("cr.demo")}</p>
      <button disabled className="btn-ghost mt-4 w-full"><Download size={16} />{t("cr.download")}</button>
      <button className="btn-primary mt-3 w-full" onClick={() => setStatus("idle")}>{t("cr.reset")}</button></div>);
  if (status === "error") return (
    <div className="card mx-auto max-w-xl p-8 text-center"><AlertTriangle className="mx-auto text-pink" />
      <p className="mt-3">{t("cr.fail")}</p><button className="btn-primary mt-4" onClick={() => setStatus("idle")}>{t("cr.reset")}</button></div>);

  return (
    <form onSubmit={submit} className="card mx-auto max-w-xl space-y-5 p-6">
      <p className="rounded-lg border border-action/40 bg-action/10 p-3 text-xs text-action">{t("cr.demo")}</p>
      <div><label className="label" htmlFor="f">{t("cr.upload")}</label>
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/70 hover:border-violet">
          <Upload size={18} />{file ? file.name : "PNG, JPG, MP4…"}
          <input id="f" type="file" accept="image/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label></div>
      <div><label className="label" htmlFor="t">{t("cr.template")}</label>
        <select id="t" className="input" value={tplId} onChange={(e) => setTplId(e.target.value)}>{templates.map((x) => <option key={x.id} value={x.id}>{x.name[lang]}</option>)}</select></div>
      <div><span className="label">{t("cr.style")}</span><Pills items={effects} value={style} set={setStyle} /></div>
      <div><span className="label">{t("cr.duration")}</span><Pills items={durations} value={seconds} set={setSeconds} /></div>
      <div><span className="label">{t("cr.ratio")}</span><Pills items={ratios} value={ratio} set={setRatio} /></div>
      <div><label className="label" htmlFor="x">{t("cr.text")}</label><input id="x" className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={40} /></div>
      {err && <p role="alert" className="text-sm text-pink">{err}</p>}
      <button className="btn-primary w-full">{t("cr.submit")}</button>
    </form>
  );
}

export default function Create() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-8 text-center text-3xl font-bold">{t("cr.title")}</h1>
      <Suspense fallback={null}><Creator /></Suspense>
    </main>
  );
}
