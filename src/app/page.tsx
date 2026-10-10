
"use client";

import Link from "next/link";
import { motion } from "framer-motion";

import {
  Gamepad2,
  Building2,
  Check,
  Clapperboard,
  Music2,
  Volume2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { templates } from "@/lib/data";
import TemplateCard from "@/components/TemplateCard";

const studios = [
  {
    k: "studios.creator",
    Icon: Gamepad2,
    color: "text-violet",
  },
  {
    k: "studios.brand",
    Icon: Building2,
    color: "text-electric",
  },
];

export default function Home() {
  const { t, lang } = useI18n();

  return (
    <main>
      {/* HERO */}
      <section className="relative overflow-hidden px-4 pb-20 pt-24 text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-violet/30 blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative mx-auto max-w-3xl"
        >
          <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
            {t("hero.title1")}{" "}
            <span className="bg-gradient-to-r from-violet via-pink to-electric bg-clip-text text-transparent">
              {t("hero.title2")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-white/70">
            {t("hero.sub")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/create" className="btn-primary">
              {t("cta.start")}
            </Link>

            <Link href="/templates" className="btn-ghost">
              {t("cta.explore")}
            </Link>

            <Link
              href="/edit"
              className="btn-ghost flex items-center justify-center gap-2"
            >
              <Clapperboard size={18} />
              {lang === "tr"
                ? "Video Editörü"
                : "Video Editor"}
            </Link>
          </div>
        </motion.div>
      </section>

      {/* EXISTING STUDIO CARDS */}
      <section className="mx-auto grid max-w-6xl gap-4 px-4 md:grid-cols-2">
        {studios.map(({ k, Icon, color }) => (
          <div key={k} className="card p-6">
            <Icon className={color} />

            <h2 className="mt-3 text-xl font-bold">
              {t(k)}
            </h2>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {t(`${k}.items`)
                .split("|")
                .map((item) => (
                  <li
                    key={item}
                    className="flex gap-2"
                  >
                    <Check
                      size={16}
                      className="mt-0.5 shrink-0 text-pink"
                    />
                    {item}
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </section>

      {/* NEW EDIT STUDIO SECTION */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <div className="relative overflow-hidden rounded-3xl border border-violet/30 bg-gradient-to-br from-violet/20 via-[#151525] to-[#090912] p-6 md:p-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet/20 blur-[90px]" />

          <div className="relative grid items-center gap-10 md:grid-cols-2">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/10 px-4 py-2 text-xs font-semibold text-violet">
                <Sparkles size={15} />
                HAGY EDIT STUDIO
              </div>

              <h2 className="text-3xl font-extrabold leading-tight md:text-4xl">
                {lang === "tr"
                  ? "Videolarını Kendi Tarzında Düzenle"
                  : "Edit Videos Your Way"}
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-white/60">
                {lang === "tr"
                  ? "Videonu yükle, ses efektleri ekle, zamanlamayı ayarla ve kendi sinematik editlerini hazırlamaya başla."
                  : "Upload your video, add sound effects, adjust timing and start creating your own cinematic edits."}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  <Clapperboard size={15} />
                  Video Timeline
                </span>

                <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  <Volume2 size={15} />
                  Sound Effects
                </span>

                <span className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                  <Music2 size={15} />
                  Audio Controls
                </span>
              </div>

              <Link
                href="/edit"
                className="btn-primary mt-8 inline-flex items-center justify-center gap-2"
              >
                {lang === "tr"
                  ? "Video Editörünü Aç"
                  : "Open Video Editor"}

                <ArrowRight size={18} />
              </Link>
            </div>

            {/* EDITOR PREVIEW */}
            <div className="rounded-2xl border border-white/10 bg-[#0B0B14] p-4 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-400" />

                <span className="ml-3 text-xs text-white/40">
                  HAGY Edit Studio
                </span>
              </div>

              <div className="flex aspect-video items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet/20 via-[#151525] to-black">
                <div className="text-center">
                  <Clapperboard
                    size={44}
                    className="mx-auto text-violet"
                  />

                  <p className="mt-3 text-sm font-semibold text-white/80">
                    Video Preview
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    00:00 / 00:05
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Clapperboard
                    size={16}
                    className="shrink-0 text-white/50"
                  />

                  <div className="flex h-10 flex-1 items-center rounded-lg bg-violet/50 px-3 text-xs">
                    Video.mp4
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Volume2
                    size={16}
                    className="shrink-0 text-white/50"
                  />

                  <div className="relative h-10 flex-1 rounded-lg border border-white/10 bg-white/5">
                    <div className="absolute left-[35%] top-1 flex h-8 w-[40%] items-center rounded-md bg-emerald-600/80 px-2 text-xs">
                      Sound FX
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Music2
                    size={16}
                    className="shrink-0 text-white/50"
                  />

                  <div className="flex h-10 flex-1 items-center rounded-lg bg-white/10 px-3 text-xs text-white/50">
                    Audio Track
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-white/30">
                HAGY Creative Tools
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TEMPLATES */}
      <section className="mx-auto mt-20 max-w-6xl px-4">
        <h2 className="mb-6 text-2xl font-bold">
          {t("tpl.title")}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.slice(0, 3).map((item) => (
            <TemplateCard
              key={item.id}
              tpl={item}
            />
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        className="mx-auto mt-20 max-w-6xl px-4"
      >
        <h2 className="text-2xl font-bold">
          {t("price.title")}
        </h2>

        <p className="mt-2 rounded-lg border border-action/40 bg-action/10 p-3 text-sm text-action">
          {t("price.note")}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Starter", "Creator", "Agency"].map(
            (name) => (
              <div
                key={name}
                className="card p-6"
              >
                <h3 className="font-bold">
                  {name}
                </h3>

                <p className="mt-4 text-2xl text-white/50">
                  {t("price.tbd")}
                </p>

                <button
                  disabled
                  className="btn-ghost mt-6 w-full"
                >
                  Placeholder
                </button>
              </div>
            )
          )}
        </div>
      </section>
    </main>
  );
}
