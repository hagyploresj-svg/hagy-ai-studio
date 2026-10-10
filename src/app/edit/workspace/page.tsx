
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as PE,
} from "react";
import Link from "next/link";
import {
  ArrowLeft, Clapperboard, Download, Film, Music2,
  Pause, Play, Plus, Scissors, Trash2, Type,
  Upload, GripVertical, Sparkles, Settings2,
} from "lucide-react";
import MemeSounds from "../MemeSounds";

type Transition = "none" | "fade" | "flash";
type Segment = {
  id: string;
  start: number;
  end: number;
  transition: Transition;
  transitionDuration: number;
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
type Sound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};
type Tool = "media" | "audio" | "text" | "effects" | "settings";

const uid = () => crypto.randomUUID();
const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
const fmt = (n: number) => {
  const x = Math.floor(Math.max(0, n || 0));
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
const btn =
  "rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-40";
const primary =
  "rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40";
const panel = "rounded-xl border border-white/10 bg-white/5 p-3";

const filters = [
  ["Normal", "none"],
  ["Siyah Beyaz", "grayscale(1)"],
  ["Vintage", "sepia(.8)"],
  ["Canlı", "saturate(1.8)"],
  ["Kontrast", "contrast(1.5)"],
];

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const urls = useRef<string[]>([]);
  const players = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentIndex = useRef(0);
  const scrubbing = useRef(false);
  const textDrag = useRef<string | null>(null);
  const clipDrag = useRef<number | null>(null);
  const dragging = useRef<{
    kind: "audio" | "text";
    id: string;
    x: number;
    start: number;
  } | null>(null);

  const [tool, setTool] = useState<Tool>("media");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audios, setAudios] = useState<AudioClip[]>([]);
  const [texts, setTexts] = useState<TextClip[]>([]);
  const [filter, setFilter] = useState("none");
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [ratio, setRatio] = useState("9:16");
  const [quality, setQuality] = useState(720);
  const [fps, setFps] = useState(30);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [exportMenu, setExportMenu] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const total = segments.reduce(
    (n, s) => n + s.end - s.start,
    0
  );
  const boundaries = segments.map((_, i) =>
    segments
      .slice(0, i + 1)
      .reduce((n, s) => n + s.end - s.start, 0)
  );
  const segmentStart = (i: number) =>
    i === 0 ? 0 : boundaries[i - 1];

  useEffect(() => {
    return () => {
      urls.current.forEach(URL.revokeObjectURL);
      players.current.forEach((audio) => audio.pause());
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume / 100;
      videoRef.current.playbackRate = speed;
    }
  }, [volume, speed, videoUrl]);

  useEffect(() => {
    const active = new Set(audios.map((a) => a.id));
    players.current.forEach((audio, key) => {
      if (!active.has(key)) {
        audio.pause();
        players.current.delete(key);
      }
    });

    for (const clip of audios) {
      let audio = players.current.get(clip.id);
      if (!audio) {
        audio = new Audio(clip.url);
        players.current.set(clip.id, audio);
      }
      const offset = time - clip.start;
      if (!playing || offset < 0 || offset >= clip.duration) {
        audio.pause();
        continue;
      }
      audio.volume = clip.volume / 100;
      audio.playbackRate = speed;
      if (
        audio.readyState >= 1 &&
        Math.abs(audio.currentTime - offset) > 0.3
      ) {
        try {
          audio.currentTime = offset;
        } catch {}
      }
      if (audio.paused) audio.play().catch(() => {});
    }
  }, [audios, time, playing, speed]);

  function locate(t: number) {
    let remaining = clamp(t, 0, total);
    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const length = s.end - s.start;
      if (remaining < length || i === segments.length - 1) {
        return {
          i,
          source: Math.min(s.end, s.start + remaining),
        };
      }
      remaining -= length;
    }
    return { i: 0, source: 0 };
  }

  function seek(t: number) {
    if (!segments.length || !videoRef.current) return;
    const p = clamp(t, 0, total);
    const loc = locate(p);
    currentIndex.current = loc.i;
    videoRef.current.currentTime = loc.source;
    setTime(p);
  }

  function scrub(clientX: number) {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect && total) {
      seek(clamp((clientX - rect.left) / rect.width, 0, 1) * total);
    }
  }

  function onVideoTime() {
    const video = videoRef.current;
    if (!video || !segments.length) return;
    const i = clamp(currentIndex.current, 0, segments.length - 1);
    const s = segments[i];

    if (video.currentTime >= s.end - 0.035 && !video.paused) {
      if (i + 1 < segments.length) {
        currentIndex.current = i + 1;
        video.currentTime = segments[i + 1].start;
        setTime(boundaries[i]);
      } else {
        video.pause();
        setTime(total);
      }
      return;
    }

    if (
      video.currentTime >= s.start - 0.05 &&
      video.currentTime <= s.end + 0.05
    ) {
      setTime(
        clamp(
          segmentStart(i) + video.currentTime - s.start,
          0,
          total
        )
      );
    }
  }

  function uploadVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) return;
    videoRef.current?.pause();
    players.current.forEach((a) => a.pause());
    players.current.clear();

    const url = URL.createObjectURL(file);
    urls.current.push(url);
    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setSegments([]);
    setAudios([]);
    setTexts([]);
    setTime(0);
    currentIndex.current = 0;
    setPlaying(false);
    e.target.value = "";
  }

  async function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) {
      video.pause();
      return;
    }
    if (time >= total - 0.05) seek(0);
    try {
      await video.play();
    } catch {
      setMessage("Video oynatılamadı.");
    }
  }

  function split() {
    if (!segments.length) return;
    videoRef.current?.pause();

    const { i, source } = locate(time);
    const s = segments[i];
    if (source <= s.start + 0.05 || source >= s.end - 0.05) {
      setMessage("Klibin içinden bir nokta seç.");
      return;
    }

    setSegments((old) => [
      ...old.slice(0, i),
      {
        ...s,
        id: uid(),
        end: source,
        transition: "none",
      },
      {
        ...s,
        id: uid(),
        start: source,
      },
      ...old.slice(i + 1),
    ]);

    currentIndex.current = i;
    setMessage("Klip bölündü. Arasına geçiş veya ses ekleyebilirsin.");
  }

  function removeSegment(i: number) {
    const next = segments.filter((_, index) => index !== i);
    videoRef.current?.pause();
    setSegments(next);
    currentIndex.current = 0;
    setTime(0);
    if (next.length && videoRef.current) {
      videoRef.current.currentTime = next[0].start;
    }
  }

  function reorder(from: number, to: number) {
    if (
      from < 0 ||
      from >= segments.length ||
      to < 0 ||
      to >= segments.length ||
      from === to
    ) return;

    const next = [...segments];
    const item = next.splice(from, 1)[0];
    next.splice(to, 0, item);
    videoRef.current?.pause();
    setSegments(next);
    currentIndex.current = 0;
    setTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = next[0].start;
    }
  }

  function updateTransition(i: number, value: Transition) {
    setSegments((old) =>
      old.map((s, j) =>
        j === i ? { ...s, transition: value } : s
      )
    );
  }

  function addSound(sound: Sound, at?: number) {
    if (!total) {
      setMessage("Önce video yükle.");
      return;
    }
    const start = clamp(at ?? time, 0, Math.max(0, total - 0.1));
    const length =
      Number.isFinite(sound.duration) && sound.duration > 0
        ? sound.duration
        : 5;

    setAudios((old) => [
      ...old,
      {
        id: uid(),
        name: sound.name,
        url: sound.url,
        start,
        duration: Math.min(length, total - start),
        volume: 100,
      },
    ]);
    setMessage(`${sound.name} eklendi. Yeşil bloğu sürükleyebilirsin.`);
  }

  function uploadAudio(e: ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach((file) => {
      if (!file.type.startsWith("audio/")) return;
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      const audio = new Audio(url);
      audio.onloadedmetadata = () =>
        addSound({
          id: uid(),
          name: file.name,
          url,
          duration: audio.duration,
          source: "local",
          category: "custom",
        });
    });
    e.target.value = "";
  }

  function addText() {
    if (!total) return;
    setTexts((old) => [
      ...old,
      {
        id: uid(),
        text: "Yeni Metin",
        start: Math.min(time, Math.max(0, total - 0.1)),
        duration: Math.min(3, Math.max(0.1, total - time)),
        x: 50,
        y: 50,
        size: 36,
        color: "#ffffff",
      },
    ]);
    setTool("text");
  }

  function moveTimeline(e: PE<HTMLDivElement>) {
    const drag = dragging.current;
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!drag || !rect || !total) return;

    const delta = ((e.clientX - drag.x) / rect.width) * total;
    if (drag.kind === "audio") {
      setAudios((old) =>
        old.map((clip) =>
          clip.id === drag.id
            ? {
                ...clip,
                start: clamp(
                  drag.start + delta,
                  0,
                  Math.max(0, total - clip.duration)
                ),
              }
            : clip
        )
      );
    } else {
      setTexts((old) =>
        old.map((clip) =>
          clip.id === drag.id
            ? {
                ...clip,
                start: clamp(
                  drag.start + delta,
                  0,
                  Math.max(0, total - clip.duration)
                ),
              }
            : clip
        )
      );
    }
  }

  function dragTextPreview(e: PE<HTMLDivElement>, clipId: string) {
    if (textDrag.current !== clipId || !previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    setTexts((old) =>
      old.map((clip) =>
        clip.id === clipId
          ? {
              ...clip,
              x: clamp(
                ((e.clientX - rect.left) / rect.width) * 100,
                5,
                95
              ),
              y: clamp(
                ((e.clientY - rect.top) / rect.height) * 100,
                5,
                95
              ),
            }
          : clip
      )
    );
  }

  function dimensions(): [number, number] {
    if (ratio === "9:16") {
      return quality === 1080 ? [1080, 1920] : [720, 1280];
    }
    if (ratio === "1:1") {
      return quality === 1080 ? [1080, 1080] : [720, 720];
    }
    return quality === 1080 ? [1920, 1080] : [1280, 720];
  }

  function transitionAlpha(t: number) {
    for (let i = 0; i < segments.length - 1; i++) {
      const s = segments[i];
      const duration = Math.min(
        s.transitionDuration,
        (s.end - s.start) / 2,
        (segments[i + 1].end - segments[i + 1].start) / 2
      );
      if (s.transition === "none" || duration <= 0) continue;
      const boundary = boundaries[i];
      if (t >= boundary - duration && t <= boundary + duration) {
        return 1 - Math.abs(t - boundary) / duration;
      }
    }
    return 0;
  }

  function transitionColor() {
    for (let i = 0; i < segments.length - 1; i++) {
      const s = segments[i];
      const boundary = boundaries[i];
      if (
        s.transition !== "none" &&
        time >= boundary - s.transitionDuration &&
        time <= boundary + s.transitionDuration
      ) {
        return s.transition === "flash" ? "white" : "black";
      }
    }
    return "black";
  }

  async function exportVideo() {
    if (!videoUrl || !segments.length || exporting) return;
    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setMessage("Tarayıcı video dışa aktarmayı desteklemiyor.");
      return;
    }

    videoRef.current?.pause();
    setExporting(true);
    setExportMenu(false);
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

    const [w, h] = dimensions();
    canvas.width = w;
    canvas.height = h;

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let frame = 0;

    const sounds: {
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
      const sourceNode =
        audioContext.createMediaElementSource(source);
      const gain = audioContext.createGain();
      gain.gain.value = volume / 100;
      sourceNode.connect(gain);
      gain.connect(destination);

      for (const clip of audios) {
        const audio = new Audio(clip.url);
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        const node =
          audioContext.createMediaElementSource(audio);
        const clipGain = audioContext.createGain();
        clipGain.gain.value = clip.volume / 100;
        node.connect(clipGain);
        clipGain.connect(destination);
        sounds.push({ audio, clip });
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
      ].find((type) => MediaRecorder.isTypeSupported(type));

      if (!mime) {
        throw new Error("Desteklenen format yok.");
      }

      recorder = new MediaRecorder(combined, {
        mimeType: mime,
        videoBitsPerSecond:
          quality === 1080 ? 10000000 : 5000000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const done = new Promise<void>((resolve, reject) => {
        recorder!.onstop = () => resolve();
        recorder!.onerror = () =>
          reject(new Error("Kayıt hatası."));
      });

      let projectTime = 0;

      function draw() {
        if (!ctx) return;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        if (source.readyState >= 2) {
          const vw = source.videoWidth || w;
          const vh = source.videoHeight || h;
          const scale =
            fit === "cover"
              ? Math.max(w / vw, h / vh)
              : Math.min(w / vw, h / vh);
          const dw = vw * scale;
          const dh = vh * scale;

          ctx.save();
          ctx.filter = filter;
          ctx.drawImage(
            source,
            (w - dw) / 2,
            (h - dh) / 2,
            dw,
            dh
          );
          ctx.restore();
        }

        for (const clip of texts) {
          if (
            projectTime < clip.start ||
            projectTime >= clip.start + clip.duration
          ) continue;

          ctx.save();
          ctx.fillStyle = clip.color;
          ctx.font = `bold ${Math.round(
            (clip.size * w) / 720
          )}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 8;
          ctx.fillText(
            clip.text,
            (clip.x / 100) * w,
            (clip.y / 100) * h,
            w * 0.9
          );
          ctx.restore();
        }

        for (let i = 0; i < segments.length - 1; i++) {
          const s = segments[i];
          if (s.transition === "none") continue;

          const boundary = boundaries[i];
          const d = Math.min(
            s.transitionDuration,
            (s.end - s.start) / 2,
            (segments[i + 1].end - segments[i + 1].start) / 2
          );

          if (
            d > 0 &&
            projectTime >= boundary - d &&
            projectTime <= boundary + d
          ) {
            ctx.fillStyle =
              s.transition === "flash" ? "white" : "black";
            ctx.globalAlpha =
              1 - Math.abs(projectTime - boundary) / d;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
            break;
          }
        }

        frame = requestAnimationFrame(draw);
      }

      await audioContext.resume();
      recorder.start(500);
      draw();

      let completed = 0;

      for (const segment of segments) {
        source.pause();

        if (Math.abs(source.currentTime - segment.start) > 0.02) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error("Video konum hatası.")),
              15000
            );
            source.addEventListener(
              "seeked",
              () => {
                clearTimeout(timeout);
                resolve();
              },
              { once: true }
            );
            source.currentTime = segment.start;
          });
        }

        await source.play();

        const started = performance.now();
        const length = (segment.end - segment.start) / speed;

        await new Promise<void>((resolve) => {
          const interval = window.setInterval(() => {
            const elapsed =
              (performance.now() - started) / 1000;

            projectTime =
              completed * speed +
              Math.min(
                elapsed * speed,
                segment.end - segment.start
              );

            for (const { audio, clip } of sounds) {
              const offset = projectTime - clip.start;

              if (offset >= 0 && offset < clip.duration) {
                if (audio.paused && audio.readyState >= 2) {
                  try {
                    audio.currentTime = offset;
                    audio.playbackRate = speed;
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
                  ((completed + elapsed) / (total / speed)) * 100
                )
              )
            );

            if (elapsed >= length || source.ended) {
              clearInterval(interval);
              source.pause();
              sounds.forEach((item) => item.audio.pause());
              resolve();
            }
          }, 40);
        });

        completed += length;
      }

      recorder.stop();
      await done;

      const blob = new Blob(chunks, { type: mime });
      if (!blob.size) {
        throw new Error("Boş video oluşturuldu.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `hagy-${ratio.replace(
        ":",
        "x"
      )}-${quality}p-${fps}fps.${
        mime.includes("mp4") ? "mp4" : "webm"
      }`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("Video indirildi.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dışa aktarma başarısız."
      );
    } finally {
      if (recorder?.state === "recording") {
        recorder.stop();
      }
      cancelAnimationFrame(frame);
      source.pause();
      sounds.forEach((item) => item.audio.pause());
      stream?.getTracks().forEach((track) => track.stop());
      await audioContext?.close().catch(() => {});
      setExporting(false);
      setProgress(0);
    }
  }

  const overlay = transitionAlpha(time);

  return (
    <main className="min-h-screen bg-[#090b12] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#131624] p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className={btn}>
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
            className={btn}
            onClick={() => videoInput.current?.click()}
          >
            <Upload size={16} className="mr-1 inline" />
            Video Yükle
          </button>
          <button
            className={primary}
            disabled={!segments.length || exporting}
            onClick={() => setExportMenu(true)}
          >
            <Download size={16} className="mr-1 inline" />
            {exporting ? `%${progress}` : "Dışa Aktar"}
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
          {(
            [
              { id: "media", name: "Medya", Icon: Film },
              { id: "audio", name: "Sesler", Icon: Music2 },
              { id: "text", name: "Metin", Icon: Type },
              { id: "effects", name: "Efektler", Icon: Sparkles },
              { id: "settings", name: "Ayarlar", Icon: Settings2 },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              onClick={() => setTool(item.id)}
              className={`flex min-w-20 flex-col items-center gap-2 rounded-xl p-3 text-xs ${
                tool === item.id
                  ? "bg-violet-600/25 text-violet-300"
                  : "text-white/50 hover:bg-white/10"
              }`}
            >
              <item.Icon size={20} />
              {item.name}
            </button>
          ))}
        </nav>

        <aside className="w-full space-y-3 border-b border-white/10 bg-[#171a28] p-4 lg:w-80 lg:border-r">
          {tool === "media" && (
            <>
              <h2 className="font-bold">Medya</h2>
              <button
                className={`${primary} w-full`}
                onClick={() => videoInput.current?.click()}
              >
                Video Seç
              </button>
              <p className="break-all text-sm text-white/60">
                {videoName || "Video yüklenmedi"}
              </p>
            </>
          )}

          {tool === "audio" && (
            <>
              <h2 className="font-bold">Sesler</h2>
              <button
                className={`${btn} w-full`}
                onClick={() => audioInput.current?.click()}
              >
                <Plus size={15} className="mr-1 inline" />
                Kendi Sesini Ekle
              </button>
              <div className={panel}>
                <MemeSounds onAdd={addSound} />
              </div>

              {audios.map((clip) => (
                <div key={clip.id} className={`${panel} space-y-2`}>
                  <p className="break-all text-sm">{clip.name}</p>
                  <label className="block text-xs">
                    Başlangıç (sn)
                    <input
                      className="mt-1 w-full rounded bg-black/20 p-2"
                      type="number"
                      min={0}
                      step=".1"
                      value={+clip.start.toFixed(2)}
                      onChange={(e) =>
                        setAudios((old) =>
                          old.map((x) =>
                            x.id === clip.id
                              ? {
                                  ...x,
                                  start: clamp(
                                    +e.target.value,
                                    0,
                                    Math.max(0, total - x.duration)
                                  ),
                                }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    Süre (sn)
                    <input
                      className="mt-1 w-full rounded bg-black/20 p-2"
                      type="number"
                      min={0.1}
                      step=".1"
                      value={+clip.duration.toFixed(2)}
                      onChange={(e) =>
                        setAudios((old) =>
                          old.map((x) =>
                            x.id === clip.id
                              ? {
                                  ...x,
                                  duration: clamp(
                                    +e.target.value,
                                    0.1,
                                    Math.max(0.1, total - x.start)
                                  ),
                                }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                  <label className="block text-xs">
                    Ses %{clip.volume}
                    <input
                      className="w-full accent-emerald-500"
                      type="range"
                      min={0}
                      max={100}
                      value={clip.volume}
                      onChange={(e) =>
                        setAudios((old) =>
                          old.map((x) =>
                            x.id === clip.id
                              ? { ...x, volume: +e.target.value }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                  <button
                    className="text-xs text-red-300"
                    onClick={() =>
                      setAudios((old) =>
                        old.filter((x) => x.id !== clip.id)
                      )
                    }
                  >
                    Sesi Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "text" && (
            <>
              <h2 className="font-bold">Metinler</h2>
              <button
                className={`${primary} w-full`}
                onClick={addText}
              >
                <Plus size={15} className="mr-1 inline" />
                Metin Ekle
              </button>

              {texts.map((clip) => (
                <div key={clip.id} className={`${panel} space-y-2`}>
                  <textarea
                    className="w-full rounded bg-black/20 p-2"
                    rows={2}
                    value={clip.text}
                    onChange={(e) =>
                      setTexts((old) =>
                        old.map((x) =>
                          x.id === clip.id
                            ? { ...x, text: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      ["start", "duration", "x", "y", "size"] as const
                    ).map((key) => (
                      <label key={key} className="text-xs">
                        {{
                          start: "Başlangıç",
                          duration: "Süre",
                          x: "Yatay %",
                          y: "Dikey %",
                          size: "Boyut",
                        }[key]}
                        <input
                          className="mt-1 w-full rounded bg-black/20 p-2"
                          type="number"
                          step={
                            key === "start" || key === "duration"
                              ? 0.1
                              : 1
                          }
                          value={+clip[key].toFixed(2)}
                          onChange={(e) =>
                            setTexts((old) =>
                              old.map((x) =>
                                x.id === clip.id
                                  ? {
                                      ...x,
                                      [key]: +e.target.value,
                                    }
                                  : x
                              )
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <input
                    type="color"
                    value={clip.color}
                    onChange={(e) =>
                      setTexts((old) =>
                        old.map((x) =>
                          x.id === clip.id
                            ? { ...x, color: e.target.value }
                            : x
                        )
                      )
                    }
                  />
                  <button
                    className="ml-3 text-xs text-red-300"
                    onClick={() =>
                      setTexts((old) =>
                        old.filter((x) => x.id !== clip.id)
                      )
                    }
                  >
                    Metni Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "effects" && (
            <>
              <h2 className="font-bold">Efektler</h2>
              {filters.map(([name, value]) => (
                <button
                  key={name}
                  className={`${panel} block w-full text-left text-sm ${
                    filter === value ? "border-violet-400" : ""
                  }`}
                  onClick={() => setFilter(value)}
                >
                  {name}
                </button>
              ))}
            </>
          )}

          {tool === "settings" && (
            <>
              <h2 className="font-bold">Video Ayarları</h2>
              <label className="block text-sm">
                Video Sesi %{volume}
                <input
                  className="w-full"
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(e) => setVolume(+e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Hız
                <select
                  className={`${panel} mt-1 w-full`}
                  value={speed}
                  onChange={(e) => setSpeed(+e.target.value)}
                >
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((x) => (
                    <option key={x} value={x}>
                      {x}x
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-xs text-white/50">
                Video oranı, çözünürlük ve FPS seçenekleri
                Dışa Aktar menüsünde.
              </p>
            </>
          )}
        </aside>

        <section className="flex min-h-[480px] flex-1 flex-col items-center justify-center gap-4 bg-[#0b0d16] p-4">
          {videoUrl ? (
            <div
              ref={previewRef}
              className="relative flex max-h-[65vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-black"
              style={{ aspectRatio: ratio.replace(":", "/") }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                playsInline
                preload="metadata"
                className="h-full w-full"
                style={{ filter, objectFit: fit }}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) {
                    setDuration(d);
                    setSegments([
                      {
                        id: uid(),
                        start: 0,
                        end: d,
                        transition: "none",
                        transitionDuration: 0.25,
                      },
                    ]);
                  }
                }}
                onTimeUpdate={onVideoTime}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />

              {texts
                .filter(
                  (clip) =>
                    time >= clip.start &&
                    time < clip.start + clip.duration
                )
                .map((clip) => (
                  <div
                    key={clip.id}
                    className="absolute z-10 cursor-move select-none border border-dashed border-white/40 px-2"
                    style={{
                      left: `${clip.x}%`,
                      top: `${clip.y}%`,
                      transform: "translate(-50%, -50%)",
                      touchAction: "none",
                    }}
                    onPointerDown={(e) => {
                      textDrag.current = clip.id;
                      e.currentTarget.setPointerCapture(e.pointerId);
                    }}
                    onPointerMove={(e) =>
                      dragTextPreview(e, clip.id)
                    }
                    onPointerUp={() => (textDrag.current = null)}
                    onPointerCancel={() => (textDrag.current = null)}
                  >
                    <p
                      className="text-center font-bold"
                      style={{
                        fontSize: clip.size,
                        color: clip.color,
                        textShadow: "0 2px 8px black",
                      }}
                    >
                      {clip.text}
                    </p>
                  </div>
                ))}

              {overlay > 0 && (
                <div
                  className="pointer-events-none absolute inset-0 z-20"
                  style={{
                    background: transitionColor(),
                    opacity: overlay,
                  }}
                />
              )}
            </div>
          ) : (
            <button
              className="flex min-h-64 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20"
              onClick={() => videoInput.current?.click()}
            >
              <Upload size={36} className="text-violet-400" />
              Video Yükle
            </button>
          )}

          <div className="flex items-center gap-4">
            <button
              className={btn}
              disabled={!total}
              onClick={() => seek(time - 5)}
            >
              -5 sn
            </button>
            <button
              className="rounded-full bg-violet-600 p-4 disabled:opacity-40"
              disabled={!total || exporting}
              onClick={togglePlay}
            >
              {playing ? <Pause /> : <Play />}
            </button>
            <button
              className={btn}
              disabled={!total}
              onClick={() => seek(time + 5)}
            >
              +5 sn
            </button>
          </div>

          <button
            className={`${btn} flex items-center gap-2 text-violet-200`}
            disabled={!total}
            onClick={split}
          >
            <Scissors size={17} />
            Çubuktan Kes
          </button>

          <span className="text-xs text-white/50">
            {fmt(time)} / {fmt(total)}
          </span>
        </section>
      </div>

      <section className="space-y-3 border-t border-white/10 bg-[#141725] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">
              Birleşik Zaman Çizelgesi
            </h2>
            <p className="text-xs text-white/50">
              Çubuğu sürükle, kes, geçiş ve ses ekle
            </p>
          </div>
          <button
            className={btn}
            disabled={!duration}
            onClick={() => {
              videoRef.current?.pause();
              setSegments([
                {
                  id: uid(),
                  start: 0,
                  end: duration,
                  transition: "none",
                  transitionDuration: 0.25,
                },
              ]);
              seek(0);
            }}
          >
            Kesimleri Sıfırla
          </button>
        </div>

        <div
          ref={timelineRef}
          className="relative rounded-xl border border-white/10 bg-[#202438]"
        >
          {/* OYNATMA ÇUBUĞU */}
          <div
            className="relative h-8 cursor-ew-resize touch-none border-b border-white/10 bg-[#30354c]"
            onPointerDown={(e) => {
              videoRef.current?.pause();
              scrubbing.current = true;
              e.currentTarget.setPointerCapture(e.pointerId);
              scrub(e.clientX);
            }}
            onPointerMove={(e) => {
              if (scrubbing.current) scrub(e.clientX);
            }}
            onPointerUp={() => (scrubbing.current = false)}
            onPointerCancel={() => (scrubbing.current = false)}
          >
            <span className="absolute left-2 top-1 text-[10px] text-white/50">
              0:00
            </span>
            <span className="absolute right-2 top-1 text-[10px] text-white/50">
              {fmt(total)}
            </span>
          </div>

          {/* VIDEO KLİPLERİ */}
          <div className="relative h-20 border-b border-white/10">
            {segments.map((segment, i) => (
              <div
                key={segment.id}
                draggable
                onDragStart={(e) => {
                  clipDrag.current = i;
                  e.dataTransfer.setData("text/plain", String(i));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (clipDrag.current !== null) {
                    reorder(clipDrag.current, i);
                  }
                  clipDrag.current = null;
                }}
                onDragEnd={() => (clipDrag.current = null)}
                className="absolute inset-y-0 flex flex-col justify-between overflow-hidden border-r-2 border-[#141725] bg-blue-600/80 p-2"
                style={{
                  left: `${total ? (segmentStart(i) / total) * 100 : 0}%`,
                  width: `${
                    total
                      ? ((segment.end - segment.start) / total) * 100
                      : 0
                  }%`,
                }}
              >
                <button
                  className="flex items-center gap-1 text-xs"
                  onClick={() => seek(segmentStart(i))}
                >
                  <GripVertical size={13} />
                  Klip {i + 1}
                </button>
                <span className="text-[10px]">
                  {fmt(segment.end - segment.start)}
                </span>
                <button
                  className="absolute right-1 top-1 rounded bg-red-600 p-1"
                  onClick={() => removeSegment(i)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* KLİP BİRLEŞİM NOKTALARI */}
            {segments.slice(0, -1).map((segment, i) => (
              <button
                key={segment.id}
                title="Geçiş düzenle"
                className="absolute top-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-violet-600 px-2 py-1 text-xs"
                style={{
                  left: `${(boundaries[i] / total) * 100}%`,
                }}
                onClick={() => {
                  setTool("media");
                  setMessage(
                    `Klip ${i + 1} → ${i + 2} geçişini aşağıdan seç.`
                  );
                }}
              >
                ✦
              </button>
            ))}
          </div>

          {/* SES KATMANI */}
          <div className="relative h-14 border-b border-white/10 bg-emerald-950/30">
            {audios.map((clip) => (
              <div
                key={clip.id}
                className="absolute inset-y-1 flex cursor-grab touch-none items-center gap-1 overflow-hidden rounded border border-emerald-300 bg-emerald-600/90 px-2 text-xs"
                style={{
                  left: `${total ? (clip.start / total) * 100 : 0}%`,
                  width: `${
                    total ? (clip.duration / total) * 100 : 0
                  }%`,
                }}
                onPointerDown={(e) => {
                  dragging.current = {
                    kind: "audio",
                    id: clip.id,
                    x: e.clientX,
                    start: clip.start,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={moveTimeline}
                onPointerUp={() => (dragging.current = null)}
                onPointerCancel={() => (dragging.current = null)}
              >
                <Music2 size={13} />
                <span className="truncate">{clip.name}</span>
              </div>
            ))}
          </div>

          {/* METİN KATMANI */}
          <div className="relative h-12 bg-violet-950/30">
            {texts.map((clip) => (
              <div
                key={clip.id}
                className="absolute inset-y-1 flex cursor-grab touch-none items-center gap-1 overflow-hidden rounded border border-violet-300 bg-violet-600/90 px-2 text-xs"
                style={{
                  left: `${total ? (clip.start / total) * 100 : 0}%`,
                  width: `${
                    total ? (clip.duration / total) * 100 : 0
                  }%`,
                }}
                onPointerDown={(e) => {
                  dragging.current = {
                    kind: "text",
                    id: clip.id,
                    x: e.clientX,
                    start: clip.start,
                  };
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={moveTimeline}
                onPointerUp={() => (dragging.current = null)}
                onPointerCancel={() => (dragging.current = null)}
                onDoubleClick={() => {
                  setTool("text");
                  seek(clip.start);
                }}
              >
                <Type size={13} />
                <span className="truncate">{clip.text}</span>
              </div>
            ))}
          </div>

          {/* ORTAK OYNATMA ÇİZGİSİ */}
          {total > 0 && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-30 w-[2px] bg-white"
              style={{ left: `${(time / total) * 100}%` }}
            >
              <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-b bg-white" />
            </div>
          )}
        </div>

        {/* KLİP ARASI GEÇİŞLER */}
        {segments.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Klip Arası Geçişler ve Ses Efektleri
            </h3>
            <div className="flex flex-wrap gap-2">
              {segments.slice(0, -1).map((segment, i) => (
                <div
                  key={segment.id}
                  className={`${panel} flex flex-wrap items-center gap-2 text-xs`}
                >
                  <span>
                    {i + 1} → {i + 2}
                  </span>
                  <select
                    className="rounded bg-[#202438] p-2"
                    value={segment.transition}
                    onChange={(e) =>
                      updateTransition(
                        i,
                        e.target.value as Transition
                      )
                    }
                  >
                    <option value="none">Geçiş yok</option>
                    <option value="fade">Karartarak geç</option>
                    <option value="flash">Beyaz flaş</option>
                  </select>
                  <button
                    className="rounded bg-emerald-700 px-2 py-2"
                    onClick={() => {
                      seek(boundaries[i]);
                      setTool("audio");
                      setMessage(
                        "Birleşim noktasını seçtin. Şimdi bir ses efekti ekle."
                      );
                    }}
                  >
                    + Sesi buraya ekle
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-white/50">
          Mavi video, yeşil ses, mor metin. Üstteki cetveli
          sürükleyerek videoyu oynatmadan saniye seç ve makasla
          kes. Klip birleşimlerine geçiş veya ses ekle.
        </p>
      </section>

      {/* DIŞA AKTARMA PENCERESİ */}
      {exportMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setExportMenu(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-white/20 bg-[#1a1d2e] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Videoyu Dışa Aktar
              </h2>
              <button onClick={() => setExportMenu(false)}>
                ✕
              </button>
            </div>

            <label className="block text-sm">
              Video Boyutu / Oran
              <select
                className={`${panel} mt-2 w-full`}
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
              >
                <option value="9:16">9:16 — TikTok / Reels</option>
                <option value="16:9">16:9 — YouTube</option>
                <option value="1:1">1:1 — Kare</option>
              </select>
            </label>

            <label className="block text-sm">
              Kalite
              <select
                className={`${panel} mt-2 w-full`}
                value={quality}
                onChange={(e) => setQuality(+e.target.value)}
              >
                <option value={720}>720p</option>
                <option value={1080}>1080p</option>
              </select>
            </label>

            <label className="block text-sm">
              FPS
              <select
                className={`${panel} mt-2 w-full`}
                value={fps}
                onChange={(e) => setFps(+e.target.value)}
              >
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </label>

            <label className="block text-sm">
              Kadraj
              <select
                className={`${panel} mt-2 w-full`}
                value={fit}
                onChange={(e) =>
                  setFit(e.target.value as "contain" | "cover")
                }
              >
                <option value="contain">Sığdır</option>
                <option value="cover">Doldur / Kırp</option>
              </select>
            </label>

            <button
              className={`${primary} w-full`}
              onClick={exportVideo}
            >
              Videoyu Oluştur ve İndir
            </button>

            <p className="text-xs text-white/40">
              Dosya biçimi tarayıcı desteğine göre MP4 veya
              WebM olur.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
