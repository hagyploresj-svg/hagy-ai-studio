"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { categories, templates, Category } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import TemplateCard from "@/components/TemplateCard";

export default function Templates() {
  const { t, lang } = useI18n();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const list = useMemo(() => templates.filter((x) =>
    (cat === "all" || x.category === cat) &&
    (x.name[lang] + x.desc[lang]).toLowerCase().includes(q.toLowerCase())), [q, cat, lang]);
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t("tpl.title")}</h1>
      <div className="relative mt-6"><Search size={16} className="absolute left-4 top-3.5 text-white/40" />
        <input className="input !pl-10" placeholder={t("tpl.search")} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t("tpl.search")} /></div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", ...categories] as const).map((c) => (
          <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-4 py-1.5 text-sm ${cat === c ? "border-violet bg-violet/20" : "border-white/10 text-white/70"}`}>
            {c === "all" ? t("tpl.all") : t(`cat.${c}`)}</button>
        ))}
      </div>
      {list.length === 0 ? <p className="mt-16 text-center text-white/50">{t("tpl.empty")}</p> :
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((x) => <TemplateCard key={x.id} tpl={x} />)}</div>}
    </main>
  );
}
