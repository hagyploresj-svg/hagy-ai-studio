
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Plus,
  Search,
  ExternalLink,
  Volume2,
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

type MemeItem = {
  id: string;
  name: string;
  emoji: string;
  url: string;
  tags: string;
  category: string;
  source: string;
};

const MY = "https://www.myinstants.com/media/sounds/";

const GH =
  "https://raw.githubusercontent.com/" +
  "PareekshithPalat/IDE-Error-Soundboard/" +
  "main/sounds/";

const GH_SOURCE =
  "https://github.com/PareekshithPalat/" +
  "IDE-Error-Soundboard/tree/main/sounds";

function oldMeme(
  id: string,
  name: string,
  emoji: string,
  filename: string,
  category: string,
  tags: string
): MemeItem {
  return {
    id,
    name,
    emoji,
    url: MY + filename,
    category,
    tags,
    source:
      "https://www.myinstants.com/en/search/?name=" +
      encodeURIComponent(name),
  };
}

function githubMeme(
  id: string,
  name: string,
  emoji: string,
  filename: string,
  category: string,
  tags: string
): MemeItem {
  return {
    id,
    name,
    emoji,
    url: GH + filename,
    category,
    tags,
    source: GH_SOURCE,
  };
}

const MEMES: MemeItem[] = [
  // ÖNCEDEN ÇALIŞAN SESLER
  oldMeme(
    "vine-boom",
    "Vine Boom",
    "💀",
    "vine-boom.mp3",
    "Reaction",
    "boom bass dramatic"
  ),
  oldMeme(
    "bruh",
    "Bruh",
    "😂",
    "movie_1.mp3",
    "Reaction",
    "bruh funny"
  ),
  oldMeme(
    "sad-trombone",
    "Sad Trombone",
    "🎺",
    "sadtrombone.mp3",
    "Classic",
    "fail sad"
  ),
  oldMeme(
    "fbi",
    "FBI Open Up",
    "🚨",
    "fbi-open-up-sfx.mp3",
    "Classic",
    "fbi police"
  ),
  oldMeme(
    "windows",
    "Windows XP Error",
    "❌",
    "erro.mp3",
    "Gaming",
    "windows error"
  ),
  oldMeme(
    "nokia",
    "Nokia Arabic Ringtone",
    "📱",
    "nokia-arabic-ringtone.mp3",
    "Classic",
    "nokia ringtone"
  ),
  oldMeme(
    "moments",
    "A Few Moments Later",
    "⏳",
    "a-few-moments-later-hd.mp3",
    "Classic",
    "spongebob moments later"
  ),

  // YENİ MEME SESLERİ
  githubMeme(
    "metal-pipe",
    "Metal Pipe Clang",
    "🔩",
    "metal-pipe-clang.mp3",
    "Impact",
    "metal pipe falling"
  ),
  githubMeme(
    "among-us",
    "Among Us Role Reveal",
    "ඞ",
    "among-us-role.mp3",
    "Gaming",
    "among us impostor"
  ),
  githubMeme(
    "anime-wow",
    "Anime Wow",
    "😮",
    "anime-wow.mp3",
    "Reaction",
    "anime wow"
  ),
  githubMeme(
    "bruh-alt",
    "Bruh — Alternative",
    "🤣",
    "bruh.mp3",
    "Reaction",
    "bruh"
  ),
  githubMeme(
    "movie-bruh",
    "Movie Bruh",
    "🎬",
    "movie-bruh.mp3",
    "Reaction",
    "movie bruh"
  ),
  githubMeme(
    "fbi-alt",
    "FBI — Alternative",
    "🚔",
    "fbi.mp3",
    "Classic",
    "fbi open up"
  ),
  githubMeme(
    "vine-alt",
    "Vine Boom — Alternative",
    "💥",
    "vine-boom.mp3",
    "Impact",
    "vine boom"
  ),
  githubMeme(
    "rizz",
    "Rizz Effect",
    "😎",
    "rizz-effect.mp3",
    "Reaction",
    "rizz"
  ),
  githubMeme(
    "fart",
    "Fart",
    "💨",
    "fart.mp3",
    "Funny",
    "fart funny"
  ),
  githubMeme(
    "fart-button",
    "Fart Button",
    "😂",
    "fart-button.mp3",
    "Funny",
    "fart button"
  ),
  githubMeme(
    "spongebob-fail",
    "SpongeBob Fail",
    "🧽",
    "spongebob-fail.mp3",
    "Funny",
    "spongebob fail"
  ),
  githubMeme(
    "yeet",
    "Yeet",
    "🚀",
    "yeet.mp3",
    "Reaction",
    "yeet"
  ),
  githubMeme(
    "undertaker",
    "Undertaker Bell",
    "🔔",
    "undertaker-bell.mp3",
    "Classic",
    "undertaker bell"
  ),
  githubMeme(
    "chicken",
    "Chicken Screaming",
    "🐔",
    "chicken-screaming.mp3",
    "Funny",
    "chicken scream"
  ),
  githubMeme(
    "bone-crack",
    "Bone Crack",
    "🦴",
    "bone-crack.mp3",
    "Impact",
    "bone crack"
  ),
  githubMeme(
    "apple-pay",
    "Apple Pay",
    "💳",
    "apple-pay.mp3",
    "Classic",
    "apple pay notification"
  ),
  githubMeme(
    "phone",
    "Phone Ringing",
    "📞",
    "phone-ringing.mp3",
    "Classic",
    "phone ringing"
  ),
  githubMeme(
    "smoke-beep",
    "Smoke Detector Beep",
    "🚨",
    "smoke-detector-beep.mp3",
    "Funny",
    "smoke detector beep"
  ),
  githubMeme(
    "romance",
    "Romance",
    "💕",
    "romance.mp3",
    "Reaction",
    "romance love"
  ),
  githubMeme(
    "lizard",
    "Lizard Button",
    "🦎",
    "lizard-button.mp3",
    "Funny",
    "lizard"
  ),
  githubMeme(
    "granny",
    "Granny Bazooka",
    "👵",
    "granny-bazooka.mp3",
    "Funny",
    "granny bazooka"
  ),
  githubMeme(
    "tuco",
    "Tuco Get Out",
    "😤",
    "tuco-get-out.mp3",
    "Reaction",
    "tuco get out"
  ),
  githubMeme(
    "good-boy",
    "What A Good Boy",
    "🐶",
    "what-a-good-boy.mp3",
    "Funny",
    "good boy"
  ),
  githubMeme(
    "ack",
    "Ack",
    "😵",
    "ack.mp3",
    "Reaction",
    "ack reaction"
  ),
  githubMeme(
    "faaah",
    "FAAAH",
    "😱",
    "faaah.mp3",
    "Reaction",
    "fah scream"
  ),
  githubMeme(
    "fah-alt",
    "FAAAH — Alternative",
    "📢",
    "fahhh-alt.mp3",
    "Reaction",
    "fah meme"
  ),
  githubMeme(
    "fah-long",
    "FAAAH — Long",
    "😫",
    "fahhhhhhh.mp3",
    "Reaction",
    "fah long"
  ),
  githubMeme(
    "dexter",
    "Dexter Meme",
    "🩸",
    "dexter-meme.mp3",
    "Classic",
    "dexter"
  ),
  githubMeme(
    "hub-intro",
    "Hub Intro",
    "🎵",
    "hub-intro.mp3",
    "Classic",
    "intro"
  ),
  githubMeme(
    "so-beautiful",
    "So Beautiful",
    "🥹",
    "so-beautiful.mp3",
    "Reaction",
    "beautiful"
  ),
];

const CATEGORIES = [
  "Tümü",
  "Reaction",
  "Funny",
  "Gaming",
  "Impact",
  "Classic",
];

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
  const [durations, setDurations] = useState<
    Record<string, number>
  >({});

  const audioRef = useRef<HTMLAudioElement | null>(
    null
  );

  const requestRef = useRef(0);

  useEffect(() => {
    return () => {
      requestRef.current++;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const filtered = MEMES.filter((item) => {
    const text = query.trim().toLowerCase();

    const matchesText =
      !text ||
      `${item.name} ${item.tags}`
        .toLowerCase()
        .includes(text);

    const matchesCategory =
      category === "Tümü" ||
      item.category === category;

    return matchesText && matchesCategory;
  });

  function stop() {
    requestRef.current++;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setPlaying(null);
    setBusy(null);
  }

  function listen(item: MemeItem) {
    if (playing === item.id) {
      stop();
      return;
    }

    stop();
    setError("");

    const request = requestRef.current;
    const audio = new Audio();

    audioRef.current = audio;
    audio.preload = "auto";
    audio.volume = 0.75;

    setBusy(item.id);

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
        setBusy(null);
        audioRef.current = null;
      }
    };

    audio.onerror = () => {
      if (request !== requestRef.current) return;

      setError(
        `${item.name}: Ses bağlantısı açılamadı.`
      );
      setPlaying(null);
      setBusy(null);
      audioRef.current = null;
    };

    audio.src = item.url;

    void audio
      .play()
      .then(() => {
        if (request !== requestRef.current) {
          audio.pause();
          return;
        }

        setPlaying(item.id);
        setBusy(null);
      })
      .catch(() => {
        if (request !== requestRef.current) return;

        setError(
          `${item.name}: Ses oynatılamadı.`
        );
        setPlaying(null);
        setBusy(null);
      });
  }

  function getDuration(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      let settled = false;

      const timer = setTimeout(() => {
        finish(0);
      }, 12000);

      function finish(value: number) {
        if (settled) return;

        settled = true;
        clearTimeout(timer);

        audio.onloadedmetadata = null;
        audio.onerror = null;

        if (value > 0) {
          resolve(value);
        } else {
          reject(
            new Error("Ses süresi okunamadı.")
          );
        }
      }

      audio.preload = "metadata";

      audio.onloadedmetadata = () => {
        finish(
          Number.isFinite(audio.duration)
            ? audio.duration
            : 0
        );
      };

      audio.onerror = () => finish(0);
      audio.src = url;
    });
  }

  async function add(item: MemeItem) {
    setError("");
    setBusy(item.id);

    try {
      const duration =
        durations[item.id] ||
        (await getDuration(item.url));

      setDurations((prev) => ({
        ...prev,
        [item.id]: duration,
      }));

      onAdd({
        id: `meme-${item.id}`,
        name: item.name,
        url: item.url,
        duration,
        source: item.source,
        category: "Global Meme",
      });
    } catch {
      setError(
        `${item.name}: Ses dosyası yüklenemedi veya süresi okunamadı.`
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
          HAGY Edit Studio • Meme Sound Library
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-white/15 bg-black/20 px-3">
        <Search
          size={17}
          className="text-white/40"
        />

        <input
          value={query}
          onChange={(event) =>
            setQuery(event.target.value)
          }
          placeholder="Vine Boom, Metal Pipe, Bruh..."
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

      <div className="mb-3 flex items-center gap-2 text-xs text-white/50">
        <Volume2 size={15} />
        {filtered.length} ses listeleniyor
      </div>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300"
        >
          {error}
        </p>
      )}

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-white/50">
          Aradığın isimde ses bulunamadı.
        </p>
      )}

      <div className="max-h-[650px] space-y-3 overflow-y-auto pr-1">
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
                    ? `${durations[item.id].toFixed(1)} sn`
                    : item.category}
                </p>
              </div>

              <a
                href={item.source}
                target="_blank"
                rel="noopener noreferrer"
                title="Ses kaynağını aç"
                className="text-white/50 hover:text-white"
              >
                <ExternalLink size={16} />
              </a>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => listen(item)}
                disabled={busy === item.id}
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
                onClick={() => void add(item)}
                disabled={busy === item.id}
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
        Sesler üçüncü taraf bağlantılarından
        oynatılır. Bağlantılar değişebilir.
        Ticari kullanım ve telif hakları
        ayrıca kontrol edilmelidir.
      </p>
    </div>
  );
}
