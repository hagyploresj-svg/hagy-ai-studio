
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
  prompt: string;
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
      en: "Create cinematic effects and realistic camera movements.",
      tr: "Sinematik efektler ve gerçekçi kamera hareketleri oluştur.",
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
      en: "Epic character entrance through atmospheric fog.",
      tr: "Atmosferik sislerin arasından destansı karakter girişi.",
    },
    seconds: 5,
    from: "#8B5CF6",
    to: "#3B82F6",
    prompt:
      "An epic fantasy hero walks slowly and confidently toward the camera. Atmospheric fog rolls across the ground, dramatic cinematic lighting, subtle glowing particles, natural body movements, realistic footsteps. Smooth backward tracking shot. Preserve the original character's face and outfit. Ultra-realistic, no distortion, no sudden cuts.",
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
    seconds: 5,
    from: "#6366F1",
    to: "#111827",
    prompt:
      "A powerful cinematic character introduction. The character slowly turns toward the camera and takes a confident step forward. Dramatic side lighting, soft smoke, realistic clothing movement, cinematic depth of field and smooth camera push-in. Preserve the original facial features and clothing. Photorealistic movement, no distortion, no sudden cuts.",
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
      en: "Dramatic lighting and celebratory energy.",
      tr: "Dramatik ışıklandırma ve kutlama atmosferi.",
    },
    seconds: 5,
    from: "#EC4899",
    to: "#8B5CF6",
    prompt:
      "An epic livestream celebration. Brilliant glowing light bursts and sparkling particles surround the original subject. The camera performs a smooth dramatic push-in. Powerful cinematic atmosphere, rich purple and gold lighting, energetic but natural movement. Preserve the original subject and composition. No distortion, no text, no sudden cuts.",
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
      en: "Dynamic movement and energetic camera motion.",
      tr: "Dinamik hareket ve enerjik kamera geçişleri.",
    },
    seconds: 5,
    from: "#F97316",
    to: "#EC4899",
    prompt:
      "A high-energy cinematic livestream gift animation. Smooth dynamic camera movement, vivid neon light trails, glowing particles and a dramatic burst of light. Maintain the original subject's appearance and natural proportions. Energetic visual atmosphere with fluid movement, no facial distortion, no text, no sudden cuts.",
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
      en: "Elegant gold-toned celebration.",
      tr: "Altın tonlarında zarif kutlama animasyonu.",
    },
    seconds: 5,
    from: "#F59E0B",
    to: "#151522",
    prompt:
      "An elegant luxury celebration with floating golden particles, soft golden light rays and beautiful reflections. The camera slowly moves toward the original subject. Premium black and gold cinematic atmosphere, realistic motion and smooth transitions. Preserve the original subject's appearance. No distortion, no text, no sudden cuts.",
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
      en: "Dramatic esports-style introduction.",
      tr: "Dramatik e-spor tarzı giriş.",
    },
    seconds: 5,
    from: "#3B82F6",
    to: "#8B5CF6",
    prompt:
      "A powerful esports cinematic introduction. Dramatic blue and purple neon lighting, atmospheric smoke and subtle electric light effects. The original subjects pose confidently while the camera moves smoothly forward. Epic competitive gaming atmosphere, realistic motion, preserve all original faces and clothing. No distortion, no text, no sudden cuts.",
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
      en: "Cinematic streamer branding animation.",
      tr: "Sinematik yayıncı marka animasyonu.",
    },
    seconds: 5,
    from: "#EC4899",
    to: "#3B82F6",
    prompt:
      "A premium cinematic streamer branding animation. The original logo or central subject remains recognizable while elegant neon purple and blue lights sweep across the scene. Subtle glowing particles, atmospheric smoke and smooth camera movement. Preserve the original logo shape and visual identity. No unwanted text, no distortion, no sudden cuts.",
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
      en: "Dynamic cinematic gaming moment.",
      tr: "Dinamik sinematik oyun sahnesi.",
    },
    seconds: 5,
    from: "#8B5CF6",
    to: "#F97316",
    prompt:
      "A dramatic cinematic gaming highlight moment. Dynamic but smooth camera movement, intense atmospheric lighting, subtle sparks and realistic environmental motion. The central subject performs a natural action while remaining visually consistent with the original image. High-quality cinematic look, no distortion, no sudden cuts.",
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
      en: "Studio lighting and slow camera orbit.",
      tr: "Stüdyo ışığı ve yavaş kamera dönüşü.",
    },
    seconds: 5,
    from: "#3B82F6",
    to: "#151522",
    prompt:
      "A premium cinematic product advertisement. The camera slowly orbits around the original product while soft studio lights reveal its details. Elegant reflections, realistic materials, professional commercial lighting and smooth camera motion. Keep the product's original shape, branding and colors consistent. No distortion, no additional objects, no unwanted text.",
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
      en: "Dark, glossy, premium commercial.",
      tr: "Koyu, parlak ve premium reklam.",
    },
    seconds: 5,
    from: "#8B5CF6",
    to: "#151522",
    prompt:
      "An ultra-premium luxury product commercial. The original product is displayed against an elegant dark background with beautiful glossy reflections and subtle golden highlights. Smooth slow camera push-in, sophisticated studio lighting and realistic product details. Preserve the original product design, branding and proportions. No distortion, no unwanted text.",
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
      en: "Eye-catching social media commercial.",
      tr: "Dikkat çekici sosyal medya reklamı.",
    },
    seconds: 5,
    from: "#F97316",
    to: "#8B5CF6",
    prompt:
      "A modern eye-catching social media advertisement. The original product or subject remains clearly visible while the camera performs a smooth cinematic movement. Bright professional lighting, clean modern background, elegant reflections and engaging visual energy. Preserve the original branding and appearance. No distorted text, no unwanted objects, no sudden cuts.",
  },
];

export const effects = [
  "Cinematic",
  "Neon",
  "Smoke",
  "Sparks",
  "Minimal",
];

export const durations = [3, 5];

export const ratios = ["9:16", "16:9", "1:1"];
