"use client";
import Link from "next/link";
import { Play } from "lucide-react";
import { Template } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

export function Preview({ tpl, className = "h-44" }: { tpl: Template; className?: string }) {
  return (
    <div className={`relative grid place-items-center overflow-hidden rounded-xl ${className}`} style={{ background: `linear-gradient(135deg, ${tpl.from}, ${tpl.to})` }}>
      <span className="grid h-12 w-12 place-items-center rounded-full bg-black/40 backdrop-blur"><Play size={20} /></span>
      <span className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-0.5 text-xs">{tpl.seconds}s · placeholder</span>
    </div>
  );
}
export default function TemplateCard({ tpl }: { tpl: Template }) {
  const { lang, t } = useI18n();
  return (
    <Link href={`/templates/${tpl.id}`} className="card block p-3 transition hover:border-violet/60">
      <Preview tpl={tpl} />
      <div className="px-1 pb-1 pt-3">
        <span className="text-xs text-violet">{t(`cat.${tpl.category}`)}</span>
        <h3 className="font-semibold">{tpl.name[lang]}</h3>
        <p className="mt-1 text-sm text-white/60">{tpl.desc[lang]}</p>
      </div>
    </Link>
  );
}
