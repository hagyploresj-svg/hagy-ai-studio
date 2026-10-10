
"use client";

import {
  ChangeEvent,
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
  Trash2,
  Download,
  Plus,
} from "lucide-react";

type Tool =
  | "media"
  | "audio"
  | "text"
  | "trim"
  | "settings"
  | "effects";

type AudioClip = {
  id: string;
  name: string;
  url: string;
  start: number;
  duration: number;
};

type Segment = {
  start: number;
  end: number;
};

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

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";

  const seconds = Math.floor(Math.max(0, value));

  return (
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0")
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioElementsRef = useRef<
    Map<string, HTMLAudioElement>
  >(new Map());

  const urlsRef = useRef<string[]>([]);
  const exportCancelRef = useRef(false);

  const [activeTool, setActiveTool] =
    useState<Tool>("media");

  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [audioClips, setAudioClips] =
    useState<AudioClip[]>([]);

  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [textOverlay, setTextOverlay] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [filter, setFilter] = useState("none");

  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [message, setMessage] = useState("");

  const totalDuration = segments.reduce(
    (sum, segment) => sum + segment.end - segment.start,
    0
  );

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      audioElementsRef.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume / 100;
    video.playbackRate = speed;
  }, [volume, speed, videoUrl]);

  useEffect(() => {
    audioElementsRef.current.forEach((audio, id) => {
      const clip = audioClips.find((item) => item.id === id);

      if (!clip || !playing) {
        audio.pause();
        return;
      }

      const offset = currentTime - clip.start;

      if (offset >= 0 && offset < clip.duration) {
        if (Math.abs(audio.currentTime - offset) > 0.35) {
          audio.currentTime = offset;
        }

        audio.volume = 1;

        if (audio.paused) {
          audio.play().catch(() => {});
        }
      } else {
        audio.pause();
      }
    });
  }, [currentTime, playing, audioClips]);

  function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setMessage("Lütfen video dosyası seç.");
      return;
    }

    videoRef.current?.pause();

    const url = URL.createObjectURL(file);
    urlsRef.current.push(url);

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setCurrentTime(0);
    setSegments([]);
    setPlaying(false);
    setMessage("");
    setActiveTool("media");

    event.target.value = "";
  }

  function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    files.forEach((file) => {
      if (!file.type.startsWith("audio/")) return;

      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);

      const audio = new Audio(url);

      audio.onloadedmetadata = () => {
        const clipDuration = Number.isFinite(audio.duration)
          ? audio.duration
          : 0;

        const clip: AudioClip = {
          id: crypto.randomUUID(),
          name: file.name,
          url,
          start: currentTime,
          duration: clipDuration,
        };

        audioElementsRef.current.set(clip.id, audio);
        setAudioClips((previous) => [...previous, clip]);
      };

      audio.onerror = () => {
        setMessage(`Ses okunamadı: ${file.name}`);
      };
    });

    event.target.value = "";
  }

  function seek(time: number) {
    const video = videoRef.current;
    if (!video) return;

    const next = clamp(time, 0, duration);

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

    const segment = segments.find(
      (item) =>
        video.currentTime >= item.start &&
        video.currentTime < item.end
    );

    if (!segment && segments.length > 0) {
      seek(segments[0].start);
    }

    try {
      await video.play();
    } catch {
      setMessage("Video oynatılamadı.");
    }
  }

  function splitAtPlayhead() {
    if (!videoUrl || !duration) return;

    const point = currentTime;

    setSegments((previous) => {
      const original =
        previous.length > 0
          ? previous
          : [{ start: 0, end: duration }];

      const index = original.findIndex(
        (item) =>
          point > item.start + 0.05 &&
          point < item.end - 0.05
      );

      if (index < 0) {
        setMessage("Kesmek için klibin içinden bir nokta seç.");
        return previous;
      }

      const segment = original[index];

      return [
        ...original.slice(0, index),
        { start: segment.start, end: point },
        { start: point, end: segment.end },
        ...original.slice(index + 1),
      ];
    });

    setMessage("Kesim noktası oluşturuldu.");
  }

  function removeSegment(index: number) {
    const updated = segments.filter((_, i) => i !== index);
    setSegments(updated);

    if (updated.length > 0) {
      seek(updated[0].start);
    } else {
      videoRef.current?.pause();
    }
  }

  function removeAudio(id: string) {
    const audio = audioElementsRef.current.get(id);

    if (audio) {
      audio.pause();
      audioElementsRef.current.delete(id);
    }

    setAudioClips((previous) =>
      previous.filter((item) => item.id !== id)
    );
  }

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video || exporting) return;

    const time = video.currentTime;

    if (segments.length > 0 && !video.paused) {
      const active = segments.find(
        (segment) =>
          time >= segment.start &&
          time < segment.end
      );

      if (!active) {
        const next = segments.find(
          (segment) => segment.start > time
        );

        if (next) {
          video.currentTime = next.start;
          setCurrentTime(next.start);
          return;
        }

        video.pause();
      }
    }

    setCurrentTime(video.currentTime);
  }

  function resetEditor() {
    videoRef.current?.pause();

    audioElementsRef.current.forEach((audio) => {
      audio.pause();
    });

    setVideoUrl("");
    setVideoName("");
    setDuration(0);
    setCurrentTime(0);
    setSegments([]);
    setAudioClips([]);
    setTextOverlay("");
    setFilter("none");
    setVolume(100);
    setSpeed(1);
    setPlaying(false);
    setMessage("");
  }

  async function exportVideo() {
    const video = videoRef.current;

    if (!video || !videoUrl || exporting) return;

    if (
      typeof MediaRecorder === "undefined" ||
      typeof HTMLCanvasElement.prototype.captureStream !==
        "function"
    ) {
      setMessage(
        "Bu tarayıcı video dışa aktarmayı desteklemiyor. Chrome veya Edge dene."
      );
      return;
    }

    setExporting(true);
    setExportProgress(0);
    setMessage("");
    exportCancelRef.current = false;

    const wasPlaying = !video.paused;
    video.pause();

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setExporting(false);
      setMessage("Video işleme alanı oluşturulamadı.");
      return;
    }

    const canvasStream = canvas.captureStream(30);

    const AudioContextClass = window.AudioContext;
    const audioContext = new AudioContextClass();
    const destination =
      audioContext.createMediaStreamDestination();

    const sourceVideo = document.createElement("video");
    sourceVideo.src = videoUrl;
    sourceVideo.preload = "auto";
    sourceVideo.muted = false;
    sourceVideo.playsInline = true;
    sourceVideo.playbackRate = speed;

    const videoSource =
      audioContext.createMediaElementSource(sourceVideo);
    const videoGain = audioContext.createGain();
    videoGain.gain.value = volume / 100;

    videoSource.connect(videoGain);
    videoGain.connect(destination);

    const exportAudios: {
      element: HTMLAudioElement;
      source: MediaElementAudioSourceNode;
      clip: AudioClip;
    }[] = [];

    for (const clip of audioClips) {
      const element = new Audio(clip.url);
      element.preload = "auto";

      const source =
        audioContext.createMediaElementSource(element);

      source.connect(destination);

      exportAudios.push({ element, source, clip });
    }

    const outputStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destination.stream.getAudioTracks(),
    ]);

    const candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    const mimeType = candidates.find((type) =>
      MediaRecorder.isTypeSupported(type)
    );

    if (!mimeType) {
      await audioContext.close();
      canvasStream.getTracks().forEach((track) => track.stop());
      setExporting(false);
      setMessage("Tarayıcı uygun video kayıt biçimi sunmuyor.");
      return;
    }

    const recorder = new MediaRecorder(outputStream, {
      mimeType,
      videoBitsPerSecond: 6000000,
    });

    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    const selected =
      segments.length > 0
        ? segments
        : [{ start: 0, end: duration }];

    const outputLength = selected.reduce(
      (sum, item) => sum + (item.end - item.start) / speed,
      0
    );

    let elapsed = 0;
    let animationFrame = 0;

    function drawFrame() {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, canvas.width, canvas.height);

      ctx!.save();
      ctx!.filter = filter;
      ctx!.drawImage(
        sourceVideo,
        0,
        0,
        canvas.width,
        canvas.height
      );
      ctx!.restore();

      if (textOverlay.trim()) {
        ctx!.fillStyle = textColor;
        ctx!.font = `bold ${textSize}px Arial`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.shadowColor = "#000";
        ctx!.shadowBlur = 8;

        ctx!.fillText(
          textOverlay,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width - 40
        );
      }

      animationFrame = requestAnimationFrame(drawFrame);
    }

    function waitForSeek(
      element: HTMLMediaElement,
      time: number
    ) {
      return new Promise<void>((resolve, reject) => {
        if (element.readyState >= 1 &&
            Math.abs(element.currentTime - time) < 0.03) {
          resolve();
          return;
        }

        const timeout = window.setTimeout(() => {
          cleanup();
          reject(new Error("Video konumlandırılamadı."));
        }, 15000);

        function cleanup() {
          clearTimeout(timeout);
          element.removeEventListener("seeked", done);
          element.removeEventListener("error", failed);
        }

        function done() {
          cleanup();
          resolve();
        }

        function failed() {
          cleanup();
          reject(new Error("Video okunamadı."));
        }

        element.addEventListener("seeked", done);
        element.addEventListener("error", failed);
        element.currentTime = time;
      });
    }

    try {
      await audioContext.resume();

      await new Promise<void>((resolve, reject) => {
        if (sourceVideo.readyState >= 1) {
          resolve();
          return;
        }

        sourceVideo.onloadedmetadata = () => resolve();
        sourceVideo.onerror = () =>
          reject(new Error("Video açılamadı."));
      });

      recorder.start(1000);
      drawFrame();

      for (const segment of selected) {
        if (exportCancelRef.current) break;

        await waitForSeek(sourceVideo, segment.start);
        await sourceVideo.play();

        const segmentStart = performance.now();
        const segmentLength =
          (segment.end - segment.start) / speed;

        await new Promise<void>((resolve) => {
          const interval = window.setInterval(() => {
            const passed =
              (performance.now() - segmentStart) / 1000;

            const sourceTime =
              segment.start + passed * speed;

            exportAudios.forEach(({ element, clip }) => {
              const offset = sourceTime - clip.start;

              if (
                offset >= 0 &&
                offset < clip.duration
              ) {
                if (
                  element.paused &&
                  element.readyState >= 2
                ) {
                  element.currentTime = offset;
                  element.play().catch(() => {});
                }
              } else {
                element.pause();
              }
            });

            setExportProgress(
              Math.min(
                100,
                Math.round(
                  ((elapsed + passed) / outputLength) * 100
                )
              )
            );

            if (
              passed >= segmentLength ||
              exportCancelRef.current
            ) {
              clearInterval(interval);
              sourceVideo.pause();

              exportAudios.forEach(({ element }) =>
                element.pause()
              );

              resolve();
            }
          }, 50);
        });

        elapsed += segmentLength;
      }

      sourceVideo.pause();
      recorder.stop();
      await finished;

      if (!exportCancelRef.current) {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download =
          "hagy-edit-" +
          Date.now() +
          (mimeType.includes("mp4") ? ".mp4" : ".webm");

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => URL.revokeObjectURL(url), 60000);

        setMessage("Video dışa aktarıldı.");
      }
    } catch (error) {
      if (recorder.state !== "inactive") {
        recorder.stop();
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "Dışa aktarma başarısız."
      );
    } finally {
      cancelAnimationFrame(animationFrame);
      sourceVideo.pause();

      exportAudios.forEach(({ element }) => {
        element.pause();
        element.src = "";
      });

      outputStream.getTracks().forEach((track) => track.stop());
      canvasStream.getTracks().forEach((track) => track.stop());

      await audioContext.close().catch(() => {});

      setExporting(false);
      setExportProgress(0);

      if (wasPlaying) {
        video.play().catch(() => {});
      }
    }
  }

  const progress =
    duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <main className="flex min-h-screen flex-col bg-[#090b12] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111420] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-white/10 p-2 hover:bg-white/20"
          >
            <ArrowLeft size={18} />
          </Link>

          <Clapperboard size={23} className="text-violet-400" />

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
            onClick={() => videoInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs hover:bg-white/20"
          >
            <Upload size={15} />
            Video Yükle
          </button>

          <button
            onClick={exportVideo}
            disabled={!videoUrl || exporting}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <Download size={15} />
            {exporting
              ? `Aktarılıyor %${exportProgress}`
              : "Dışa Aktar"}
          </button>
        </div>
      </header>

      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        onChange={uploadVideo}
        className="hidden"
      />

      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        onChange={uploadAudio}
        className="hidden"
      />

      {message && (
        <div className="border-b border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm text-violet-200">
          {message}
        </div>
      )}

      <div className="flex min-h-[540px] flex-1 flex-col lg:flex-row">
        <aside className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#131622] p-2 lg:w-[88px] lg:flex-col lg:border-b-0 lg:border-r">
          {tools.map((tool) => {
            const Icon = tool.icon;

            return (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`flex min-w-[72px] flex-col items-center gap-2 rounded-xl px-2 py-4 text-xs transition ${
                  activeTool === tool.id
                    ? "bg-violet-600/25 text-violet-300"
                    : "text-white/50 hover:bg-white/10"
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
              <h2 className="font-semibold">Medya Kütüphanesi</h2>

              <button
                onClick={() => videoInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-violet-400/50 bg-violet-500/10 p-6 text-sm"
              >
                <Upload className="text-violet-400" />
                Video seç veya değiştir
              </button>

              {videoName && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Film size={20} className="mb-2 text-violet-400" />
                  <p className="break-all text-sm">{videoName}</p>
                  <p className="mt-2 text-xs text-white/40">
                    {formatTime(duration)}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTool === "audio" && (
            <div className="space-y-4">
              <h2 className="font-semibold">Ses Kütüphanesi</h2>

              <button
                onClick={() => audioInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold"
              >
                <Plus size={18} />
                Ses Dosyası Ekle
              </button>

              <p className="text-xs leading-5 text-white/50">
                MP3, WAV veya desteklenen başka bir ses
                dosyasını ekle. Ses, oynatma imlecinin
                bulunduğu saniyeye yerleştirilir.
              </p>

              <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 p-4">
                <Music2 className="mb-2 text-violet-300" />
                <p className="text-sm font-medium">
                  Global Meme Sounds
                </p>
                <p className="mt-2 text-xs text-white/50">
                  Hazır 37 sesin adreslerini mevcut
                  MemeSounds kütüphanesinden bağlayacağız.
                </p>
              </div>

              {audioClips.map((clip) => (
                <div
                  key={clip.id}
                  className="rounded-lg border border-white/10 bg-white/5 p-3"
                >
                  <p className="break-all text-xs">{clip.name}</p>
                  <p className="mt-1 text-xs text-white/40">
                    Başlangıç: {formatTime(clip.start)}
                  </p>

                  <button
                    onClick={() => removeAudio(clip.id)}
                    className="mt-2 flex items-center gap-1 text-xs text-red-300"
                  >
                    <Trash2 size={13} />
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTool === "text" && (
            <div className="space-y-5">
              <h2 className="font-semibold">Video Üzerine Metin</h2>

              <textarea
                value={textOverlay}
                onChange={(event) =>
                  setTextOverlay(event.target.value)
                }
                placeholder="Videoya yazı ekle..."
                rows={4}
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none"
              />

              <label className="block text-xs">
                Yazı boyutu: {textSize}px
              </label>

              <input
                type="range"
                min="16"
                max="72"
                value={textSize}
                onChange={(event) =>
                  setTextSize(Number(event.target.value))
                }
                className="w-full accent-violet-500"
              />

              <label className="block text-xs">Yazı rengi</label>

              <input
                type="color"
                value={textColor}
                onChange={(event) =>
                  setTextColor(event.target.value)
                }
              />

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
            <div className="space-y-4">
              <h2 className="font-semibold">Video Kesme</h2>

              <p className="text-xs leading-5 text-white/50">
                Zaman çizelgesinde videonun istediğin
                saniyesine tıkla ve Kes butonuna bas.
              </p>

              <button
                onClick={splitAtPlayhead}
                disabled={!videoUrl}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 text-sm disabled:opacity-40"
              >
                <Scissors size={18} />
                Bu Noktadan Kes
              </button>

              <p className="text-xs text-white/50">
                Seçilen nokta: {formatTime(currentTime)}
              </p>

              {segments.map((segment, index) => (
                <div
                  key={`${segment.start}-${segment.end}`}
                  className="rounded-lg bg-white/5 p-3"
                >
                  <p className="text-xs">
                    Klip {index + 1}:{" "}
                    {formatTime(segment.start)} –{" "}
                    {formatTime(segment.end)}
                  </p>

                  <button
                    onClick={() => removeSegment(index)}
                    className="mt-2 text-xs text-red-300"
                  >
                    Bu klibi çıkar
                  </button>
                </div>
              ))}

              <button
                onClick={() =>
                  setSegments([{ start: 0, end: duration }])
                }
                disabled={!duration}
                className="rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-40"
              >
                Kesimleri Sıfırla
              </button>
            </div>
          )}

          {activeTool === "settings" && (
            <div className="space-y-5">
              <h2 className="font-semibold">Video Ayarları</h2>

              <label className="block text-sm">
                Video sesi: %{volume}
              </label>

              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(event) =>
                  setVolume(Number(event.target.value))
                }
                className="w-full accent-violet-500"
              />

              <label className="block text-sm">
                Oynatma Hızı
              </label>

              <select
                value={speed}
                onChange={(event) =>
                  setSpeed(Number(event.target.value))
                }
                className="w-full rounded-lg bg-[#24283a] p-3 text-sm"
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

          {activeTool === "effects" && (
            <div className="space-y-4">
              <h2 className="font-semibold">Görsel Efektler</h2>

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
              <div className="relative flex max-h-[65vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  playsInline
                  preload="metadata"
                  style={{ filter }}
                  className="max-h-[65vh] w-full object-contain"
                  onLoadedMetadata={(event) => {
                    const value = event.currentTarget.duration;

                    if (Number.isFinite(value) && value > 0) {
                      setDuration(value);
                      setSegments([{ start: 0, end: value }]);
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
                onClick={() => videoInputRef.current?.click()}
                className="flex min-h-[300px] w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/15 bg-[#151826] p-8"
              >
                <Upload size={35} className="text-violet-400" />
                <h2 className="text-xl font-bold">
                  Videonu Yükle
                </h2>
                <p className="text-center text-sm text-white/50">
                  Düzenlemeye başlamak için video seç.
                </p>
                <span className="rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold">
                  Video Seç
                </span>
              </button>
            )}
          </div>

          <div className="mt-5 flex items-center justify-center gap-5">
            <button
              onClick={() => seek(currentTime - 5)}
              disabled={!videoUrl}
              className="text-sm text-white/60 disabled:opacity-30"
            >
              -5 sn
            </button>

            <button
              onClick={togglePlay}
              disabled={!videoUrl || exporting}
              className="rounded-full bg-violet-600 p-4 disabled:opacity-30"
            >
              {playing ? <Pause size={22} /> : <Play size={22} />}
            </button>

            <button
              onClick={() => seek(currentTime + 5)}
              disabled={!videoUrl}
              className="text-sm text-white/60 disabled:opacity-30"
            >
              +5 sn
            </button>

            <span className="text-xs tabular-nums text-white/50">
              {formatTime(currentTime)} / {formatTime(duration)}
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
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs disabled:opacity-30"
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
            value={currentTime}
            disabled={!videoUrl || duration <= 0}
            onChange={(event) =>
              seek(Number(event.target.value))
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

            <div
              className="relative flex h-14 flex-1 cursor-pointer overflow-hidden rounded-lg bg-[#24283a]"
              onClick={(event) => {
                if (!duration) return;

                const rect =
                  event.currentTarget.getBoundingClientRect();

                const ratio =
                  (event.clientX - rect.left) / rect.width;

                seek(ratio * duration);
              }}
            >
              {segments.map((segment, index) => (
                <div
                  key={`${segment.start}-${segment.end}-${index}`}
                  className="absolute inset-y-0 flex items-center justify-center overflow-hidden border-r-2 border-[#141725] bg-blue-600/70"
                  style={{
                    left: `${(segment.start / duration) * 100}%`,
                    width: `${
                      ((segment.end - segment.start) / duration) *
                      100
                    }%`,
                  }}
                >
                  <span className="truncate px-2 text-xs">
                    Klip {index + 1}
                  </span>
                </div>
              ))}

              {videoUrl && (
                <div
                  className="pointer-events-none absolute inset-y-0 z-20 w-0.5 bg-white"
                  style={{ left: `${progress}%` }}
                />
              )}
            </div>
          </div>

          <div className="flex min-h-11 items-center gap-3">
            <span className="w-16 shrink-0 text-xs text-white/50">
              Ses
            </span>

            <div className="relative h-11 flex-1 overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              {audioClips.map((clip) => (
                <button
                  key={clip.id}
                  onClick={() => seek(clip.start)}
                  title={clip.name}
                  className="absolute inset-y-1 flex items-center overflow-hidden rounded bg-emerald-600/70 px-2 text-xs"
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
                  <Music2 size={13} className="mr-1 shrink-0" />
                  <span className="truncate">{clip.name}</span>
                </button>
              ))}
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
                  <span className="truncate">{textOverlay}</span>
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
          Videonun üzerine tıklayarak kesim noktası seç.
          Dışa aktarma gerçek zamanlı çalışır; tarayıcı
          desteğine göre MP4 veya WebM üretir.
        </p>
      </section>
    </main>
  );
}
