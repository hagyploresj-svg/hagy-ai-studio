
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
  Upload,
  Download,
  Play,
  Pause,
  Scissors,
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Film,
  Music2,
  Type,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  Save,
  FolderOpen,
  Plus,
  X,
  RotateCcw,
  Sparkles,
  WandSparkles,
  Layers,
  ChevronRight,
  Mic,
} from "lucide-react";
import MemeSounds from "../MemeSounds";

type Kind = "video" | "audio" | "text";
type Transition =
  | "none"
  | "fade"
  | "flash"
  | "slide"
  | "zoom"
  | "blur";
type Panel =
  | "transform"
  | "color"
  | "chroma"
  | "audio"
  | "transition";

type MediaItem = {
  id: string;
  name: string;
  url: string;
  duration: number;
  kind: "video" | "audio";
  waveform?: number[];
};

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
  kind: Kind;
  track: number;
  mediaId?: string;
  name: string;
  start: number;
  duration: number;
  inPoint: number;
  speed: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
  text: string;
  textColor: string;
  fontSize: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  cropL: number;
  cropR: number;
  cropT: number;
  cropB: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  chroma: boolean;
  keyColor: string;
  tolerance: number;
  softness: number;
  spill: number;
  transition: Transition;
  transitionDuration: number;
};

type Track = {
  id: number;
  name: string;
  kind: Kind;
  muted: boolean;
  hidden: boolean;
  locked: boolean;
};

type Snapshot = {
  clips: Clip[];
  tracks: Track[];
};

type MediaInstance = {
  element: HTMLMediaElement;
  gain?: GainNode;
};

const uid = () => crypto.randomUUID();

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));

const fmt = (seconds: number) => {
  const s = Math.floor(Math.max(0, seconds));
  const minutes = Math.floor(s / 60);
  const remaining = s % 60;
  return `${String(minutes).padStart(2, "0")}:${String(
    remaining
  ).padStart(2, "0")}`;
};

const fmtPrecise = (seconds: number) => {
  const s = Math.max(0, seconds);
  return `${fmt(s)}.${String(Math.floor((s % 1) * 100)).padStart(
    2,
    "0"
  )}`;
};

const btn =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-[#242b3c] px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-violet-400/40 hover:bg-[#333b51] disabled:cursor-not-allowed disabled:opacity-30";

const primary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30";

const input =
  "w-full rounded-lg border border-white/10 bg-[#101521] px-3 py-2 text-xs text-white outline-none focus:border-violet-500";

const tracksInitial: Track[] = [
  { id: 3, name: "V3", kind: "video", muted: false, hidden: false, locked: false },
  { id: 2, name: "V2", kind: "video", muted: false, hidden: false, locked: false },
  { id: 5, name: "T1", kind: "text", muted: false, hidden: false, locked: false },
  { id: 1, name: "V1", kind: "video", muted: false, hidden: false, locked: false },
  { id: 4, name: "A1", kind: "audio", muted: false, hidden: false, locked: false },
  { id: 6, name: "A2", kind: "audio", muted: false, hidden: false, locked: false },
];

const clipColors: Record<Kind, string> = {
  video: "#467bd0",
  audio: "#238c79",
  text: "#8b61c6",
};

const panelItems: { key: Panel; label: string }[] = [
  { key: "transform", label: "Dönüştür" },
  { key: "color", label: "Renk" },
  { key: "chroma", label: "Chroma Key" },
  { key: "audio", label: "Ses" },
  { key: "transition", label: "Geçiş" },
];

const transitions: { value: Transition; label: string }[] = [
  { value: "none", label: "Geçiş Yok" },
  { value: "fade", label: "Yumuşak Geçiş" },
  { value: "flash", label: "Beyaz Flaş" },
  { value: "slide", label: "Kaydırma" },
  { value: "zoom", label: "Yakınlaştırma" },
  { value: "blur", label: "Bulanık Geçiş" },
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
    speed: 1,
    volume: 100,
    fadeIn: 0,
    fadeOut: 0,
    text: "Yeni Başlık",
    textColor: "#ffffff",
    fontSize: 52,
    x: 50,
    y: 50,
    scale: 100,
    rotation: 0,
    opacity: 100,
    cropL: 0,
    cropR: 0,
    cropT: 0,
    cropB: 0,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    chroma: false,
    keyColor: "#00ff00",
    tolerance: 35,
    softness: 20,
    spill: 30,
    transition: "none",
    transitionDuration: 0.5,
  };
}

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (n: number) => void;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-300">{label}</span>
        <span className="rounded bg-white/5 px-2 py-1 font-mono text-[10px] text-violet-300">
          {Number(value.toFixed(2))}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-violet-500"
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-white/10 pt-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {title}
      </h3>
      {children}
    </div>
  );
}

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const value = parseInt(clean, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function chromaProcess(
  image: ImageData,
  clip: Clip
): ImageData {
  const target = hexToRgb(clip.keyColor);
  const tolerance = clip.tolerance / 100;
  const softness = Math.max(0.005, clip.softness / 100);
  const spill = clip.spill / 100;

  const tr = target.r / 255;
  const tg = target.g / 255;
  const tb = target.b / 255;

  const targetLength = Math.sqrt(tr * tr + tg * tg + tb * tb) || 1;

  for (let i = 0; i < image.data.length; i += 4) {
    let r = image.data[i] / 255;
    let g = image.data[i + 1] / 255;
    let b = image.data[i + 2] / 255;

    const length = Math.sqrt(r * r + g * g + b * b) || 1;
    const similarity = clamp(
      (r * tr + g * tg + b * tb) / (length * targetLength),
      -1,
      1
    );

    const distance = 1 - similarity;
    const edge = tolerance * 0.45;
    const alpha = clamp(
      (distance - edge) / softness,
      0,
      1
    );

    image.data[i + 3] = Math.round(
      image.data[i + 3] * alpha
    );

    if (spill > 0 && alpha < 1) {
      const amount = (1 - alpha) * spill;

      if (tg >= tr && tg >= tb) {
        g = g * (1 - amount) + Math.min(r, b) * amount;
      } else if (tb >= tr && tb >= tg) {
        b = b * (1 - amount) + Math.min(r, g) * amount;
      } else {
        r = r * (1 - amount) + Math.min(g, b) * amount;
      }

      image.data[i] = Math.round(r * 255);
      image.data[i + 1] = Math.round(g * 255);
      image.data[i + 2] = Math.round(b * 255);
    }
  }

  return image;
}

function transitionState(clip: Clip, time: number) {
  const local = time - clip.start;
  const duration = Math.min(
    clip.transitionDuration,
    clip.duration / 2
  );

  if (clip.transition === "none" || duration <= 0) {
    return { progress: 1, alpha: 1 };
  }

  const progress = clamp(local / duration, 0, 1);

  if (clip.transition === "fade") {
    return { progress, alpha: progress };
  }

  return { progress, alpha: 1 };
}

function drawClip(
  ctx: CanvasRenderingContext2D,
  clip: Clip,
  element: HTMLVideoElement | undefined,
  time: number,
  width: number,
  height: number,
  scratch: HTMLCanvasElement
) {
  const state = transitionState(clip, time);

  ctx.save();

  ctx.translate(
    (clip.x / 100) * width,
    (clip.y / 100) * height
  );

  ctx.rotate((clip.rotation * Math.PI) / 180);

  const opacity = (clip.opacity / 100) * state.alpha;
  ctx.globalAlpha = opacity;

  if (clip.transition === "slide") {
    ctx.translate((state.progress - 1) * width, 0);
  }

  let zoom = clip.scale / 100;

  if (clip.transition === "zoom") {
    zoom *= 0.7 + state.progress * 0.3;
  }

  if (clip.kind === "text") {
    const size = Math.max(
      10,
      (clip.fontSize * width) / 720
    );

    ctx.scale(zoom, zoom);
    ctx.fillStyle = clip.textColor;
    ctx.font = `700 ${size}px Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,.75)";
    ctx.shadowBlur = 12;

    const lines = clip.text.split("\n");

    lines.forEach((line, index) => {
      ctx.fillText(
        line,
        0,
        (index - (lines.length - 1) / 2) * size * 1.25,
        width * 0.9
      );
    });

    ctx.restore();
    return;
  }

  if (
    clip.kind !== "video" ||
    !element ||
    element.readyState < 2 ||
    !element.videoWidth
  ) {
    ctx.restore();
    return;
  }

  const vw = element.videoWidth;
  const vh = element.videoHeight;

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

  const factor = Math.min(width / sw, height / sh) * zoom;
  const dw = sw * factor;
  const dh = sh * factor;

  const blur =
    clip.transition === "blur"
      ? (1 - state.progress) * 12
      : 0;

  ctx.filter = [
    `brightness(${clip.brightness}%)`,
    `contrast(${clip.contrast}%)`,
    `saturate(${clip.saturation}%)`,
    `hue-rotate(${clip.hue}deg)`,
    `blur(${blur}px)`,
  ].join(" ");

  if (clip.chroma) {
    const size = Math.min(1, 720 / Math.max(sw, sh));
    scratch.width = Math.max(1, Math.round(sw * size));
    scratch.height = Math.max(1, Math.round(sh * size));

    const bctx = scratch.getContext("2d", {
      willReadFrequently: true,
    });

    if (bctx) {
      try {
        bctx.clearRect(0, 0, scratch.width, scratch.height);

        bctx.drawImage(
          element,
          sx,
          sy,
          sw,
          sh,
          0,
          0,
          scratch.width,
          scratch.height
        );

        const pixels = bctx.getImageData(
          0,
          0,
          scratch.width,
          scratch.height
        );

        bctx.putImageData(chromaProcess(pixels, clip), 0, 0);

        ctx.drawImage(
          scratch,
          -dw / 2,
          -dh / 2,
          dw,
          dh
        );
      } catch {
        ctx.drawImage(
          element,
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
      element,
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

  if (
    clip.transition === "flash" &&
    state.progress < 1
  ) {
    const flash = Math.sin(state.progress * Math.PI);

    ctx.save();
    ctx.globalAlpha = flash * 0.65;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

function renderFrame(
  canvas: HTMLCanvasElement,
  clips: Clip[],
  tracks: Track[],
  instances: Map<string, MediaInstance>,
  time: number,
  scratch: HTMLCanvasElement
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#06080d";
  ctx.fillRect(0, 0, w, h);

  const sortedTracks = [...tracks].reverse();

  for (const track of sortedTracks) {
    if (track.hidden) continue;

    const active = clips
      .filter(
        (clip) =>
          clip.track === track.id &&
          clip.kind !== "audio" &&
          time >= clip.start &&
          time < clip.start + clip.duration
      )
      .sort((a, b) => a.start - b.start);

    for (const clip of active) {
      const instance = instances.get(clip.id);

      drawClip(
        ctx,
        clip,
        instance?.element as HTMLVideoElement | undefined,
        time,
        w,
        h,
        scratch
      );
    }
  }
}

function volumeAt(clip: Clip, time: number) {
  const local = time - clip.start;

  const fadeIn =
    clip.fadeIn > 0
      ? clamp(local / clip.fadeIn, 0, 1)
      : 1;

  const remaining = clip.duration - local;

  const fadeOut =
    clip.fadeOut > 0
      ? clamp(remaining / clip.fadeOut, 0, 1)
      : 1;

  return (clip.volume / 100) * Math.min(fadeIn, fadeOut);
}

function Waveform({
  values,
}: {
  values?: number[];
}) {
  const bars = values?.length
    ? values
    : Array.from({ length: 48 }, (_, i) =>
        0.3 + Math.abs(Math.sin(i * 1.8)) * 0.45
      );

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center gap-[2px] overflow-hidden px-1 opacity-60">
      {bars.map((value, index) => (
        <div
          key={index}
          className="min-w-[2px] flex-1 rounded-sm bg-emerald-100"
          style={{
            height: `${Math.max(10, value * 85)}%`,
          }}
        />
      ))}
    </div>
  );
}

async function getWaveform(url: string): Promise<number[]> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const context = new AudioContext();

  try {
    const decoded = await context.decodeAudioData(buffer);
    const channel = decoded.getChannelData(0);
    const count = 64;
    const size = Math.max(1, Math.floor(channel.length / count));
    const result: number[] = [];

    for (let i = 0; i < count; i++) {
      const start = i * size;
      let sum = 0;
      let samples = 0;

      for (
        let j = start;
        j < Math.min(channel.length, start + size);
        j += Math.max(1, Math.floor(size / 100))
      ) {
        sum += Math.abs(channel[j]);
        samples++;
      }

      result.push(clamp((sum / Math.max(1, samples)) * 2.5, 0.08, 1));
    }

    return result;
  } finally {
    await context.close();
  }
}

export default function WorkspacePage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  const [tracks, setTracks] = useState<Track[]>(tracksInitial);

  const [selected, setSelected] = useState<string | null>(null);
  const [inspector, setInspector] = useState(false);
  const [panel, setPanel] = useState<Panel>("transform");

  const [libraryTab, setLibraryTab] = useState<
    "media" | "sounds" | "titles" | "transitions"
  >("media");

  const [projectName, setProjectName] = useState("Adsız Proje");
  const [ratio, setRatio] = useState("9:16");
  const [resolution, setResolution] = useState(720);
  const [fps, setFps] = useState(30);

  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [zoom, setZoom] = useState(42);

  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const [recording, setRecording] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const projectRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const instancesRef = useRef<Map<string, MediaInstance>>(
    new Map()
  );

  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const urlsRef = useRef<string[]>([]);
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const playingRef = useRef(false);

  const clockRef = useRef<{
    started: number;
    from: number;
  } | null>(null);

  const dragRef = useRef<{
    id: string;
    clientX: number;
    start: number;
    moved: boolean;
  } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  const total = useMemo(
    () =>
      Math.max(
        0,
        ...clips.map((clip) => clip.start + clip.duration)
      ),
    [clips]
  );

  const current =
    clips.find((clip) => clip.id === selected) || null;

  const selectedTrack = tracks.find(
    (track) => track.id === current?.track
  );

  const width = ratio === "16:9" ? 1280 : 720;
  const height =
    ratio === "9:16" ? 1280 : 720;

  const px = Math.max(20, zoom);
  const timelineWidth = Math.max(
    900,
    (Math.max(total, 15) + 5) * px
  );

  const mediaMap = useMemo(
    () => new Map(media.map((item) => [item.id, item])),
    [media]
  );

  const snapshot = useCallback(() => {
    setHistory((old) => [
      ...old.slice(-39),
      {
        clips: structuredClone(clips),
        tracks: structuredClone(tracks),
      },
    ]);

    setFuture([]);
  }, [clips, tracks]);

  function updateClip(changes: Partial<Clip>) {
    if (!current || selectedTrack?.locked) return;

    setClips((old) =>
      old.map((clip) =>
        clip.id === current.id
          ? { ...clip, ...changes }
          : clip
      )
    );
  }

  function addClip(clip: Clip) {
    snapshot();
    setClips((old) => [...old, clip]);
    setSelected(clip.id);
    setInspector(false);
  }

  function pause() {
    playingRef.current = false;
    setPlaying(false);
    clockRef.current = null;
  }

  function seek(position: number) {
    pause();

    const next = clamp(position, 0, total);
    timeRef.current = next;
    setTime(next);
  }

  function togglePlay() {
    if (playingRef.current) {
      pause();
      return;
    }

    if (!total || exporting) return;

    const from = timeRef.current >= total ? 0 : timeRef.current;

    timeRef.current = from;
    setTime(from);

    clockRef.current = {
      started: performance.now(),
      from,
    };

    playingRef.current = true;
    setPlaying(true);
  }

  useEffect(() => {
    scratchRef.current = document.createElement("canvas");

    return () => {
      cancelAnimationFrame(frameRef.current);

      instancesRef.current.forEach((instance) =>
        instance.element.pause()
      );

      urlsRef.current.forEach((url) =>
        URL.revokeObjectURL(url)
      );

      micStreamRef.current?.getTracks().forEach((track) =>
        track.stop()
      );
    };
  }, []);

  useEffect(() => {
    const activeIds = new Set(
      clips
        .filter((clip) => clip.mediaId && clip.kind !== "text")
        .map((clip) => clip.id)
    );

    for (const [id, instance] of instancesRef.current) {
      if (!activeIds.has(id)) {
        instance.element.pause();
        instance.element.removeAttribute("src");
        instance.element.load();
        instancesRef.current.delete(id);
      }
    }

    for (const clip of clips) {
      if (
        clip.kind === "text" ||
        !clip.mediaId ||
        instancesRef.current.has(clip.id)
      ) {
        continue;
      }

      const item = mediaMap.get(clip.mediaId);
      if (!item) continue;

      const element =
        clip.kind === "video"
          ? document.createElement("video")
          : document.createElement("audio");

      element.src = item.url;
      element.preload = "auto";

      if (clip.kind === "video") {
        const video = element as HTMLVideoElement;
        video.playsInline = true;
        video.muted = false;
      }

      element.addEventListener("loadeddata", () => {
        if (canvasRef.current && scratchRef.current) {
          renderFrame(
            canvasRef.current,
            clips,
            tracks,
            instancesRef.current,
            timeRef.current,
            scratchRef.current
          );
        }
      });

      instancesRef.current.set(clip.id, { element });
    }
  }, [clips, mediaMap, tracks]);

  useEffect(() => {
    if (!canvasRef.current) return;

    canvasRef.current.width = width;
    canvasRef.current.height = height;
  }, [width, height]);

  const syncMedia = useCallback(
    (position: number, shouldPlay: boolean) => {
      for (const clip of clips) {
        if (clip.kind === "text") continue;

        const instance = instancesRef.current.get(clip.id);
        const element = instance?.element;

        if (!element) continue;

        const track = tracks.find((t) => t.id === clip.track);

        const active =
          position >= clip.start &&
          position < clip.start + clip.duration;

        if (!active || (clip.kind === "audio" && track?.muted)) {
          element.pause();
          continue;
        }

        const item = clip.mediaId
          ? mediaMap.get(clip.mediaId)
          : undefined;

        const target = clamp(
          clip.inPoint + (position - clip.start) * clip.speed,
          0,
          Math.max(0, (item?.duration || 0) - 0.02)
        );

        if (Math.abs(element.currentTime - target) > 0.18) {
          try {
            element.currentTime = target;
          } catch {}
        }

        element.playbackRate = clamp(clip.speed, 0.25, 3);

        element.volume = track?.muted
          ? 0
          : clamp(volumeAt(clip, position), 0, 1);

        if (shouldPlay) {
          if (element.paused) {
            element.play().catch(() => {});
          }
        } else {
          element.pause();
        }
      }
    },
    [clips, tracks, mediaMap]
  );

  useEffect(() => {
    const tick = () => {
      if (playingRef.current && clockRef.current) {
        const next =
          clockRef.current.from +
          (performance.now() - clockRef.current.started) / 1000;

        if (next >= total) {
          timeRef.current = total;
          setTime(total);
          pause();
        } else {
          timeRef.current = next;
          setTime(next);
        }
      }

      syncMedia(timeRef.current, playingRef.current);

      if (canvasRef.current && scratchRef.current) {
        renderFrame(
          canvasRef.current,
          clips,
          tracks,
          instancesRef.current,
          timeRef.current,
          scratchRef.current
        );
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [clips, tracks, total, syncMedia]);

  async function importFiles(files: FileList | File[]) {
    const imported: MediaItem[] = [];

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

      probe.src = url;
      probe.preload = "metadata";

      try {
        const duration = await new Promise<number>(
          (resolve, reject) => {
            probe.onloadedmetadata = () =>
              resolve(probe.duration);
            probe.onerror = () =>
              reject(new Error("Dosya okunamadı"));
          }
        );

        if (!Number.isFinite(duration) || duration <= 0) {
          continue;
        }

        const item: MediaItem = {
          id: uid(),
          name: file.name,
          url,
          duration,
          kind,
        };

        if (kind === "audio") {
          try {
            item.waveform = await getWaveform(url);
          } catch {}
        }

        imported.push(item);
      } catch {
        setMessage(`${file.name} yüklenemedi.`);
      }
    }

    setMedia((old) => [...old, ...imported]);

    if (!clips.length) {
      const first = imported.find((item) => item.kind === "video");

      if (first) {
        addClip(
          createClip(
            "video",
            1,
            0,
            first.duration,
            first.name,
            first.id
          )
        );
      }
    }
  }

  function addMedia(item: MediaItem) {
    const track = item.kind === "video" ? 1 : 4;

    addClip(
      createClip(
        item.kind,
        track,
        timeRef.current,
        item.duration,
        item.name,
        item.id
      )
    );
  }

  function addSound(sound: Sound) {
    const existing = media.find(
      (item) => item.url === sound.url
    );

    if (existing) {
      addMedia(existing);
      return;
    }

    const item: MediaItem = {
      id: uid(),
      name: sound.name,
      url: sound.url,
      duration: sound.duration || 5,
      kind: "audio",
    };

    setMedia((old) => [...old, item]);

    addClip(
      createClip(
        "audio",
        4,
        timeRef.current,
        item.duration,
        item.name,
        item.id
      )
    );
  }

  function addTitle() {
    addClip(
      createClip(
        "text",
        5,
        timeRef.current,
        4,
        "Yeni Başlık"
      )
    );
  }

  function deleteSelected() {
    if (!current || selectedTrack?.locked) return;

    snapshot();

    setClips((old) =>
      old.filter((clip) => clip.id !== current.id)
    );

    setSelected(null);
    setInspector(false);
  }

  function duplicate() {
    if (!current || selectedTrack?.locked) return;

    addClip({
      ...current,
      id: uid(),
      start: current.start + current.duration,
    });
  }

  function splitSelected() {
    if (!current || selectedTrack?.locked) return;

    const offset = timeRef.current - current.start;

    if (offset <= 0.05 || offset >= current.duration - 0.05) {
      setMessage("Kesmek için oynatma çizgisini klibin içine getir.");
      return;
    }

    snapshot();

    const left: Clip = {
      ...current,
      duration: offset,
    };

    const right: Clip = {
      ...current,
      id: uid(),
      start: timeRef.current,
      duration: current.duration - offset,
      inPoint: current.inPoint + offset * current.speed,
    };

    setClips((old) => [
      ...old.filter((clip) => clip.id !== current.id),
      left,
      right,
    ]);

    setSelected(right.id);
    setInspector(false);
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
    setInspector(false);
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
    setInspector(false);
  }

  function updateTrack(id: number, changes: Partial<Track>) {
    snapshot();

    setTracks((old) =>
      old.map((track) =>
        track.id === id ? { ...track, ...changes } : track
      )
    );
  }

  function openInspector(nextPanel: Panel = "transform") {
    if (!current) return;

    setPanel(nextPanel);
    setInspector(true);
  }

  function handleClipPointerDown(
    event: ReactPointerEvent<HTMLDivElement>,
    clip: Clip
  ) {
    const track = tracks.find((item) => item.id === clip.track);
    if (track?.locked) return;

    event.stopPropagation();

    setSelected(clip.id);
    setInspector(false);

    dragRef.current = {
      id: clip.id,
      clientX: event.clientX,
      start: clip.start,
      moved: false,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleClipPointerMove(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    const drag = dragRef.current;
    if (!drag) return;

    const delta = (event.clientX - drag.clientX) / px;

    if (Math.abs(delta) > 0.03) {
      drag.moved = true;
    }

    setClips((old) =>
      old.map((clip) =>
        clip.id === drag.id
          ? {
              ...clip,
              start: Math.max(0, drag.start + delta),
            }
          : clip
      )
    );
  }

  function handleClipPointerUp() {
    dragRef.current = null;
  }

  function scrub(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    seek((event.clientX - rect.left) / px);
  }

  function saveProject() {
    const data = {
      version: 2,
      projectName,
      ratio,
      resolution,
      fps,
      clips,
      tracks,
      media: media.map((item) => ({
        id: item.id,
        name: item.name,
        duration: item.duration,
        kind: item.kind,
      })),
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${projectName || "HAGY"}-project.json`;
    anchor.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    setMessage(
      "Proje kaydedildi. Yerel video ve ses dosyaları JSON'a dahil değildir."
    );
  }

  function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));

        if (
          !Array.isArray(data.clips) ||
          !Array.isArray(data.tracks)
        ) {
          throw new Error("Geçersiz proje");
        }

        pause();

        setClips(data.clips);
        setTracks(data.tracks);
        setProjectName(data.projectName || "Adsız Proje");
        setRatio(data.ratio || "9:16");
        setResolution(data.resolution || 720);
        setFps(data.fps || 30);
        setSelected(null);
        setInspector(false);

        timeRef.current = 0;
        setTime(0);

        setMessage(
          "Proje açıldı. Yerel medya dosyalarının yeniden eşleştirilmesi gerekir."
        );
      } catch {
        setMessage("Proje dosyası okunamadı.");
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  }

  async function recordVoice() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setMessage("Tarayıcı mikrofon kaydını desteklemiyor.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      micStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      const chunks: Blob[] = [];
      const startPosition = timeRef.current;

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });

        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);

        const audio = new Audio(url);

        const duration = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () =>
            resolve(
              Number.isFinite(audio.duration)
                ? audio.duration
                : 5
            );

          audio.onerror = () => resolve(5);
        });

        const item: MediaItem = {
          id: uid(),
          name: `Seslendirme ${new Date().toLocaleTimeString("tr-TR")}`,
          url,
          duration,
          kind: "audio",
        };

        try {
          item.waveform = await getWaveform(url);
        } catch {}

        setMedia((old) => [...old, item]);

        addClip(
          createClip(
            "audio",
            6,
            startPosition,
            duration,
            item.name,
            item.id
          )
        );

        stream.getTracks().forEach((track) => track.stop());
        micStreamRef.current = null;
        setRecording(false);
      };

      recorder.start();
      setRecording(true);
      setMessage("Mikrofon kaydı başladı.");
    } catch {
      setMessage("Mikrofon izni alınamadı.");
    }
  }

  async function exportVideo() {
    if (!clips.length || exporting) return;

    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setMessage("Tarayıcın video dışa aktarmayı desteklemiyor.");
      return;
    }

    pause();
    setExportOpen(false);
    setExporting(true);
    setProgress(0);

    const canvas = document.createElement("canvas");

    canvas.width =
      ratio === "16:9"
        ? Math.round((resolution * 16) / 9)
        : resolution;

    canvas.height =
      ratio === "9:16"
        ? Math.round((resolution * 16) / 9)
        : resolution;

    const scratch = document.createElement("canvas");

    const exportInstances = new Map<string, MediaInstance>();

    let audioContext: AudioContext | null = null;
    let outputStream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let animation = 0;

    try {
      audioContext = new AudioContext();

      const destination =
        audioContext.createMediaStreamDestination();

      for (const clip of clips) {
        if (!clip.mediaId || clip.kind === "text") continue;

        const item = mediaMap.get(clip.mediaId);

        if (!item) {
          throw new Error(
            `Eksik medya: ${clip.name}. Dosyayı yeniden yüklemelisin.`
          );
        }

        const element =
          clip.kind === "video"
            ? document.createElement("video")
            : document.createElement("audio");

        element.src = item.url;
        element.preload = "auto";

        if (clip.kind === "video") {
          (element as HTMLVideoElement).playsInline = true;
        }

        const source =
          audioContext.createMediaElementSource(element);

        const gain = audioContext.createGain();

        source.connect(gain);
        gain.connect(destination);

        exportInstances.set(clip.id, { element, gain });
      }

      const canvasStream = canvas.captureStream(fps);

      outputStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
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
        throw new Error("Desteklenen video formatı bulunamadı.");
      }

      recorder = new MediaRecorder(outputStream, {
        mimeType: mime,
        videoBitsPerSecond:
          resolution === 1080 ? 12000000 : 6000000,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      const completed = new Promise<void>((resolve, reject) => {
        if (!recorder) return reject(new Error("Kayıt başlatılamadı"));

        recorder.onstop = () => resolve();
        recorder.onerror = () =>
          reject(new Error("Video oluşturulamadı"));
      });

      await audioContext.resume();

      const syncExport = (position: number) => {
        for (const clip of clips) {
          const instance = exportInstances.get(clip.id);
          if (!instance) continue;

          const element = instance.element;
          const track = tracks.find((t) => t.id === clip.track);

          const active =
            position >= clip.start &&
            position < clip.start + clip.duration;

          if (!active) {
            element.pause();
            if (instance.gain) instance.gain.gain.value = 0;
            continue;
          }

          const item = clip.mediaId
            ? mediaMap.get(clip.mediaId)
            : undefined;

          const target = clamp(
            clip.inPoint + (position - clip.start) * clip.speed,
            0,
            Math.max(0, (item?.duration || 0) - 0.02)
          );

          if (Math.abs(element.currentTime - target) > 0.18) {
            try {
              element.currentTime = target;
            } catch {}
          }

          element.playbackRate = clamp(clip.speed, 0.25, 3);

          if (instance.gain) {
            instance.gain.gain.value = track?.muted
              ? 0
              : clamp(volumeAt(clip, position), 0, 1);
          }

          if (element.paused) {
            element.play().catch(() => {});
          }
        }
      };

      syncExport(0);

      renderFrame(
        canvas,
        clips,
        tracks,
        exportInstances,
        0,
        scratch
      );

      recorder.start(250);

      const started = performance.now();

      await new Promise<void>((resolve) => {
        const draw = () => {
          const elapsed = (performance.now() - started) / 1000;
          const position = Math.min(total, elapsed);

          syncExport(position);

          renderFrame(
            canvas,
            clips,
            tracks,
            exportInstances,
            position,
            scratch
          );

          setProgress(
            Math.round(
              (position / Math.max(total, 0.01)) * 100
            )
          );

          if (elapsed >= total) {
            resolve();
          } else {
            animation = requestAnimationFrame(draw);
          }
        };

        animation = requestAnimationFrame(draw);
      });

      recorder.stop();
      await completed;

      const blob = new Blob(chunks, { type: mime });

      if (!blob.size) {
        throw new Error("Oluşturulan video dosyası boş.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `HAGY-${resolution}p-${fps}fps.${
        mime.includes("mp4") ? "mp4" : "webm"
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
          : "Dışa aktarma başarısız."
      );
    } finally {
      cancelAnimationFrame(animation);

      exportInstances.forEach((instance) =>
        instance.element.pause()
      );

      if (recorder?.state === "recording") {
        recorder.stop();
      }

      outputStream?.getTracks().forEach((track) => track.stop());

      await audioContext?.close().catch(() => {});

      setExporting(false);
      setProgress(0);
    }
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#0c1019] text-white">
      {/* HEADER */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#171c2a] px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className={btn} title="Geri">
            <ArrowLeft size={16} />
          </Link>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15">
            <Clapperboard size={23} className="text-violet-400" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-widest">
                HAGY EDITOR
              </h1>
              <span className="rounded bg-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-300">
                PRO V2
              </span>
            </div>

            <input
              className="w-44 bg-transparent text-[11px] text-slate-400 outline-none"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={btn}
            onClick={undo}
            disabled={!history.length}
            title="Geri al"
          >
            <Undo2 size={15} />
          </button>

          <button
            className={btn}
            onClick={redo}
            disabled={!future.length}
            title="Yinele"
          >
            <Redo2 size={15} />
          </button>

          <button
            className={btn}
            onClick={saveProject}
            title="Proje kaydet"
          >
            <Save size={15} />
          </button>

          <button
            className={btn}
            onClick={() => projectRef.current?.click()}
            title="Proje aç"
          >
            <FolderOpen size={15} />
          </button>

          <button
            className={primary}
            disabled={!clips.length || exporting}
            onClick={() => setExportOpen(true)}
          >
            <Download size={15} />
            {exporting ? `%${progress}` : "Dışa Aktar"}
          </button>
        </div>
      </header>

      {message && (
        <div className="flex items-center justify-between border-b border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs text-violet-200">
          <span>{message}</span>
          <button onClick={() => setMessage("")}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* WORKSPACE */}
      <div className="flex min-h-[520px] flex-col lg:flex-row">
        {/* LIBRARY */}
        <aside className="flex w-full shrink-0 flex-col border-b border-white/10 bg-[#171c2a] lg:w-72 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-4 border-b border-white/10">
            {[
              { key: "media", label: "Medya", Icon: Film },
              { key: "sounds", label: "Ses", Icon: Music2 },
              { key: "titles", label: "Yazı", Icon: Type },
              {
                key: "transitions",
                label: "Geçiş",
                Icon: Sparkles,
              },
            ].map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() =>
                  setLibraryTab(
                    key as
                      | "media"
                      | "sounds"
                      | "titles"
                      | "transitions"
                  )
                }
                className={`flex flex-col items-center gap-1 py-3 text-[10px] transition ${
                  libraryTab === key
                    ? "border-b-2 border-violet-400 bg-violet-500/10 text-violet-300"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>

          <div className="max-h-[530px] flex-1 space-y-3 overflow-y-auto p-3">
            {libraryTab === "media" && (
              <>
                <button
                  className={`${primary} w-full`}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload size={15} />
                  Video / Ses Yükle
                </button>

                <div className="grid grid-cols-2 gap-2">
                  {media.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addMedia(item)}
                      className="overflow-hidden rounded-xl border border-white/10 bg-[#252d40] text-left transition hover:border-violet-400"
                    >
                      <div className="flex h-20 items-center justify-center bg-[#30394e]">
                        {item.kind === "video" ? (
                          <Film
                            size={28}
                            className="text-blue-300"
                          />
                        ) : (
                          <Music2
                            size={28}
                            className="text-emerald-300"
                          />
                        )}
                      </div>

                      <div className="space-y-1 p-2">
                        <p className="truncate text-[10px] font-medium">
                          {item.name}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          {fmt(item.duration)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                {!media.length && (
                  <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                    Henüz medya eklenmedi.
                  </div>
                )}
              </>
            )}

            {libraryTab === "sounds" && (
              <div className="space-y-4">
                <button
                  className={`${recording ? "bg-red-600" : "bg-emerald-600"} flex w-full items-center justify-center gap-2 rounded-lg px-3 py-3 text-xs font-semibold`}
                  onClick={recordVoice}
                >
                  <Mic size={16} />
                  {recording
                    ? "Kaydı Durdur"
                    : "Mikrofonla Seslendir"}
                </button>

                <p className="text-[11px] text-slate-400">
                  Kendi müziğini yükleyebilir, mikrofonla
                  seslendirme yapabilir veya hazır efekt ekleyebilirsin.
                </p>

                <MemeSounds onAdd={addSound} />
              </div>
            )}

            {libraryTab === "titles" && (
              <div className="space-y-3">
                <button
                  className={`${primary} w-full`}
                  onClick={addTitle}
                >
                  <Plus size={15} />
                  Yeni Başlık Ekle
                </button>

                <button
                  onClick={addTitle}
                  className="w-full rounded-xl border border-white/10 bg-[#252d40] p-6 text-center"
                >
                  <span className="text-2xl font-black">
                    HAGY
                  </span>
                  <p className="mt-2 text-[11px] text-slate-400">
                    Kalın Başlık
                  </p>
                </button>
              </div>
            )}

            {libraryTab === "transitions" && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400">
                  Bir video klibi seç ve geçiş uygula.
                </p>

                {transitions.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      if (!current) {
                        setMessage("Önce bir klip seç.");
                        return;
                      }

                      snapshot();
                      updateClip({
                        transition: item.value,
                      });
                      openInspector("transition");
                    }}
                    className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-[#252d40] px-3 py-3 text-xs transition hover:border-violet-400"
                  >
                    <span className="flex items-center gap-2">
                      <WandSparkles
                        size={15}
                        className="text-violet-300"
                      />
                      {item.label}
                    </span>
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* PREVIEW */}
        <section className="flex min-h-[520px] min-w-0 flex-1 flex-col bg-[#090c13] p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-slate-500">
              PROGRAM MONITOR
            </span>

            <div className="flex items-center gap-2">
              <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400">
                {ratio}
              </span>
              <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400">
                {fps} FPS
              </span>
            </div>
          </div>

          <div className="relative flex min-h-[330px] flex-1 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black">
            <canvas
              ref={canvasRef}
              width={width}
              height={height}
              className="max-h-[470px] max-w-full object-contain"
              style={{
                aspectRatio: `${width}/${height}`,
              }}
            />

            {!clips.length && (
              <button
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#101522]"
                onClick={() => fileRef.current?.click()}
              >
                <div className="rounded-full bg-violet-500/15 p-5">
                  <Upload
                    size={32}
                    className="text-violet-400"
                  />
                </div>
                <span className="text-sm text-slate-300">
                  Videonu yükleyerek başla
                </span>
                <span className="text-xs text-slate-500">
                  MP4, MOV, WebM ve ses dosyaları
                </span>
              </button>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="w-24 font-mono text-xs text-violet-300">
              {fmtPrecise(time)}
            </span>

            <div className="flex items-center gap-2">
              <button
                className={btn}
                onClick={() => seek(timeRef.current - 1)}
              >
                -1s
              </button>

              <button
                className="rounded-full bg-violet-600 p-3 transition hover:bg-violet-500 disabled:opacity-30"
                onClick={togglePlay}
                disabled={!total || exporting}
              >
                {playing ? (
                  <Pause size={21} />
                ) : (
                  <Play size={21} />
                )}
              </button>

              <button
                className={btn}
                onClick={() => seek(timeRef.current + 1)}
              >
                +1s
              </button>
            </div>

            <span className="w-24 text-right font-mono text-xs text-slate-400">
              {fmtPrecise(total)}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-4">
            <button
              className={btn}
              onClick={splitSelected}
              disabled={!current}
              title="Klibi kes"
            >
              <Scissors size={16} />
            </button>

            <button
              className={btn}
              onClick={duplicate}
              disabled={!current}
              title="Çoğalt"
            >
              <Copy size={16} />
            </button>

            <button
              className={btn}
              onClick={deleteSelected}
              disabled={!current}
              title="Sil"
            >
              <Trash2 size={16} />
            </button>

            <button
              className={`${btn} ${
                inspector ? "border-violet-400 text-violet-300" : ""
              }`}
              onClick={() => {
                if (!current) return;

                if (inspector) {
                  setInspector(false);
                } else {
                  openInspector("transform");
                }
              }}
              disabled={!current}
              title="Klip ayarları"
            >
              <SlidersHorizontal size={16} />
              <span className="hidden sm:inline">Ayarlar</span>
            </button>
          </div>
        </section>

        {/* INSPECTOR */}
        {inspector && current && (
          <aside className="max-h-[650px] w-full shrink-0 overflow-y-auto border-t border-white/10 bg-[#171c2a] p-4 lg:w-80 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold">
                  {current.name}
                </h2>
                <p className="text-[10px] text-slate-500">
                  PROFESYONEL KLİP DÜZENLEYİCİ
                </p>
              </div>

              <button
                className={btn}
                onClick={() => setInspector(false)}
              >
                <X size={15} />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2">
              {panelItems
                .filter(
                  (item) =>
                    current.kind !== "text" ||
                    item.key === "transform" ||
                    item.key === "transition"
                )
                .map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setPanel(item.key)}
                    className={`rounded-lg px-2 py-2 text-[11px] ${
                      panel === item.key
                        ? "bg-violet-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
            </div>

            <div className="space-y-5">
              {current.kind === "text" && (
                <Section title="Başlık İçeriği">
                  <textarea
                    className={input}
                    rows={3}
                    value={current.text}
                    onChange={(e) =>
                      updateClip({ text: e.target.value })
                    }
                  />

                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={current.textColor}
                      onChange={(e) =>
                        updateClip({
                          textColor: e.target.value,
                        })
                      }
                    />
                    <span className="text-xs text-slate-400">
                      Yazı Rengi
                    </span>
                  </div>

                  <Slider
                    label="Yazı Boyutu"
                    value={current.fontSize}
                    min={12}
                    max={150}
                    onChange={(fontSize) =>
                      updateClip({ fontSize })
                    }
                  />
                </Section>
              )}

              {panel === "transform" && (
                <>
                  <Section title="Konum ve Boyut">
                    <Slider
                      label="Yatay Konum"
                      value={current.x}
                      onChange={(x) => updateClip({ x })}
                    />

                    <Slider
                      label="Dikey Konum"
                      value={current.y}
                      onChange={(y) => updateClip({ y })}
                    />

                    <Slider
                      label="Ölçek"
                      value={current.scale}
                      min={10}
                      max={300}
                      suffix="%"
                      onChange={(scale) =>
                        updateClip({ scale })
                      }
                    />

                    <Slider
                      label="Döndürme"
                      value={current.rotation}
                      min={-180}
                      max={180}
                      suffix="°"
                      onChange={(rotation) =>
                        updateClip({ rotation })
                      }
                    />

                    <Slider
                      label="Opaklık"
                      value={current.opacity}
                      suffix="%"
                      onChange={(opacity) =>
                        updateClip({ opacity })
                      }
                    />

                    <button
                      className={`${btn} w-full`}
                      onClick={() =>
                        updateClip({
                          x: 50,
                          y: 50,
                          scale: 100,
                          rotation: 0,
                          opacity: 100,
                        })
                      }
                    >
                      <RotateCcw size={14} />
                      Dönüşümü Sıfırla
                    </button>
                  </Section>

                  {current.kind === "video" && (
                    <Section title="Görüntü Kırpma">
                      {(
                        [
                          ["cropL", "Sol"],
                          ["cropR", "Sağ"],
                          ["cropT", "Üst"],
                          ["cropB", "Alt"],
                        ] as const
                      ).map(([key, label]) => (
                        <Slider
                          key={key}
                          label={label}
                          value={current[key]}
                          max={80}
                          suffix="%"
                          onChange={(value) =>
                            updateClip({ [key]: value })
                          }
                        />
                      ))}
                    </Section>
                  )}
                </>
              )}

              {panel === "color" && current.kind === "video" && (
                <Section title="Profesyonel Renk Ayarları">
                  <Slider
                    label="Parlaklık"
                    value={current.brightness}
                    min={0}
                    max={200}
                    suffix="%"
                    onChange={(brightness) =>
                      updateClip({ brightness })
                    }
                  />

                  <Slider
                    label="Kontrast"
                    value={current.contrast}
                    min={0}
                    max={200}
                    suffix="%"
                    onChange={(contrast) =>
                      updateClip({ contrast })
                    }
                  />

                  <Slider
                    label="Doygunluk"
                    value={current.saturation}
                    min={0}
                    max={250}
                    suffix="%"
                    onChange={(saturation) =>
                      updateClip({ saturation })
                    }
                  />

                  <Slider
                    label="Renk Tonu"
                    value={current.hue}
                    min={-180}
                    max={180}
                    suffix="°"
                    onChange={(hue) =>
                      updateClip({ hue })
                    }
                  />

                  <button
                    className={`${btn} w-full`}
                    onClick={() =>
                      updateClip({
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        hue: 0,
                      })
                    }
                  >
                    <RotateCcw size={14} />
                    Renkleri Sıfırla
                  </button>
                </Section>
              )}

              {panel === "chroma" && current.kind === "video" && (
                <Section title="Chroma Key / Yeşil Ekran">
                  <label className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs">
                    Anahtarlamayı Etkinleştir
                    <input
                      type="checkbox"
                      checked={current.chroma}
                      onChange={(e) =>
                        updateClip({
                          chroma: e.target.checked,
                        })
                      }
                      className="accent-violet-500"
                    />
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      className={btn}
                      onClick={() =>
                        updateClip({
                          chroma: true,
                          keyColor: "#00ff00",
                        })
                      }
                    >
                      <span className="h-3 w-3 rounded-full bg-green-500" />
                      Yeşil
                    </button>

                    <button
                      className={btn}
                      onClick={() =>
                        updateClip({
                          chroma: true,
                          keyColor: "#0000ff",
                        })
                      }
                    >
                      <span className="h-3 w-3 rounded-full bg-blue-500" />
                      Mavi
                    </button>

                    <label className={`${btn} cursor-pointer`}>
                      <input
                        type="color"
                        value={current.keyColor}
                        onChange={(e) =>
                          updateClip({
                            chroma: true,
                            keyColor: e.target.value,
                          })
                        }
                        className="h-5 w-6 cursor-pointer"
                      />
                    </label>
                  </div>

                  <Slider
                    label="Renk Toleransı"
                    value={current.tolerance}
                    min={0}
                    max={100}
                    onChange={(tolerance) =>
                      updateClip({ tolerance })
                    }
                  />

                  <Slider
                    label="Kenar Yumuşatma"
                    value={current.softness}
                    min={1}
                    max={100}
                    onChange={(softness) =>
                      updateClip({ softness })
                    }
                  />

                  <Slider
                    label="Renk Taşmasını Azalt"
                    value={current.spill}
                    min={0}
                    max={100}
                    onChange={(spill) =>
                      updateClip({ spill })
                    }
                  />

                  <p className="rounded-lg bg-violet-500/10 p-3 text-[11px] leading-relaxed text-violet-200">
                    Önce yeşil veya mavi anahtarı seç.
                    Ardından toleransı artırarak arka planı
                    kaldır. Kenarlarda renk kalırsa yumuşatma
                    ve renk taşması ayarlarını kullan.
                  </p>
                </Section>
              )}

              {panel === "audio" && current.kind !== "text" && (
                <Section title="Ses Mikseri">
                  <Slider
                    label="Ses Seviyesi"
                    value={current.volume}
                    suffix="%"
                    onChange={(volume) =>
                      updateClip({ volume })
                    }
                  />

                  <Slider
                    label="Fade In"
                    value={current.fadeIn}
                    min={0}
                    max={Math.min(10, current.duration)}
                    step={0.1}
                    suffix="s"
                    onChange={(fadeIn) =>
                      updateClip({ fadeIn })
                    }
                  />

                  <Slider
                    label="Fade Out"
                    value={current.fadeOut}
                    min={0}
                    max={Math.min(10, current.duration)}
                    step={0.1}
                    suffix="s"
                    onChange={(fadeOut) =>
                      updateClip({ fadeOut })
                    }
                  />

                  <Slider
                    label="Oynatma Hızı"
                    value={current.speed}
                    min={0.25}
                    max={3}
                    step={0.05}
                    suffix="x"
                    onChange={(speed) =>
                      updateClip({ speed })
                    }
                  />
                </Section>
              )}

              {panel === "transition" && (
                <Section title="Geçiş Düzenleyici">
                  <select
                    className={input}
                    value={current.transition}
                    onChange={(e) =>
                      updateClip({
                        transition: e.target.value as Transition,
                      })
                    }
                  >
                    {transitions.map((item) => (
                      <option
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </option>
                    ))}
                  </select>

                  <Slider
                    label="Geçiş Süresi"
                    value={current.transitionDuration}
                    min={0.1}
                    max={Math.min(3, current.duration / 2)}
                    step={0.1}
                    suffix="s"
                    onChange={(transitionDuration) =>
                      updateClip({ transitionDuration })
                    }
                  />
                </Section>
              )}

              <Section title="Klip Zamanlaması">
                <label className="block space-y-1 text-[11px] text-slate-400">
                  Başlangıç
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className={input}
                    value={Number(current.start.toFixed(2))}
                    onChange={(e) =>
                      updateClip({
                        start: Math.max(0, Number(e.target.value)),
                      })
                    }
                  />
                </label>

                <label className="block space-y-1 text-[11px] text-slate-400">
                  Süre
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    className={input}
                    value={Number(current.duration.toFixed(2))}
                    onChange={(e) =>
                      updateClip({
                        duration: Math.max(
                          0.1,
                          Number(e.target.value)
                        ),
                      })
                    }
                  />
                </label>

                <label className="block space-y-1 text-[11px] text-slate-400">
                  Kaynak Giriş Noktası
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    className={input}
                    value={Number(current.inPoint.toFixed(2))}
                    onChange={(e) =>
                      updateClip({
                        inPoint: Math.max(
                          0,
                          Number(e.target.value)
                        ),
                      })
                    }
                  />
                </label>
              </Section>
            </div>
          </aside>
        )}
      </div>

      {/* TIMELINE */}
      <section className="border-t border-white/10 bg-[#141a28]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Layers size={17} className="text-violet-400" />

            <h2 className="text-xs font-bold tracking-wide">
              TIMELINE
            </h2>

            <span className="rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400">
              {clips.length} klip
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={btn}
              onClick={() => setZoom((old) => Math.max(20, old - 10))}
            >
              <ZoomOut size={15} />
            </button>

            <span className="w-12 text-center font-mono text-[11px] text-slate-400">
              {Math.round(zoom)}x
            </span>

            <button
              className={btn}
              onClick={() => setZoom((old) => Math.min(160, old + 10))}
            >
              <ZoomIn size={15} />
            </button>
          </div>
        </div>

        <div className="flex">
          {/* TRACK LABELS */}
          <div className="z-10 w-24 shrink-0 border-r border-white/10 bg-[#1b2232]">
            <div className="flex h-8 items-center justify-center border-b border-white/10 text-[10px] text-slate-500">
              KANALLAR
            </div>

            {tracks.map((track) => (
              <div
                key={track.id}
                className="flex h-16 flex-col justify-center gap-1 border-b border-white/10 px-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold">
                    {track.name}
                  </span>

                  <button
                    onClick={() =>
                      updateTrack(track.id, {
                        locked: !track.locked,
                      })
                    }
                    title={track.locked ? "Kilidi aç" : "Kilitle"}
                  >
                    {track.locked ? (
                      <Lock size={12} className="text-amber-400" />
                    ) : (
                      <Unlock
                        size={12}
                        className="text-slate-500"
                      />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      updateTrack(track.id, {
                        hidden: !track.hidden,
                      })
                    }
                    title="Görünürlük"
                  >
                    {track.hidden ? (
                      <EyeOff
                        size={12}
                        className="text-red-400"
                      />
                    ) : (
                      <Eye
                        size={12}
                        className="text-slate-400"
                      />
                    )}
                  </button>

                  <button
                    onClick={() =>
                      updateTrack(track.id, {
                        muted: !track.muted,
                      })
                    }
                    title="Sesi aç/kapat"
                  >
                    {track.muted ? (
                      <VolumeX
                        size={12}
                        className="text-red-400"
                      />
                    ) : (
                      <Volume2
                        size={12}
                        className="text-slate-400"
                      />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* TIMELINE CONTENT */}
          <div
            ref={timelineRef}
            className="min-w-0 flex-1 overflow-x-auto"
          >
            <div
              className="relative"
              style={{ width: timelineWidth }}
            >
              {/* RULER */}
              <div
                className="relative h-8 cursor-crosshair border-b border-white/10 bg-[#20283a]"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  scrub(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) scrub(e);
                }}
              >
                {Array.from(
                  {
                    length: Math.ceil(timelineWidth / px / 2) + 1,
                  },
                  (_, index) => index * 2
                ).map((second) => (
                  <div
                    key={second}
                    className="absolute bottom-0 border-l border-white/20 pl-1 text-[9px] text-slate-400"
                    style={{
                      left: second * px,
                      height: 19,
                    }}
                  >
                    {fmt(second)}
                  </div>
                ))}
              </div>

              {/* TRACKS */}
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className="relative h-16 border-b border-white/10 bg-[#171d2b]"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(255,255,255,.035) 1px, transparent 1px)",
                    backgroundSize: `${px}px 100%`,
                  }}
                  onClick={() => setSelected(null)}
                >
                  {clips
                    .filter((clip) => clip.track === track.id)
                    .map((clip) => {
                      const item = clip.mediaId
                        ? mediaMap.get(clip.mediaId)
                        : undefined;

                      const isSelected = selected === clip.id;

                      return (
                        <div
                          key={clip.id}
                          onPointerDown={(e) =>
                            handleClipPointerDown(e, clip)
                          }
                          onPointerMove={handleClipPointerMove}
                          onPointerUp={handleClipPointerUp}
                          onPointerCancel={handleClipPointerUp}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setSelected(clip.id);
                            setPanel("transform");
                            setInspector(true);
                          }}
                          className={`absolute top-2 h-12 cursor-grab touch-none overflow-hidden rounded-md border-2 transition-colors active:cursor-grabbing ${
                            isSelected
                              ? "border-white shadow-[0_0_0_2px_rgba(139,92,246,.5)]"
                              : "border-white/10 hover:border-white/40"
                          }`}
                          style={{
                            left: clip.start * px,
                            width: Math.max(
                              20,
                              clip.duration * px
                            ),
                            backgroundColor: clipColors[clip.kind],
                            opacity: track.hidden ? 0.35 : 1,
                          }}
                        >
                          {clip.kind === "audio" && (
                            <Waveform values={item?.waveform} />
                          )}

                          <div className="pointer-events-none relative z-10 flex h-full items-start gap-1 overflow-hidden px-2 pt-1">
                            {clip.kind === "video" ? (
                              <Film size={12} />
                            ) : clip.kind === "audio" ? (
                              <Music2 size={12} />
                            ) : (
                              <Type size={12} />
                            )}

                            <span className="truncate text-[10px] font-semibold">
                              {clip.name}
                            </span>
                          </div>

                          {clip.transition !== "none" && (
                            <div className="pointer-events-none absolute bottom-0 left-0 h-2 w-8 bg-gradient-to-r from-white/70 to-transparent" />
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}

              {/* PLAYHEAD */}
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-20 w-[2px] bg-red-500"
                style={{
                  left: time * px,
                }}
              >
                <div className="absolute -left-[6px] top-0 h-0 w-0 border-l-[7px] border-r-[7px] border-t-[10px] border-l-transparent border-r-transparent border-t-red-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
          <span className="text-[11px] text-slate-400">
            Tek tık: Seç • Çift tık: Düzenle • Sürükle: Taşı
          </span>

          <span className="font-mono text-[11px] text-violet-300">
            {fmtPrecise(time)} / {fmtPrecise(total)}
          </span>
        </div>
      </section>

      {/* HIDDEN INPUTS */}
      <input
        ref={fileRef}
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
        ref={projectRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={importProject}
      />

      {/* EXPORT MODAL */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md space-y-5 rounded-2xl border border-white/10 bg-[#1a2030] p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">
                  Videoyu Dışa Aktar
                </h2>
                <p className="text-xs text-slate-400">
                  HAGY Editor Pro
                </p>
              </div>

              <button onClick={() => setExportOpen(false)}>
                <X size={19} />
              </button>
            </div>

            <label className="block space-y-2 text-xs">
              <span className="text-slate-400">
                Video Oranı
              </span>

              <select
                className={input}
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
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

            <label className="block space-y-2 text-xs">
              <span className="text-slate-400">
                Çözünürlük
              </span>

              <select
                className={input}
                value={resolution}
                onChange={(e) =>
                  setResolution(Number(e.target.value))
                }
              >
                <option value={720}>720p HD</option>
                <option value={1080}>1080p Full HD</option>
              </select>
            </label>

            <label className="block space-y-2 text-xs">
              <span className="text-slate-400">
                Kare Hızı
              </span>

              <select
                className={input}
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

            <div className="rounded-xl bg-white/5 p-3 text-[11px] leading-relaxed text-slate-400">
              Dışa aktarma gerçek zamanlıdır. Dosya biçimi
              tarayıcı desteğine göre MP4 veya WebM olabilir.
              Uzun videolarda sekmeyi açık tut.
            </div>

            <button
              className={`${primary} w-full py-3`}
              onClick={() => void exportVideo()}
            >
              <Download size={16} />
              Videoyu Oluştur
            </button>
          </div>
        </div>
      )}

      {/* EXPORT PROGRESS */}
      {exporting && (
        <div className="fixed bottom-5 right-5 z-50 w-72 rounded-xl border border-violet-400/30 bg-[#1c2334] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between text-xs">
            <span>Video Oluşturuluyor</span>
            <span className="font-mono text-violet-300">
              %{progress}
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-violet-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </main>
  );
}
