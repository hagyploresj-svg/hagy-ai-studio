
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
  Download,
  Film,
  Music2,
  Pause,
  Play,
  Plus,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Type,
  Upload,
} from "lucide-react";
import MemeSounds from "../MemeSounds";

type Tool =
  | "media"
  | "audio"
  | "text"
  | "trim"
  | "settings"
  | "effects";

type Sound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};

type AudioClip = {
  id: string;
  name: string;
  url: string;
  start: number;
  duration: number;
};

type Segment = {
  id: string;
  start: number;
  end: number;
};

const tools = [
  { id: "media", label: "Medya", icon: Film },
  { id: "audio", label: "Sesler", icon: Music2 },
  { id: "text", label: "Metin", icon: Type },
  { id: "trim", label: "Kes", icon: Scissors },
  { id: "settings", label: "Ayarlar", icon: SlidersHorizontal },
  { id: "effects", label: "Efektler", icon: Sparkles },
] as const;

const effects = [
  { name: "Normal", value: "none" },
  { name: "Siyah Beyaz", value: "grayscale(1)" },
  { name: "Vintage", value: "sepia(0.8)" },
  { name: "Canlı Renkler", value: "saturate(1.8)" },
  { name: "Kontrast", value: "contrast(1.5)" },
  { name: "Parlak", value: "brightness(1.3)" },
  { name: "Bulanık", value: "blur(2px)" },
  { name: "Soğuk", value: "hue-rotate(35deg)" },
];

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function formatTime(n: number) {
  const s = Math.floor(Math.max(0, n || 0));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const audioPlayers = useRef<Map<string, HTMLAudioElement>>(
    new Map()
  );
  const objectUrls = useRef<string[]>([]);
  const dragRef = useRef(false);

  const [tool, setTool] = useState<Tool>("media");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] =
    useState<string | null>(null);

  const [clips, setClips] = useState<AudioClip[]>([]);
  const [text, setText] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPosition, setTextPosition] = useState({
    x: 50,
    y: 50,
  });

  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [filter, setFilter] = useState("none");

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return () => {
      objectUrls.current.forEach(URL.revokeObjectURL);
      audioPlayers.current.forEach((audio) => audio.pause());
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume / 100;
    video.playbackRate = speed;
  }, [volume, speed, videoUrl]);

  useEffect(() => {
    for (const clip of clips) {
      let audio = audioPlayers.current.get(clip.id);

      if (!audio) {
        audio = new Audio(clip.url);
        audioPlayers.current.set(clip.id, audio);
      }

      const offset = time - clip.start;
      const active =
        playing && offset >= 0 && offset < clip.duration;

      if (!active) {
        audio.pause();
        continue;
      }

      if (audio.readyState >= 1) {
        try {
          if (Math.abs(audio.currentTime - offset) > 0.4) {
            audio.currentTime = offset;
          }
        } catch {}
      }

      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }
  }, [clips, playing, time]);

  function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMessage("Lütfen bir video seç.");
      return;
    }

    videoRef.current?.pause();

    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setTime(0);
    setSegments([]);
    setSelectedSegment(null);
    setClips([]);
    setPlaying(false);
    setMessage("");

    audioPlayers.current.forEach((a) => a.pause());
    audioPlayers.current.clear();

    event.target.value = "";
  }

  function addSound(sound: Sound) {
    if (!videoUrl || duration <= 0) {
      setMessage("Önce video yükle kanka.");
      return;
    }

    const start = clamp(time, 0, duration - 0.01);

    setClips((previous) => [
      ...previous,
      {
        id: crypto.randomUUID(),
        name: sound.name,
        url: sound.url,
        start,
        duration: Math.min(
          Math.max(0.1, sound.duration),
          duration - start
        ),
      },
    ]);

    setMessage(`${sound.name} zaman çizelgesine eklendi.`);
  }

  function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    for (const file of files) {
      if (!file.type.startsWith("audio/")) continue;

      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);

      const audio = new Audio(url);

      audio.onloadedmetadata = () => {
        addSound({
          id: crypto.randomUUID(),
          name: file.name,
          url,
          duration: audio.duration,
          source: "",
          category: "Kendi Sesim",
        });
      };
    }

    event.target.value = "";
  }

  function removeAudio(id: string) {
    audioPlayers.current.get(id)?.pause();
    audioPlayers.current.delete(id);
    setClips((old) => old.filter((clip) => clip.id !== id));
  }

  function seek(value: number) {
    const video = videoRef.current;
    if (!video || !duration) return;

    const next = clamp(value, 0, duration);
    video.currentTime = next;
    setTime(next);
  }

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    const first = segments[0];

    if (first) {
      const valid = segments.some(
        (s) => video.currentTime >= s.start &&
          video.currentTime < s.end
      );

      if (!valid) seek(first.start);
    }

    try {
      await video.play();
    } catch {
      setMessage("Video oynatılamadı.");
    }
  }

  function splitVideo() {
    if (!videoUrl || duration <= 0) return;

    const index = segments.findIndex(
      (s) => time > s.start + 0.05 &&
        time < s.end - 0.05
    );

    if (index < 0) {
      setMessage("Klibin içinden bir kesim noktası seç.");
      return;
    }

    const target = segments[index];

    const left: Segment = {
      id: crypto.randomUUID(),
      start: target.start,
      end: time,
    };

    const right: Segment = {
      id: crypto.randomUUID(),
      start: time,
      end: target.end,
    };

    setSegments((old) => [
      ...old.slice(0, index),
      left,
      right,
      ...old.slice(index + 1),
    ]);

    setSelectedSegment(right.id);
    setMessage("Video kesildi. Parçayı seçip silebilirsin.");
  }

  function removeSegment(id: string) {
    const next = segments.filter((s) => s.id !== id);

    setSegments(next);
    setSelectedSegment(null);

    videoRef.current?.pause();

    if (next.length) {
      seek(next[0].start);
    } else {
      seek(0);
    }

    setMessage("Seçilen video parçası silindi.");
  }

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime;

    if (!video.paused) {
      const active = segments.find(
        (s) => current >= s.start &&
          current < s.end - 0.025
      );

      if (!active) {
        const next = segments.find(
          (s) => s.start > current + 0.02
        );

        if (next) {
          video.currentTime = next.start;
          setTime(next.start);
          return;
        }

        video.pause();
      }
    }

    setTime(video.currentTime);
  }

  function moveText(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();

    setTextPosition({
      x: clamp(
        ((event.clientX - rect.left) / rect.width) * 100,
        5,
        95
      ),
      y: clamp(
        ((event.clientY - rect.top) / rect.height) * 100,
        5,
        95
      ),
    });
  }

  function resetEditor() {
    videoRef.current?.pause();
    audioPlayers.current.forEach((a) => a.pause());
    audioPlayers.current.clear();

    setVideoUrl("");
    setVideoName("");
    setDuration(0);
    setTime(0);
    setSegments([]);
    setSelectedSegment(null);
    setClips([]);
    setText("");
    setTextPosition({ x: 50, y: 50 });
    setFilter("none");
    setPlaying(false);
    setMessage("");
  }

  async function exportVideo() {
    if (!videoUrl || exporting || !segments.length) return;

    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setMessage("Dışa aktarma için Chrome veya Edge dene.");
      return;
    }

    setExporting(true);
    setProgress(0);
    setMessage("");

    const preview = videoRef.current;
    preview?.pause();

    const source = document.createElement("video");
    source.src = videoUrl;
    source.preload = "auto";
    source.playsInline = true;
    source.playbackRate = speed;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setExporting(false);
      return;
    }

    const audioContext = new AudioContext();
    const destination =
      audioContext.createMediaStreamDestination();

    const videoSource =
      audioContext.createMediaElementSource(source);
    const videoGain = audioContext.createGain();

    videoGain.gain.value = volume / 100;
    videoSource.connect(videoGain);
    videoGain.connect(destination);

    const sounds: {
      audio: HTMLAudioElement;
      clip: AudioClip;
    }[] = [];

    const stream = canvas.captureStream(30);
    let recorder: MediaRecorder | null = null;
    let frameId = 0;

    try {
      await new Promise<void>((resolve, reject) => {
        if (source.readyState >= 1) return resolve();
        source.onloadedmetadata = () => resolve();
        source.onerror = () => reject(
          new Error("Video açılamadı.")
        );
      });

      canvas.width = source.videoWidth || 1280;
      canvas.height = source.videoHeight || 720;

      for (const clip of clips) {
        const audio = new Audio(clip.url);
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";

        const node =
          audioContext.createMediaElementSource(audio);

        node.connect(destination);
        sounds.push({ audio, clip });
      }

      const output = new MediaStream([
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const mimeType = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      if (!mimeType) {
        throw new Error("Tarayıcı video kaydını desteklemiyor.");
      }

      recorder = new MediaRecorder(output, {
        mimeType,
        videoBitsPerSecond: 6000000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const finished = new Promise<void>((resolve) => {
        recorder!.onstop = () => resolve();
      });

      function draw() {
        if (!ctx) return;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (source.readyState >= 2) {
          ctx.save();
          ctx.filter = filter;
          ctx.drawImage(
            source,
            0,
            0,
            canvas.width,
            canvas.height
          );
          ctx.restore();
        }

        if (text.trim()) {
          ctx.save();
          ctx.fillStyle = textColor;
          ctx.font = `bold ${textSize}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "black";
          ctx.shadowBlur = 8;

          ctx.fillText(
            text,
            (textPosition.x / 100) * canvas.width,
            (textPosition.y / 100) * canvas.height,
            canvas.width * 0.9
          );

          ctx.restore();
        }

        frameId = requestAnimationFrame(draw);
      }

      await audioContext.resume();
      recorder.start(500);
      draw();

      const total = segments.reduce(
        (sum, s) => sum + (s.end - s.start) / speed,
        0
      );

      let completed = 0;

      for (const segment of segments) {
        source.pause();

        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(() => {
            reject(new Error("Video konumlandırılamadı."));
          }, 15000);

          source.addEventListener(
            "seeked",
            () => {
              clearTimeout(timer);
              resolve();
            },
            { once: true }
          );

          source.currentTime = segment.start;
        });

        await source.play();

        const started = performance.now();
        const length = (segment.end - segment.start) / speed;

        await new Promise<void>((resolve) => {
          const timer = window.setInterval(() => {
            const elapsed =
              (performance.now() - started) / 1000;

            const sourceTime =
              segment.start + elapsed * speed;

            for (const { audio, clip } of sounds) {
              const offset = sourceTime - clip.start;

              if (offset >= 0 && offset < clip.duration) {
                if (audio.paused && audio.readyState >= 2) {
                  try {
                    audio.currentTime = offset;
                    audio.play().catch(() => {});
                  } catch {}
                }
              } else {
                audio.pause();
              }
            }

            setProgress(
              Math.min(
                100,
                Math.round(
                  ((completed + elapsed) / total) * 100
                )
              )
            );

            if (elapsed >= length || source.ended) {
              clearInterval(timer);
              source.pause();
              sounds.forEach(({ audio }) => audio.pause());
              resolve();
            }
          }, 50);
        });

        completed += length;
      }

      if (recorder.state !== "inactive") recorder.stop();
      await finished;

      const blob = new Blob(chunks, { type: mimeType });

      if (!blob.size) {
        throw new Error("Video kaydı boş oluşturuldu.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `hagy-edit-${Date.now()}.${
        mimeType.includes("mp4") ? "mp4" : "webm"
      }`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("Video dışa aktarıldı.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dışa aktarma sırasında hata oluştu."
      );
    } finally {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }

      cancelAnimationFrame(frameId);
      source.pause();
      sounds.forEach(({ audio }) => audio.pause());
      stream.getTracks().forEach((track) => track.stop());
      destination.stream
        .getTracks()
        .forEach((track) => track.stop());

      await audioContext.close().catch(() => {});
      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#090b12] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111420] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white/10 p-2"
          >
            <ArrowLeft size={18} />
          </Link>

          <Clapperboard
            size={23}
            className="text-violet-400"
          />

          <div>
            <h1 className="text-sm font-bold">
              HAGY EDITOR
            </h1>
            <p className="text-xs text-white/40">
              {videoName || "Yeni Proje"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => videoInput.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs"
          >
            <Upload size={15} />
            Video Yükle
          </button>

          <button
            onClick={exportVideo}
            disabled={!videoUrl || exporting || !segments.length}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <Download size={15} />
            {exporting
              ? `Aktarılıyor %${progress}`
              : "Dışa Aktar"}
          </button>
        </div>
      </header>

      <input
        ref={videoInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={uploadVideo}
      />

      <input
        ref={audioInput}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={uploadAudio}
      />

      {message && (
        <div className="bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
          {message}
        </div>
      )}

      <div className="flex min-h-[540px] flex-1 flex-col lg:flex-row">
        <aside className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#131622] p-2 lg:w-[88px] lg:flex-col lg:border-r">
          {tools.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setTool(item.id)}
                className={`flex min-w-[72px] flex-col items-center gap-2 rounded-xl px-2 py-4 text-xs ${
                  tool === item.id
                    ? "bg-violet-600/25 text-violet-300"
                    : "text-white/50 hover:bg-white/10"
                }`}
              >
                <Icon size={21} />
                {item.label}
              </button>
            );
          })}
        </aside>

        <section className="w-full border-b border-white/10 bg-[#171a28] p-4 lg:w-[320px] lg:border-r">
          {tool === "media" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Medya Kütüphanesi
              </h2>

              <button
                onClick={() => videoInput.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-violet-400/50 bg-violet-500/10 p-6 text-sm"
              >
                <Upload className="text-violet-400" />
                Video seç veya değiştir
              </button>

              {videoName && (
                <div className="rounded-xl bg-white/5 p-3">
                  <Film className="mb-2 text-violet-400" />
                  <p className="break-all text-sm">{videoName}</p>
                  <p className="mt-2 text-xs text-white/40">
                    {formatTime(duration)}
                  </p>
                </div>
              )}
            </div>
          )}

          {tool === "audio" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Ses Kütüphanesi
              </h2>

              <button
                onClick={() => audioInput.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 p-3 text-sm"
              >
                <Plus size={17} />
                Kendi Sesini Ekle
              </button>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
                <h3 className="mb-3 font-semibold">
                  Global Meme Sounds
                </h3>

                <MemeSounds onAdd={addSound} />
              </div>

              <h3 className="text-sm font-semibold">
                Eklenen Sesler
              </h3>

              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="rounded-lg bg-white/5 p-3"
                >
                  <p className="break-all text-xs">
                    {clip.name}
                  </p>

                  <p className="mt-1 text-xs text-white/40">
                    Başlangıç: {formatTime(clip.start)}
                  </p>

                  <button
                    onClick={() => removeAudio(clip.id)}
                    className="mt-2 flex items-center gap-1 text-xs text-red-300"
                  >
                    <Trash2 size={13} />
                    Sesi Sil
                  </button>
                </div>
              ))}
            </div>
          )}

          {tool === "text" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Metin Düzenleyici
              </h2>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Videoya yazı ekle..."
                rows={4}
                className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm"
              />

              <p className="text-xs text-violet-300">
                Yazıyı videonun üzerinde fareyle tutup taşı.
              </p>

              <label className="block text-xs">
                Yazı Boyutu: {textSize}px
              </label>

              <input
                type="range"
                min={16}
                max={72}
                value={textSize}
                onChange={(e) =>
                  setTextSize(Number(e.target.value))
                }
                className="w-full accent-violet-500"
              />

              <label className="block text-xs">
                Yazı Rengi
              </label>

              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />

              <button
                onClick={() =>
                  setTextPosition({ x: 50, y: 50 })
                }
                className="block rounded-lg bg-white/10 px-3 py-2 text-xs"
              >
                Yazıyı Ortala
              </button>

              <button
                onClick={() => setText("")}
                className="flex items-center gap-2 text-xs text-red-300"
              >
                <Trash2 size={15} />
                Metni Sil
              </button>
            </div>
          )}

          {tool === "trim" && (
            <div className="space-y-4">
              <h2 className="font-semibold">
                Video Kesme
              </h2>

              <p className="text-xs leading-5 text-white/50">
                Zaman çizelgesinden bir saniye seç.
                Kes butonuna bas. Sonra istemediğin
                parçayı seçip sil.
              </p>

              <button
                onClick={splitVideo}
                disabled={!videoUrl}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 text-sm disabled:opacity-40"
              >
                <Scissors size={18} />
                Bu Noktadan Kes
              </button>

              <p className="text-xs text-white/50">
                Kesim Noktası: {formatTime(time)}
              </p>

              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  onClick={() =>
                    setSelectedSegment(segment.id)
                  }
                  className={`cursor-pointer rounded-xl border p-3 ${
                    selectedSegment === segment.id
                      ? "border-violet-400 bg-violet-500/20"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    Klip {index + 1}
                  </p>

                  <p className="mt-1 text-xs text-white/50">
                    {formatTime(segment.start)} -{" "}
                    {formatTime(segment.end)}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSegment(segment.id);
                    }}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-xs text-red-300"
                  >
                    <Trash2 size={15} />
                    Bu Parçayı Sil
                  </button>
                </div>
              ))}

              <button
                onClick={() => {
                  if (!duration) return;

                  setSegments([
                    {
                      id: crypto.randomUUID(),
                      start: 0,
                      end: duration,
                    },
                  ]);
                  setSelectedSegment(null);
                }}
                disabled={!duration}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-40"
              >
                Kesimleri Sıfırla
              </button>
            </div>
          )}

          {tool === "settings" && (
            <div className="space-y-5">
              <h2 className="font-semibold">
                Video Ayarları
              </h2>

              <label className="block text-sm">
                Video Sesi: %{volume}
              </label>

              <input
                type="range"
                min={0}
                max={100}
                value={volume}
                onChange={(e) =>
                  setVolume(Number(e.target.value))
                }
                className="w-full accent-violet-500"
              />

              <label className="block text-sm">
                Oynatma Hızı
              </label>

              <select
                value={speed}
                onChange={(e) =>
                  setSpeed(Number(e.target.value))
                }
                className="w-full rounded-lg bg-[#24283a] p-3"
              >
                <option value={0.5}>0.5x</option>
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.25}>1.25x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </div>
          )}

          {tool === "effects" && (
            <div className="space-y-3">
              <h2 className="font-semibold">
                Görsel Efektler
              </h2>

              {effects.map((effect) => (
                <button
                  key={effect.name}
                  onClick={() => setFilter(effect.value)}
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
              <div
                ref={previewRef}
                className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-black"
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  preload="metadata"
                  style={{ filter }}
                  className="max-h-[65vh] w-full object-contain"
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;

                    if (Number.isFinite(d) && d > 0) {
                      setDuration(d);
                      setSegments([
                        {
                          id: crypto.randomUUID(),
                          start: 0,
                          end: d,
                        },
                      ]);
                    }
                  }}
                  onTimeUpdate={onTimeUpdate}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                />

                {text.trim() && (
                  <div
                    onPointerDown={(e) => {
                      dragRef.current = true;
                      e.currentTarget.setPointerCapture(
                        e.pointerId
                      );
                      moveText(e);
                    }}
                    onPointerMove={moveText}
                    onPointerUp={() => {
                      dragRef.current = false;
                    }}
                    onPointerCancel={() => {
                      dragRef.current = false;
                    }}
                    className="absolute z-10 cursor-move select-none rounded-lg border border-dashed border-white/50 bg-black/10 px-3 py-2"
                    style={{
                      left: `${textPosition.x}%`,
                      top: `${textPosition.y}%`,
                      transform: "translate(-50%, -50%)",
                      touchAction: "none",
                    }}
                  >
                    <p
                      style={{
                        fontSize: textSize,
                        color: textColor,
                        textShadow: "0 2px 8px black",
                      }}
                      className="max-w-[70vw] break-words text-center font-bold"
                    >
                      {text}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => videoInput.current?.click()}
                className="flex min-h-[300px] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/15 bg-[#151826] p-8"
              >
                <Upload
                  size={35}
                  className="text-violet-400"
                />

                <h2 className="text-xl font-bold">
                  Videonu Yükle
                </h2>

                <p className="text-sm text-white/50">
                  Düzenlemeye başlamak için video seç.
                </p>

                <span className="rounded-lg bg-violet-600 px-5 py-3 text-sm">
                  Video Seç
                </span>
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              onClick={() => seek(time - 5)}
              disabled={!videoUrl}
              className="text-sm text-white/60"
            >
              -5 sn
            </button>

            <button
              onClick={togglePlay}
              disabled={!videoUrl || exporting}
              className="rounded-full bg-violet-600 p-4 disabled:opacity-40"
            >
              {playing ? (
                <Pause size={22} />
              ) : (
                <Play size={22} />
              )}
            </button>

            <button
              onClick={() => seek(time + 5)}
              disabled={!videoUrl}
              className="text-sm text-white/60"
            >
              +5 sn
            </button>

            <span className="text-xs text-white/50">
              {formatTime(time)} / {formatTime(duration)}
            </span>
          </div>
        </section>
      </div>

      <section className="border-t border-white/10 bg-[#141725] p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Zaman Çizelgesi
          </h2>

          <button
            onClick={resetEditor}
            disabled={!videoUrl || exporting}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-40"
          >
            <Trash2 size={14} />
            Projeyi Temizle
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <span className="w-12 text-xs text-white/40">
            00:00
          </span>

          <input
            type="range"
            min={0}
            max={Math.max(duration, 0.1)}
            step={0.05}
            value={time}
            disabled={!videoUrl}
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
          <div className="flex min-h-16 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Video
            </span>

            <div
              className="relative h-16 flex-1 cursor-crosshair overflow-hidden rounded-lg bg-[#24283a]"
              onClick={(e) => {
                if (!duration) return;

                const rect =
                  e.currentTarget.getBoundingClientRect();

                seek(
                  ((e.clientX - rect.left) / rect.width) *
                    duration
                );
              }}
            >
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSegment(segment.id);

                    const rect =
                      e.currentTarget.getBoundingClientRect();

                    seek(
                      segment.start +
                        ((e.clientX - rect.left) /
                          rect.width) *
                          (segment.end - segment.start)
                    );
                  }}
                  className={`absolute inset-y-1 flex items-center justify-center rounded border-2 ${
                    selectedSegment === segment.id
                      ? "border-white bg-violet-600"
                      : "border-blue-400 bg-blue-600/70"
                  }`}
                  style={{
                    left: `${
                      (segment.start / duration) * 100
                    }%`,
                    width: `${
                      ((segment.end - segment.start) /
                        duration) *
                      100
                    }%`,
                  }}
                >
                  <span className="truncate px-2 text-xs">
                    Klip {index + 1}
                  </span>

                  <button
                    title="Bu parçayı sil"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSegment(segment.id);
                    }}
                    className="absolute right-1 top-1 rounded bg-red-600 p-1 hover:bg-red-500"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}

              {videoUrl && (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white"
                  style={{
                    left: `${
                      duration ? (time / duration) * 100 : 0
                    }%`,
                  }}
                />
              )}
            </div>
          </div>

          <div className="flex min-h-12 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Ses
            </span>

            <div className="relative h-12 flex-1 overflow-hidden rounded-lg bg-emerald-500/10">
              {clips.map((clip) => (
                <div
                  key={clip.id}
                  className="absolute inset-y-1 flex items-center gap-1 overflow-hidden rounded bg-emerald-600/80 px-2"
                  style={{
                    left: `${
                      duration
                        ? (clip.start / duration) * 100
                        : 0
                    }%`,
                    width: `${
                      duration
                        ? (clip.duration / duration) * 100
                        : 0
                    }%`,
                  }}
                >
                  <Music2 size={12} />
                  <span className="truncate text-xs">
                    {clip.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-12 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Metin
            </span>

            <div className="flex h-12 flex-1 items-center rounded-lg bg-[#24283a] px-3">
              {text ? (
                <span className="rounded bg-violet-600/60 px-3 py-2 text-xs">
                  {text}
                </span>
              ) : (
                <span className="text-xs text-white/35">
                  Henüz metin eklenmedi
                </span>
              )}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-white/40">
          Kesilen klibi seçip çöp kutusuna basarak sil.
          Metni önizleme üzerinde sürükle. Dışa aktarma
          tarayıcı desteğine göre MP4 veya WebM üretir.
        </p>
      </section>
    </main>
  );
}
