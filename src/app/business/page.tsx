
"use client";

import Link from "next/link";
import {
  Building2,
  Bot,
  Users,
  BriefcaseBusiness,
  BarChart3,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Yapay Zeka Asistanı",
    description:
      "İşletmenin günlük operasyonlarını, müşteri taleplerini ve iş süreçlerini yapay zeka desteğiyle yönet.",
  },
  {
    icon: Users,
    title: "Müşteri Yönetimi",
    description:
      "Müşterilerini, görüşmelerini ve gelen talepleri tek panel üzerinden takip et.",
  },
  {
    icon: BriefcaseBusiness,
    title: "İş ve Görev Takibi",
    description:
      "Projelerini, görevlerini ve yapılacak işleri düzenli şekilde yönet.",
  },
  {
    icon: BarChart3,
    title: "İşletme Analizleri",
    description:
      "İşletmenin performansını ve faaliyetlerini anlaşılır raporlarla incele.",
  },
  {
    icon: Building2,
    title: "Dijital İşletme Portföyü",
    description:
      "İşletmeni, hizmetlerini ve çalışmalarını profesyonel bir dijital alanda tanıt.",
  },
  {
    icon: ShieldCheck,
    title: "Özel Yönetim Alanı",
    description:
      "İşletmene özel hesabınla yönetim paneline güvenli şekilde eriş.",
  },
];

export default function BusinessPage() {
  return (
    <main className="min-h-screen bg-[#080811] text-white">
      {/* HERO */}
      <section className="relative overflow-hidden px-5 pb-24 pt-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-[650px] -translate-x-1/2 rounded-full bg-violet-700/20 blur-[130px]" />

        <div className="relative mx-auto max-w-6xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300">
            <Sparkles size={15} />
            HAGY AI STUDIO FOR BUSINESS
          </div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
                İşletmeni
                <span className="block bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
                  Yapay Zeka ile
                </span>
                Yönet
              </h1>

              <p className="mt-6 max-w-xl text-base leading-8 text-white/60">
                Müşterilerini, projelerini, günlük işlerini ve
                işletme süreçlerini tek platformda yönet.
                Hagy Business ile dijital dönüşümünü başlat.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/business/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-4 font-semibold transition hover:bg-violet-500"
                >
                  İşletme Hesabı Oluştur
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/business/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-4 font-semibold transition hover:bg-white/10"
                >
                  <LockKeyhole size={18} />
                  Giriş Yap
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap gap-5 text-xs text-white/50">
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-violet-400" />
                  İşletmelere özel
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-violet-400" />
                  Yapay zeka destekli
                </span>

                <span className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-violet-400" />
                  Tek panelden yönetim
                </span>
              </div>
            </div>

            {/* DASHBOARD PREVIEW */}
            <div className="rounded-3xl border border-violet-500/20 bg-[#111121] p-5 shadow-2xl shadow-violet-900/10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-violet-600/20 p-3">
                    <Building2 className="text-violet-400" />
                  </div>

                  <div>
                    <p className="font-bold">Hagy Business</p>
                    <p className="text-xs text-white/40">
                      Yönetim Paneli Önizlemesi
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                  DEMO
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ["Müşteriler", "128"],
                  ["Aktif Projeler", "12"],
                  ["Tamamlanan İşler", "86"],
                  ["Bekleyen Görevler", "7"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="text-xs text-white/40">{label}</p>
                    <p className="mt-2 text-2xl font-bold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                <div className="flex items-center gap-2">
                  <Bot size={21} className="text-violet-400" />
                  <p className="font-semibold">Hagy AI Asistan</p>
                </div>

                <p className="mt-3 text-sm leading-6 text-white/60">
                  Merhaba! İşletmenin günlük faaliyetlerini
                  takip etmene ve görevlerini organize etmene
                  yardımcı olmak için buradayım.
                </p>

                <div className="mt-4 rounded-xl border border-white/10 bg-[#080811] px-4 py-3 text-xs text-white/40">
                  Asistanına bir şey sor...
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-white/30">
                Görsel önizleme • Örnek veriler
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold text-violet-400">
            HAGY BUSINESS
          </p>

          <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
            İşletmen İçin Akıllı Çözümler
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/50">
            İşletme yönetimini kolaylaştırmak için
            geliştirmeyi planladığımız dijital araçlar.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="group rounded-2xl border border-white/10 bg-[#111121] p-6 transition hover:border-violet-500/40 hover:bg-[#16162a]"
            >
              <div className="mb-5 inline-flex rounded-xl bg-violet-500/10 p-3">
                <Icon size={24} className="text-violet-400" />
              </div>

              <h3 className="text-lg font-bold">{title}</h3>

              <p className="mt-3 text-sm leading-7 text-white/50">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-950/50 to-[#111121] p-8 text-center md:p-14">
          <Bot size={38} className="mx-auto text-violet-400" />

          <h2 className="mt-5 text-3xl font-extrabold">
            İşletmenin Geleceğine Hazır Ol
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/60">
            Yapay zeka destekli işletme yönetim sistemimiz
            geliştirme aşamasında.
          </p>

          <Link
            href="/business/register"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold transition hover:bg-violet-500"
          >
            İşletme Hesabı Oluştur
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
