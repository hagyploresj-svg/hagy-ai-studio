
"use client";

import {
  ChangeEvent,
  CSSProperties,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
  Film,
  Music2,
  Type,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  Trash2,
  Download,
} from "lucide-react";

type Tool =
  | "media"
  | "audio"
  | "text"
  | "trim"
  | "settings"
  | "effects";

const tools = [
  { id: "media", label: "Medya", icon: Film },
  { id: "audio", label: "Sesler", icon: Music2 },
  { id: "text", label: "Metin", icon: Type },
  { id: "trim", label: "Kes", icon: Scissors },
  {
    id: "settings",
    label: "Ayarlar",
    icon: SlidersHorizontal,
  },
  {
    id: "effects",
    label: "Efektler",
    icon: Sparkles,
  },
] as const;

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";

  const seconds = Math.floor(Math.max(0, value));
  const minutes = Math.floor(seconds / 60);

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0")
  );
}

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [activeTool, setActiveTool] =
    useState<Tool>("media");

  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [textOverlay, setTextOverlay] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [filter, setFilter] = useState("none");

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.volume = volume / 100;
    videoRef.current.playbackRate = speed;
  }, [volume, speed, videoUrl]);

  function uploadVideo(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Lütfen bir video dosyası seç.");
      return;
    }

    videoRef.current?.pause();

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }

    const url = URL.createObjectURL(file);

    objectUrlRef.current = url;

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setPlaying(false);
    setActiveTool("media");

    event.target.value = "";
  }

  function seek(time: number) {
    const video = videoRef.current;
    if (!video) return;

    const next = Math.max(
      0,
      Math.min(duration || 0, time)
    );

    video.currentTime = next;
    setCurrentTime(next);
  }

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    if (trimEnd > trimStart) {
      if (
        video.currentTime < trimStart ||
        video.currentTime >= trimEnd
      ) {
        seek(trimStart);
      }
    }

    try {
      await video.play();
    } catch {
      setPlaying(false);
    }
  }

  function resetEditor() {
    videoRef.current?.pause();

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setVideoUrl("");
    setVideoName("");
    setDuration(0);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setPlaying(false);
    setTextOverlay("");
    setVolume(100);
    setSpeed(1);
    setFilter("none");
    setActiveTool("media");
  }

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    if (
      trimEnd > trimStart &&
      video.currentTime >= trimEnd &&
      !video.paused
    ) {
      video.pause();
      video.currentTime = trimStart;
      setCurrentTime(trimStart);
      return;
    }

    setCurrentTime(video.currentTime);
  }

  const selectedEnd = trimEnd || duration;

  const videoStyle: CSSProperties = {
    filter,
  };

  const progress =
    duration > 0
      ? Math.min(100, (currentTime / duration) * 100)
      : 0;

  return (
    <main className="flex min-h-screen flex-col bg-[#090b12] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111420] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/edit"
            className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
            title="Eski editöre dön"
          >
            <ArrowLeft size={18} />
          </Link>

          <Clapperboard
            size={23}
            className="text-violet-400"
          />

          <div>
            <h1 className="text-sm font-bold tracking-wide">
              HAGY EDITOR
            </h1>
            <p className="text-xs text-white/40">
              {videoName || "Yeni proje"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              fileInputRef.current?.click()
            }
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
          >
            <Upload size={15} />
            Video Yükle
          </button>

          <button
            disabled
            title="MP4 dışa aktarma sonraki aşamada eklenecek"
            className="flex cursor-not-allowed items-center gap-2 rounded-lg bg-violet-600/50 px-3 py-2 text-xs font-semibold text-white/60"
          >
            <Download size={15} />
            Dışa Aktar
          </button>
        </div>
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={uploadVideo}
        className="hidden"
      />

      <div className="flex min-h-[540px] flex-1 flex-col lg:flex-row">
        <aside className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#131622] p-2 lg:w-[88px] lg:flex-col lg:border-b-0 lg:border-r">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                onClick={() =>
                  setActiveTool(tool.id)
                }
                className={`flex min-w-[72px] flex-col items-center gap-2 rounded-xl px-2 py-4 text-xs transition ${
                  activeTool === tool.id
                    ? "bg-violet-600/25 text-violet-300"
                    : "text-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={21} />
                {tool.label}
              </button>
            );
          })}
        </aside>

        <section className="w-full border-b border-white/10 bg-[#171a28] p-4 lg:w-[300px] lg:border-b-0 lg:border-r">
          {activeTool === "media" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Medya Kütüphanesi
              </h2>

              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-violet-400/50 bg-violet-500/10 p-6 text-sm hover:bg-violet-500/20"
              >
                <Upload className="text-violet-400" />
                Video seç veya değiştir
              </button>

              {videoName && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Film
                    size={20}
                    className="mb-2 text-violet-400"
                  />
                  <p className="break-all text-sm">
                    {videoName}
                  </p>
                  <p className="mt-2 text-xs text-white/40">
                    {formatTime(duration)}
                  </p>
                </div>
              )}

              <p className="text-xs leading-5 text-white/40">
                Video yalnızca tarayıcında açılır.
                Sunucuya yüklenmez.
              </p>
            </div>
          )}

          {activeTool === "audio" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Ses Kütüphanesi
              </h2>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                <Music2 className="mb-3 text-violet-300" />
                <p className="text-sm font-medium">
                  Global Meme Sounds
                </p>
                <p className="mt-2 text-xs leading-5 text-white/60">
                  Mevcut meme kütüphanemizi bu
                  çalışma alanına sonraki adımda
                  bağlayacağız.
                </p>
              </div>

              <Link
                href="/edit"
                className="block rounded-lg bg-white/10 px-4 py-3 text-center text-xs hover:bg-white/20"
              >
                Mevcut ses editörünü aç
              </Link>
            </div>
          )}

          {activeTool === "text" && (
            <div className="space-y-5">
              <h2 className="font-semibold">
                Video Üzerine Metin
              </h2>

              <textarea
                value={textOverlay}
                onChange={(e) =>
                  setTextOverlay(e.target.value)
                }
                placeholder="Videoya yazı ekle..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none focus:border-violet-400"
              />

              <div>
                <label className="mb-2 block text-xs text-white/60">
                  Yazı boyutu: {textSize}px
                </label>
                <input
                  type="range"
                  min="16"
                  max="72"
                  value={textSize}
                  onChange={(e) =>
                    setTextSize(Number(e.target.value))
                  }
                  className="w-full accent-violet-500"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-xs text-white/60">
                  Yazı rengi
                </label>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) =>
                    setTextColor(e.target.value)
                  }
                  className="h-9 w-12 cursor-pointer"
                />
              </div>

              <button
                onClick={() => setTextOverlay("")}
                className="flex items-center gap-2 text-xs text-red-300"
              >
                <Trash2 size={15} />
                Metni kaldır
              </button>
            </div>
          )}

          {activeTool === "trim" && (
            <div className="space-y-5">
              <h2 className="font-semibold">
                Video Kesme
              </h2>

              <p className="text-xs leading-5 text-white/50">
                Videonun oynatılacak başlangıç
                ve bitiş noktalarını seç.
              </p>

              <div>
                <label className="mb-2 block text-xs">
                  Başlangıç: {formatTime(trimStart)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.1}
                  value={trimStart}
                  disabled={!videoUrl || duration <= 0}
                  onChange={(e) => {
                    const value = Number(
                      e.target.value
                    );
                    const next = Math.min(
                      value,
                      Math.max(0, selectedEnd - 0.1)
                    );
                    setTrimStart(next);
                    seek(next);
                  }}
                  className="w-full accent-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs">
                  Bitiş: {formatTime(selectedEnd)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={Math.max(duration, 0.1)}
                  step={0.1}
                  value={selectedEnd}
                  disabled={!videoUrl || duration <= 0}
                  onChange={(e) => {
                    const next = Math.max(
                      Number(e.target.value),
                      trimStart + 0.1
                    );
                    setTrimEnd(
                      Math.min(duration, next)
                    );
                  }}
                  className="w-full accent-violet-500"
                />
              </div>

              <div className="rounded-lg bg-black/20 p-3 text-sm">
                Seçilen süre:{" "}
                {Math.max(
                  0,
                  selectedEnd - trimStart
                ).toFixed(1)}{" "}
                saniye
              </div>

              <button
                onClick={() => {
                  setTrimStart(0);
                  setTrimEnd(duration);
                  seek(0);
                }}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs"
              >
                <RotateCcw size={15} />
                Kesimi sıfırla
              </button>
            </div>
          )}

          {activeTool === "settings" && (
            <div className="space-y-5">
              <h2 className="font-semibold">
                Video Ayarları
              </h2>

              <div>
                <label className="mb-3 flex items-center gap-2 text-sm">
                  {volume === 0 ? (
                    <VolumeX size={17} />
                  ) : (
                    <Volume2 size={17} />
                  )}
                  Ses: %{volume}
                </label>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) =>
                    setVolume(Number(e.target.value))
                  }
                  className="w-full accent-violet-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">
                  Oynatma Hızı
                </label>

                <select
                  value={speed}
                  onChange={(e) =>
                    setSpeed(Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-white/10 bg-[#24283a] p-3 text-sm"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </select>
              </div>
            </div>
          )}

          {activeTool === "effects" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Görsel Efektler
              </h2>

              {[
                { name: "Normal", value: "none" },
                {
                  name: "Siyah Beyaz",
                  value: "grayscale(1)",
                },
                {
                  name: "Vintage",
                  value: "sepia(0.8)",
                },
                {
                  name: "Canlı Renkler",
                  value: "saturate(1.8)",
                },
                {
                  name: "Kontrast",
                  value: "contrast(1.5)",
                },
                {
                  name: "Parlak",
                  value: "brightness(1.3)",
                },
              ].map((effect) => (
                <button
                  key={effect.name}
                  onClick={() =>
                    setFilter(effect.value)
                  }
                  className={`block w-full rounded-lg border p-3 text-left text-sm ${
                    filter === effect.value
                      ? "border-violet-400 bg-violet-500/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  {effect.name}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="flex min-h-[420px] flex-1 flex-col bg-[#0b0d16] p-4">
          <div className="flex flex-1 items-center justify-center">
            {videoUrl ? (
              <div className="relative flex max-h-[65vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  preload="metadata"
                  style={videoStyle}
                  className="max-h-[65vh] w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const value =
                      e.currentTarget.duration;

                    if (
                      Number.isFinite(value) &&
                      value > 0
                    ) {
                      setDuration(value);
                      setTrimEnd(value);
                    }
                  }}
                  onTimeUpdate={onTimeUpdate}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />

                {textOverlay && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-5">
                    <p
                      style={{
                        fontSize: textSize,
                        color: textColor,
                        textShadow:
                          "0 2px 8px rgba(0,0,0,0.9)",
                      }}
                      className="max-w-full break-words text-center font-bold"
                    >
                      {textOverlay}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="flex min-h-[300px] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/15 bg-[#151826] p-8 hover:border-violet-400/50"
              >
                <div className="rounded-full bg-violet-500/15 p-5">
                  <Upload
                    size={35}
                    className="text-violet-400"
                  />
                </div>

                <h2 className="text-xl font-bold">
                  Videonu Yükle
                </h2>

                <p className="text-center text-sm text-white/50">
                  Düzenlemeye başlamak için
                  bilgisayarından bir video seç.
                </p>

                <span className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold">
                  Video Seç
                </span>
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              onClick={() =>
                seek(
                  Math.max(
                    trimStart,
                    currentTime - 5
                  )
                )
              }
              disabled={!videoUrl}
              className="text-sm text-white/60 disabled:opacity-30"
            >
              -5 sn
            </button>

            <button
              onClick={togglePlay}
              disabled={!videoUrl}
              className="rounded-full bg-violet-600 p-4 hover:bg-violet-500 disabled:opacity-30"
            >
              {playing ? (
                <Pause size={22} />
              ) : (
                <Play size={22} />
              )}
            </button>

            <button
              onClick={() =>
                seek(
                  Math.min(
                    selectedEnd,
                    currentTime + 5
                  )
                )
              }
              disabled={!videoUrl}
              className="text-sm text-white/60 disabled:opacity-30"
            >
              +5 sn
            </button>

            <span className="text-xs tabular-nums text-white/50">
              {formatTime(currentTime)} /{" "}
              {formatTime(duration)}
            </span>
          </div>
        </section>
      </div>

      <section className="border-t border-white/10 bg-[#141725] p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Zaman Çizelgesi
          </h2>

          <button
            onClick={resetEditor}
            disabled={!videoUrl}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-30"
          >
            <Trash2 size={14} />
            Projeyi Temizle
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="w-12 text-xs text-white/40">
            {formatTime(0)}
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.05}
            value={currentTime}
            disabled={!videoUrl || duration <= 0}
            onChange={(e) =>
              seek(Number(e.target.value))
            }
            className="w-full accent-violet-500"
          />

          <span className="w-12 text-right text-xs text-white/40">
            {formatTime(duration)}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex min-h-14 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Video
            </span>

            <div className="relative h-14 flex-1 overflow-hidden rounded-lg bg-[#24283a]">
              {videoUrl && (
                <>
                  <div
                    className="absolute inset-y-0 rounded-lg bg-blue-600/65"
                    style={{
                      left: `${
                        duration
                          ? (trimStart / duration) *
                            100
                          : 0
                      }%`,
                      width: `${
                        duration
                          ? ((selectedEnd -
                              trimStart) /
                              duration) *
                            100
                          : 100
                      }%`,
                    }}
                  />

                  <div className="relative z-10 flex h-full items-center gap-2 px-3">
                    <Film size={17} />
                    <span className="truncate text-xs">
                      {videoName}
                    </span>
                  </div>

                  <div
                    className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white"
                    style={{
                      left: `${progress}%`,
                    }}
                  />
                </>
              )}
            </div>
          </div>

          <div className="flex min-h-11 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Ses
            </span>

            <div className="flex h-11 flex-1 items-center rounded-lg border border-dashed border-emerald-500/20 bg-emerald-500/5 px-3 text-xs text-white/35">
              Ses klipleri yakında
            </div>
          </div>

          <div className="flex min-h-11 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Metin
            </span>

            <div className="flex h-11 flex-1 items-center rounded-lg bg-[#24283a] px-3">
              {textOverlay ? (
                <div className="flex items-center gap-2 rounded bg-violet-600/60 px-3 py-2 text-xs">
                  <Type size={13} />
                  <span className="max-w-48 truncate">
                    {textOverlay}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-white/35">
                  Henüz metin eklenmedi
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/35">
          Önizleme ve kesim noktaları bu
          sürümde çalışır. MP4 oluşturma,
          çoklu klip düzenleme ve ses
          miksajı henüz eklenmedi.
        </p>
      </section>
    </main>
  );
}
