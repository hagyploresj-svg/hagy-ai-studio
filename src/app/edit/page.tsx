
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  Clapperboard,
  ExternalLink,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Upload,
  Volume2,
} from "lucide-react";

import MemeSounds from "./MemeSounds";

type Sound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};

type Clip = {
  id: string;
  sound: Sound;
  start: number;
  duration: number;
  volume: number;
};

type ApiSound = {
  slug?: string;
  title?: string;
  duration_ms?: number;
  mp3_url?: string;
  page_url?: string;
  license?: string;
};

const categories = [
  { label: "😂 Komik", query: "cartoon boing funny laugh" },
  { label: "💨 Whoosh", query: "whoosh swoosh transition" },
  { label: "💥 Patlama", query: "explosion impact punch" },
  { label: "🎮 Oyun", query: "retro game coin win" },
  { label: "🎁 Bildirim", query: "notification chime bell" },
  { label: "⚡ Doğa", query: "thunder rain wind" },
  { label: "🦁 Hayvan", query: "animal lion roar" },
  { label: "✨ Büyü", query: "magic sparkle spell" },
];

function fmt(t: number) {
  const value = Math.max(
    0,
    Number.isFinite(t) ? t : 0
  );

  return `${String(Math.floor(value / 60)).padStart(
    2,
    "0"
  )}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function EditStudio() {
  const video = useRef<HTMLVideoElement>(null);
  const videoObject = useRef<string | null>(null);
  const localUrls = useRef<string[]>([]);

  const active = useRef<Map<string, HTMLAudioElement>>(
    new Map()
  );

  const clipsRef = useRef<Clip[]>([]);
  const preview = useRef<HTMLAudioElement | null>(null);
  const requestId = useRef(0);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);

  const [selected, setSelected] = useState<string | null>(
    null
  );

  const [category, setCategory] = useState(
    categories[0].label
  );

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [previewId, setPreviewId] = useState<
    string | null
  >(null);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  const stopClips = useCallback(() => {
    active.current.forEach((audio) => {
      audio.pause();
      audio.src = "";
    });

    active.current.clear();
  }, []);

  const stopPreview = useCallback(() => {
    preview.current?.pause();
    preview.current = null;
    setPreviewId(null);
  }, []);

  useEffect(() => {
    return () => {
      active.current.forEach((audio) => audio.pause());
      preview.current?.pause();

      if (videoObject.current) {
        URL.revokeObjectURL(videoObject.current);
      }

      localUrls.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );
    };
  }, []);

  const search = useCallback(
    async (text: string, cat: string) => {
      const id = ++requestId.current;

      setLoading(true);
      setError("");

      try {
        const term =
          text.trim() ||
          categories.find((c) => c.label === cat)?.query ||
          "funny";

        const response = await fetch(
          `https://sfxmint.com/api/v1/search?q=${encodeURIComponent(
            term
          )}&limit=30`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error(
            `Ses servisi yanıt vermedi (${response.status}).`
          );
        }

        const json: unknown = await response.json();

        const list: ApiSound[] = Array.isArray(json)
          ? json
          : json &&
              typeof json === "object" &&
              "candidates" in json &&
              Array.isArray(json.candidates)
            ? (json.candidates as ApiSound[])
            : [];

        const found: Sound[] = list
          .filter(
            (item) =>
              item.slug &&
              item.mp3_url &&
              (!item.license ||
                item.license === "CC0" ||
                item.license === "CC0-1.0")
          )
          .map((item) => ({
            id: `remote-${item.slug}`,
            name:
              item.title || item.slug || "Ses efekti",
            url: item.mp3_url!,
            duration: Math.max(
              0.1,
              (item.duration_ms || 1000) / 1000
            ),
            source:
              item.page_url ||
              `https://sfxmint.com/sounds/${item.slug}`,
            category: cat,
          }));

        if (id === requestId.current) {
          setSounds(found);
        }
      } catch (err) {
        if (id === requestId.current) {
          setSounds([]);
          setError(
            err instanceof Error
              ? err.message
              : "Sesler yüklenemedi."
          );
        }
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void search("", categories[0].label);
  }, [search]);

  function uploadVideo(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (
      !file.type.startsWith("video/") &&
      !/\.(mp4|webm|mov)$/i.test(file.name)
    ) {
      setError("MP4, WebM veya MOV video seç.");
      return;
    }

    video.current?.pause();
    stopClips();

    if (videoObject.current) {
      URL.revokeObjectURL(videoObject.current);
    }

    const url = URL.createObjectURL(file);
    videoObject.current = url;

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setTime(0);
    setPlaying(false);
    setClips([]);
    setSelected(null);
    setError("");
  }

  async function uploadSound(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    const added: Sound[] = [];

    for (const file of files) {
      if (
        !file.type.startsWith("audio/") &&
        !/\.(mp3|wav|ogg|m4a)$/i.test(file.name)
      ) {
        continue;
      }

      const url = URL.createObjectURL(file);
      localUrls.current.push(url);

      const len = await new Promise<number>((resolve) => {
        const audio = new Audio();
        audio.preload = "metadata";

        audio.onloadedmetadata = () =>
          resolve(
            Number.isFinite(audio.duration)
              ? audio.duration
              : 0
          );

        audio.onerror = () => resolve(0);
        audio.src = url;
      });

      if (len > 0) {
        added.push({
          id: crypto.randomUUID(),
          name: file.name,
          url,
          duration: len,
          source: "",
          category: "Dosyalarım",
        });
      }
    }

    setSounds((prev) => [...added, ...prev]);
  }

  function listen(sound: Sound) {
    if (previewId === sound.id) {
      stopPreview();
      return;
    }

    stopPreview();

    const audio = new Audio(sound.url);
    preview.current = audio;
    setPreviewId(sound.id);

    audio.onended = stopPreview;

    void audio.play().catch(() => {
      setError(
        "Ses oynatılamadı. Kaynak bağlantısını kontrol et."
      );
      stopPreview();
    });
  }

  function add(sound: Sound) {
    if (!videoUrl || duration <= 0) {
      setError("Önce video yükle.");
      return;
    }

    const start = clamp(
      time,
      0,
      Math.max(0, duration - 0.1)
    );

    const clip: Clip = {
      id: crypto.randomUUID(),
      sound,
      start,
      duration: Math.min(
        sound.duration,
        duration - start
      ),
      volume: 70,
    };

    setClips((prev) => [...prev, clip]);
    setSelected(clip.id);
    setError("");
  }

  function sync(t: number) {
    for (const clip of clipsRef.current) {
      const inRange =
        t >= clip.start &&
        t < clip.start + clip.duration;

      const audio = active.current.get(clip.id);

      if (!inRange) {
        if (audio) {
          audio.pause();
          active.current.delete(clip.id);
        }

        continue;
      }

      if (!audio) {
        const sound = new Audio(clip.sound.url);
        sound.volume = clip.volume / 100;

        sound.currentTime = Math.max(
          0,
          t - clip.start
        );

        active.current.set(clip.id, sound);

        void sound.play().catch(() => {
          active.current.delete(clip.id);
          setError("Ses kaynağı çalınamadı.");
        });
      } else {
        audio.volume = clip.volume / 100;

        const expected = t - clip.start;

        if (
          Math.abs(audio.currentTime - expected) > 0.45
        ) {
          audio.currentTime = expected;
        }
      }
    }
  }

  function seek(t: number) {
    if (!video.current) return;

    const next = clamp(t, 0, duration);
    video.current.currentTime = next;

    setTime(next);
    stopClips();

    if (!video.current.paused) {
      sync(next);
    }
  }

  async function toggle() {
    const currentVideo = video.current;
    if (!currentVideo) return;

    if (!currentVideo.paused) {
      currentVideo.pause();
      stopClips();
      return;
    }

    try {
      if (currentVideo.currentTime >= duration - 0.05) {
        seek(0);
      }

      await currentVideo.play();
      sync(currentVideo.currentTime);
    } catch {
      setError("Video oynatılamadı.");
    }
  }

  function update(id: string, patch: Partial<Clip>) {
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === id
          ? { ...clip, ...patch }
          : clip
      )
    );

    if (
      patch.start !== undefined ||
      patch.duration !== undefined
    ) {
      stopClips();
    }

    if (patch.volume !== undefined) {
      const audio = active.current.get(id);

      if (audio) {
        audio.volume = patch.volume / 100;
      }
    }
  }

  function remove(id: string) {
    active.current.get(id)?.pause();
    active.current.delete(id);

    setClips((prev) =>
      prev.filter((clip) => clip.id !== id)
    );

    if (selected === id) {
      setSelected(null);
    }
  }

  const chosen = clips.find(
    (clip) => clip.id === selected
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-violet/20 p-3 text-violet">
          <Clapperboard size={28} />
        </div>

        <div>
          <h1 className="text-3xl font-bold">
            HAGY Edit Studio
          </h1>

          <p className="text-sm text-white/50">
            Global Meme Sounds • Video Editor 4.0
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-bold">
            <Music2
              size={20}
              className="text-violet"
            />
            Hazır Ses Efektleri
          </h2>

          <p className="mb-3 text-xs text-white/50">
            İndirme gerekmez. Sesler çevrimiçi oynatılır.
          </p>

          <form
            className="mb-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void search(query, category);
            }}
          >
            <input
              aria-label="Ses ara"
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Boing, laugh, meme, punch..."
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-violet"
            />

            <button
              type="submit"
              className="rounded-lg bg-violet px-3"
              aria-label="Ara"
            >
              <Search size={18} />
            </button>
          </form>

          <div className="mb-4 flex flex-wrap gap-2">
            {categories.map((item) => (
              <button
                type="button"
                key={item.label}
                onClick={() => {
                  setCategory(item.label);
                  setQuery("");
                  void search("", item.label);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  category === item.label
                    ? "border-violet bg-violet/20"
                    : "border-white/10 bg-white/5"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 p-3 text-sm hover:border-violet">
            <Upload size={16} />
            Kendi MP3/WAV dosyanı ekle

            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              multiple
              onChange={uploadSound}
              className="hidden"
            />
          </label>

          {loading && (
            <p className="flex items-center gap-2 text-sm text-white/60">
              <Loader2
                size={16}
                className="animate-spin"
              />
              Sesler aranıyor...
            </p>
          )}

          {!loading && sounds.length === 0 && (
            <p className="py-6 text-center text-sm text-white/50">
              Bu aramada ses bulunamadı.
            </p>
          )}

          <div className="max-h-[540px] space-y-2 overflow-y-auto pr-1">
            {sounds.map((sound) => (
              <div
                key={sound.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-medium"
                      title={sound.name}
                    >
                      {sound.name}
                    </p>

                    <p className="text-xs text-white/40">
                      {sound.duration.toFixed(1)} sn
                    </p>
                  </div>

                  {sound.source && (
                    <a
                      href={sound.source}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Ses kaynağı"
                      title="Kaynak"
                      className="text-white/50 hover:text-white"
                    >
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => listen(sound)}
                    className="btn-ghost flex flex-1 items-center justify-center gap-1 text-xs"
                  >
                    {previewId === sound.id ? (
                      <Pause size={14} />
                    ) : (
                      <Play size={14} />
                    )}

                    {previewId === sound.id
                      ? "Durdur"
                      : "Dinle"}
                  </button>

                  <button
                    type="button"
                    onClick={() => add(sound)}
                    className="btn-primary flex flex-1 items-center justify-center gap-1 text-xs"
                  >
                    <Plus size={14} />
                    Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-5 text-white/40">
            Çevrimiçi sesler üçüncü taraf servisten
            alınır. Bağlantı ve servis erişimi gerekir.
          </p>

          {/* GLOBAL MEME SOUNDS */}
          <MemeSounds onAdd={add} />
        </aside>

        <section className="space-y-5">
          <div className="card p-5">
            {!videoUrl ? (
              <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-violet/30 bg-violet/5 p-6 text-center">
                <Upload
                  size={42}
                  className="text-violet"
                />

                <h2 className="text-xl font-bold">
                  Videonu Yükle
                </h2>

                <p className="text-sm text-white/50">
                  MP4, WebM veya desteklenen MOV
                </p>

                <span className="btn-primary">
                  Video Seç
                </span>

                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  onChange={uploadVideo}
                  className="hidden"
                />
              </label>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-white/70">
                    {videoName}
                  </p>

                  <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-2 text-xs">
                    Değiştir

                    <input
                      type="file"
                      accept="video/*"
                      onChange={uploadVideo}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4 flex min-h-64 items-center justify-center rounded-xl bg-black">
                  <video
                    ref={video}
                    src={videoUrl}
                    playsInline
                    preload="metadata"
                    className="max-h-[480px] w-full rounded-xl object-contain"
                    onLoadedMetadata={(event) => {
                      const d =
                        event.currentTarget.duration;

                      if (
                        Number.isFinite(d) &&
                        d > 0
                      ) {
                        setDuration(d);
                      } else {
                        setError(
                          "Video süresi okunamadı."
                        );
                      }
                    }}
                    onTimeUpdate={() => {
                      if (!video.current) return;

                      const current =
                        video.current.currentTime;

                      setTime(current);

                      if (!video.current.paused) {
                        sync(current);
                      }
                    }}
                    onPlay={() => setPlaying(true)}
                    onPause={() => {
                      setPlaying(false);
                      stopClips();
                    }}
                    onEnded={() => {
                      setPlaying(false);
                      stopClips();
                    }}
                    onError={() =>
                      setError("Video açılamadı.")
                    }
                  />
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggle}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet"
                  >
                    {playing ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>

                  <input
                    type="range"
                    min={0}
                    max={duration || 1}
                    step={0.01}
                    value={time}
                    onChange={(event) =>
                      seek(
                        Number(event.target.value)
                      )
                    }
                    className="min-w-0 flex-1 accent-violet"
                  />

                  <span className="shrink-0 text-xs text-white/60">
                    {fmt(time)} / {fmt(duration)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold">
                <Volume2
                  size={20}
                  className="text-violet"
                />
                Zaman Çizelgesi
              </h2>

              <span className="text-xs text-white/50">
                {clips.length} efekt
              </span>
            </div>

            {!videoUrl ? (
              <p className="py-10 text-center text-sm text-white/40">
                Önce video yükle.
              </p>
            ) : (
              <>
                <div className="mb-2 flex justify-between text-xs text-white/40">
                  <span>00:00</span>
                  <span>{fmt(duration / 2)}</span>
                  <span>{fmt(duration)}</span>
                </div>

                <div
                  className="relative mb-3 h-12 cursor-pointer overflow-hidden rounded-lg bg-violet/30"
                  onClick={(event) => {
                    const rect =
                      event.currentTarget.getBoundingClientRect();

                    seek(
                      ((event.clientX -
                        rect.left) /
                        rect.width) *
                        duration
                    );
                  }}
                >
                  <div className="flex h-full items-center px-4 text-xs">
                    🎬 {videoName}
                  </div>

                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
                    style={{
                      left: `${
                        duration
                          ? (time / duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div
                  className="relative overflow-hidden rounded-lg border border-white/10 bg-white/5"
                  style={{
                    minHeight: Math.max(
                      112,
                      clips.length * 40 + 12
                    ),
                  }}
                >
                  {clips.map((clip, index) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() =>
                        setSelected(clip.id)
                      }
                      className={`absolute flex h-9 items-center overflow-hidden rounded-lg border px-2 text-left text-xs ${
                        selected === clip.id
                          ? "border-white bg-violet"
                          : "border-emerald-400/40 bg-emerald-600/70"
                      }`}
                      style={{
                        top: `${8 + index * 40}px`,
                        left: `${
                          duration
                            ? (clip.start /
                                duration) *
                              100
                            : 0
                        }%`,
                        width: `${
                          duration
                            ? (clip.duration /
                                duration) *
                              100
                            : 0
                        }%`,
                        minWidth: 20,
                      }}
                      title={`${clip.start.toFixed(
                        1
                      )} sn`}
                    >
                      <span className="truncate">
                        🔊 {clip.sound.name}
                      </span>
                    </button>
                  ))}

                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/80"
                    style={{
                      left: `${
                        duration
                          ? (time / duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {chosen && (
                  <div className="mt-4 rounded-xl border border-violet/30 bg-violet/10 p-4">
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <h3 className="truncate text-sm font-bold">
                        {chosen.sound.name}
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          remove(chosen.id)
                        }
                        className="text-pink"
                        aria-label="Efekti sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <label className="block text-xs text-white/70">
                      Başlangıç:{" "}
                      {chosen.start.toFixed(1)} sn

                      <input
                        className="mt-2 w-full accent-violet"
                        type="range"
                        min={0}
                        max={Math.max(
                          0,
                          duration -
                            chosen.duration
                        )}
                        step={0.1}
                        value={chosen.start}
                        onChange={(event) =>
                          update(chosen.id, {
                            start: Number(
                              event.target.value
                            ),
                          })
                        }
                      />
                    </label>

                    <label className="mt-4 block text-xs text-white/70">
                      Ses: %{chosen.volume}

                      <input
                        className="mt-2 w-full accent-violet"
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={chosen.volume}
                        onChange={(event) =>
                          update(chosen.id, {
                            volume: Number(
                              event.target.value
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    stopClips();
                    setClips([]);
                    setSelected(null);
                    seek(0);
                  }}
                  className="mt-4 text-xs text-white/50 hover:text-white"
                >
                  Zaman Çizelgesini Temizle
                </button>
              </>
            )}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-pink/30 bg-pink/10 p-3 text-sm text-pink"
            >
              {error}
            </p>
          )}

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-white/50">
            <p className="mb-1 font-semibold text-white">
              HAGY Edit Studio 4.0
            </p>

            Hazır sesleri ve Global Meme
            efektlerini ara, dinle, videoya
            ekle ve başlangıç saniyesini
            ayarla. MP4 dışa aktarma henüz
            yoktur. Proje sayfa yenilenince
            sıfırlanır. Çevrimiçi sesler
            üçüncü taraf servise bağlıdır.
          </div>
        </section>
      </div>
    </main>
  );
}
