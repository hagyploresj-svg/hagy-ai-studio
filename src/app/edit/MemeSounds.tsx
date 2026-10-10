
"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Play,
  Pause,
  Plus,
  Search,
  ExternalLink,
} from "lucide-react";

export type MemeSound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};

type ApiSound = {
  slug?: string;
  title?: string;
  mp3_url?: string;
  page_url?: string;
  duration_ms?: number;
  license?: string;
};

const memes = [
  { name: "Vine Boom", emoji: "💀", query: "deep dramatic bass impact boom" },
  { name: "Bruh", emoji: "😂", query: "funny disappointed reaction voice" },
  { name: "Metal Pipe", emoji: "🔩", query: "metal pipe falling clang" },
  { name: "Boing", emoji: "🤡", query: "cartoon boing spring" },
  { name: "Fail Trombone", emoji: "🎺", query: "sad trombone failure" },
  { name: "Airhorn", emoji: "📢", query: "air horn loud" },
  { name: "Bonk", emoji: "🔨", query: "cartoon bonk hit" },
  { name: "Fart", emoji: "💨", query: "funny fart" },
  { name: "Laugh", emoji: "🤣", query: "funny laughter crowd" },
  { name: "Record Scratch", emoji: "💿", query: "vinyl record scratch" },
  { name: "Suspense", emoji: "😳", query: "dramatic suspense sting" },
  { name: "Game Over", emoji: "🎮", query: "retro game over" },
  { name: "Victory", emoji: "🏆", query: "video game victory fanfare" },
  { name: "Cartoon Fall", emoji: "😵", query: "cartoon falling whistle crash" },
  { name: "Wow", emoji: "😮", query: "surprised reaction wow" },
  { name: "Notification", emoji: "🎁", query: "funny notification pop chime" },
  { name: "Drum Joke", emoji: "🥁", query: "comedy drum rimshot" },
  { name: "Scream", emoji: "😱", query: "cartoon scream" },
  { name: "Error", emoji: "❌", query: "retro error buzzer" },
  { name: "Dramatic Hit", emoji: "🔥", query: "cinematic dramatic hit" },
];

export default function MemeSounds({
  onAdd,
}: {
  onAdd: (sound: MemeSound) => void;
}) {
  const [selected, setSelected] = useState(memes[0]);
  const [searchText, setSearchText] = useState("");
  const [sounds, setSounds] = useState<MemeSound[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const [audio] = useState<HTMLAudioElement | null>(
    () => (typeof window !== "undefined" ? new Audio() : null)
  );

  useEffect(() => {
    return () => {
      audio?.pause();
      if (audio) audio.src = "";
    };
  }, [audio]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      setSounds([]);
      setPlayingId(null);
      audio?.pause();

      try {
        const term = searchText.trim() || selected.query;

        const url =
          "https://sfxmint.com/api/v1/search?q=" +
          encodeURIComponent(term) +
          "&limit=20";

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Ses servisi yanıt vermedi.");
        }

        const data: unknown = await response.json();

        const items: ApiSound[] = Array.isArray(data)
          ? data
          : typeof data === "object" &&
              data !== null &&
              "candidates" in data &&
              Array.isArray(data.candidates)
            ? data.candidates
            : [];

        const result: MemeSound[] = items
          .filter(
            (item) =>
              item.slug &&
              item.mp3_url &&
              (!item.license ||
                item.license.toUpperCase().startsWith("CC0"))
          )
          .map((item) => ({
            id: `meme-${item.slug}`,
            name: item.title || item.slug || "Meme Sound",
            url: item.mp3_url!,
            duration: Math.max(
              0.1,
              (item.duration_ms || 1000) / 1000
            ),
            source:
              item.page_url ||
              `https://sfxmint.com/sounds/${item.slug}`,
            category: "Global Meme",
          }));

        setSounds(result);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError("Meme sesleri yüklenemedi.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [selected, searchText, audio]);

  function listen(sound: MemeSound) {
    if (!audio) return;

    if (playingId === sound.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }

    audio.pause();
    audio.src = sound.url;
    audio.currentTime = 0;
    audio.volume = 0.8;

    audio.onended = () => setPlayingId(null);

    setPlayingId(sound.id);

    void audio.play().catch(() => {
      setPlayingId(null);
      setError("Bu ses şu anda oynatılamıyor.");
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-violet-950/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xl">🌍</span>
        <h2 className="font-bold text-white">
          Global Meme Sounds
        </h2>
      </div>

      <p className="mb-4 text-xs leading-5 text-white/60">
        Komik, viral meme tarzı efektleri
        indirmeden dinle ve videona ekle.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {memes.map((meme) => (
          <button
            key={meme.name}
            type="button"
            onClick={() => {
              setSelected(meme);
              setSearchText("");
            }}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              selected.name === meme.name
                ? "border-violet-500 bg-violet-600/30 text-white"
                : "border-white/10 bg-black/20 text-white/60 hover:border-violet-500"
            }`}
          >
            {meme.emoji} {meme.name}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3">
        <Search size={17} className="text-white/40" />

        <input
          value={searchText}
          onChange={(event) =>
            setSearchText(event.target.value)
          }
          placeholder="Meme sesi ara..."
          className="w-full bg-transparent py-3 text-sm text-white outline-none"
        />
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-white/60">
          <Loader2 size={17} className="animate-spin" />
          Sesler yükleniyor...
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 text-xs text-red-400">
          {error}
        </p>
      )}

      {!loading && sounds.length === 0 && !error && (
        <p className="py-4 text-xs text-white/50">
          Bu aramada uygun ses bulunamadı.
        </p>
      )}

      <div className="max-h-[420px] space-y-2 overflow-y-auto">
        {sounds.map((sound) => (
          <div
            key={sound.id}
            className="rounded-xl border border-white/10 bg-black/20 p-3"
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold text-white"
                  title={sound.name}
                >
                  {sound.name}
                </p>

                <p className="text-xs text-white/40">
                  {sound.duration.toFixed(1)} sn
                  {" • "}
                  CC0
                </p>
              </div>

              <a
                href={sound.source}
                target="_blank"
                rel="noopener noreferrer"
                title="Ses kaynağı"
                className="text-white/50 hover:text-white"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => listen(sound)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white"
              >
                {playingId === sound.id ? (
                  <Pause size={15} />
                ) : (
                  <Play size={15} />
                )}

                {playingId === sound.id
                  ? "Durdur"
                  : "Dinle"}
              </button>

              <button
                type="button"
                onClick={() => onAdd(sound)}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white"
              >
                <Plus size={15} />
                Videoya Ekle
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs leading-5 text-white/40">
        Efektler çevrimiçi ses servisinden gelir.
        Kategori isimleri arama temalarıdır;
        orijinal viral meme kayıtları garanti edilmez.
      </p>
    </div>
  );
}
