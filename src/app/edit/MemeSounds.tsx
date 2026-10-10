
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Search,
  ExternalLink,
  Loader2,
} from "lucide-react";

export type MemeSound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};

type Meme = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  slug: string;
  tags: string;
};

const MEMES: Meme[] = [
  {
    id: "vine-boom",
    name: "Vine Boom",
    emoji: "💀",
    category: "Reaction",
    slug: "vine-boom",
    tags: "boom dramatic bass",
  },
  {
    id: "bruh",
    name: "Bruh",
    emoji: "😂",
    category: "Reaction",
    slug: "bruh",
    tags: "bruh funny",
  },
  {
    id: "metal-pipe",
    name: "Metal Pipe Falling",
    emoji: "🔩",
    category: "Impact",
    slug: "metal-pipe-falling-sound-effect-7737",
    tags: "metal pipe clang",
  },
  {
    id: "roblox-oof",
    name: "Roblox Oof",
    emoji: "🎮",
    category: "Gaming",
    slug: "roblox-oof",
    tags: "roblox oof death",
  },
  {
    id: "huh-cat",
    name: "Huh Cat",
    emoji: "🐱",
    category: "Reaction",
    slug: "huh-cat-21280",
    tags: "cat huh confused",
  },
  {
    id: "emotional-damage",
    name: "Emotional Damage",
    emoji: "😭",
    category: "Reaction",
    slug: "emotional-damage-99808",
    tags: "emotional damage steven he",
  },
  {
    id: "mission-failed",
    name: "Mission Failed",
    emoji: "🎮",
    category: "Gaming",
    slug: "mission-failed",
    tags: "mission failed next time",
  },
  {
    id: "robert-weide",
    name: "Directed by Robert B. Weide",
    emoji: "🎬",
    category: "Classic",
    slug: "directed-by-robert-b-weide-451",
    tags: "robert weide credits music",
  },
  {
    id: "oh-no-laugh",
    name: "Oh No No No Laugh",
    emoji: "🤣",
    category: "Reaction",
    slug: "oh-no-no-no-laugh-56694",
    tags: "oh no laugh tiktok",
  },
  {
    id: "sad-trombone",
    name: "Sad Trombone",
    emoji: "🎺",
    category: "Classic",
    slug: "sad-trombone",
    tags: "sad trombone fail",
  },
  {
    id: "fbi-open-up",
    name: "FBI Open Up",
    emoji: "🚨",
    category: "Classic",
    slug: "fbi-open-up",
    tags: "fbi police open up",
  },
  {
    id: "windows-error",
    name: "Windows Error",
    emoji: "❌",
    category: "Gaming",
    slug: "windows-xp-error",
    tags: "windows xp error computer",
  },
  {
    id: "few-moments",
    name: "A Few Moments Later",
    emoji: "⏳",
    category: "Classic",
    slug: "a-few-moments-later",
    tags: "spongebob few moments later",
  },
  {
    id: "nokia",
    name: "Nokia Arabic Ringtone",
    emoji: "📱",
    category: "Classic",
    slug: "nokia-arabic-ringtone",
    tags: "nokia arabic ringtone",
  },
  {
    id: "mission-failed-alt",
    name: "Mission Failed — Alternatif",
    emoji: "🎯",
    category: "Gaming",
    slug: "mission-failed-we-get-em-next-time-6737",
    tags: "mission failed alternative",
  },
  {
    id: "robert-weide-alt",
    name: "Robert B. Weide — Alternatif",
    emoji: "🎞️",
    category: "Classic",
    slug: "directed-by-robert-b-weide-97744",
    tags: "robert weide alternative",
  },
  {
    id: "oh-no-alt",
    name: "Oh No No No — Alternatif",
    emoji: "😆",
    category: "Reaction",
    slug: "oh-no-no-no-no-laugh-76981",
    tags: "oh no laugh alternative",
  },
  {
    id: "metal-pipe-alt",
    name: "Metal Pipe — Alternatif",
    emoji: "🔨",
    category: "Impact",
    slug: "metal-pipe-falling-sound-25733",
    tags: "metal pipe alternative",
  },
  {
    id: "roblox-alt",
    name: "Roblox Oof — Alternatif",
    emoji: "🕹️",
    category: "Gaming",
    slug: "roblox-oof-sound-effect-59474",
    tags: "roblox oof alternative",
  },
  {
    id: "emotional-alt",
    name: "Emotional Damage — Alternatif",
    emoji: "🥲",
    category: "Reaction",
    slug: "emotional-damage-43302",
    tags: "emotional damage alternative",
  },
];

const CATEGORIES = [
  "Tümü",
  "Reaction",
  "Gaming",
  "Impact",
  "Classic",
];

type ResolvedSound = {
  url: string;
  source: string;
};

export default function MemeSounds({
  onAdd,
}: {
  onAdd: (sound: MemeSound) => void;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Tümü");

  const [playing, setPlaying] = useState<string | null>(
    null
  );

  const [busy, setBusy] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [resolved, setResolved] = useState<
    Record<string, ResolvedSound>
  >({});

  const [durations, setDurations] = useState<
    Record<string, number>
  >({});

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playRequest = useRef(0);

  useEffect(() => {
    return () => {
      playRequest.current++;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const filtered = MEMES.filter((item) => {
    const matchesCategory =
      category === "Tümü" ||
      item.category === category;

    const text = query.trim().toLowerCase();

    const matchesSearch =
      !text ||
      `${item.name} ${item.tags}`
        .toLowerCase()
        .includes(text);

    return matchesCategory && matchesSearch;
  });

  function stop() {
    playRequest.current++;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }

    setPlaying(null);
  }

  async function resolveSound(
    item: Meme
  ): Promise<ResolvedSound> {
    if (resolved[item.id]) {
      return resolved[item.id];
    }

    const response = await fetch(
      `/api/meme-sound?slug=${encodeURIComponent(
        item.slug
      )}`,
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok || !data.url) {
      throw new Error(
        data.error ||
          "Kaynak ses dosyası bulunamadı."
      );
    }

    const sound: ResolvedSound = {
      url: data.url,
      source: data.source,
    };

    setResolved((prev) => ({
      ...prev,
      [item.id]: sound,
    }));

    return sound;
  }

  function readDuration(
    url: string
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.preload = "metadata";

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Ses süresi zaman aşımına uğradı."));
      }, 12000);

      function cleanup() {
        clearTimeout(timeout);
        audio.onloadedmetadata = null;
        audio.onerror = null;
      }

      audio.onloadedmetadata = () => {
        const value = audio.duration;
        cleanup();

        if (Number.isFinite(value) && value > 0) {
          resolve(value);
        } else {
          reject(new Error("Ses süresi okunamadı."));
        }
      };

      audio.onerror = () => {
        cleanup();
        reject(new Error("Ses dosyası açılamadı."));
      };

      audio.src = url;
    });
  }

  async function listen(item: Meme) {
    if (playing === item.id) {
      stop();
      return;
    }

    stop();

    const request = playRequest.current;
    setBusy(item.id);
    setError("");

    try {
      const sound = await resolveSound(item);

      if (request !== playRequest.current) return;

      const audio = new Audio(sound.url);
      audio.volume = 0.8;
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (
          Number.isFinite(audio.duration) &&
          audio.duration > 0
        ) {
          setDurations((prev) => ({
            ...prev,
            [item.id]: audio.duration,
          }));
        }
      };

      audio.onended = () => {
        if (audioRef.current === audio) {
          setPlaying(null);
          audioRef.current = null;
        }
      };

      audio.onerror = () => {
        if (audioRef.current === audio) {
          setError(
            `${item.name}: Ses dosyası oynatılamadı.`
          );
          setPlaying(null);
          audioRef.current = null;
        }
      };

      setPlaying(item.id);

      await audio.play();
    } catch (err) {
      if (request === playRequest.current) {
        setError(
          `${item.name}: ${
            err instanceof Error
              ? err.message
              : "Bilinmeyen hata."
          }`
        );

        setPlaying(null);
      }
    } finally {
      if (request === playRequest.current) {
        setBusy(null);
      }
    }
  }

  async function add(item: Meme) {
    setBusy(item.id);
    setError("");

    try {
      const sound = await resolveSound(item);

      const duration =
        durations[item.id] ||
        (await readDuration(sound.url));

      setDurations((prev) => ({
        ...prev,
        [item.id]: duration,
      }));

      onAdd({
        id: `meme-${item.id}`,
        name: item.name,
        url: sound.url,
        duration,
        source: sound.source,
        category: "Global Meme",
      });
    } catch (err) {
      setError(
        `${item.name}: ${
          err instanceof Error
            ? err.message
            : "Videoya eklenemedi."
        }`
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-violet/30 bg-violet/10 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">
          🌍 Global Meme Sounds
        </h2>

        <p className="mt-1 text-xs text-white/50">
          Viral meme sesleri • HAGY Edit Studio
        </p>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3">
        <Search
          size={17}
          className="text-white/50"
        />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Meme sesi ara..."
          className="w-full bg-transparent py-3 text-sm text-white outline-none"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`rounded-full border px-3 py-1.5 text-xs ${
              category === item
                ? "border-violet-400 bg-violet-600/30 text-white"
                : "border-white/10 bg-white/5 text-white/60"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs text-white/50">
        {filtered.length} ses bulundu
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {error}
        </div>
      )}

      <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">
                {item.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {item.name}
                </p>

                <p className="text-xs text-white/40">
                  {durations[item.id]
                    ? `${durations[item.id].toFixed(1)} sn`
                    : item.category}
                </p>
              </div>

              <a
                href={`https://www.myinstants.com/en/instant/${item.slug}/`}
                target="_blank"
                rel="noopener noreferrer"
                title="Kaynağı aç"
                className="text-white/50 hover:text-white"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => void listen(item)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-xs text-white hover:bg-white/20 disabled:opacity-50"
              >
                {busy === item.id ? (
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                ) : playing === item.id ? (
                  <Pause size={15} />
                ) : (
                  <Play size={15} />
                )}

                {playing === item.id
                  ? "Durdur"
                  : "Dinle"}
              </button>

              <button
                type="button"
                disabled={busy === item.id}
                onClick={() => void add(item)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
              >
                <Plus size={15} />
                Videoya Ekle
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-white/40">
        Sesler Myinstants kaynaklarından alınır.
        Üçüncü taraf erişimi değişebilir.
        Ticari kullanım hakları ayrıca kontrol
        edilmelidir.
      </p>
    </div>
  );
}
