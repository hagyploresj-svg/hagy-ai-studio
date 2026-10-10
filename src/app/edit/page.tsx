
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
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
  FileAudio,
} from "lucide-react";

type Sound = {
  id: string;
  name: string;
  url: string;
  duration: number;
};

type Clip = {
  id: string;
  soundId: string;
  start: number;
  duration: number;
  volume: number;
};

function fmt(value: number) {
  const seconds = Math.max(
    0,
    Number.isFinite(value) ? value : 0
  );

  return `${String(Math.floor(seconds / 60)).padStart(
    2,
    "0"
  )}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export default function EditStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string | null>(null);
  const soundsRef = useRef<Sound[]>([]);
  const clipsRef = useRef<Clip[]>([]);
  const audioRef = useRef<Map<string, HTMLAudioElement>>(
    new Map()
  );

  const dragRef = useRef<{
    id: string;
    x: number;
    start: number;
    width: number;
  } | null>(null);

  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");

  useEffect(() => {
    soundsRef.current = sounds;
  }, [sounds]);

  useEffect(() => {
    clipsRef.current = clips;
  }, [clips]);

  useEffect(() => {
    const audioElements = audioRef.current;

    return () => {
      if (videoUrlRef.current) {
        URL.revokeObjectURL(videoUrlRef.current);
      }

      soundsRef.current.forEach((sound) => {
        URL.revokeObjectURL(sound.url);
      });

      audioElements.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });

      audioElements.clear();
    };
  }, []);

  function stopAudio() {
    audioRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });

    audioRef.current.clear();
  }

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

    videoRef.current?.pause();
    stopAudio();

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
    setSelectedId(null);
    setError("");
  }

  async function uploadSounds(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";

    const accepted: Sound[] = [];

    for (const file of files) {
      if (
        !file.type.startsWith("audio/") &&
        !/\.(mp3|wav|ogg|m4a)$/i.test(file.name)
      ) {
        continue;
      }

      const url = URL.createObjectURL(file);

      try {
        const length = await new Promise<number>(
          (resolve, reject) => {
            const probe = new Audio();

            probe.preload = "metadata";

            probe.onloadedmetadata = () =>
              resolve(probe.duration);

            probe.onerror = () =>
              reject(new Error("Ses okunamadı"));

            probe.src = url;
          }
        );

        if (
          !Number.isFinite(length) ||
          length <= 0
        ) {
          throw new Error("Süre okunamadı");
        }

        accepted.push({
          id: crypto.randomUUID(),
          name: file.name,
          url,
          duration: length,
        });
      } catch {
        URL.revokeObjectURL(url);
      }
    }

    if (accepted.length) {
      setSounds((prev) => [...prev, ...accepted]);
    }

    setError(
      accepted.length === files.length
        ? ""
        : "Bazı ses dosyaları okunamadı. MP3 veya WAV deneyebilirsin."
    );
  }

  function playSound(
    sound: Sound,
    volume = 0.7,
    offset = 0,
    clipId?: string
  ) {
    const audio = new Audio(sound.url);

    audio.volume = Math.min(
      1,
      Math.max(0, volume)
    );

    audio.currentTime = Math.max(0, offset);

    const id = clipId || crypto.randomUUID();

    audioRef.current.get(id)?.pause();
    audioRef.current.set(id, audio);

    audio.onended = () => {
      if (audioRef.current.get(id) === audio) {
        audioRef.current.delete(id);
      }
    };

    void audio.play().catch(() => {
      setError(
        "Ses oynatılamadı. Tarayıcının ses iznini kontrol et."
      );
    });
  }

  function addClip(sound: Sound) {
    if (!videoUrl || duration <= 0) {
      setError("Önce bir video yükle.");
      return;
    }

    const start = Math.min(
      currentTime,
      Math.max(0, duration - 0.1)
    );

    const clip: Clip = {
      id: crypto.randomUUID(),
      soundId: sound.id,
      start,
      duration: Math.min(
        sound.duration,
        duration - start
      ),
      volume: 70,
    };

    setClips((prev) => [...prev, clip]);
    setSelectedId(clip.id);
    setError("");
  }

  function syncAudio(time: number) {
    for (const clip of clipsRef.current) {
      const sound = soundsRef.current.find(
        (item) => item.id === clip.soundId
      );

      if (!sound) continue;

      const active =
        time >= clip.start &&
        time < clip.start + clip.duration;

      const existing = audioRef.current.get(clip.id);

      if (!active) {
        if (existing) {
          existing.pause();
          audioRef.current.delete(clip.id);
        }

        continue;
      }

      if (!existing) {
        playSound(
          sound,
          clip.volume / 100,
          time - clip.start,
          clip.id
        );
      } else {
        existing.volume = clip.volume / 100;

        const expected = time - clip.start;

        if (
          Math.abs(
            existing.currentTime - expected
          ) > 0.4
        ) {
          existing.currentTime = expected;
        }
      }
    }
  }

  function timeUpdate() {
    const video = videoRef.current;

    if (!video) return;

    const time = video.currentTime;

    setCurrentTime(time);

    if (!video.paused) {
      syncAudio(time);
    }
  }

  function seek(time: number) {
    const video = videoRef.current;

    if (!video) return;

    const next = Math.max(
      0,
      Math.min(duration, time)
    );

    video.currentTime = next;
    setCurrentTime(next);

    stopAudio();

    if (!video.paused) {
      syncAudio(next);
    }
  }

  async function togglePlay() {
    const video = videoRef.current;

    if (!video) return;

    if (!video.paused) {
      video.pause();
      stopAudio();
      return;
    }

    try {
      if (
        duration > 0 &&
        video.currentTime >= duration - 0.05
      ) {
        seek(0);
      }

      await video.play();
      syncAudio(video.currentTime);
    } catch {
      setError(
        "Video oynatılamadı. Dosya biçimini kontrol et."
      );
    }
  }

  function updateClip(
    id: string,
    patch: Partial<Clip>
  ) {
    setClips((prev) =>
      prev.map((clip) =>
        clip.id === id
          ? { ...clip, ...patch }
          : clip
      )
    );

    const audio = audioRef.current.get(id);

    if (
      audio &&
      patch.volume !== undefined
    ) {
      audio.volume = patch.volume / 100;
    }
  }

  function removeClip(id: string) {
    const audio = audioRef.current.get(id);

    audio?.pause();
    audioRef.current.delete(id);

    setClips((prev) =>
      prev.filter((clip) => clip.id !== id)
    );

    if (selectedId === id) {
      setSelectedId(null);
    }
  }

  function dragStart(
    event: PointerEvent<HTMLButtonElement>,
    clip: Clip
  ) {
    if (!duration) return;

    const width =
      event.currentTarget.parentElement
        ?.getBoundingClientRect().width || 1;

    dragRef.current = {
      id: clip.id,
      x: event.clientX,
      start: clip.start,
      width,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    setSelectedId(clip.id);
  }

  function dragMove(
    event: PointerEvent<HTMLButtonElement>
  ) {
    const drag = dragRef.current;

    if (!drag || !duration) return;

    const clip = clipsRef.current.find(
      (item) => item.id === drag.id
    );

    if (!clip) return;

    const next = Math.max(
      0,
      Math.min(
        duration - clip.duration,
        drag.start +
          ((event.clientX - drag.x) /
            drag.width) *
            duration
      )
    );

    updateClip(drag.id, {
      start: Math.round(next * 10) / 10,
    });
  }

  const selected = clips.find(
    (clip) => clip.id === selectedId
  );

  const selectedSound = sounds.find(
    (sound) => sound.id === selected?.soundId
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

          <p className="mt-1 text-sm text-white/50">
            Video & Sound Effects Editor 2.0
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="card p-5">
          <h2 className="mb-2 flex items-center gap-2 font-bold">
            <Music2
              className="text-violet"
              size={20}
            />
            Ses Kütüphanem
          </h2>

          <p className="mb-4 text-xs leading-5 text-white/50">
            Kendi MP3, WAV, OGG veya M4A
            seslerini yükle. Sesler sadece
            bu tarayıcı oturumunda tutulur.
          </p>

          <label className="btn-primary flex cursor-pointer items-center justify-center gap-2 text-center">
            <FileAudio size={18} />
            Ses Dosyası Yükle

            <input
              type="file"
              multiple
              accept="audio/*,.mp3,.wav,.ogg,.m4a"
              onChange={uploadSounds}
              className="hidden"
            />
          </label>

          <div className="mt-5 space-y-2">
            {sounds.length === 0 && (
              <p className="rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-white/40">
                Henüz ses eklenmedi.
              </p>
            )}

            {sounds.map((sound) => (
              <div
                key={sound.id}
                className="rounded-xl border border-white/10 bg-white/5 p-3"
              >
                <p
                  className="truncate text-sm font-medium"
                  title={sound.name}
                >
                  {sound.name}
                </p>

                <p className="mt-1 text-xs text-white/40">
                  {fmt(sound.duration)} sn
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost flex flex-1 items-center justify-center gap-1 text-xs"
                    onClick={() =>
                      playSound(sound)
                    }
                  >
                    <Play size={14} />
                    Dinle
                  </button>

                  <button
                    type="button"
                    className="btn-primary flex flex-1 items-center justify-center gap-1 text-xs"
                    onClick={() =>
                      addClip(sound)
                    }
                  >
                    <Plus size={14} />
                    Ekle
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-violet/20 bg-violet/10 p-4 text-xs leading-5 text-white/60">
            Aslan, gök gürültüsü, whoosh
            veya hediye seslerini kendi
            dosyalarınla ekleyebilirsin.
            Hazır efekt paketi henüz eklenmedi.
          </div>
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
                  MP4, WebM veya tarayıcının
                  desteklediği MOV
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
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm text-white/70">
                    {videoName}
                  </p>

                  <label className="cursor-pointer rounded-lg border border-white/20 px-3 py-2 text-xs">
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
                          "Video süresi okunamadı."
                        );
                      }
                    }}
                    onTimeUpdate={timeUpdate}
                    onPlay={() =>
                      setPlaying(true)
                    }
                    onPause={() => {
                      setPlaying(false);
                      stopAudio();
                    }}
                    onEnded={() => {
                      setPlaying(false);
                      stopAudio();
                    }}
                    onError={() =>
                      setError(
                        "Video açılamadı. Farklı bir MP4 veya WebM dene."
                      )
                    }
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
                      seek(
                        Number(
                          event.target.value
                        )
                      )
                    }
                    className="min-w-0 flex-1 accent-violet"
                  />

                  <span className="shrink-0 text-xs text-white/60">
                    {fmt(currentTime)} /{" "}
                    {fmt(duration)}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="card p-5">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold">
                <Volume2
                  size={20}
                  className="text-violet"
                />
                Zaman Çizelgesi
              </h2>

              <span className="text-xs text-white/50">
                {clips.length} ses klibi
              </span>
            </div>

            {!videoUrl ? (
              <p className="py-10 text-center text-sm text-white/40">
                Önce video yükle.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-white/40">
                  <span>00:00</span>
                  <span>
                    {fmt(duration / 2)}
                  </span>
                  <span>
                    {fmt(duration)}
                  </span>
                </div>

                <div
                  className="relative h-12 cursor-pointer overflow-hidden rounded-lg bg-violet/30"
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
                  <div className="flex h-full items-center px-4 text-xs font-medium">
                    🎬 {videoName}
                  </div>

                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
                    style={{
                      left: `${
                        duration
                          ? (currentTime /
                              duration) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <div className="relative min-h-24 rounded-lg border border-white/10 bg-white/5">
                  {clips.map(
                    (clip, index) => (
                      <button
                        key={clip.id}
                        type="button"
                        onPointerDown={(
                          event
                        ) =>
                          dragStart(
                            event,
                            clip
                          )
                        }
                        onPointerMove={
                          dragMove
                        }
                        onPointerUp={() => {
                          dragRef.current =
                            null;
                        }}
                        onPointerCancel={() => {
                          dragRef.current =
                            null;
                        }}
                        onClick={() =>
                          setSelectedId(
                            clip.id
                          )
                        }
                        className={`absolute flex h-9 touch-none items-center overflow-hidden rounded-lg border px-2 text-left text-xs ${
                          selectedId ===
                          clip.id
                            ? "border-white bg-violet"
                            : "border-emerald-400/40 bg-emerald-600/70"
                        }`}
                        style={{
                          top: `${
                            8 +
                            (index % 2) *
                              42
                          }px`,
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
                          minWidth:
                            "20px",
                        }}
                        title="Sürükleyerek zamanını değiştir"
                      >
                        <span className="truncate">
                          🔊{" "}
                          {sounds.find(
                            (sound) =>
                              sound.id ===
                              clip.soundId
                          )?.name ||
                            "Ses"}
                        </span>
                      </button>
                    )
                  )}

                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white/80"
                    style={{
                      left: `${
                        duration
                          ? (currentTime /
                              duration) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {selected && (
                  <div className="rounded-xl border border-violet/30 bg-violet/10 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <h3 className="truncate text-sm font-bold">
                        {selectedSound?.name}
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          removeClip(
                            selected.id
                          )
                        }
                        className="text-pink"
                        title="Klibi sil"
                      >
                        <Trash2
                          size={18}
                        />
                      </button>
                    </div>

                    <label className="block text-xs text-white/70">
                      Başlangıç:{" "}
                      {selected.start.toFixed(
                        1
                      )}{" "}
                      saniye

                      <input
                        type="range"
                        min={0}
                        max={Math.max(
                          0,
                          duration -
                            selected.duration
                        )}
                        step={0.1}
                        value={
                          selected.start
                        }
                        onChange={(
                          event
                        ) =>
                          updateClip(
                            selected.id,
                            {
                              start:
                                Number(
                                  event
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        className="mt-2 w-full accent-violet"
                      />
                    </label>

                    <label className="mt-4 block text-xs text-white/70">
                      Ses seviyesi:{" "}
                      {selected.volume}%

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={
                          selected.volume
                        }
                        onChange={(
                          event
                        ) =>
                          updateClip(
                            selected.id,
                            {
                              volume:
                                Number(
                                  event
                                    .target
                                    .value
                                ),
                            }
                          )
                        }
                        className="mt-2 w-full accent-violet"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        if (
                          selectedSound
                        ) {
                          playSound(
                            selectedSound,
                            selected.volume /
                              100
                          );
                        }
                      }}
                      className="btn-ghost mt-4 flex items-center gap-2 text-xs"
                    >
                      <Play size={15} />
                      Efekti Dinle
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    stopAudio();
                    setClips([]);
                    setSelectedId(null);
                    seek(0);
                  }}
                  className="flex items-center gap-2 text-xs text-white/50 hover:text-white"
                >
                  <RotateCcw
                    size={15}
                  />
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
              Edit Studio 2.0 — Ses Düzenleme
            </p>

            <p className="mt-2 text-xs leading-6 text-white/50">
              Gerçek ses dosyası yükleme,
              birden fazla ses klibi,
              sürükleyerek zamanlama ve ses
              seviyesi ayarı kullanılabilir.
              MP4 dışa aktarma ve hazır
              telif uyumlu ses paketi henüz
              yoktur. Düzenleme tarayıcıda
              yapılır; sayfayı yenilersen
              proje sıfırlanır.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
