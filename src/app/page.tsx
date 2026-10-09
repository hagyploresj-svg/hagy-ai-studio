"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Gamepad2, Building2, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { templates } from "@/lib/data";
import TemplateCard from "@/components/TemplateCard";

const studios = [
  { k: "studios.creator", Icon: Gamepad2, color: "text-violet" },
  { k: "studios.brand", Icon: Building2, color: "text-electric" },
];

export default function Home() {
  const { t } = useI18n();
  return (
    <main>
      <section className="relative overflow-hidden px-4 pb-20 pt-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-violet/30 blur-[120px]" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative mx-auto max-w-3xl">
          <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
            {t("hero.title1")} <span className="bg-gradient-to-r from-violet via-pink to-electric bg-clip-text text-transparent">{t("hero.title2")}</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-white/70">{t("hero.sub")}</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/create" className="btn-primary">{t("cta.start")}</Link>
            <Link href="/templates" className="btn-ghost">{t("cta.explore")}</Link>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        {studios.map(({ k, Icon, color }) => (
          <div key={k} className="card p-6">
            <Icon className={color} />
            <h2 className="mt-3 text-xl font-bold">{t(k)}</h2>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {t(`${k}.items`).split("|").map((i) => <li key={i} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-pink" />{i}</li>)}
            </ul>
          </div>
        ))}
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="mb-6 text-2xl font-bold">{t("tpl.title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{templates.slice(0, 3).map((x) => <TemplateCard key={x.id} tpl={x} />)}</div>
      </section>

      <section id="pricing" className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="text-2xl font-bold">{t("price.title")}</h2>
        <p className="mt-2 rounded-lg border border-action/40 bg-action/10 p-3 text-sm text-action">{t("price.note")}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Starter", "Creator", "Agency"].map((n) => (
            <div key={n} className="card p-6">
              <h3 className="font-bold">{n}</h3>
              <p className="mt-4 text-2xl text-white/50">{t("price.tbd")}</p>
              <button disabled className="btn-ghost mt-6 w-full">Placeholder</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
