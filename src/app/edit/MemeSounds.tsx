
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Search,
  ExternalLink,
  Volume2,
} from "lucide-react";

export type MemeSound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};

type MemeItem = {
  id: string;
  name: string;
  emoji: string;
  url: string;
  tags: string;
};

const BASE = "https://www.myinstants.com/media/sounds/";

const MEMES: MemeItem[] = [
  {
    id: "vine-boom",
    name: "Vine Boom",
    emoji: "💀",
    url: BASE + "vine-boom.mp3",
    tags: "boom bass dramatic shock",
  },
  {
    id: "bruh",
    name: "Bruh",
    emoji: "😂",
    url: BASE + "movie_1.mp3",
    tags: "bruh reaction funny",
  },
  {
    id: "sad-trombone",
    name: "Sad Trombone",
    emoji: "🎺",
    url: BASE + "sadtrombone.mp3",
    tags: "fail sad trombone",
  },
  {
    id: "fbi-open-up",
    name: "FBI Open Up",
    emoji: "🚨",
    url: BASE + "fbi-open-up-sfx.mp3",
    tags: "fbi open up police meme",
  },
  {
    id: "mission-failed",
    name: "Mission Failed",
    emoji: "🎮",
    url:
      BASE +
      "mission-failed-we-ll-get-em-next-time.mp3",
    tags: "mission failed game",
  },
  {
    id: "directed-by",
    name: "Directed by Robert B. Weide",
    emoji: "🎬",
    url:
      BASE +
      "directed-by-robert-b_gE1sT6P.mp3",
    tags: "directed by robert weide credits",
  },
  {
    id: "windows-error",
    name: "Windows XP Error",
    emoji: "❌",
    url: BASE + "erro.mp3",
    tags: "windows error computer",
  },
  {
    id: "oh-no-laugh",
    name: "Oh No No No Laugh",
    emoji: "🤣",
    url:
      BASE +
      "oh-no-no-no-tik-tok-laugh.mp3",
    tags: "oh no laugh tiktok funny",
  },
  {
    id: "nokia-arabic",
    name: "Nokia Arabic Ringtone",
    emoji: "📱",
    url: BASE + "nokia-arabic-ringtone.mp3",
    tags: "nokia arabic ringtone",
  },
  {
    id: "few-moments",
    name: "A Few Moments Later",
    emoji: "⏳",
    url:
      BASE +
      "a-few-moments-later-hd.mp3",
    tags: "spongebob moments later time",
  },
];

const SOURCE_SEARCH =
  "https://www.myinstants.com/en/search/?name=";

export default function MemeSounds({
  onAdd,
}: {
  onAdd: (sound: MemeSound) => void;
}) {
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<
    string | null
  >(null);
  const [error, setError] = useState("");
  const [durations, setDurations] = useState<
    Record<string, number>
  >({});

  const audioRef = useRef<HTMLAudioElement | null>(
    null
  );

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const filtered = MEMES.filter((item) => {
    const text = query.trim().toLowerCase();

    return (
      !text ||
      item.name.toLowerCase().includes(text) ||
      item.tags.toLowerCase().includes(text)
    );
  });

  function stop() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }

    setPlaying(null);
  }

  function listen(item: MemeItem) {
    if (playing === item.id) {
      stop();
      return;
    }

    stop();
    setError("");

    const audio = new Audio(item.url);
    audioRef.current = audio;
    audio.volume = 0.75;
    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDurations((prev) => ({
          ...prev,
          [item.id]: audio.duration,
        }));
      }
    };

    audio.onended = () => {
      setPlaying(null);
      audioRef.current = null;
    };

    audio.onerror = () => {
      setError(
        item.name +
          " sesi yüklenemedi. Kaynak bağlantısı değişmiş olabilir."
      );
      setPlaying(null);
    };

    setPlaying(item.id);

    void audio.play().catch(() => {
      setError(
        item.name + " sesi oynatılamadı."
      );
      setPlaying(null);
    });
  }

  async function add(item: MemeItem) {
    setError("");

    let duration = durations[item.id];

    if (!duration) {
      try {
        duration = await new Promise<number>(
          (resolve, reject) => {
            const audio = new Audio();
            audio.preload = "metadata";

            audio.onloadedmetadata = () => {
              if (
                Number.isFinite(audio.duration) &&
                audio.duration > 0
              ) {
                resolve(audio.duration);
              } else {
                reject(
                  new Error("Süre okunamadı")
                );
              }
            };

            audio.onerror = () =>
              reject(
                new Error("Ses yüklenemedi")
              );

            audio.src = item.url;
          }
        );

        setDurations((prev) => ({
          ...prev,
          [item.id]: duration,
        }));
      } catch {
        setError(
          "Bu sesin bağlantısı veya süresi okunamadı."
        );
        return;
      }
    }

    onAdd({
      id: "meme-" + item.id,
      name: item.name,
      url: item.url,
      duration,
      source:
        SOURCE_SEARCH +
        encodeURIComponent(item.name),
      category: "Global Meme",
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-violet/30 bg-violet/10 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">🌍</span>

        <div>
          <h2 className="font-bold">
            Global Meme Sounds
          </h2>

          <p className="text-xs text-white/50">
            Gerçek viral meme sesleri
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3">
        <Search
          size={17}
          className="text-white/40"
        />

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Vine Boom, Bruh, FBI..."
          className="w-full bg-transparent py-3 text-sm text-white outline-none"
        />
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
        <Volume2 size={15} />
        {filtered.length} meme sesi
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {error}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="py-5 text-center text-sm text-white/50">
          Bu isimde meme sesi bulunamadı.
        </p>
      )}

      <div className="max-h-[600px] space-y-3 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-xl">
                {item.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white">
                  {item.name}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {durations[item.id]
                    ? durations[item.id].toFixed(
                        1
                      ) + " sn"
                    : "Meme Sound"}
                </p>
              </div>

              <a
                href={
                  SOURCE_SEARCH +
                  encodeURIComponent(item.name)
                }
                target="_blank"
                rel="noopener noreferrer"
                title="Ses kaynağını görüntüle"
                className="text-white/50 hover:text-white"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => listen(item)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-xs font-medium text-white hover:bg-white/20"
              >
                {playing === item.id ? (
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
                onClick={() => void add(item)}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-violet-600 px-3 py-2.5 text-xs font-semibold text-white hover:bg-violet-500"
              >
                <Plus size={15} />
                Videoya Ekle
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-white/40">
        Sesler üçüncü taraf Myinstants
        bağlantılarından oynatılır.
        Kullanım ve telif hakları her kayıt
        için ayrıca değerlendirilmelidir.
        Bağlantılar zamanla değişebilir.
      </p>
    </div>
  );
}
