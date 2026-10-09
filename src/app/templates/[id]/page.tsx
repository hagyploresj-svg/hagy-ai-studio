"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { templates, effects } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { Preview } from "@/components/TemplateCard";

export default function Detail() {
  const { id } = useParams<{ id: string }>();
  const { t, lang } = useI18n();
  const tpl = templates.find((x) => x.id === id);
  if (!tpl) return <main className="px-4 py-24 text-center"><Link href="/templates" className="btn-ghost">{t("tpl.back")}</Link></main>;
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <Link href="/templates" className="text-sm text-white/60 hover:text-white">← {t("tpl.back")}</Link>
      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <Preview tpl={tpl} className="h-72" />
        <div>
          <span className="text-sm text-violet">{t(`cat.${tpl.category}`)}</span>
          <h1 className="text-3xl font-bold">{tpl.name[lang]}</h1>
          <p className="mt-3 text-white/70">{tpl.desc[lang]}</p>
          <p className="mt-4 text-sm text-white/50">{t("cr.duration")}: {tpl.seconds}s</p>
          <div className="mt-4 flex flex-wrap gap-2">{effects.map((e) => <span key={e} className="rounded-full border border-white/10 px-3 py-1 text-xs">{e}</span>)}</div>
          <Link href={`/create?template=${tpl.id}`} className="btn-primary mt-8">{t("tpl.use")}</Link>
        </div>
      </div>
    </main>
  );
}
