
export type Category =
  | "gaming"
  | "tiktok"
  | "esports"
  | "streamer"
  | "product"
  | "social";

export type Studio =
  | "character"
  | "cinematic"
  | "gift"
  | "advertisement";

export interface StudioInfo {
  id: Studio;
  name: { en: string; tr: string };
  desc: { en: string; tr: string };
  icon: string;
}

export interface Template {
  id: string;
  category: Category;
  studio: Studio;
  name: { en: string; tr: string };
  desc: { en: string; tr: string };
  seconds: number;
  from: string;
  to: string;
}

export const studios: StudioInfo[] = [
  {
    id: "character",
    name: {
      en: "AI Character Studio",
      tr: "AI Karakter Stüdyosu",
    },
    desc: {
      en: "Create animated characters and cinematic entrances.",
      tr: "Karakter animasyonları ve sinematik girişler oluştur.",
    },
    icon: "user-round",
  },
  {
    id: "cinematic",
    name: {
      en: "Cinematic Edit Studio",
      tr: "Sinematik Edit Stüdyosu",
    },
    desc: {
      en: "Create cinematic effects, transitions and motion graphics.",
      tr: "Sinematik efektler, geçişler ve hareketli grafikler oluştur.",
    },
    icon: "clapperboard",
  },
  {
    id: "gift",
    name: {
      en: "TikTok Gift Studio",
      tr: "TikTok Hediye Stüdyosu",
    },
    desc: {
      en: "Create spectacular edits for livestream gifts.",
      tr: "Canlı yayın hediyeleri için etkileyici editler oluştur.",
    },
    icon: "gift",
  },
  {
    id: "advertisement",
    name: {
      en: "AI Advertisement Studio",
      tr: "AI Reklam Stüdyosu",
    },
    desc: {
      en: "Create product commercials and social media ads.",
      tr: "Ürün tanıtımları ve sosyal medya reklamları oluştur.",
    },
    icon: "megaphone",
  },
];

export const categories: Category[] = [
  "gaming",
  "tiktok",
  "esports",
  "streamer",
  "product",
  "social",
];

export const templates: Template[] = [
  {
    id: "hero-entrance",
    category: "gaming",
    studio: "character",
    name: {
      en: "Hero Entrance",
      tr: "Kahraman Girişi",
    },
    desc: {
      en: "Your character walks through mist with companion animals.",
      tr: "Karakterin sisin içinden yoldaş hayvanlarla yürür.",
    },
    seconds: 8,
    from: "#8B5CF6",
    to: "#3B82F6",
  },
  {
    id: "character-cinematic",
    category: "gaming",
    studio: "character",
    name: {
      en: "Cinematic Character Intro",
      tr: "Sinematik Karakter Girişi",
    },
    desc: {
      en: "Dramatic entrance with cinematic lighting.",
      tr: "Sinematik ışıklarla dramatik karakter girişi.",
    },
    seconds: 10,
    from: "#6366F1",
    to: "#111827",
  },
  {
    id: "gift-epic",
    category: "tiktok",
    studio: "gift",
    name: {
      en: "Gift Edit — Epic",
      tr: "Hediye Edit — Epic",
    },
    desc: {
      en: "Dramatic zooms and light bursts on every gift.",
      tr: "Her hediyede dramatik yakınlaşma ve ışık patlamaları.",
    },
    seconds: 15,
    from: "#EC4899",
    to: "#8B5CF6",
  },
  {
    id: "gift-velocity",
    category: "tiktok",
    studio: "gift",
    name: {
      en: "Gift Edit — Velocity",
      tr: "Hediye Edit — Velocity",
    },
    desc: {
      en: "Fast speed ramps synced to the beat.",
      tr: "Ritme senkron hızlı hız rampaları.",
    },
    seconds: 15,
    from: "#F97316",
    to: "#EC4899",
  },
  {
    id: "gift-luxury",
    category: "tiktok",
    studio: "gift",
    name: {
      en: "Gift Edit — Luxury",
      tr: "Hediye Edit — Luxury",
    },
    desc: {
      en: "Gold-toned slow reveal for big supporters.",
      tr: "Büyük destekçiler için altın tonlu yavaş tanıtım.",
    },
    seconds: 12,
    from: "#F59E0B",
    to: "#151522",
  },
  {
    id: "esports-intro",
    category: "esports",
    studio: "cinematic",
    name: {
      en: "Team Intro",
      tr: "Takım Tanıtımı",
    },
    desc: {
      en: "Roster reveal with glitch transitions.",
      tr: "Glitch geçişlerle kadro tanıtımı.",
    },
    seconds: 10,
    from: "#3B82F6",
    to: "#8B5CF6",
  },
  {
    id: "stream-brand",
    category: "streamer",
    studio: "cinematic",
    name: {
      en: "Streamer Brand Sting",
      tr: "Yayıncı Marka Animasyonu",
    },
    desc: {
      en: "Animated logo sting for stream starts.",
      tr: "Yayın başlangıçları için animasyonlu logo.",
    },
    seconds: 5,
    from: "#EC4899",
    to: "#3B82F6",
  },
  {
    id: "highlight-reel",
    category: "gaming",
    studio: "cinematic",
    name: {
      en: "Highlight Reel",
      tr: "Öne Çıkanlar",
    },
    desc: {
      en: "Auto-paced highlights with cinematic grading.",
      tr: "Sinematik renk ayarlı otomatik tempolu kesitler.",
    },
    seconds: 20,
    from: "#8B5CF6",
    to: "#F97316",
  },
  {
    id: "product-reveal",
    category: "product",
    studio: "advertisement",
    name: {
      en: "Cinematic Product Reveal",
      tr: "Sinematik Ürün Tanıtımı",
    },
    desc: {
      en: "Studio lighting and slow orbit around your product.",
      tr: "Stüdyo ışığı ve ürün etrafında yavaş dönüş.",
    },
    seconds: 10,
    from: "#3B82F6",
    to: "#151522",
  },
  {
    id: "luxury-spot",
    category: "product",
    studio: "advertisement",
    name: {
      en: "Luxury Product Spot",
      tr: "Lüks Ürün Reklamı",
    },
    desc: {
      en: "Dark, glossy, premium look.",
      tr: "Koyu, parlak, premium görünüm.",
    },
    seconds: 12,
    from: "#8B5CF6",
    to: "#151522",
  },
  {
    id: "social-ad",
    category: "social",
    studio: "advertisement",
    name: {
      en: "Social Ad Pack",
      tr: "Sosyal Reklam Paketi",
    },
    desc: {
      en: "Vertical ad with bold text and CTA.",
      tr: "Cesur metin ve CTA içeren dikey reklam.",
    },
    seconds: 9,
    from: "#F97316",
    to: "#8B5CF6",
  },
];

export const effects = [
  "Cinematic",
  "Neon",
  "Smoke",
  "Sparks",
  "Minimal",
];

export const durations = [5, 10, 15, 30];

export const ratios = ["9:16", "16:9", "1:1"];
