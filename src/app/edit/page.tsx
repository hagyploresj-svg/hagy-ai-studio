
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  Upload,
  Play,
  Pause,
  Volume2,
  Plus,
  Trash2,
  Clapperboard,
  Music2,
  RotateCcw,
} from "lucide-react";

type SoundEffect = {
  id: string;
  name: string;
  icon: string;
  frequency: number;
  type: OscillatorType;
  duration: number;
};

type AudioClip = {
  id: string;
  name: string;
  start: number;
  duration: number;
  volume: number;
  frequency: number;
  type: OscillatorType;
};

const effects: SoundEffect[] = [
  {
    id: "impact",
    name: "Cinematic Impact",
    icon: "💥",
    frequency: 90,
    type: "sine",
    duration: 0.7,
  },
  {
    id: "whoosh",
    name: "Whoosh",
    icon: "💨",
    frequency: 550,
    type: "sawtooth",
    duration: 0.5,
  },
  {
    id: "magic",
    name: "Magic Sparkle",
    icon: "✨",
    frequency: 880,
    type: "sine",
    duration: 0.8,
  },
  {
    id: "laser",
    name: "Laser",
    icon: "⚡",
    frequency: 650,
    type: "square",
    duration: 0.4,
  },
  {
    id: "bass",
    name: "Deep Bass",
    icon: "🔊",
    frequency: 65,
    type: "sine",
    duration: 1,
  },
  {
    id: "notification",
    name: "Gift Notification",
    icon: "🎁",
    frequency: 1100,
    type: "sine",
    duration: 0.5,
  },
];

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);

  return `${String(minutes).padStart(2, "0")}:${String(
    secs
  ).padStart(2, "0")}`;
}

export default function EditStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoUrlRef = useRef<string | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [selectedClip, setSelectedClip] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");

  const clipsRef = useRef<AudioClip[]>([]);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }

      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
    };
  }, []);

  function getAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    return audioContextRef.current;
  }

  function playTone(
    frequency: number,
    type: OscillatorType,
    length: number,
    volume = 0.4
  ) {
    try {
      const context = getAudioContext();

      if (context.state === "suspended") {
        void context.resume();
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(
        frequency,
        context.currentTime
      );

      gain.gain.setValueAtTime(
        Math.max(0.001, volume * 0.15),
        context.currentTime
      );

      gain.gain.exponentialRampToValueAtTime(
        0.001,
        context.currentTime + length
      );

      oscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start();
      oscillator.stop(context.currentTime + length);
    } catch {
      setError("Ses efekti oynatılamadı.");
    }
  }

  function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith("video/") &&
      !/\.(mp4|webm|mov)$/i.test(file.name)
    ) {
      setError("Lütfen MP4, WebM veya MOV video yükle.");
      return;
    }

    if (videoUrlRef.current) {
      URL.revokeObjectURL(videoUrlRef.current);
    }

    const url = URL.createObjectURL(file);

    videoUrlRef.current = url;

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setCurrentTime(0);
    setPlaying(false);
    setClips([]);
    setSelectedClip(null);
    setError("");

    lastTimeRef.current = 0;
    event.target.value = "";
  }

  function addEffect(effect: SoundEffect) {
    if (!videoUrl || duration <= 0) {
      setError("Önce bir video yükle.");
      return;
    }

    const start = Math.min(
      currentTime,
      Math.max(0, duration - effect.duration)
    );

    const clip: AudioClip = {
      id: crypto.randomUUID(),
      name: effect.name,
      start,
      duration: Math.min(effect.duration, duration - start),
      volume: 70,
      frequency: effect.frequency,
      type: effect.type,
    };

    setClips((previous) => [...previous, clip]);
    setSelectedClip(clip.id);
    setError("");

    playTone(
      effect.frequency,
      effect.type,
      effect.duration
    );
  }

  function updateClip(id: string, patch: Partial<AudioClip>) {
    setClips((previous) =>
      previous.map((clip) =>
        clip.id === id ? { ...clip, ...patch } : clip
      )
    );
  }

  function removeClip(id: string) {
    setClips((previous) =>
      previous.filter((clip) => clip.id !== id)
    );

    if (selectedClip === id) {
      setSelectedClip(null);
    }
  }

  function handleTimeUpdate() {
    const video = videoRef.current;

    if (!video) return;

    const nextTime = video.currentTime;
    const previousTime = lastTimeRef.current;

    if (nextTime < previousTime) {
      lastTimeRef.current = nextTime;
      setCurrentTime(nextTime);
      return;
    }

    for (const clip of clipsRef.current) {
      if (
        previousTime <= clip.start &&
        nextTime >= clip.start &&
        nextTime - previousTime < 0.5
      ) {
        playTone(
          clip.frequency,
          clip.type,
          clip.duration,
          clip.volume / 100
        );
      }
    }

    lastTimeRef.current = nextTime;
    setCurrentTime(nextTime);
  }

  function seek(value: number) {
    const video = videoRef.current;

    if (!video) return;

    video.currentTime = value;
    lastTimeRef.current = value;
    setCurrentTime(value);
  }

  async function togglePlay() {
    const video = videoRef.current;

    if (!video) return;

    if (video.paused) {
      try {
        const context = getAudioContext();
        await context.resume();

        if (video.currentTime === 0) {
          clipsRef.current
            .filter((clip) => clip.start === 0)
            .forEach((clip) => {
              playTone(
                clip.frequency,
                clip.type,
                clip.duration,
                clip.volume / 100
              );
            });
        }

        await video.play();
      } catch {
        setError("Video oynatılamadı.");
      }
    } else {
      video.pause();
    }
  }

  const activeClip = clips.find(
    (clip) => clip.id === selectedClip
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet/20 p-3 text-violet">
            <Clapperboard size={28} />
          </div>

          <div>
            <h1 className="text-3xl font-bold">
              HAGY Edit Studio
            </h1>

            <p className="mt-1 text-sm text-white/50">
              Video & Sound Effects Editor
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="card p-5">
          <div className="mb-5 flex items-center gap-2">
            <Volume2 size={20} className="text-violet" />

            <h2 className="font-bold">
              Ses Efektleri
            </h2>
          </div>

          <p className="mb-4 text-xs text-white/50">
            Bir efekt seçerek zaman çizelgesine ekle.
          </p>

          <div className="space-y-3">
            {effects.map((effect) => (
              <button
                key={effect.id}
                type="button"
                onClick={() => addEffect(effect)}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-violet/50 hover:bg-violet/10"
              >
                <span className="text-2xl">
                  {effect.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {effect.name}
                  </p>

                  <p className="text-xs text-white/40">
                    {effect.duration.toFixed(1)} sn
                  </p>
                </div>

                <Plus
                  size={18}
                  className="text-violet"
                />
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-violet/20 bg-violet/10 p-4">
            <p className="text-sm font-semibold">
              HAGY Sound Engine
            </p>

            <p className="mt-2 text-xs leading-5 text-white/60">
              Bu ilk sürümde sesler tarayıcıda
              oluşturulan sentetik efektlerdir.
              Gerçek ses dosyası kütüphanesini
              sonraki aşamada ekleyeceğiz.
            </p>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="card p-5">
            {!videoUrl ? (
              <label className="flex min-h-72 cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-violet/30 bg-violet/5 p-6 text-center hover:border-violet">
                <Upload
                  size={42}
                  className="text-violet"
                />

                <div>
                  <h2 className="text-xl font-bold">
                    Videonu Yükle
                  </h2>

                  <p className="mt-2 text-sm text-white/50">
                    MP4, WebM veya tarayıcının
                    desteklediği MOV dosyası
                  </p>
                </div>

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
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-white/70">
                    {videoName}
                  </p>

                  <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-2 text-xs hover:border-violet">
                    Değiştir

                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={uploadVideo}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="mt-4 flex min-h-64 items-center justify-center rounded-xl bg-black">
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    preload="metadata"
                    className="max-h-[480px] w-full rounded-xl object-contain"
                    onLoadedMetadata={(event) => {
                      const value =
                        event.currentTarget.duration;

                      if (
                        Number.isFinite(value) &&
                        value > 0
                      ) {
                        setDuration(value);
                      } else {
                        setError(
                          "Video süresi okunamadı. Farklı bir MP4 dene."
                        );
                      }
                    }}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />
                </div>

                <div className="mt-5 flex items-center gap-4">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet text-white"
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
                    value={currentTime}
                    onChange={(event) =>
                      seek(Number(event.target.value))
                    }
                    className="min-w-0 flex-1 accent-violet"
                  />

                  <span className="shrink-0 text-xs text-white/60">
                    {formatTime(currentTime)} /{" "}
                    {formatTime(duration)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Music2
                  size={20}
                  className="text-violet"
                />

                <h2 className="font-bold">
                  Zaman Çizelgesi
                </h2>
              </div>

              <span className="text-xs text-white/50">
                {clips.length} efekt
              </span>
            </div>

            {!videoUrl ? (
              <p className="py-10 text-center text-sm text-white/40">
                Zaman çizelgesini görmek için
                önce video yükle.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-white/40">
                  <span>00:00</span>
                  <span>{formatTime(duration / 2)}</span>
                  <span>{formatTime(duration)}</span>
                </div>

                <div
                  className="relative h-12 cursor-pointer overflow-hidden rounded-lg bg-violet/30"
                  onClick={(event) => {
                    const rect =
                      event.currentTarget.getBoundingClientRect();

                    const fraction =
                      (event.clientX - rect.left) /
                      rect.width;

                    seek(
                      Math.max(
                        0,
                        Math.min(duration, fraction * duration)
                      )
                    );
                  }}
                >
                  <div className="flex h-full items-center px-4 text-xs font-medium">
                    🎬 {videoName}
                  </div>

                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
                    style={{
                      left: `${
                        duration > 0
                          ? (currentTime / duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="relative min-h-20 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {clips.map((clip) => (
                    <button
                      key={clip.id}
                      type="button"
                      onClick={() =>
                        setSelectedClip(clip.id)
                      }
                      className={`absolute top-3 flex h-12 items-center overflow-hidden rounded-lg border px-2 text-left text-xs ${
                        selectedClip === clip.id
                          ? "border-white bg-violet"
                          : "border-emerald-400/40 bg-emerald-600/70"
                      }`}
                      style={{
                        left: `${
                          duration > 0
                            ? (clip.start / duration) * 100
                            : 0
                        }%`,
                        width: `${
                          duration > 0
                            ? (clip.duration / duration) * 100
                            : 0
                        }%`,
                        minWidth: "24px",
                      }}
                      title={`${clip.name} — ${clip.start.toFixed(
                        1
                      )}s`}
                    >
                      <span className="truncate">
                        🔊 {clip.name}
                      </span>
                    </button>
                  ))}

                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/80"
                    style={{
                      left: `${
                        duration > 0
                          ? (currentTime / duration) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {activeClip && (
                  <div className="rounded-xl border border-violet/30 bg-violet/10 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-sm font-bold">
                        {activeClip.name}
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          removeClip(activeClip.id)
                        }
                        className="text-pink"
                        title="Efekti sil"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <label className="block text-xs text-white/70">
                      Başlangıç:{" "}
                      {activeClip.start.toFixed(1)} saniye

                      <input
                        type="range"
                        min={0}
                        max={Math.max(
                          0,
                          duration - activeClip.duration
                        )}
                        step={0.1}
                        value={activeClip.start}
                        onChange={(event) =>
                          updateClip(activeClip.id, {
                            start: Number(
                              event.target.value
                            ),
                          })
                        }
                        className="mt-2 w-full accent-violet"
                      />
                    </label>

                    <label className="mt-4 block text-xs text-white/70">
                      Ses seviyesi: {activeClip.volume}%

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={activeClip.volume}
                        onChange={(event) =>
                          updateClip(activeClip.id, {
                            volume: Number(
                              event.target.value
                            ),
                          })
                        }
                        className="mt-2 w-full accent-violet"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        playTone(
                          activeClip.frequency,
                          activeClip.type,
                          activeClip.duration,
                          activeClip.volume / 100
                        )
                      }
                      className="btn-ghost mt-4 flex items-center gap-2 text-xs"
                    >
                      <Volume2 size={15} />
                      Efekti Dinle
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setClips([]);
                    setSelectedClip(null);
                    seek(0);
                  }}
                  className="flex items-center gap-2 text-xs text-white/50 hover:text-white"
                >
                  <RotateCcw size={15} />
                  Zaman Çizelgesini Temizle
                </button>
              </div>
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

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">
              Edit Studio — İlk Sürüm
            </p>

            <p className="mt-2 text-xs leading-6 text-white/50">
              Video yükleme, oynatma, efekt ekleme,
              zamanlama ve ses seviyesi ayarları
              kullanılabilir. MP4 dışa aktarma,
              gerçek ses dosyaları ve sürükle-bırak
              timeline sonraki geliştirmelerdir.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
