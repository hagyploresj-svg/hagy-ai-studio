"use client";
import Link from "next/link";
import { useState } from "react";
import { Menu, X, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Navbar() {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const links = [["/templates", t("nav.templates")], ["/create", t("nav.create")], ["/#pricing", t("nav.pricing")]];
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-widest">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet to-pink"><Sparkles size={16} /></span>HAGY
        </Link>
        <nav className="hidden items-center gap-6 text-sm md:flex">
          {links.map(([h, l]) => <Link key={h} href={h} className="text-white/70 hover:text-white">{l}</Link>)}
          <button className="btn-ghost !px-3 !py-1.5" onClick={() => setLang(lang === "en" ? "tr" : "en")} aria-label="Switch language">{lang === "en" ? "TR" : "EN"}</button>
        </nav>
        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 border-t border-white/10 px-4 py-4 md:hidden">
          {links.map(([h, l]) => <Link key={h} href={h} onClick={() => setOpen(false)}>{l}</Link>)}
          <button className="btn-ghost" onClick={() => setLang(lang === "en" ? "tr" : "en")}>{lang === "en" ? "Türkçe" : "English"}</button>
        </div>
      )}
    </header>
  );
}
