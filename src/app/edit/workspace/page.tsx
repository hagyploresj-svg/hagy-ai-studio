
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as PE,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
  Download,
  Upload,
  Play,
  Pause,
  Scissors,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Plus,
  Film,
  Music2,
  Type,
  Layers,
  SlidersHorizontal,
  Volume2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  FolderOpen,
} from "lucide-react";
import MemeSounds from "../MemeSounds";

type Kind = "video" | "audio" | "text";
type Transition = "none" | "fade" | "flash";

type Media = {
  id: string;
  name: string;
  url: string;
  duration: number;
  kind: "video" | "audio";
};

type Clip = {
  id: string;
  kind: Kind;
  track: number;
  mediaId?: string;
  name: string;
  start: number;
  duration: number;
  inPoint: number;
  volume: number;
  speed: number;
  text: string;
  color: string;
  fontSize: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  cropL: number;
  cropR: number;
  cropT: number;
  cropB: number;
  chroma: boolean;
  threshold: number;
  opacity: number;
  filter: string;
  transition: Transition;
};

type Track = {
  id: number;
  kind: Kind;
  name: string;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
};

type Sound = {
  id: string;
  name: string;
  url: string;
  duration: number;
  source: string;
  category: string;
};

type Snapshot = {
  clips: Clip[];
  tracks: Track[];
};

const uid = () => crypto.randomUUID();

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

const format = (seconds: number) => {
  const s = Math.floor(Math.max(0, seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(
    s % 60
  ).padStart(2, "0")}`;
};

const button =
  "rounded-lg border border-white/10 bg-[#252b3c] px-3 py-2 text-xs text-white hover:bg-[#333a4e] disabled:opacity-40";

const primary =
  "rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-40";

const field =
  "w-full rounded-md border border-white/10 bg-[#111625] px-2 py-2 text-xs text-white";

const tracksInitial: Track[] = [
  { id: 3, kind: "video", name: "V3", muted: false, hidden: false, locked: false },
  { id: 2, kind: "video", name: "V2", muted: false, hidden: false, locked: false },
  { id: 1, kind: "video", name: "V1", muted: false, hidden: false, locked: false },
  { id: 5, kind: "text", name: "T1", muted: false, hidden: false, locked: false },
  { id: 4, kind: "audio", name: "A1", muted: false, hidden: false, locked: false },
  { id: 6, kind: "audio", name: "A2", muted: false, hidden: false, locked: false },
];

const colors: Record<Kind, string> = {
  video: "#477ed4",
  audio: "#259e85",
  text: "#8d65c9",
};

const filters = [
  { name: "Normal", value: "none" },
  { name: "Siyah Beyaz", value: "grayscale(1)" },
  { name: "Vintage", value: "sepia(.85)" },
  { name: "Canlı", value: "saturate(1.65)" },
  { name: "Kontrast", value: "contrast(1.35)" },
  { name: "Soğuk", value: "hue-rotate(25deg)" },
];

function createClip(
  kind: Kind,
  track: number,
  start: number,
  duration: number,
  name: string,
  mediaId?: string
): Clip {
  return {
    id: uid(),
    kind,
    track,
    mediaId,
    name,
    start,
    duration,
    inPoint: 0,
    volume: 100,
    speed: 1,
    text: "Yeni Başlık",
    color: "#ffffff",
    fontSize: 44,
    x: 50,
    y: 50,
    scale: 100,
    rotation: 0,
    cropL: 0,
    cropR: 0,
    cropT: 0,
    cropB: 0,
    chroma: false,
    threshold: 75,
    opacity: 100,
    filter: "none",
    transition: "none",
  };
}

function NumberSlider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span>{Number(value.toFixed(2))}</span>
      </div>
      <input
        className="w-full accent-violet-500"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function drawVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  clip: Clip,
  width: number,
  height: number
) {
  if (video.readyState < 2 || !video.videoWidth) return;

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const sx = (vw * clip.cropL) / 100;
  const sy = (vh * clip.cropT) / 100;

  const sw = Math.max(
    1,
    vw * (1 - (clip.cropL + clip.cropR) / 100)
  );
  const sh = Math.max(
    1,
    vh * (1 - (clip.cropT + clip.cropB) / 100)
  );

  const factor =
    Math.min(width / sw, height / sh) * (clip.scale / 100);

  const dw = sw * factor;
  const dh = sh * factor;

  ctx.save();
  ctx.translate((width * clip.x) / 100, (height * clip.y) / 100);
  ctx.rotate((clip.rotation * Math.PI) / 180);
  ctx.globalAlpha = clip.opacity / 100;
  ctx.filter = clip.filter;

  if (clip.chroma) {
    const buffer = document.createElement("canvas");
    const downscale = Math.min(1, 640 / Math.max(sw, sh));

    buffer.width = Math.max(1, Math.round(sw * downscale));
    buffer.height = Math.max(1, Math.round(sh * downscale));

    const bctx = buffer.getContext("2d", {
      willReadFrequently: true,
    });

    if (bctx) {
      bctx.drawImage(
        video,
        sx,
        sy,
        sw,
        sh,
        0,
        0,
        buffer.width,
        buffer.height
      );

      try {
        const image = bctx.getImageData(
          0,
          0,
          buffer.width,
          buffer.height
        );

        for (let i = 0; i < image.data.length; i += 4) {
          const r = image.data[i];
          const g = image.data[i + 1];
          const b = image.data[i + 2];

          const difference = g - Math.max(r, b);

          if (difference > clip.threshold * 0.6) {
            const amount = clamp(
              (difference - clip.threshold * 0.6) / 38,
              0,
              1
            );

            image.data[i + 3] = Math.round(
              image.data[i + 3] * (1 - amount)
            );
          }
        }

        bctx.putImageData(image, 0, 0);
        ctx.drawImage(buffer, -dw / 2, -dh / 2, dw, dh);
      } catch {
        ctx.drawImage(
          video,
          sx,
          sy,
          sw,
          sh,
          -dw / 2,
          -dh / 2,
          dw,
          dh
        );
      }
    }
  } else {
    ctx.drawImage(
      video,
      sx,
      sy,
      sw,
      sh,
      -dw / 2,
      -dh / 2,
      dw,
      dh
    );
  }

  ctx.restore();
}

function renderFrame(
  canvas: HTMLCanvasElement,
  clips: Clip[],
  tracks: Track[],
  videos: Map<string, HTMLVideoElement>,
  time: number
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#05060a";
  ctx.fillRect(0, 0, w, h);

  // Alt katmandan üst katmana çiz.
  for (const track of [...tracks].reverse()) {
    if (track.hidden) continue;

    const active = clips.filter(
      (c) =>
        c.track === track.id &&
        time >= c.start &&
        time < c.start + c.duration
    );

    for (const clip of active) {
      if (clip.kind === "video" && clip.mediaId) {
        const video = videos.get(clip.mediaId);

        if (video) {
          drawVideo(ctx, video, clip, w, h);
        }

        if (clip.transition !== "none") {
          const d = Math.min(0.3, clip.duration / 3);
          let alpha = 0;

          if (time < clip.start + d) {
            alpha = 1 - (time - clip.start) / d;
          } else if (time > clip.start + clip.duration - d) {
            alpha =
              1 -
              (clip.start + clip.duration - time) / d;
          }

          if (alpha > 0) {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle =
              clip.transition === "flash" ? "white" : "black";
            ctx.fillRect(0, 0, w, h);
            ctx.restore();
          }
        }
      }

      if (clip.kind === "text") {
        ctx.save();

        ctx.globalAlpha = clip.opacity / 100;
        ctx.translate(
          (w * clip.x) / 100,
          (h * clip.y) / 100
        );
        ctx.rotate((clip.rotation * Math.PI) / 180);

        ctx.fillStyle = clip.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#000";
        ctx.shadowBlur = 8;

        const fontSize = Math.max(
          12,
          (clip.fontSize * w) / 720
        );

        ctx.font = `700 ${fontSize}px Arial`;

        const lines = clip.text.split("\n");

        lines.forEach((line, i) => {
          ctx.fillText(
            line,
            0,
            (i - (lines.length - 1) / 2) *
              fontSize *
              1.25,
            w * 0.9
          );
        });

        ctx.restore();
      }
    }
  }
}

function seekElement(
  element: HTMLMediaElement,
  time: number
) {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(element.currentTime - time) < 0.025) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(
      () => reject(new Error("Medya konumlandırılamadı.")),
      12000
    );

    element.addEventListener(
      "seeked",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );

    element.currentTime = time;
  });
}

export default function WorkspacePage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [tracks, setTracks] = useState<Track[]>(tracksInitial);

  const [selected, setSelected] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);

  const [tab, setTab] = useState<
    "media" | "sounds" | "titles"
  >("media");

  const [inspector, setInspector] = useState(false);

  const [inspectorTab, setInspectorTab] = useState<
    "transform" | "color" | "audio"
  >("transform");

  const [ratio, setRatio] = useState("9:16");
  const [resolution, setResolution] = useState(720);
  const [fps, setFps] = useState(30);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [zoom, setZoom] = useState(44);
  const [message, setMessage] = useState("");
  const [projectName, setProjectName] =
    useState("Adsız Proje");

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const projectInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);

  const urlsRef = useRef<string[]>([]);

  const videosRef = useRef<
    Map<string, HTMLVideoElement>
  >(new Map());

  const audioRef = useRef<
    Map<string, HTMLAudioElement>
  >(new Map());

  const dragRef = useRef<{
    id: string;
    x: number;
    start: number;
  } | null>(null);

  const scrubRef = useRef(false);
  const animationRef = useRef(0);

  const clockRef = useRef<{
    started: number;
    from: number;
  } | null>(null);

  const total = useMemo(
    () =>
      Math.max(
        0,
        ...clips.map((c) => c.start + c.duration)
      ),
    [clips]
  );

  const current =
    clips.find((c) => c.id === selected) || null;

  const selectedTrack = tracks.find(
    (t) => t.id === current?.track
  );

  const width =
    ratio === "9:16" || ratio === "1:1" ? 720 : 1280;

  const height =
    ratio === "9:16"
      ? 1280
      : ratio === "1:1"
      ? 720
      : 720;

  const px = Math.max(20, zoom);

  const timelineWidth = Math.max(
    800,
    (Math.max(total, 12) + 4) * px
  );

  const saveHistory = useCallback(() => {
    setHistory((old) => [
      ...old.slice(-29),
      {
        clips: structuredClone(clips),
        tracks: structuredClone(tracks),
      },
    ]);

    setFuture([]);
  }, [clips, tracks]);

  function changeClip(changes: Partial<Clip>) {
    if (!current) return;

    setClips((old) =>
      old.map((c) =>
        c.id === current.id ? { ...c, ...changes } : c
      )
    );
  }

  function pushClip(clip: Clip) {
    saveHistory();
    setClips((old) => [...old, clip]);
    setSelected(clip.id);
    setInspector(true);
  }

  function pause() {
    setPlaying(false);
    clockRef.current = null;
  }

  function setPosition(value: number) {
    pause();
    setTime(clamp(value, 0, total));
  }

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);

      urlsRef.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );

      videosRef.current.forEach((video) =>
        video.pause()
      );

      audioRef.current.forEach((audio) =>
        audio.pause()
      );
    };
  }, []);

  useEffect(() => {
    for (const item of media) {
      if (
        item.kind === "video" &&
        !videosRef.current.has(item.id)
      ) {
        const video = document.createElement("video");

        video.src = item.url;
        video.preload = "auto";
        video.muted = true;
        video.playsInline = true;

        videosRef.current.set(item.id, video);
      }

      if (
        item.kind === "audio" &&
        !audioRef.current.has(item.id)
      ) {
        const audio = new Audio(item.url);
        audio.preload = "auto";
        audioRef.current.set(item.id, audio);
      }
    }
  }, [media]);

  useEffect(() => {
    if (!canvasRef.current) return;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
  }, [width, height]);

  const syncMedia = useCallback(
    (position: number, shouldPlay: boolean) => {
      for (const item of media) {
        const active = clips
          .filter(
            (c) =>
              c.mediaId === item.id &&
              c.kind === item.kind &&
              position >= c.start &&
              position < c.start + c.duration
          )
          .sort((a, b) => b.track - a.track)[0];

        if (item.kind === "video") {
          const video = videosRef.current.get(item.id);
          if (!video) continue;

          if (!active) {
            video.pause();
            continue;
          }

          const target = clamp(
            active.inPoint +
              (position - active.start) * active.speed,
            0,
            Math.max(0, item.duration - 0.02)
          );

          if (
            Math.abs(video.currentTime - target) > 0.12
          ) {
            try {
              video.currentTime = target;
            } catch {}
          }

          video.playbackRate = active.speed;

          if (shouldPlay && video.paused) {
            video.play().catch(() => {});
          } else if (!shouldPlay) {
            video.pause();
          }
        } else {
          const audio = audioRef.current.get(item.id);
          if (!audio) continue;

          const track = tracks.find(
            (t) => t.id === active?.track
          );

          if (!active || track?.muted) {
            audio.pause();
            continue;
          }

          const target = clamp(
            active.inPoint +
              (position - active.start) * active.speed,
            0,
            Math.max(0, item.duration - 0.02)
          );

          if (
            Math.abs(audio.currentTime - target) > 0.15
          ) {
            try {
              audio.currentTime = target;
            } catch {}
          }

          audio.volume = active.volume / 100;
          audio.playbackRate = active.speed;

          if (shouldPlay && audio.paused) {
            audio.play().catch(() => {});
          } else if (!shouldPlay) {
            audio.pause();
          }
        }
      }
    },
    [media, clips, tracks]
  );

  useEffect(() => {
    syncMedia(time, playing);

    if (canvasRef.current) {
      renderFrame(
        canvasRef.current,
        clips,
        tracks,
        videosRef.current,
        time
      );
    }
  }, [time, playing, clips, tracks, syncMedia]);

  useEffect(() => {
    if (!playing) return;

    clockRef.current = {
      started: performance.now(),
      from: time,
    };

    const tick = () => {
      const clock = clockRef.current;
      if (!clock) return;

      const next =
        clock.from +
        (performance.now() - clock.started) / 1000;

      if (next >= total) {
        setTime(total);
        setPlaying(false);
        clockRef.current = null;
        return;
      }

      setTime(next);
      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
    // Başlangıç zamanı yalnızca oynatma başlatıldığında alınır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, total]);

  async function importFiles(files: FileList | File[]) {
    const next: Media[] = [];

    for (const file of Array.from(files)) {
      const kind = file.type.startsWith("video/")
        ? "video"
        : file.type.startsWith("audio/")
        ? "audio"
        : null;

      if (!kind) continue;

      const url = URL.createObjectURL(file);
      urlsRef.current.push(url);

      const probe =
        kind === "video"
          ? document.createElement("video")
          : document.createElement("audio");

      probe.preload = "metadata";
      probe.src = url;

      try {
        const duration = await new Promise<number>(
          (resolve, reject) => {
            probe.onloadedmetadata = () =>
              resolve(probe.duration);

            probe.onerror = () =>
              reject(new Error("Dosya okunamadı."));
          }
        );

        if (!Number.isFinite(duration) || duration <= 0) {
          continue;
        }

        next.push({
          id: uid(),
          name: file.name,
          url,
          duration,
          kind,
        });
      } catch {
        setMessage(`${file.name} okunamadı.`);
      }
    }

    setMedia((old) => [...old, ...next]);

    if (!clips.length) {
      const firstVideo = next.find(
        (item) => item.kind === "video"
      );

      if (firstVideo) {
        pushClip(
          createClip(
            "video",
            1,
            0,
            firstVideo.duration,
            firstVideo.name,
            firstVideo.id
          )
        );
      }
    }
  }

  function addMedia(item: Media) {
    const track =
      item.kind === "video" ? 1 : 4;

    const clip = createClip(
      item.kind,
      track,
      time,
      item.duration,
      item.name,
      item.id
    );

    pushClip(clip);
  }

  function addSound(sound: Sound) {
    const existing = media.find(
      (m) => m.url === sound.url
    );

    if (existing) {
      addMedia(existing);
      return;
    }

    const item: Media = {
      id: uid(),
      name: sound.name,
      url: sound.url,
      duration: sound.duration || 5,
      kind: "audio",
    };

    setMedia((old) => [...old, item]);

    pushClip(
      createClip(
        "audio",
        4,
        time,
        item.duration,
        item.name,
        item.id
      )
    );
  }

  function addTitle() {
    const clip = createClip(
      "text",
      5,
      time,
      3,
      "Başlık"
    );

    pushClip(clip);
  }

  function deleteSelected() {
    if (!current || selectedTrack?.locked) return;

    saveHistory();

    setClips((old) =>
      old.filter((c) => c.id !== current.id)
    );

    setSelected(null);
    setInspector(false);
  }

  function duplicate() {
    if (!current || selectedTrack?.locked) return;

    const next = {
      ...current,
      id: uid(),
      start: current.start + current.duration,
    };

    pushClip(next);
  }

  function splitSelected() {
    if (!current || selectedTrack?.locked) return;

    const offset = time - current.start;

    if (
      offset <= 0.05 ||
      offset >= current.duration - 0.05
    ) {
      setMessage("Kesmek için klibin içinden bir nokta seç.");
      return;
    }

    saveHistory();

    const left = {
      ...current,
      duration: offset,
    };

    const right = {
      ...current,
      id: uid(),
      start: time,
      duration: current.duration - offset,
      inPoint:
        current.inPoint + offset * current.speed,
    };

    setClips((old) => [
      ...old.filter((c) => c.id !== current.id),
      left,
      right,
    ]);

    setSelected(right.id);
  }

  function undo() {
    if (!history.length) return;

    const previous = history[history.length - 1];

    setFuture((old) => [
      ...old,
      {
        clips: structuredClone(clips),
        tracks: structuredClone(tracks),
      },
    ]);

    setHistory((old) => old.slice(0, -1));
    setClips(previous.clips);
    setTracks(previous.tracks);
    setSelected(null);
  }

  function redo() {
    if (!future.length) return;

    const next = future[future.length - 1];

    setHistory((old) => [
      ...old,
      {
        clips: structuredClone(clips),
        tracks: structuredClone(tracks),
      },
    ]);

    setFuture((old) => old.slice(0, -1));
    setClips(next.clips);
    setTracks(next.tracks);
    setSelected(null);
  }

  function updateTrack(
    id: number,
    changes: Partial<Track>
  ) {
    setTracks((old) =>
      old.map((t) =>
        t.id === id ? { ...t, ...changes } : t
      )
    );
  }

  function handleDrag(e: PE<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;

    const delta = (e.clientX - drag.x) / px;

    setClips((old) =>
      old.map((c) =>
        c.id === drag.id
          ? {
              ...c,
              start: Math.max(0, drag.start + delta),
            }
          : c
      )
    );
  }

  function handleScrub(clientX: number) {
    const rect =
      rulerRef.current?.getBoundingClientRect();

    if (!rect) return;

    setPosition(
      (clientX - rect.left) / px
    );
  }

  function saveProject() {
    const project = {
      version: 1,
      projectName,
      ratio,
      clips,
      tracks,
      media: media.map((m) => ({
        id: m.id,
        name: m.name,
        duration: m.duration,
        kind: m.kind,
      })),
    };

    const blob = new Blob(
      [JSON.stringify(project, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "HAGY-project.json";
    a.click();

    URL.revokeObjectURL(url);

    setMessage(
      "Proje ayarları kaydedildi. Medya dosyaları JSON içine dahil değildir."
    );
  }

  function importProject(
    e: ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(
          String(reader.result)
        );

        if (
          !Array.isArray(data.clips) ||
          !Array.isArray(data.tracks)
        ) {
          throw new Error("Geçersiz proje.");
        }

        setClips(data.clips);
        setTracks(data.tracks);
        setProjectName(
          data.projectName || "Adsız Proje"
        );
        setRatio(data.ratio || "9:16");
        setSelected(null);
        setTime(0);

        setMessage(
          "Proje açıldı. Medya dosyalarını yeniden yükleyip eşleştirmen gerekebilir."
        );
      } catch {
        setMessage("Proje dosyası açılamadı.");
      }
    };

    reader.readAsText(file);
    e.target.value = "";
  }

  async function exportVideo() {
    if (!clips.length || exporting) return;

    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setMessage(
        "Bu tarayıcı video dışa aktarmayı desteklemiyor."
      );
      return;
    }

    setExportOpen(false);
    setExporting(true);
    setProgress(0);
    setPlaying(false);
    setMessage("");

    const canvas = document.createElement("canvas");

    canvas.width =
      ratio === "9:16"
        ? resolution
        : ratio === "1:1"
        ? resolution
        : Math.round((resolution * 16) / 9);

    canvas.height =
      ratio === "9:16"
        ? Math.round((resolution * 16) / 9)
        : resolution;

    const exportVideos = new Map<
      string,
      HTMLVideoElement
    >();

    const exportAudios = new Map<
      string,
      HTMLAudioElement
    >();

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let frame = 0;

    try {
      const audioSources: {
        element: HTMLMediaElement;
        gain: GainNode;
        kind: "video" | "audio";
        mediaId: string;
      }[] = [];

      audioContext = new AudioContext();

      const destination =
        audioContext.createMediaStreamDestination();

      for (const item of media) {
        const element =
          item.kind === "video"
            ? document.createElement("video")
            : document.createElement("audio");

        element.src = item.url;
        element.preload = "auto";

        if (item.kind === "video") {
          (element as HTMLVideoElement).playsInline =
            true;

          exportVideos.set(
            item.id,
            element as HTMLVideoElement
          );
        } else {
          exportAudios.set(
            item.id,
            element as HTMLAudioElement
          );
        }

        const node =
          audioContext.createMediaElementSource(
            element
          );

        const gain = audioContext.createGain();

        node.connect(gain);
        gain.connect(destination);

        audioSources.push({
          element,
          gain,
          kind: item.kind,
          mediaId: item.id,
        });
      }

      const videoStream =
        canvas.captureStream(fps);

      stream = new MediaStream([
        ...videoStream.getVideoTracks(),
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
          "Desteklenen video biçimi bulunamadı."
        );
      }

      recorder = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond:
          resolution === 1080
            ? 10000000
            : 5000000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };

      const completed = new Promise<void>(
        (resolve, reject) => {
          recorder!.onstop = () => resolve();

          recorder!.onerror = () =>
            reject(
              new Error("Video kaydı başarısız.")
            );
        }
      );

      await audioContext.resume();

      let exportTime = 0;

      const syncExport = async (
        position: number,
        startPlayback: boolean
      ) => {
        for (const source of audioSources) {
          const item = media.find(
            (m) => m.id === source.mediaId
          );

          if (!item) continue;

          const active = clips
            .filter(
              (c) =>
                c.mediaId === item.id &&
                c.kind === item.kind &&
                position >= c.start &&
                position < c.start + c.duration
            )
            .sort((a, b) => b.track - a.track)[0];

          const track = tracks.find(
            (t) => t.id === active?.track
          );

          if (!active || track?.muted) {
            source.element.pause();
            source.gain.gain.value = 0;
            continue;
          }

          const target = clamp(
            active.inPoint +
              (position - active.start) *
                active.speed,
            0,
            Math.max(0, item.duration - 0.02)
          );

          source.gain.gain.value =
            active.volume / 100;

          source.element.playbackRate =
            active.speed;

          if (
            Math.abs(
              source.element.currentTime - target
            ) > 0.2
          ) {
            try {
              source.element.currentTime = target;
            } catch {}
          }

          if (
            startPlayback &&
            source.element.paused
          ) {
            source.element.play().catch(() => {});
          }
        }
      };

      await syncExport(0, false);

      renderFrame(
        canvas,
        clips,
        tracks,
        exportVideos,
        0
      );

      recorder.start(250);

      const started = performance.now();

      const draw = () => {
        exportTime = Math.min(
          total,
          (performance.now() - started) / 1000
        );

        renderFrame(
          canvas,
          clips,
          tracks,
          exportVideos,
          exportTime
        );

        setProgress(
          Math.round(
            (exportTime / Math.max(total, 0.01)) *
              100
          )
        );

        if (exportTime < total) {
          frame = requestAnimationFrame(draw);
        }
      };

      await syncExport(0, true);
      draw();

      await new Promise<void>((resolve) => {
        const interval = window.setInterval(
          () => {
            const elapsed =
              (performance.now() - started) /
              1000;

            void syncExport(
              Math.min(total, elapsed),
              true
            );

            if (elapsed >= total) {
              window.clearInterval(interval);
              resolve();
            }
          },
          100
        );
      });

      recorder.stop();
      await completed;

      const blob = new Blob(chunks, {
        type: mime,
      });

      if (!blob.size) {
        throw new Error(
          "Oluşturulan video dosyası boş."
        );
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `HAGY-Editor-${resolution}p-${fps}fps.${
        mime.includes("mp4") ? "mp4" : "webm"
      }`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(
        () => URL.revokeObjectURL(url),
        60000
      );

      setMessage("Video dışa aktarıldı.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dışa aktarma başarısız."
      );
    } finally {
      cancelAnimationFrame(frame);

      if (recorder?.state === "recording") {
        recorder.stop();
      }

      exportVideos.forEach((v) => v.pause());
      exportAudios.forEach((a) => a.pause());

      stream?.getTracks().forEach((track) =>
        track.stop()
      );

      await audioContext
        ?.close()
        .catch(() => {});

      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0d111b] text-white">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#171c2b] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className={button}>
            <ArrowLeft size={16} />
          </Link>

          <Clapperboard
            size={23}
            className="text-violet-400"
          />

          <div>
            <h1 className="text-sm font-bold tracking-wide">
              HAGY EDITOR PRO
            </h1>

            <input
              className="w-40 bg-transparent text-[11px] text-slate-400 outline-none"
              value={projectName}
              onChange={(e) =>
                setProjectName(e.target.value)
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={button}
            onClick={undo}
            disabled={!history.length}
            title="Geri al"
          >
            <Undo2 size={15} />
          </button>

          <button
            className={button}
            onClick={redo}
            disabled={!future.length}
            title="Yinele"
          >
            <Redo2 size={15} />
          </button>

          <button
            className={button}
            onClick={saveProject}
            title="Proje ayarlarını kaydet"
          >
            <Save size={15} />
          </button>

          <button
            className={button}
            onClick={() =>
              projectInputRef.current?.click()
            }
            title="Proje aç"
          >
            <FolderOpen size={15} />
          </button>

          <button
            className={primary}
            disabled={!clips.length || exporting}
            onClick={() => setExportOpen(true)}
          >
            <Download
              size={15}
              className="mr-2 inline"
            />
            {exporting
              ? `%${progress}`
              : "Dışa Aktar"}
          </button>
        </div>
      </header>

      {message && (
        <div className="border-b border-violet-400/10 bg-violet-500/10 px-4 py-2 text-xs text-violet-200">
          {message}

          <button
            className="ml-3"
            onClick={() => setMessage("")}
          >
            ✕
          </button>
        </div>
      )}

      {/* MAIN WORKSPACE */}
      <div className="flex min-h-[480px] flex-col lg:flex-row">
        {/* MEDIA LIBRARY */}
        <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#171c2b] lg:w-64 lg:border-b-0 lg:border-r">
          <div className="flex border-b border-white/10">
            {(
              [
                ["media", Film, "Medya"],
                ["sounds", Music2, "Sesler"],
                ["titles", Type, "Başlık"],
              ] as const
            ).map(([key, Icon, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex flex-1 items-center justify-center gap-1 px-2 py-4 text-[11px] ${
                  tab === key
                    ? "border-b-2 border-violet-400 text-violet-300"
                    : "text-slate-400"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-80 flex-1 space-y-3 overflow-y-auto p-3 lg:max-h-[560px]">
            {tab === "media" && (
              <>
                <button
                  className={`${primary} w-full`}
                  onClick={() =>
                    inputRef.current?.click()
                  }
                >
                  <Upload
                    size={14}
                    className="mr-2 inline"
                  />
                  Medya İçe Aktar
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addMedia(item)}
                      className="overflow-hidden rounded-lg border border-white/10 bg-[#252b3c] text-left hover:border-violet-400"
                    >
                      <div className="flex h-20 items-center justify-center bg-[#30374c]">
                        {item.kind === "video" ? (
                          <Film
                            size={26}
                            className="text-blue-300"
                          />
                        ) : (
                          <Music2
                            size={26}
                            className="text-emerald-300"
                          />
                        )}
                      </div>

                      <div className="p-2">
                        <p className="truncate text-[10px]">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {format(item.duration)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {!media.length && (
                  <p className="py-8 text-center text-xs text-slate-500">
                    Video veya ses yükleyerek başla.
                  </p>
                )}
              </>
            )}

            {tab === "sounds" && (
              <>
                <p className="text-xs text-slate-400">
                  Ses seçtiğinde zaman çizelgesine eklenir.
                </p>

                <MemeSounds onAdd={addSound} />
              </>
            )}

            {tab === "titles" && (
              <>
                <button
                  className={`${primary} w-full`}
                  onClick={addTitle}
                >
                  <Plus
                    size={14}
                    className="mr-2 inline"
                  />
                  Metin Ekle
                </button>

                <div className="rounded-lg border border-white/10 bg-[#252b3c] p-4 text-center">
                  <p className="text-xl font-bold">
                    Başlık
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    Metni seçerek boyut, renk ve konumunu değiştir.
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* PREVIEW */}
        <section className="flex min-h-[480px] min-w-0 flex-1 flex-col items-center justify-center gap-4 bg-[#0a0d15] p-4">
          <div className="flex w-full items-center justify-between">
            <span className="text-xs text-slate-500">
              ÖNİZLEME
            </span>

            <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400">
              {ratio}
            </span>
          </div>

          <div
            className="relative flex min-h-60 w-full max-w-3xl flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black"
            style={{
              maxHeight: 480,
            }}
          >
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="max-h-[450px] max-w-full object-contain"
              style={{
                aspectRatio: `${width}/${height}`,
              }}
            />

            {!media.length && (
              <button
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#111625]"
                onClick={() =>
                  inputRef.current?.click()
                }
              >
                <Upload
                  size={32}
                  className="text-violet-400"
                />

                <span className="text-sm text-slate-300">
                  Videonu buraya yükle
                </span>
              </button>
            )}
          </div>

          <div className="flex w-full max-w-lg items-center justify-between gap-3">
            <span className="w-20 font-mono text-xs text-violet-300">
              {format(time)}
            </span>

            <div className="flex items-center gap-2">
              <button
                className={button}
                onClick={() =>
                  setPosition(time - 1)
                }
              >
                -1s
              </button>

              <button
                className="rounded-full bg-violet-600 p-3 hover:bg-violet-500"
                onClick={() => {
                  if (playing) {
                    pause();
                  } else {
                    if (time >= total) {
                      setTime(0);
                    }
                    setPlaying(true);
                  }
                }}
                disabled={!total || exporting}
              >
                {playing ? (
                  <Pause size={20} />
                ) : (
                  <Play size={20} />
                )}
              </button>

              <button
                className={button}
                onClick={() =>
                  setPosition(time + 1)
                }
              >
                +1s
              </button>
            </div>

            <span className="w-20 text-right font-mono text-xs text-slate-400">
              {format(total)}
            </span>
          </div>
        </section>

        {/* INSPECTOR */}
        {inspector && current && (
          <aside className="max-h-80 w-full shrink-0 space-y-3 overflow-y-auto border-t border-white/10 bg-[#171c2b] p-3 lg:max-h-[600px] lg:w-64 lg:border-l lg:border-t-0">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {current.name}
                </p>

                <p className="text-[10px] text-slate-500">
                  Klip Düzenleyici
                </p>
              </div>

              <button
                className={button}
                onClick={() => setInspector(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex gap-1">
              {(
                [
                  ["transform", "Dönüştür"],
                  ["color", "Efekt"],
                  ["audio", "Ses"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  className={`flex-1 rounded px-1 py-2 text-[10px] ${
                    inspectorTab === key
                      ? "bg-violet-500/30 text-violet-200"
                      : "bg-white/5 text-slate-400"
                  }`}
                  onClick={() =>
                    setInspectorTab(key)
                  }
                >
                  {label}
                </button>
              ))}
            </div>

            {current.kind === "text" && (
              <div className="space-y-3">
                <textarea
                  className={field}
                  rows={3}
                  value={current.text}
                  onChange={(e) =>
                    changeClip({
                      text: e.target.value,
                    })
                  }
                />

                <input
                  type="color"
                  value={current.color}
                  onChange={(e) =>
                    changeClip({
                      color: e.target.value,
                    })
                  }
                />

                <NumberSlider
                  label="Yazı Boyutu"
                  value={current.fontSize}
                  min={12}
                  max={120}
                  onChange={(fontSize) =>
                    changeClip({ fontSize })
                  }
                />
              </div>
            )}

            {inspectorTab === "transform" && (
              <div className="space-y-3">
                <NumberSlider
                  label="Yatay Konum"
                  value={current.x}
                  onChange={(x) =>
                    changeClip({ x })
                  }
                />

                <NumberSlider
                  label="Dikey Konum"
                  value={current.y}
                  onChange={(y) =>
                    changeClip({ y })
                  }
                />

                <NumberSlider
                  label="Boyut"
                  value={current.scale}
                  min={10}
                  max={250}
                  onChange={(scale) =>
                    changeClip({ scale })
                  }
                />

                <NumberSlider
                  label="Döndürme"
                  value={current.rotation}
                  min={-180}
                  max={180}
                  onChange={(rotation) =>
                    changeClip({ rotation })
                  }
                />

                <NumberSlider
                  label="Opaklık"
                  value={current.opacity}
                  onChange={(opacity) =>
                    changeClip({ opacity })
                  }
                />

                {current.kind === "video" && (
                  <>
                    <p className="border-t border-white/10 pt-3 text-xs font-semibold">
                      Kırpma
                    </p>

                    {(
                      [
                        ["cropL", "Sol"],
                        ["cropR", "Sağ"],
                        ["cropT", "Üst"],
                        ["cropB", "Alt"],
                      ] as const
                    ).map(([key, label]) => (
                      <NumberSlider
                        key={key}
                        label={label}
                        value={current[key]}
                        max={80}
                        onChange={(value) =>
                          changeClip({
                            [key]: value,
                          })
                        }
                      />
                    ))}
                  </>
                )}

                <button
                  className={`${button} w-full`}
                  onClick={() =>
                    changeClip({
                      x: 50,
                      y: 50,
                      scale: 100,
                      rotation: 0,
                    })
                  }
                >
                  <RotateCcw
                    size={13}
                    className="mr-1 inline"
                  />
                  Konumu Sıfırla
                </button>
              </div>
            )}

            {inspectorTab === "color" &&
              current.kind === "video" && (
                <div className="space-y-3">
                  <select
                    className={field}
                    value={current.filter}
                    onChange={(e) =>
                      changeClip({
                        filter: e.target.value,
                      })
                    }
                  >
                    {filters.map((filter) => (
                      <option
                        key={filter.name}
                        value={filter.value}
                      >
                        {filter.name}
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={current.chroma}
                      onChange={(e) =>
                        changeClip({
                          chroma: e.target.checked,
                        })
                      }
                    />

                    Yeşil Ekranı Kaldır
                  </label>

                  {current.chroma && (
                    <NumberSlider
                      label="Hassasiyet"
                      value={current.threshold}
                      min={10}
                      max={160}
                      onChange={(threshold) =>
                        changeClip({ threshold })
                      }
                    />
                  )}

                  <label className="block text-xs">
                    Geçiş

                    <select
                      className={`${field} mt-1`}
                      value={current.transition}
                      onChange={(e) =>
                        changeClip({
                          transition:
                            e.target.value as Transition,
                        })
                      }
                    >
                      <option value="none">
                        Geçiş Yok
                      </option>
                      <option value="fade">
                        Kararma
                      </option>
                      <option value="flash">
                        Beyaz Flaş
                      </option>
                    </select>
                  </label>
                </div>
              )}

            {inspectorTab === "audio" && (
              <div className="space-y-3">
                <NumberSlider
                  label="Ses Seviyesi"
                  value={current.volume}
                  onChange={(volume) =>
                    changeClip({ volume })
                  }
                />

                <NumberSlider
                  label="Oynatma Hızı"
                  value={current.speed}
                  min={0.25}
                  max={3}
                  step={0.05}
                  onChange={(speed) =>
                    changeClip({ speed })
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <label className="text-[10px]">
                Başlangıç
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className={field}
                  value={Number(
                    current.start.toFixed(2)
                  )}
                  onChange={(e) =>
                    changeClip({
                      start: Math.max(
                        0,
                        Number(e.target.value)
                      ),
                    })
                  }
                />
              </label>

              <label className="text-[10px]">
                Süre
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className={field}
                  value={Number(
                    current.duration.toFixed(2)
                  )}
                  onChange={(e) =>
                    changeClip({
                      duration: Math.max(
                        0.1,
                        Number(e.target.value)
                      ),
                    })
                  }
                />
              </label>

              <label className="text-[10px]">
                Kaynak Başlangıcı
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className={field}
                  value={Number(
                    current.inPoint.toFixed(2)
                  )}
                  onChange={(e) =>
                    changeClip({
                      inPoint: Math.max(
                        0,
                        Number(e.target.value)
                      ),
                    })
                  }
                />
              </label>
            </div>
          </aside>
        )}
      </div>

      {/* EDITING TOOLBAR */}
      <div className="flex items-center justify-between gap-2 border-y border-white/10 bg-[#171c2b] px-3 py-2">
        <div className="flex items-center gap-1">
          <button
            className={button}
            onClick={splitSelected}
            disabled={!current}
            title="Klibi Kes"
          >
            <Scissors size={15} />
          </button>

          <button
            className={button}
            onClick={duplicate}
            disabled={!current}
            title="Çoğalt"
          >
            <Copy size={15} />
          </button>

          <button
            className={button}
            onClick={deleteSelected}
            disabled={!current}
            title="Sil"
          >
            <Trash2 size={15} />
          </button>

          <button
            className={button}
            onClick={() => {
              setSelected(null);
              setInspector(false);
            }}
            title="Seçimi Kaldır"
          >
            <Layers size={15} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={button}
            onClick={() =>
              setZoom((z) => Math.max(20, z - 10))
            }
          >
            <ZoomOut size={14} />
          </button>

          <span className="w-12 text-center font-mono text-[10px] text-slate-400">
            {zoom}px/s
          </span>

          <button
            className={button}
            onClick={() =>
              setZoom((z) => Math.min(180, z + 10))
            }
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* TIMELINE */}
      <section className="h-[310px] overflow-auto bg-[#101523]">
        <div style={{ minWidth: timelineWidth }}>
          {/* TIME RULER */}
          <div className="sticky top-0 z-20 flex h-9 border-b border-white/10 bg-[#252b3b]">
            <div className="sticky left-0 z-30 flex w-16 shrink-0 items-center justify-center border-r border-white/10 bg-[#252b3b] text-[10px] text-slate-400">
              TIME
            </div>

            <div
              ref={rulerRef}
              className="relative h-full flex-1 cursor-crosshair touch-none"
              onPointerDown={(e) => {
                scrubRef.current = true;
                e.currentTarget.setPointerCapture(
                  e.pointerId
                );
                handleScrub(e.clientX);
              }}
              onPointerMove={(e) => {
                if (scrubRef.current) {
                  handleScrub(e.clientX);
                }
              }}
              onPointerUp={() => {
                scrubRef.current = false;
              }}
              onPointerCancel={() => {
                scrubRef.current = false;
              }}
            >
              {Array.from(
                {
                  length:
                    Math.ceil(
                      timelineWidth / px / 2
                    ) + 1,
                },
                (_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 top-0 border-l border-white/15 pl-1 text-[10px] text-slate-400"
                    style={{
                      left: i * 2 * px,
                    }}
                  >
                    {format(i * 2)}
                  </div>
                )
              )}
            </div>
          </div>

          {/* TRACKS */}
          <div className="relative">
            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex h-11 border-b border-white/5"
              >
                <div className="sticky left-0 z-10 flex w-16 shrink-0 items-center justify-between gap-1 border-r border-white/10 bg-[#1d2333] px-1">
                  <span className="text-[10px] font-semibold text-slate-300">
                    {track.name}
                  </span>

                  <div className="flex flex-col gap-1">
                    <button
                      title={
                        track.locked
                          ? "Kilidi Aç"
                          : "Kilitle"
                      }
                      onClick={() =>
                        updateTrack(track.id, {
                          locked: !track.locked,
                        })
                      }
                    >
                      {track.locked ? (
                        <Lock size={10} />
                      ) : (
                        <Unlock size={10} />
                      )}
                    </button>

                    <button
                      title={
                        track.hidden
                          ? "Göster"
                          : "Gizle"
                      }
                      onClick={() =>
                        updateTrack(track.id, {
                          hidden: !track.hidden,
                        })
                      }
                    >
                      {track.hidden ? (
                        <EyeOff size={10} />
                      ) : (
                        <Eye size={10} />
                      )}
                    </button>

                    {track.kind === "audio" && (
                      <button
                        title="Sesi Aç / Kapat"
                        onClick={() =>
                          updateTrack(track.id, {
                            muted: !track.muted,
                          })
                        }
                        className={
                          track.muted
                            ? "text-red-400"
                            : ""
                        }
                      >
                        <Volume2 size={10} />
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className="relative flex-1"
                  onPointerDown={(e) => {
                    if (
                      e.target === e.currentTarget
                    ) {
                      setSelected(null);
                      setInspector(false);

                      setPosition(
                        (e.clientX -
                          e.currentTarget
                            .getBoundingClientRect()
                            .left) /
                          px
                      );
                    }
                  }}
                >
                  {clips
                    .filter(
                      (clip) =>
                        clip.track === track.id
                    )
                    .map((clip) => (
                      <div
                        key={clip.id}
                        onPointerDown={(e) => {
                          if (track.locked) return;

                          e.stopPropagation();
                          setSelected(clip.id);
                          setInspector(true);

                          dragRef.current = {
                            id: clip.id,
                            x: e.clientX,
                            start: clip.start,
                          };

                          e.currentTarget.setPointerCapture(
                            e.pointerId
                          );
                        }}
                        onPointerMove={handleDrag}
                        onPointerUp={() => {
                          dragRef.current = null;
                        }}
                        onPointerCancel={() => {
                          dragRef.current = null;
                        }}
                        className={`absolute inset-y-1 flex cursor-grab touch-none items-center overflow-hidden rounded border px-2 text-[10px] ${
                          selected === clip.id
                            ? "border-white ring-1 ring-white"
                            : "border-white/20"
                        }`}
                        style={{
                          left: clip.start * px,
                          width: Math.max(
                            9,
                            clip.duration * px
                          ),
                          background:
                            colors[clip.kind],
                          opacity: track.hidden
                            ? 0.35
                            : 1,
                        }}
                      >
                        <span className="truncate">
                          {clip.kind === "video"
                            ? "▣ "
                            : clip.kind === "audio"
                            ? "♫ "
                            : "T "}
                          {clip.kind === "text"
                            ? clip.text
                            : clip.name}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {/* PLAYHEAD */}
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-20 w-px bg-white"
              style={{
                left: 64 + time * px,
              }}
            >
              <div className="absolute -left-1.5 top-0 h-3 w-3 rounded-b bg-white" />
            </div>
          </div>
        </div>
      </section>

      {/* FILE INPUTS */}
      <input
        ref={inputRef}
        type="file"
        accept="video/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            void importFiles(e.target.files);
          }
          e.target.value = "";
        }}
      />

      <input
        ref={projectInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={importProject}
      />

      {/* EXPORT DIALOG */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl border border-white/10 bg-[#1b2030] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between">
              <h2 className="text-base font-bold">
                Dışa Aktarma
              </h2>

              <button
                onClick={() =>
                  setExportOpen(false)
                }
              >
                ✕
              </button>
            </div>

            <label className="block text-xs">
              Görüntü Oranı

              <select
                className={`${field} mt-1`}
                value={ratio}
                onChange={(e) =>
                  setRatio(e.target.value)
                }
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
            </label>

            <label className="block text-xs">
              Çözünürlük

              <select
                className={`${field} mt-1`}
                value={resolution}
                onChange={(e) =>
                  setResolution(
                    Number(e.target.value)
                  )
                }
              >
                <option value={720}>720p</option>
                <option value={1080}>1080p</option>
              </select>
            </label>

            <label className="block text-xs">
              Kare Hızı

              <select
                className={`${field} mt-1`}
                value={fps}
                onChange={(e) =>
                  setFps(Number(e.target.value))
                }
              >
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </label>

            <p className="text-[11px] text-slate-400">
              MP4 veya WebM desteği tarayıcıya
              bağlıdır. Bazı harici ses dosyaları
              CORS izni gerektirebilir.
            </p>

            <button
              className={`${primary} w-full py-3`}
              onClick={exportVideo}
            >
              Videoyu Oluştur
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
