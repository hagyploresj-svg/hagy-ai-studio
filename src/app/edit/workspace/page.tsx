
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
  Settings2,
  Sparkles,
  Trash2,
  Type,
  Upload,
  GripVertical,
  Captions,
} from "lucide-react";
import MemeSounds from "../MemeSounds";

type Segment = {
  id: string;
  start: number;
  end: number;
};

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
  volume: number;
};

type TextClip = {
  id: string;
  text: string;
  start: number;
  duration: number;
  x: number;
  y: number;
  size: number;
  color: string;
};

type Tool =
  | "media"
  | "audio"
  | "text"
  | "effects"
  | "settings";

const uid = () => crypto.randomUUID();

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function fmt(n: number) {
  const value = Math.floor(Math.max(0, n || 0));
  return (
    String(Math.floor(value / 60)).padStart(2, "0") +
    ":" +
    String(value % 60).padStart(2, "0")
  );
}

const menu = [
  { id: "media", label: "Medya", icon: Film },
  { id: "audio", label: "Sesler", icon: Music2 },
  { id: "text", label: "Metin", icon: Type },
  { id: "effects", label: "Efektler", icon: Sparkles },
  { id: "settings", label: "Ayarlar", icon: Settings2 },
] as const;

const effects = [
  ["Normal", "none"],
  ["Siyah Beyaz", "grayscale(1)"],
  ["Vintage", "sepia(.8)"],
  ["Canlı", "saturate(1.8)"],
  ["Kontrast", "contrast(1.5)"],
  ["Parlak", "brightness(1.3)"],
  ["Soğuk", "hue-rotate(35deg)"],
];

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const urlsRef = useRef<string[]>([]);
  const playersRef = useRef<Map<string, HTMLAudioElement>>(
    new Map()
  );

  const textDragging = useRef(false);
  const timelineDragging = useRef<{
    id: string;
    kind: "audio" | "text";
    startX: number;
    originalStart: number;
  } | null>(null);

  const [tool, setTool] = useState<Tool>("media");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);

  const [segments, setSegments] = useState<Segment[]>([]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [audioClips, setAudioClips] = useState<AudioClip[]>([]);
  const [textClips, setTextClips] = useState<TextClip[]>([]);
  const [selectedText, setSelectedText] = useState<string | null>(
    null
  );

  const [filter, setFilter] = useState("none");
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);

  const [ratio, setRatio] = useState("9:16");
  const [quality, setQuality] = useState(720);
  const [fps, setFps] = useState(30);
  const [fit, setFit] = useState<"contain" | "cover">(
    "contain"
  );

  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const total = segments.reduce(
    (sum, segment) =>
      sum + segment.end - segment.start,
    0
  );

  const currentText = textClips.find(
    (clip) =>
      time >= clip.start &&
      time < clip.start + clip.duration
  );

  const editingText = textClips.find(
    (clip) => clip.id === selectedText
  );

  const buttonClass =
    "rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15";

  const primaryClass =
    "rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40";

  const panelClass =
    "rounded-xl border border-white/10 bg-white/5 p-3";

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );
      playersRef.current.forEach((audio) =>
        audio.pause()
      );
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = volume / 100;
    video.playbackRate = speed;
  }, [volume, speed, videoUrl]);

  useEffect(() => {
    for (const clip of audioClips) {
      let audio = playersRef.current.get(clip.id);

      if (!audio) {
        audio = new Audio(clip.url);
        playersRef.current.set(clip.id, audio);
      }

      const offset = time - clip.start;

      const active =
        playing &&
        offset >= 0 &&
        offset < clip.duration;

      if (!active) {
        audio.pause();
        continue;
      }

      audio.volume = clip.volume / 100;

      if (
        audio.readyState >= 1 &&
        Math.abs(audio.currentTime - offset) > 0.4
      ) {
        try {
          audio.currentTime = offset;
        } catch {}
      }

      if (audio.paused) {
        audio.play().catch(() => {});
      }
    }
  }, [time, playing, audioClips]);

  function sourceAt(projectTime: number) {
    let remaining = projectTime;

    for (const segment of segments) {
      const length = segment.end - segment.start;

      if (remaining < length) {
        return segment.start + remaining;
      }

      remaining -= length;
    }

    return segments.length
      ? segments[segments.length - 1].end
      : 0;
  }

  function projectAt(index: number, sourceTime: number) {
    const previous = segments
      .slice(0, index)
      .reduce(
        (sum, segment) =>
          sum + segment.end - segment.start,
        0
      );

    return previous + sourceTime - segments[index].start;
  }

  function seek(value: number) {
    const video = videoRef.current;

    if (!video || !segments.length) return;

    const next = clamp(value, 0, total);

    video.currentTime = sourceAt(next);
    setTime(next);
  }

  function uploadVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !file.type.startsWith("video/")) {
      return;
    }

    videoRef.current?.pause();

    const url = URL.createObjectURL(file);
    urlsRef.current.push(url);

    playersRef.current.forEach((audio) =>
      audio.pause()
    );
    playersRef.current.clear();

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setSegments([]);
    setTime(0);
    setPlaying(false);
    setAudioClips([]);
    setTextClips([]);
    setSelectedText(null);
    setMessage("");

    event.target.value = "";
  }

  async function togglePlay() {
    const video = videoRef.current;

    if (!video || !segments.length) return;

    if (!video.paused) {
      video.pause();
      return;
    }

    if (time >= total - 0.05) {
      seek(0);
    }

    try {
      await video.play();
    } catch {
      setMessage("Video oynatılamadı.");
    }
  }

  function onVideoTime() {
    const video = videoRef.current;

    if (!video || !segments.length) return;

    const sourceTime = video.currentTime;

    const index = segments.findIndex(
      (segment) =>
        sourceTime >= segment.start - 0.02 &&
        sourceTime < segment.end - 0.025
    );

    if (index >= 0) {
      setTime(
        projectAt(
          index,
          clamp(
            sourceTime,
            segments[index].start,
            segments[index].end
          )
        )
      );
      return;
    }

    if (video.paused) return;

    const next = segments.findIndex(
      (segment) =>
        segment.start > sourceTime + 0.02
    );

    if (next >= 0) {
      video.currentTime = segments[next].start;
      setTime(
        projectAt(next, segments[next].start)
      );
    } else {
      video.pause();
      setTime(total);
    }
  }

  function splitVideo() {
    if (!segments.length) return;

    videoRef.current?.pause();

    let remaining = time;

    const index = segments.findIndex((segment) => {
      const length = segment.end - segment.start;

      if (
        remaining > 0.05 &&
        remaining < length - 0.05
      ) {
        return true;
      }

      remaining -= length;
      return false;
    });

    if (index < 0) {
      setMessage(
        "Kesmek için klibin içinden bir saniye seç."
      );
      return;
    }

    const segment = segments[index];
    const cut = segment.start + remaining;

    setSegments((old) => [
      ...old.slice(0, index),
      {
        id: uid(),
        start: segment.start,
        end: cut,
      },
      {
        id: uid(),
        start: cut,
        end: segment.end,
      },
      ...old.slice(index + 1),
    ]);

    setMessage("Video kesildi.");
  }

  function removeSegment(id: string) {
    const next = segments.filter(
      (segment) => segment.id !== id
    );

    videoRef.current?.pause();

    setSegments(next);
    setTime(0);

    if (videoRef.current && next.length) {
      videoRef.current.currentTime = next[0].start;
    }

    setMessage("Klip silindi.");
  }

  function reorderSegments(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;

    const next = [...segments];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    videoRef.current?.pause();

    setSegments(next);
    setTime(0);

    if (videoRef.current) {
      videoRef.current.currentTime = next[0].start;
    }

    setMessage("Klip sırası değiştirildi.");
  }

  function addSound(sound: Sound) {
    if (!videoUrl || total <= 0) {
      setMessage("Önce video yükle.");
      return;
    }

    setAudioClips((old) => [
      ...old,
      {
        id: uid(),
        name: sound.name,
        url: sound.url,
        start: clamp(time, 0, total),
        duration: Math.min(
          Number.isFinite(sound.duration) &&
            sound.duration > 0
            ? sound.duration
            : 5,
          Math.max(0.1, total - time)
        ),
        volume: 100,
      },
    ]);

    setMessage(
      `${sound.name} ses katmanına eklendi.`
    );
  }

  function uploadAudio(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(
      event.target.files || []
    );

    files.forEach((file) => {
      if (!file.type.startsWith("audio/")) return;

      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);

      const audio = new Audio(url);

      audio.onloadedmetadata = () => {
        addSound({
          id: uid(),
          name: file.name,
          url,
          duration: audio.duration,
          source: "local",
          category: "Kendi Sesim",
        });
      };
    });

    event.target.value = "";
  }

  function removeAudio(id: string) {
    playersRef.current.get(id)?.pause();
    playersRef.current.delete(id);

    setAudioClips((old) =>
      old.filter((clip) => clip.id !== id)
    );
  }

  function updateAudio(
    id: string,
    changes: Partial<AudioClip>
  ) {
    setAudioClips((old) =>
      old.map((clip) =>
        clip.id === id
          ? { ...clip, ...changes }
          : clip
      )
    );
  }

  function addText() {
    if (!total) {
      setMessage("Önce video yükle.");
      return;
    }

    const clip: TextClip = {
      id: uid(),
      text: "Yeni Metin",
      start: clamp(time, 0, total),
      duration: Math.min(
        3,
        Math.max(0.1, total - time)
      ),
      x: 50,
      y: 50,
      size: 36,
      color: "#ffffff",
    };

    setTextClips((old) => [...old, clip]);
    setSelectedText(clip.id);
    setTool("text");
  }

  function updateText(
    id: string,
    changes: Partial<TextClip>
  ) {
    setTextClips((old) =>
      old.map((clip) =>
        clip.id === id
          ? { ...clip, ...changes }
          : clip
      )
    );
  }

  function removeText(id: string) {
    setTextClips((old) =>
      old.filter((clip) => clip.id !== id)
    );

    if (selectedText === id) {
      setSelectedText(null);
    }
  }

  function moveText(event: PointerEvent<HTMLDivElement>) {
    if (
      !textDragging.current ||
      !previewRef.current ||
      !currentText
    ) {
      return;
    }

    const rect =
      previewRef.current.getBoundingClientRect();

    updateText(currentText.id, {
      x: clamp(
        ((event.clientX - rect.left) /
          rect.width) *
          100,
        5,
        95
      ),
      y: clamp(
        ((event.clientY - rect.top) /
          rect.height) *
          100,
        5,
        95
      ),
    });
  }

  function startTimelineDrag(
    event: PointerEvent<HTMLDivElement>,
    kind: "audio" | "text",
    id: string,
    start: number
  ) {
    if (!timelineRef.current) return;

    timelineDragging.current = {
      kind,
      id,
      startX: event.clientX,
      originalStart: start,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId
    );
  }

  function moveTimelineItem(
    event: PointerEvent<HTMLDivElement>
  ) {
    const drag = timelineDragging.current;

    if (
      !drag ||
      !timelineRef.current ||
      total <= 0
    ) {
      return;
    }

    const rect =
      timelineRef.current.getBoundingClientRect();

    const delta =
      ((event.clientX - drag.startX) /
        rect.width) *
      total;

    if (drag.kind === "audio") {
      const clip = audioClips.find(
        (item) => item.id === drag.id
      );

      if (!clip) return;

      updateAudio(drag.id, {
        start: clamp(
          drag.originalStart + delta,
          0,
          Math.max(0, total - clip.duration)
        ),
      });
    } else {
      const clip = textClips.find(
        (item) => item.id === drag.id
      );

      if (!clip) return;

      updateText(drag.id, {
        start: clamp(
          drag.originalStart + delta,
          0,
          Math.max(0, total - clip.duration)
        ),
      });
    }
  }

  function stopTimelineDrag() {
    timelineDragging.current = null;
  }

  function outputSize() {
    if (ratio === "9:16") {
      return quality === 1080
        ? [1080, 1920]
        : [720, 1280];
    }

    if (ratio === "1:1") {
      return quality === 1080
        ? [1080, 1080]
        : [720, 720];
    }

    return quality === 1080
      ? [1920, 1080]
      : [1280, 720];
  }

  async function exportVideo() {
    if (
      !videoUrl ||
      !segments.length ||
      exporting
    ) {
      return;
    }

    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setMessage(
        "Bu tarayıcı dışa aktarmayı desteklemiyor."
      );
      return;
    }

    videoRef.current?.pause();
    setExporting(true);
    setProgress(0);
    setMessage("");

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

    const [width, height] = outputSize();
    canvas.width = width;
    canvas.height = height;

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let frame = 0;

    const exportAudios: {
      audio: HTMLAudioElement;
      clip: AudioClip;
    }[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        if (source.readyState >= 1) {
          resolve();
          return;
        }

        source.onloadedmetadata = () => resolve();
        source.onerror = () =>
          reject(new Error("Video açılamadı."));
      });

      audioContext = new AudioContext();

      const destination =
        audioContext.createMediaStreamDestination();

      const videoSource =
        audioContext.createMediaElementSource(source);

      const videoGain = audioContext.createGain();
      videoGain.gain.value = volume / 100;

      videoSource.connect(videoGain);
      videoGain.connect(destination);

      for (const clip of audioClips) {
        const audio = new Audio(clip.url);
        audio.preload = "auto";
        audio.crossOrigin = "anonymous";

        const node =
          audioContext.createMediaElementSource(audio);

        const gain = audioContext.createGain();
        gain.gain.value = clip.volume / 100;

        node.connect(gain);
        gain.connect(destination);

        exportAudios.push({ audio, clip });
      }

      stream = canvas.captureStream(fps);

      const combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ]);

      const mime = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      if (!mime) {
        throw new Error(
          "Desteklenen video formatı bulunamadı."
        );
      }

      recorder = new MediaRecorder(combined, {
        mimeType: mime,
        videoBitsPerSecond:
          quality === 1080 ? 10000000 : 5000000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      const finished = new Promise<void>((resolve) => {
        recorder!.onstop = () => resolve();
      });

      let outputTime = 0;

      function drawFrame() {
        if (!ctx) return;

        ctx.fillStyle = "#000000";
        ctx.fillRect(
          0,
          0,
          canvas.width,
          canvas.height
        );

        if (source.readyState >= 2) {
          const vw = source.videoWidth || width;
          const vh = source.videoHeight || height;

          const scale =
            fit === "cover"
              ? Math.max(width / vw, height / vh)
              : Math.min(width / vw, height / vh);

          const dw = vw * scale;
          const dh = vh * scale;

          ctx.save();
          ctx.filter = filter;

          ctx.drawImage(
            source,
            (width - dw) / 2,
            (height - dh) / 2,
            dw,
            dh
          );

          ctx.restore();
        }

        const visibleTexts = textClips.filter(
          (clip) =>
            outputTime >= clip.start &&
            outputTime < clip.start + clip.duration
        );

        for (const clip of visibleTexts) {
          ctx.save();

          ctx.fillStyle = clip.color;
          ctx.font = `bold ${Math.round(
            (clip.size * width) / 720
          )}px Arial`;

          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "#000000";
          ctx.shadowBlur = 8;

          ctx.fillText(
            clip.text,
            (clip.x / 100) * width,
            (clip.y / 100) * height,
            width * 0.9
          );

          ctx.restore();
        }

        frame = requestAnimationFrame(drawFrame);
      }

      await audioContext.resume();

      recorder.start(500);
      drawFrame();

      let completed = 0;
      const totalExport = total / speed;

      for (const segment of segments) {
        source.pause();

        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(
            () =>
              reject(
                new Error(
                  "Video konumu ayarlanamadı."
                )
              ),
            15000
          );

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
        const length =
          (segment.end - segment.start) / speed;

        await new Promise<void>((resolve) => {
          const timer = window.setInterval(() => {
            const elapsed =
              (performance.now() - started) / 1000;

            outputTime =
              completed * speed +
              Math.min(
                elapsed * speed,
                segment.end - segment.start
              );

            for (const item of exportAudios) {
              const offset =
                outputTime - item.clip.start;

              if (
                offset >= 0 &&
                offset < item.clip.duration
              ) {
                if (
                  item.audio.paused &&
                  item.audio.readyState >= 2
                ) {
                  try {
                    item.audio.currentTime = offset;
                    item.audio.play().catch(() => {});
                  } catch {}
                }
              } else {
                item.audio.pause();
              }
            }

            setProgress(
              Math.min(
                100,
                Math.round(
                  ((completed + elapsed) /
                    totalExport) *
                    100
                )
              )
            );

            if (
              elapsed >= length ||
              source.ended
            ) {
              clearInterval(timer);
              source.pause();

              exportAudios.forEach((item) =>
                item.audio.pause()
              );

              resolve();
            }
          }, 50);
        });

        completed += length;
      }

      recorder.stop();
      await finished;

      const blob = new Blob(chunks, {
        type: mime,
      });

      if (!blob.size) {
        throw new Error("Video boş oluşturuldu.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `hagy-${ratio.replace(
        ":",
        "x"
      )}-${Date.now()}.${
        mime.includes("mp4") ? "mp4" : "webm"
      }`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(
        () => URL.revokeObjectURL(url),
        60000
      );

      setMessage("Video dışa aktarıldı.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dışa aktarma hatası."
      );
    } finally {
      if (
        recorder &&
        recorder.state !== "inactive"
      ) {
        recorder.stop();
      }

      cancelAnimationFrame(frame);
      source.pause();

      exportAudios.forEach((item) =>
        item.audio.pause()
      );

      stream
        ?.getTracks()
        .forEach((track) => track.stop());

      await audioContext?.close().catch(() => {});

      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <main className="min-h-screen bg-[#090b12] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#131624] p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className={buttonClass}>
            <ArrowLeft size={18} />
          </Link>

          <Clapperboard className="text-violet-400" />

          <div>
            <h1 className="font-bold">HAGY EDITOR</h1>
            <p className="text-xs text-white/40">
              {videoName || "Yeni Proje"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={buttonClass}
            onClick={() =>
              videoInput.current?.click()
            }
          >
            <Upload
              size={16}
              className="mr-2 inline"
            />
            Video Yükle
          </button>

          <button
            className={primaryClass}
            disabled={!segments.length || exporting}
            onClick={exportVideo}
          >
            <Download
              size={16}
              className="mr-2 inline"
            />
            {exporting
              ? `%${progress}`
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
        <div className="bg-violet-500/10 p-3 text-sm text-violet-200">
          {message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#141725] p-2 lg:w-24 lg:flex-col lg:border-r">
          {menu.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => setTool(item.id)}
                className={`flex min-w-20 flex-col items-center gap-2 rounded-xl p-3 text-xs ${
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
        </nav>

        <aside className="w-full space-y-4 border-b border-white/10 bg-[#171a28] p-4 lg:w-80 lg:border-r">
          {tool === "media" && (
            <>
              <h2 className="font-bold">
                Medya Kütüphanesi
              </h2>

              <button
                className={`${primaryClass} w-full`}
                onClick={() =>
                  videoInput.current?.click()
                }
              >
                <Upload
                  size={17}
                  className="mr-2 inline"
                />
                Video Seç
              </button>

              {videoName && (
                <div className={panelClass}>
                  <Film className="mb-2 text-violet-400" />
                  <p className="break-all text-sm">
                    {videoName}
                  </p>
                  <p className="text-xs text-white/50">
                    {fmt(duration)}
                  </p>
                </div>
              )}
            </>
          )}

          {tool === "audio" && (
            <>
              <h2 className="font-bold">
                Ses Kütüphanesi
              </h2>

              <button
                className={`${buttonClass} w-full`}
                onClick={() =>
                  audioInput.current?.click()
                }
              >
                <Plus
                  size={16}
                  className="mr-2 inline"
                />
                Kendi Sesini Ekle
              </button>

              <div className={panelClass}>
                <h3 className="mb-3 font-semibold">
                  Global Meme Sounds
                </h3>

                <MemeSounds onAdd={addSound} />
              </div>

              <h3 className="font-semibold">
                Eklenen Sesler
              </h3>

              {audioClips.map((clip) => (
                <div
                  key={clip.id}
                  className={`${panelClass} space-y-3`}
                >
                  <p className="break-all text-sm">
                    {clip.name}
                  </p>

                  <label className="block text-xs">
                    Başlangıç (saniye)
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={total}
                    step={0.1}
                    value={Number(
                      clip.start.toFixed(2)
                    )}
                    onChange={(event) =>
                      updateAudio(clip.id, {
                        start: clamp(
                          Number(event.target.value),
                          0,
                          total
                        ),
                      })
                    }
                    className="w-full rounded-lg bg-black/20 p-2 text-sm"
                  />

                  <label className="block text-xs">
                    Ses Süresi (saniye)
                  </label>

                  <input
                    type="number"
                    min={0.1}
                    max={total}
                    step={0.1}
                    value={Number(
                      clip.duration.toFixed(2)
                    )}
                    onChange={(event) =>
                      updateAudio(clip.id, {
                        duration: clamp(
                          Number(event.target.value),
                          0.1,
                          total
                        ),
                      })
                    }
                    className="w-full rounded-lg bg-black/20 p-2 text-sm"
                  />

                  <label className="block text-xs">
                    Ses Seviyesi: %{clip.volume}
                  </label>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={clip.volume}
                    onChange={(event) =>
                      updateAudio(clip.id, {
                        volume: Number(
                          event.target.value
                        ),
                      })
                    }
                    className="w-full accent-emerald-500"
                  />

                  <button
                    onClick={() =>
                      removeAudio(clip.id)
                    }
                    className="flex items-center gap-2 text-xs text-red-300"
                  >
                    <Trash2 size={14} />
                    Sesi Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "text" && (
            <>
              <h2 className="font-bold">
                Metin Düzenleyici
              </h2>

              <button
                onClick={addText}
                className={`${primaryClass} w-full`}
              >
                <Plus
                  size={16}
                  className="mr-2 inline"
                />
                Yeni Metin Ekle
              </button>

              <p className="text-xs leading-5 text-white/50">
                Her metni farklı bir saniyeye ekleyebilir,
                süresini ayarlayabilir ve video üzerinde
                istediğin yere taşıyabilirsin.
              </p>

              {textClips.map((clip, index) => (
                <div
                  key={clip.id}
                  className={`${panelClass} space-y-3 ${
                    selectedText === clip.id
                      ? "border-violet-400"
                      : ""
                  }`}
                >
                  <button
                    onClick={() => {
                      setSelectedText(clip.id);
                      seek(clip.start);
                    }}
                    className="text-sm font-semibold text-violet-300"
                  >
                    Metin {index + 1} — Düzenle
                  </button>

                  <textarea
                    value={clip.text}
                    rows={3}
                    onChange={(event) =>
                      updateText(clip.id, {
                        text: event.target.value,
                      })
                    }
                    className="w-full rounded-lg bg-black/20 p-2 text-sm"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Başlangıç (sn)
                      <input
                        type="number"
                        min={0}
                        max={total}
                        step={0.1}
                        value={Number(
                          clip.start.toFixed(2)
                        )}
                        onChange={(event) =>
                          updateText(clip.id, {
                            start: clamp(
                              Number(
                                event.target.value
                              ),
                              0,
                              total
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg bg-black/20 p-2"
                      />
                    </label>

                    <label className="text-xs">
                      Süre (sn)
                      <input
                        type="number"
                        min={0.1}
                        max={total}
                        step={0.1}
                        value={Number(
                          clip.duration.toFixed(2)
                        )}
                        onChange={(event) =>
                          updateText(clip.id, {
                            duration: clamp(
                              Number(
                                event.target.value
                              ),
                              0.1,
                              total
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg bg-black/20 p-2"
                      />
                    </label>
                  </div>

                  <label className="block text-xs">
                    Yazı Boyutu: {clip.size}px
                  </label>

                  <input
                    type="range"
                    min={16}
                    max={90}
                    value={clip.size}
                    onChange={(event) =>
                      updateText(clip.id, {
                        size: Number(
                          event.target.value
                        ),
                      })
                    }
                    className="w-full accent-violet-500"
                  />

                  <label className="block text-xs">
                    Yazı Rengi
                  </label>

                  <input
                    type="color"
                    value={clip.color}
                    onChange={(event) =>
                      updateText(clip.id, {
                        color: event.target.value,
                      })
                    }
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Yatay Konum (%)
                      <input
                        type="number"
                        min={5}
                        max={95}
                        value={Math.round(clip.x)}
                        onChange={(event) =>
                          updateText(clip.id, {
                            x: clamp(
                              Number(
                                event.target.value
                              ),
                              5,
                              95
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg bg-black/20 p-2"
                      />
                    </label>

                    <label className="text-xs">
                      Dikey Konum (%)
                      <input
                        type="number"
                        min={5}
                        max={95}
                        value={Math.round(clip.y)}
                        onChange={(event) =>
                          updateText(clip.id, {
                            y: clamp(
                              Number(
                                event.target.value
                              ),
                              5,
                              95
                            ),
                          })
                        }
                        className="mt-1 w-full rounded-lg bg-black/20 p-2"
                      />
                    </label>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        updateText(clip.id, {
                          x: 50,
                          y: 50,
                        });
                      }}
                      className={buttonClass}
                    >
                      Ortala
                    </button>

                    <button
                      onClick={() =>
                        removeText(clip.id)
                      }
                      className="flex items-center gap-1 rounded-lg bg-red-600/20 px-3 py-2 text-xs text-red-300"
                    >
                      <Trash2 size={14} />
                      Sil
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {tool === "effects" && (
            <>
              <h2 className="font-bold">
                Görsel Efektler
              </h2>

              {effects.map(([name, value]) => (
                <button
                  key={name}
                  onClick={() =>
                    setFilter(value)
                  }
                  className={`block w-full text-left ${panelClass} ${
                    filter === value
                      ? "border-violet-400"
                      : ""
                  }`}
                >
                  {name}
                </button>
              ))}
            </>
          )}

          {tool === "settings" && (
            <>
              <h2 className="font-bold">
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
                onChange={(event) =>
                  setVolume(
                    Number(event.target.value)
                  )
                }
                className="w-full accent-violet-500"
              />

              <label className="block text-sm">
                Oynatma Hızı
              </label>

              <select
                value={speed}
                onChange={(event) =>
                  setSpeed(
                    Number(event.target.value)
                  )
                }
                className={`${panelClass} w-full`}
              >
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}x
                    </option>
                  )
                )}
              </select>

              <h3 className="font-semibold">
                Dışa Aktarma
              </h3>

              <label className="block text-sm">
                Video Oranı
              </label>

              <select
                value={ratio}
                onChange={(event) =>
                  setRatio(event.target.value)
                }
                className={`${panelClass} w-full`}
              >
                <option value="9:16">
                  9:16 — TikTok / Reels
                </option>
                <option value="16:9">
                  16:9 — YouTube
                </option>
                <option value="1:1">
                  1:1 — Kare
                </option>
              </select>

              <label className="block text-sm">
                Çözünürlük
              </label>

              <select
                value={quality}
                onChange={(event) =>
                  setQuality(
                    Number(event.target.value)
                  )
                }
                className={`${panelClass} w-full`}
              >
                <option value={720}>720p</option>
                <option value={1080}>1080p</option>
              </select>

              <label className="block text-sm">
                FPS
              </label>

              <select
                value={fps}
                onChange={(event) =>
                  setFps(
                    Number(event.target.value)
                  )
                }
                className={`${panelClass} w-full`}
              >
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>

              <label className="block text-sm">
                Görüntü Yerleşimi
              </label>

              <select
                value={fit}
                onChange={(event) =>
                  setFit(
                    event.target.value as
                      | "contain"
                      | "cover"
                  )
                }
                className={`${panelClass} w-full`}
              >
                <option value="contain">
                  Tam Sığdır
                </option>
                <option value="cover">
                  Ekranı Doldur
                </option>
              </select>
            </>
          )}
        </aside>

        <section className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-5 bg-[#0b0d16] p-4">
          {videoUrl ? (
            <div
              ref={previewRef}
              className="relative flex max-h-[65vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-black"
              style={{
                aspectRatio: ratio.replace(
                  ":",
                  "/"
                ),
              }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="metadata"
                className="h-full w-full"
                style={{
                  filter,
                  objectFit: fit,
                }}
                onLoadedMetadata={(event) => {
                  const value =
                    event.currentTarget.duration;

                  if (
                    Number.isFinite(value) &&
                    value > 0
                  ) {
                    setDuration(value);
                    setSegments([
                      {
                        id: uid(),
                        start: 0,
                        end: value,
                      },
                    ]);
                  }
                }}
                onTimeUpdate={onVideoTime}
                onPlay={() =>
                  setPlaying(true)
                }
                onPause={() =>
                  setPlaying(false)
                }
                onEnded={() =>
                  setPlaying(false)
                }
              />

              {currentText && (
                <div
                  onPointerDown={(event) => {
                    textDragging.current = true;

                    event.currentTarget.setPointerCapture(
                      event.pointerId
                    );

                    setSelectedText(
                      currentText.id
                    );
                    moveText(event);
                  }}
                  onPointerMove={moveText}
                  onPointerUp={() => {
                    textDragging.current = false;
                  }}
                  onPointerCancel={() => {
                    textDragging.current = false;
                  }}
                  className="absolute z-10 cursor-move select-none rounded-lg border border-dashed border-white/50 bg-black/10 px-3 py-2"
                  style={{
                    left: `${currentText.x}%`,
                    top: `${currentText.y}%`,
                    transform:
                      "translate(-50%, -50%)",
                    touchAction: "none",
                  }}
                >
                  <p
                    className="max-w-[70vw] break-words text-center font-bold"
                    style={{
                      fontSize:
                        currentText.size,
                      color:
                        currentText.color,
                      textShadow:
                        "0 2px 8px black",
                    }}
                  >
                    {currentText.text}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() =>
                videoInput.current?.click()
              }
              className="flex min-h-72 w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/20 bg-[#171a28]"
            >
              <Upload
                size={36}
                className="text-violet-400"
              />

              <span className="font-bold">
                Videonu Yükle
              </span>

              <span className={primaryClass}>
                Video Seç
              </span>
            </button>
          )}

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-5">
              <button
                className={buttonClass}
                disabled={!videoUrl}
                onClick={() =>
                  seek(time - 5)
                }
              >
                -5 sn
              </button>

              <button
                onClick={togglePlay}
                disabled={
                  !segments.length ||
                  exporting
                }
                className="rounded-full bg-violet-600 p-4 disabled:opacity-40"
              >
                {playing ? (
                  <Pause />
                ) : (
                  <Play />
                )}
              </button>

              <button
                className={buttonClass}
                disabled={!videoUrl}
                onClick={() =>
                  seek(time + 5)
                }
              >
                +5 sn
              </button>
            </div>

            <button
              onClick={splitVideo}
              disabled={
                !segments.length ||
                exporting
              }
              className="flex items-center gap-2 rounded-xl bg-violet-600/20 px-5 py-3 text-sm font-semibold text-violet-200 disabled:opacity-40"
            >
              <Scissors size={19} />
              Buradan Kes
            </button>

            <span className="text-xs text-white/50">
              {fmt(time)} / {fmt(total)}
            </span>
          </div>
        </section>
      </div>

      <section className="space-y-4 border-t border-white/10 bg-[#141725] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            Zaman Çizelgesi
          </h2>

          <button
            className={buttonClass}
            disabled={!duration}
            onClick={() => {
              videoRef.current?.pause();

              setSegments([
                {
                  id: uid(),
                  start: 0,
                  end: duration,
                },
              ]);

              setTime(0);

              if (videoRef.current) {
                videoRef.current.currentTime = 0;
              }
            }}
          >
            Kesimleri Sıfırla
          </button>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(total, 0.1)}
          step={0.05}
          value={time}
          disabled={!segments.length}
          onChange={(event) =>
            seek(
              Number(event.target.value)
            )
          }
          className="w-full accent-violet-500"
        />

        <div className="space-y-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-white/60">
              <Film size={15} />
              Video Klipleri
            </div>

            <div className="flex gap-2 overflow-x-auto rounded-xl bg-[#222638] p-3">
              {segments.map((segment, index) => (
                <div
                  key={segment.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData(
                      "text/plain",
                      String(index)
                    );
                  }}
                  onDragOver={(event) =>
                    event.preventDefault()
                  }
                  onDrop={(event) => {
                    event.preventDefault();

                    const from = Number(
                      event.dataTransfer.getData(
                        "text/plain"
                      )
                    );

                    reorderSegments(
                      from,
                      index
                    );
                  }}
                  className="relative flex min-w-28 flex-col gap-2 rounded-lg border-2 border-blue-400 bg-blue-600/60 p-3"
                  style={{
                    flexGrow: Math.max(
                      0.2,
                      segment.end -
                        segment.start
                    ),
                  }}
                >
                  <button
                    onClick={() =>
                      seek(
                        projectAt(
                          index,
                          segment.start
                        )
                      )
                    }
                    className="flex items-center gap-1 text-left text-xs"
                  >
                    <GripVertical size={15} />
                    Klip {index + 1}
                  </button>

                  <span className="text-xs text-white/70">
                    {fmt(
                      segment.end -
                        segment.start
                    )}
                  </span>

                  <button
                    onClick={() =>
                      removeSegment(
                        segment.id
                      )
                    }
                    className="absolute right-1 top-1 rounded bg-red-600 p-1"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-emerald-300">
              <Music2 size={15} />
              Ses Katmanı — Sürükleyerek Taşı
            </div>

            <div
              ref={timelineRef}
              className="relative h-16 rounded-xl border border-emerald-500/20 bg-emerald-500/10"
            >
              {audioClips.map((clip) => (
                <div
                  key={clip.id}
                  onPointerDown={(event) =>
                    startTimelineDrag(
                      event,
                      "audio",
                      clip.id,
                      clip.start
                    )
                  }
                  onPointerMove={
                    moveTimelineItem
                  }
                  onPointerUp={
                    stopTimelineDrag
                  }
                  onPointerCancel={
                    stopTimelineDrag
                  }
                  className="absolute inset-y-2 flex cursor-grab items-center gap-1 overflow-hidden rounded-lg border border-emerald-300 bg-emerald-600/80 px-2 text-xs active:cursor-grabbing"
                  style={{
                    left: `${
                      total
                        ? (clip.start /
                            total) *
                          100
                        : 0
                    }%`,
                    width: `${
                      total
                        ? (clip.duration /
                            total) *
                          100
                        : 0
                    }%`,
                    touchAction: "none",
                  }}
                >
                  <Music2
                    size={13}
                    className="shrink-0"
                  />
                  <span className="truncate">
                    {clip.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-violet-300">
              <Type size={15} />
              Metin Katmanı — Sürükleyerek Taşı
            </div>

            <div className="relative h-16 rounded-xl border border-violet-500/20 bg-violet-500/10">
              {textClips.map((clip) => (
                <div
                  key={clip.id}
                  onPointerDown={(event) => {
                    setSelectedText(
                      clip.id
                    );

                    startTimelineDrag(
                      event,
                      "text",
                      clip.id,
                      clip.start
                    );
                  }}
                  onPointerMove={
                    moveTimelineItem
                  }
                  onPointerUp={
                    stopTimelineDrag
                  }
                  onPointerCancel={
                    stopTimelineDrag
                  }
                  onDoubleClick={() => {
                    setTool("text");
                    seek(clip.start);
                  }}
                  className="absolute inset-y-2 flex cursor-grab items-center gap-1 overflow-hidden rounded-lg border border-violet-300 bg-violet-600/80 px-2 text-xs active:cursor-grabbing"
                  style={{
                    left: `${
                      total
                        ? (clip.start /
                            total) *
                          100
                        : 0
                    }%`,
                    width: `${
                      total
                        ? (clip.duration /
                            total) *
                          100
                        : 0
                    }%`,
                    touchAction: "none",
                  }}
                >
                  <Type
                    size={13}
                    className="shrink-0"
                  />

                  <span className="truncate">
                    {clip.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-xs leading-5 text-white/40">
          Mavi: Video klipleri. Yeşil: Sesler.
          Mor: Metinler. Ses ve metin kutularını
          sağa sola sürükleyerek başlangıç
          zamanlarını değiştirebilirsin.
          Metinlerin ekrandaki yerini de video
          önizlemesinde sürükleyerek ayarlayabilirsin.
        </p>
      </section>
    </main>
  );
}
