"use client";
import { useI18n } from "@/lib/i18n";
export default function Footer() {
  const { t } = useI18n();
  return <footer className="mt-24 border-t border-white/10 py-8 text-center text-sm text-white/50">{t("foot")}</footer>;
}
