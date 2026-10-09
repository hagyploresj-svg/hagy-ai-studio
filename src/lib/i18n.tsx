"use client";
import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "tr";
const dict: Record<Lang, Record<string, string>> = {
  en: {
    "nav.templates": "Templates", "nav.create": "Create", "nav.pricing": "Pricing",
    "hero.title1": "Imagine It.", "hero.title2": "Create It.",
    "hero.sub": "Turn your images and clips into cinematic videos with AI-powered templates for creators, streamers and brands.",
    "cta.start": "Start Creating", "cta.explore": "Explore Templates",
    "studios.creator": "Creator Studio", "studios.brand": "Brand Studio",
    "studios.creator.items": "Gaming character entrances|TikTok gift edits|Esports team intros|Streamer branding|Gaming highlights",
    "studios.brand.items": "Product commercials|Cinematic product reveals|Social media ads|Luxury product animations|AI marketing videos",
    "tpl.title": "Template Marketplace", "tpl.search": "Search templates…", "tpl.all": "All",
    "tpl.empty": "No templates match your search.", "tpl.use": "Use this template", "tpl.back": "Back to templates",
    "cat.gaming": "Gaming", "cat.tiktok": "TikTok", "cat.esports": "Esports", "cat.streamer": "Streamer", "cat.product": "Product", "cat.social": "Social ads",
    "cr.title": "AI Video Creator", "cr.upload": "Upload image or video", "cr.template": "Template",
    "cr.style": "Animation style", "cr.duration": "Duration", "cr.ratio": "Aspect ratio", "cr.text": "Text / character name",
    "cr.submit": "Submit demo request", "cr.err.file": "Please upload an image or video.", "cr.err.text": "Please enter text or a name.",
    "cr.processing": "Processing demo job…", "cr.done": "Demo request completed", "cr.fail": "Something went wrong.",
    "cr.demo": "DEMO MODE — no real AI video was generated. Connect a provider on the server to enable generation.",
    "cr.download": "Download (available after real generation)", "cr.reset": "New request",
    "price.title": "Credit-based pricing", "price.note": "PLACEHOLDER — prices and credit amounts are not configured yet. No payments are processed.",
    "price.tbd": "Price TBD", "foot": "HAGY AI Creative Studio — MVP prototype. Demo content only.",
  },
  tr: {
    "nav.templates": "Şablonlar", "nav.create": "Oluştur", "nav.pricing": "Fiyatlandırma",
    "hero.title1": "Hayal Et.", "hero.title2": "Yarat.",
    "hero.sub": "Görsel ve videolarını; içerik üreticileri, yayıncılar ve markalar için yapay zekâ destekli şablonlarla sinematik videolara dönüştür.",
    "cta.start": "Oluşturmaya Başla", "cta.explore": "Şablonları Keşfet",
    "studios.creator": "Creator Stüdyo", "studios.brand": "Marka Stüdyosu",
    "studios.creator.items": "Oyun karakteri girişleri|TikTok hediye edit'leri|E-spor takım tanıtımları|Yayıncı markalama|Oyun öne çıkanları",
    "studios.brand.items": "Ürün reklamları|Sinematik ürün tanıtımları|Sosyal medya reklamları|Lüks ürün animasyonları|Yapay zekâ pazarlama videoları",
    "tpl.title": "Şablon Pazaryeri", "tpl.search": "Şablon ara…", "tpl.all": "Tümü",
    "tpl.empty": "Aramanızla eşleşen şablon yok.", "tpl.use": "Bu şablonu kullan", "tpl.back": "Şablonlara dön",
    "cat.gaming": "Oyun", "cat.tiktok": "TikTok", "cat.esports": "E-spor", "cat.streamer": "Yayıncı", "cat.product": "Ürün", "cat.social": "Sosyal reklam",
    "cr.title": "Yapay Zekâ Video Oluşturucu", "cr.upload": "Görsel veya video yükle", "cr.template": "Şablon",
    "cr.style": "Animasyon stili", "cr.duration": "Süre", "cr.ratio": "En-boy oranı", "cr.text": "Metin / karakter adı",
    "cr.submit": "Demo talebi gönder", "cr.err.file": "Lütfen bir görsel veya video yükleyin.", "cr.err.text": "Lütfen bir metin veya ad girin.",
    "cr.processing": "Demo işlem yürütülüyor…", "cr.done": "Demo talebi tamamlandı", "cr.fail": "Bir şeyler ters gitti.",
    "cr.demo": "DEMO MODU — gerçek bir yapay zekâ videosu üretilmedi. Üretim için sunucuda bir sağlayıcı bağlayın.",
    "cr.download": "İndir (gerçek üretimden sonra aktif olur)", "cr.reset": "Yeni talep",
    "price.title": "Kredi tabanlı fiyatlandırma", "price.note": "YER TUTUCU — fiyatlar ve kredi miktarları henüz belirlenmedi. Ödeme alınmaz.",
    "price.tbd": "Fiyat belirlenecek", "foot": "HAGY AI Creative Studio — MVP prototipi. Yalnızca demo içerik.",
  },
};

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: string) => string }>(null as never);
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  const t = (k: string) => dict[lang][k] ?? dict.en[k] ?? k;
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useI18n = () => useContext(Ctx);
