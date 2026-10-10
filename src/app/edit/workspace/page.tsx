
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
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
  Layers,
} from "lucide-react";
import MemeSounds from "../MemeSounds";

/* ---------------- TYPES ---------------- */

type Transition = "none" | "fade" | "flash";

type Segment = {
  id: string;
  start: number;
  end: number;
  transition: Transition;
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

type VideoLayer = {
  id: string;
  name: string;
  url: string;
  sourceDuration: number;
  start: number;
  trimStart: number;
  duration: number;
  position: "front" | "back";
  x: number;
  y: number;
  scale: number;
  cropLeft: number;
  cropRight: number;
  cropTop: number;
  cropBottom: number;
  chroma: boolean;
  chromaThreshold: number;
  volume: number;
};

type MainLayout = {
  x: number;
  y: number;
  scale: number;
  chroma: boolean;
  threshold: number;
};

type Tool =
  | "media"
  | "layers"
  | "audio"
  | "text"
  | "effects"
  | "settings";

const uid = () => crypto.randomUUID();

const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));

const fmt = (n: number) => {
  const t = Math.floor(Math.max(0, n || 0));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(
    t % 60
  ).padStart(2, "0")}`;
};

const btn =
  "rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15 disabled:opacity-40";

const primary =
  "rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-40";

const panel =
  "space-y-3 rounded-xl border border-white/10 bg-white/5 p-3";

const field =
  "mt-1 w-full rounded-lg border border-white/10 bg-[#25293b] p-2 text-sm text-white";

const defaultMain: MainLayout = {
  x: 50,
  y: 50,
  scale: 100,
  chroma: false,
  threshold: 85,
};

/* ---------------- DRAWING ---------------- */

function transitionOverlay(
  ctx: CanvasRenderingContext2D,
  time: number,
  segments: Segment[],
  width: number,
  height: number
) {
  let boundary = 0;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    boundary += segment.end - segment.start;

    if (segment.transition === "none") continue;

    const next = segments[i + 1];

    const half = Math.min(
      0.25,
      (segment.end - segment.start) / 2,
      (next.end - next.start) / 2
    );

    if (half <= 0 || Math.abs(time - boundary) > half) {
      continue;
    }

    const alpha = 1 - Math.abs(time - boundary) / half;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle =
      segment.transition === "flash" ? "#ffffff" : "#000000";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    break;
  }
}

function drawVideo(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  options: {
    x: number;
    y: number;
    scale: number;
    cropLeft: number;
    cropRight: number;
    cropTop: number;
    cropBottom: number;
    chroma: boolean;
    threshold: number;
    filter?: string;
  }
) {
  if (
    video.readyState < 2 ||
    !video.videoWidth ||
    !video.videoHeight
  ) {
    return;
  }

  const vw = video.videoWidth;
  const vh = video.videoHeight;

  const left = clamp(options.cropLeft, 0, 90) / 100;
  const right = clamp(options.cropRight, 0, 90) / 100;
  const top = clamp(options.cropTop, 0, 90) / 100;
  const bottom = clamp(options.cropBottom, 0, 90) / 100;

  const sx = vw * left;
  const sy = vh * top;

  const sw = Math.max(1, vw * (1 - left - right));
  const sh = Math.max(1, vh * (1 - top - bottom));

  const factor = Math.min(width / sw, height / sh);
  const scale = options.scale / 100;

  const dw = sw * factor * scale;
  const dh = sh * factor * scale;

  const dx = (options.x / 100) * width - dw / 2;
  const dy = (options.y / 100) * height - dh / 2;

  if (options.chroma) {
    const buffer = document.createElement("canvas");

    const processingScale = Math.min(1, 640 / Math.max(sw, sh));
    buffer.width = Math.max(1, Math.round(sw * processingScale));
    buffer.height = Math.max(1, Math.round(sh * processingScale));

    const bctx = buffer.getContext("2d", {
      willReadFrequently: true,
    });

    if (!bctx) return;

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

      const data = image.data;
      const threshold = options.threshold;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const greenDifference = g - Math.max(r, b);

        if (greenDifference > threshold * 0.6) {
          const alpha = clamp(
            (greenDifference - threshold * 0.6) / 35,
            0,
            1
          );

          data[i + 3] = Math.round(
            data[i + 3] * (1 - alpha)
          );
        }
      }

      bctx.putImageData(image, 0, 0);

      ctx.drawImage(buffer, dx, dy, dw, dh);
    } catch {
      ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    }
  } else {
    ctx.save();
    ctx.filter = options.filter || "none";
    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh);
    ctx.restore();
  }
}

function drawComposition(
  canvas: HTMLCanvasElement,
  mainVideo: HTMLVideoElement | null,
  layerVideo: HTMLVideoElement | null,
  time: number,
  segments: Segment[],
  layer: VideoLayer | null,
  main: MainLayout,
  texts: TextClip[],
  filter: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = "#090909";
  ctx.fillRect(0, 0, w, h);

  const layerActive =
    layer !== null &&
    time >= layer.start &&
    time < layer.start + layer.duration;

  const drawLayer = () => {
    if (!layerActive || !layerVideo || !layer) return;

    drawVideo(ctx, layerVideo, w, h, {
      x: layer.x,
      y: layer.y,
      scale: layer.scale,
      cropLeft: layer.cropLeft,
      cropRight: layer.cropRight,
      cropTop: layer.cropTop,
      cropBottom: layer.cropBottom,
      chroma: layer.chroma,
      threshold: layer.chromaThreshold,
    });
  };

  if (layer?.position === "back") drawLayer();

  if (mainVideo) {
    drawVideo(ctx, mainVideo, w, h, {
      ...main,
      cropLeft: 0,
      cropRight: 0,
      cropTop: 0,
      cropBottom: 0,
      threshold: main.threshold,
      filter,
    });
  }

  if (layer?.position === "front") drawLayer();

  for (const text of texts) {
    if (
      time < text.start ||
      time >= text.start + text.duration
    ) {
      continue;
    }

    ctx.save();
    ctx.font = `bold ${Math.round(
      (text.size / 720) * w
    )}px Arial`;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = text.color;
    ctx.shadowColor = "#000000";
    ctx.shadowBlur = 8;

    ctx.fillText(
      text.text,
      (text.x / 100) * w,
      (text.y / 100) * h,
      w * 0.9
    );

    ctx.restore();
  }

  transitionOverlay(ctx, time, segments, w, h);
}

function waitForMetadata(video: HTMLVideoElement) {
  return new Promise<void>((resolve, reject) => {
    if (video.readyState >= 1) {
      resolve();
      return;
    }

    video.addEventListener("loadedmetadata", () => resolve(), {
      once: true,
    });

    video.addEventListener(
      "error",
      () => reject(new Error("Video dosyası açılamadı.")),
      { once: true }
    );
  });
}

function seekVideo(video: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    if (Math.abs(video.currentTime - time) < 0.02) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      reject(new Error("Video konumlandırma zaman aşımı."));
    }, 12000);

    video.addEventListener(
      "seeked",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true }
    );

    video.currentTime = time;
  });
}

/* ---------------- EDITOR ---------------- */

export default function WorkspacePage() {
  const mainVideoRef = useRef<HTMLVideoElement>(null);
  const layerVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const mainInput = useRef<HTMLInputElement>(null);
  const layerInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  const urls = useRef<string[]>([]);
  const audioPlayers = useRef<Map<string, HTMLAudioElement>>(
    new Map()
  );

  const segmentIndex = useRef(0);
  const scrubActive = useRef(false);

  const drag = useRef<{
    kind: "audio" | "text" | "layer";
    id: string;
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

  const [layer, setLayer] = useState<VideoLayer | null>(null);
  const [mainLayout, setMainLayout] =
    useState<MainLayout>(defaultMain);

  const [audios, setAudios] = useState<AudioClip[]>([]);
  const [texts, setTexts] = useState<TextClip[]>([]);

  const [filter, setFilter] = useState("none");
  const [mainVolume, setMainVolume] = useState(100);

  const [ratio, setRatio] = useState("9:16");
  const [quality, setQuality] = useState(720);
  const [fps, setFps] = useState(30);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const total = segments.reduce(
    (sum, s) => sum + s.end - s.start,
    0
  );

  const starts: number[] = [];
  let cumulative = 0;

  for (const segment of segments) {
    starts.push(cumulative);
    cumulative += segment.end - segment.start;
  }

  const boundaries = segments.map(
    (segment, i) => starts[i] + segment.end - segment.start
  );

  function dimensions(): [number, number] {
    if (ratio === "9:16") {
      return quality === 1080 ? [1080, 1920] : [720, 1280];
    }

    if (ratio === "1:1") {
      return quality === 1080 ? [1080, 1080] : [720, 720];
    }

    return quality === 1080 ? [1920, 1080] : [1280, 720];
  }

  useEffect(() => {
    return () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      audioPlayers.current.forEach((audio) => audio.pause());
    };
  }, []);

  useEffect(() => {
    if (mainVideoRef.current) {
      mainVideoRef.current.volume = mainVolume / 100;
    }
  }, [mainVolume, videoUrl]);

  useEffect(() => {
    const video = layerVideoRef.current;
    if (!video || !layer) return;

    video.volume = layer.volume / 100;

    const offset = time - layer.start;

    if (offset < 0 || offset >= layer.duration) {
      video.pause();
      return;
    }

    const target = layer.trimStart + offset;

    if (Math.abs(video.currentTime - target) > 0.3) {
      try {
        video.currentTime = target;
      } catch {}
    }

    if (playing) {
      if (video.paused) video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [time, playing, layer]);

  useEffect(() => {
    const activeIds = new Set(audios.map((a) => a.id));

    audioPlayers.current.forEach((player, id) => {
      if (!activeIds.has(id)) {
        player.pause();
        audioPlayers.current.delete(id);
      }
    });

    for (const clip of audios) {
      let player = audioPlayers.current.get(clip.id);

      if (!player) {
        player = new Audio(clip.url);
        audioPlayers.current.set(clip.id, player);
      }

      const offset = time - clip.start;

      if (
        !playing ||
        offset < 0 ||
        offset >= clip.duration
      ) {
        player.pause();
        continue;
      }

      player.volume = clip.volume / 100;

      if (
        player.readyState >= 1 &&
        Math.abs(player.currentTime - offset) > 0.3
      ) {
        try {
          player.currentTime = offset;
        } catch {}
      }

      if (player.paused) {
        player.play().catch(() => {});
      }
    }
  }, [time, playing, audios]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    drawComposition(
      canvas,
      mainVideoRef.current,
      layerVideoRef.current,
      time,
      segments,
      layer,
      mainLayout,
      texts,
      filter
    );
  }, [
    time,
    segments,
    layer,
    mainLayout,
    texts,
    filter,
    videoUrl,
  ]);

  function locate(projectTime: number) {
    const t = clamp(projectTime, 0, total);

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i];
      const length = s.end - s.start;

      if (
        t < starts[i] + length ||
        i === segments.length - 1
      ) {
        return {
          index: i,
          source: clamp(
            s.start + t - starts[i],
            s.start,
            s.end
          ),
        };
      }
    }

    return { index: 0, source: 0 };
  }

  function seek(t: number) {
    if (!segments.length) return;

    const target = clamp(t, 0, total);
    const found = locate(target);

    segmentIndex.current = found.index;

    if (mainVideoRef.current) {
      mainVideoRef.current.currentTime = found.source;
    }

    setTime(target);
  }

  function scrub(clientX: number) {
    const rect = timelineRef.current?.getBoundingClientRect();

    if (!rect || !total) return;

    seek(
      clamp(
        (clientX - rect.left) / rect.width,
        0,
        1
      ) * total
    );
  }

  function onMainTime() {
    const video = mainVideoRef.current;

    if (!video || !segments.length) return;

    const i = clamp(
      segmentIndex.current,
      0,
      segments.length - 1
    );

    const segment = segments[i];

    if (
      !video.paused &&
      video.currentTime >= segment.end - 0.035
    ) {
      if (i + 1 < segments.length) {
        segmentIndex.current = i + 1;
        video.currentTime = segments[i + 1].start;
        setTime(boundaries[i]);
      } else {
        video.pause();
        setTime(total);
      }

      return;
    }

    if (
      video.currentTime >= segment.start - 0.05 &&
      video.currentTime <= segment.end + 0.05
    ) {
      setTime(
        clamp(
          starts[i] + video.currentTime - segment.start,
          0,
          total
        )
      );
    }
  }

  async function togglePlay() {
    const video = mainVideoRef.current;
    if (!video || !segments.length) return;

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

  function uploadMain(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) return;

    mainVideoRef.current?.pause();
    layerVideoRef.current?.pause();

    const url = URL.createObjectURL(file);
    urls.current.push(url);

    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setSegments([]);
    setTime(0);
    setPlaying(false);
    setLayer(null);
    setAudios([]);
    setTexts([]);
    setMainLayout(defaultMain);

    segmentIndex.current = 0;
    e.target.value = "";
  }

  function uploadLayer(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file || !file.type.startsWith("video/")) return;

    const url = URL.createObjectURL(file);
    urls.current.push(url);

    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = url;

    probe.onloadedmetadata = () => {
      const d = probe.duration;

      if (!Number.isFinite(d) || d <= 0) return;

      setLayer({
        id: uid(),
        name: file.name,
        url,
        sourceDuration: d,
        start: Math.min(time, Math.max(0, total - 0.1)),
        trimStart: 0,
        duration: Math.min(
          d,
          Math.max(0.1, total - time)
        ),
        position: "front",
        x: 50,
        y: 50,
        scale: 60,
        cropLeft: 0,
        cropRight: 0,
        cropTop: 0,
        cropBottom: 0,
        chroma: false,
        chromaThreshold: 85,
        volume: 0,
      });

      setTool("layers");
    };

    e.target.value = "";
  }

  function split() {
    if (!segments.length) return;

    mainVideoRef.current?.pause();

    const found = locate(time);
    const segment = segments[found.index];

    if (
      found.source <= segment.start + 0.05 ||
      found.source >= segment.end - 0.05
    ) {
      setMessage("Kesmek için klibin içinden bir nokta seç.");
      return;
    }

    setSegments((old) => [
      ...old.slice(0, found.index),
      {
        ...segment,
        id: uid(),
        end: found.source,
        transition: "none",
      },
      {
        ...segment,
        id: uid(),
        start: found.source,
      },
      ...old.slice(found.index + 1),
    ]);

    setMessage("Klip kesildi.");
  }

  function deleteSegment(index: number) {
    mainVideoRef.current?.pause();

    const next = segments.filter((_, i) => i !== index);

    setSegments(next);
    segmentIndex.current = 0;
    setTime(0);

    if (next.length && mainVideoRef.current) {
      mainVideoRef.current.currentTime = next[0].start;
    }
  }

  function updateTransition(index: number, value: Transition) {
    setSegments((old) =>
      old.map((segment, i) =>
        i === index
          ? { ...segment, transition: value }
          : segment
      )
    );
  }

  function addSound(sound: Sound) {
    if (!total) {
      setMessage("Önce ana video yükle.");
      return;
    }

    const start = clamp(time, 0, Math.max(0, total - 0.1));

    setAudios((old) => [
      ...old,
      {
        id: uid(),
        name: sound.name,
        url: sound.url,
        start,
        duration: Math.min(
          sound.duration > 0 ? sound.duration : 5,
          total - start
        ),
        volume: 100,
      },
    ]);
  }

  function uploadAudio(e: ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach((file) => {
      if (!file.type.startsWith("audio/")) return;

      const url = URL.createObjectURL(file);
      urls.current.push(url);

      const probe = new Audio(url);

      probe.onloadedmetadata = () => {
        addSound({
          id: uid(),
          name: file.name,
          url,
          duration: probe.duration,
          source: "local",
          category: "custom",
        });
      };
    });

    e.target.value = "";
  }

  function deleteAudio(id: string) {
    audioPlayers.current.get(id)?.pause();
    audioPlayers.current.delete(id);

    setAudios((old) => old.filter((a) => a.id !== id));
  }

  function addText() {
    if (!total) return;

    setTexts((old) => [
      ...old,
      {
        id: uid(),
        text: "Yeni Metin",
        start: Math.min(time, Math.max(0, total - 0.1)),
        duration: Math.min(
          3,
          Math.max(0.1, total - time)
        ),
        x: 50,
        y: 50,
        size: 36,
        color: "#ffffff",
      },
    ]);
  }

  function startDrag(
    e: ReactPointerEvent<HTMLDivElement>,
    kind: "audio" | "text" | "layer",
    id: string,
    start: number
  ) {
    if ((e.target as HTMLElement).closest("button")) return;

    drag.current = {
      kind,
      id,
      startX: e.clientX,
      originalStart: start,
    };

    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function moveDrag(e: ReactPointerEvent<HTMLDivElement>) {
    const current = drag.current;
    const rect = timelineRef.current?.getBoundingClientRect();

    if (!current || !rect || !total) return;

    const delta =
      ((e.clientX - current.startX) / rect.width) * total;

    if (current.kind === "audio") {
      setAudios((old) =>
        old.map((clip) =>
          clip.id === current.id
            ? {
                ...clip,
                start: clamp(
                  current.originalStart + delta,
                  0,
                  Math.max(0, total - clip.duration)
                ),
              }
            : clip
        )
      );
    }

    if (current.kind === "text") {
      setTexts((old) =>
        old.map((clip) =>
          clip.id === current.id
            ? {
                ...clip,
                start: clamp(
                  current.originalStart + delta,
                  0,
                  Math.max(0, total - clip.duration)
                ),
              }
            : clip
        )
      );
    }

    if (current.kind === "layer") {
      setLayer((old) =>
        old
          ? {
              ...old,
              start: clamp(
                current.originalStart + delta,
                0,
                Math.max(0, total - old.duration)
              ),
            }
          : null
      );
    }
  }

  function updateLayer(changes: Partial<VideoLayer>) {
    setLayer((old) =>
      old ? { ...old, ...changes } : null
    );
  }

  /* ---------------- EXPORT ---------------- */

  async function exportVideo() {
    if (!videoUrl || !segments.length || exporting) return;

    if (
      typeof MediaRecorder === "undefined" ||
      !HTMLCanvasElement.prototype.captureStream
    ) {
      setMessage("Tarayıcın video kaydını desteklemiyor.");
      return;
    }

    mainVideoRef.current?.pause();
    layerVideoRef.current?.pause();

    setExportOpen(false);
    setExporting(true);
    setProgress(0);
    setMessage("");

    const source = document.createElement("video");
    source.src = videoUrl;
    source.preload = "auto";
    source.playsInline = true;

    const overlay = layer
      ? document.createElement("video")
      : null;

    if (overlay && layer) {
      overlay.src = layer.url;
      overlay.preload = "auto";
      overlay.playsInline = true;
    }

    const canvas = document.createElement("canvas");
    const [w, h] = dimensions();

    canvas.width = w;
    canvas.height = h;

    let context: AudioContext | null = null;
    let recorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;
    let frame = 0;

    const audioElements: {
      element: HTMLAudioElement;
      clip: AudioClip;
    }[] = [];

    let exportTime = 0;

    try {
      await waitForMetadata(source);

      if (overlay) {
        await waitForMetadata(overlay);
      }

      context = new AudioContext();

      const destination =
        context.createMediaStreamDestination();

      const mainNode =
        context.createMediaElementSource(source);

      const mainGain = context.createGain();
      mainGain.gain.value = mainVolume / 100;

      mainNode.connect(mainGain);
      mainGain.connect(destination);

      if (overlay && layer) {
        const node =
          context.createMediaElementSource(overlay);

        const gain = context.createGain();
        gain.gain.value = layer.volume / 100;

        node.connect(gain);
        gain.connect(destination);
      }

      for (const clip of audios) {
        const audio = new Audio();

        // Remote meme sesleri için sunucuda CORS izni gerekir.
        audio.crossOrigin = "anonymous";
        audio.src = clip.url;
        audio.preload = "auto";

        const node =
          context.createMediaElementSource(audio);

        const gain = context.createGain();
        gain.gain.value = clip.volume / 100;

        node.connect(gain);
        gain.connect(destination);

        audioElements.push({
          element: audio,
          clip,
        });
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
        throw new Error("Uygun video formatı bulunamadı.");
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

      const finished = new Promise<void>((resolve, reject) => {
        recorder!.onstop = () => resolve();
        recorder!.onerror = () =>
          reject(new Error("Video kaydı başarısız."));
      });

      const render = () => {
        drawComposition(
          canvas,
          source,
          overlay,
          exportTime,
          segments,
          layer,
          mainLayout,
          texts,
          filter
        );

        frame = requestAnimationFrame(render);
      };

      await context.resume();

      // Kayda başlamadan önce ilk kareyi hazırla.
      await seekVideo(source, segments[0].start);

      if (overlay && layer) {
        await seekVideo(overlay, layer.trimStart);
      }

      drawComposition(
        canvas,
        source,
        overlay,
        0,
        segments,
        layer,
        mainLayout,
        texts,
        filter
      );

      recorder.start(250);
      render();

      let completed = 0;

      for (const segment of segments) {
        source.pause();

        await seekVideo(source, segment.start);

        const segmentLength = segment.end - segment.start;

        await source.play();

        const started = performance.now();

        await new Promise<void>((resolve) => {
          const interval = window.setInterval(() => {
            const elapsed =
              (performance.now() - started) / 1000;

            exportTime = Math.min(
              total,
              completed + Math.min(elapsed, segmentLength)
            );

            // İkinci video katmanı
            if (overlay && layer) {
              const offset = exportTime - layer.start;

              const active =
                offset >= 0 && offset < layer.duration;

              if (active) {
                const target = layer.trimStart + offset;

                if (
                  Math.abs(overlay.currentTime - target) > 0.35
                ) {
                  try {
                    overlay.currentTime = target;
                  } catch {}
                }

                if (overlay.paused) {
                  overlay.play().catch(() => {});
                }
              } else {
                overlay.pause();
              }
            }

            // Ses efektleri
            for (const item of audioElements) {
              const offset =
                exportTime - item.clip.start;

              const active =
                offset >= 0 &&
                offset < item.clip.duration;

              if (!active) {
                item.element.pause();
                continue;
              }

              if (
                item.element.readyState >= 2 &&
                Math.abs(
                  item.element.currentTime - offset
                ) > 0.35
              ) {
                try {
                  item.element.currentTime = offset;
                } catch {}
              }

              if (item.element.paused) {
                item.element.play().catch(() => {});
              }
            }

            setProgress(
              Math.min(
                100,
                Math.round((exportTime / total) * 100)
              )
            );

            if (
              elapsed >= segmentLength ||
              source.ended
            ) {
              clearInterval(interval);
              source.pause();
              resolve();
            }
          }, 30);
        });

        completed += segmentLength;
      }

      exportTime = total;

      drawComposition(
        canvas,
        source,
        overlay,
        exportTime,
        segments,
        layer,
        mainLayout,
        texts,
        filter
      );

      recorder.stop();
      await finished;

      const blob = new Blob(chunks, { type: mime });

      if (!blob.size) {
        throw new Error("Video dosyası boş oluşturuldu.");
      }

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = `HAGY-Editor-${quality}p-${fps}fps.${
        mime.includes("mp4") ? "mp4" : "webm"
      }`;

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 60000);

      setMessage("Video oluşturuldu ve indirildi.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Dışa aktarma sırasında hata oluştu."
      );
    } finally {
      if (recorder?.state === "recording") {
        recorder.stop();
      }

      cancelAnimationFrame(frame);
      source.pause();
      overlay?.pause();

      audioElements.forEach((item) =>
        item.element.pause()
      );

      stream?.getTracks().forEach((track) =>
        track.stop()
      );

      await context?.close().catch(() => {});

      setExporting(false);
      setProgress(0);
    }
  }

  /* ---------------- UI ---------------- */

  const menu = [
    { id: "media", name: "Medya", Icon: Film },
    { id: "layers", name: "Katman", Icon: Layers },
    { id: "audio", name: "Sesler", Icon: Music2 },
    { id: "text", name: "Metin", Icon: Type },
    { id: "effects", name: "Efektler", Icon: Sparkles },
    { id: "settings", name: "Ayarlar", Icon: Settings2 },
  ] as const;

  return (
    <main className="min-h-screen bg-[#090b12] text-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#131624] p-4">
        <div className="flex items-center gap-3">
          <Link href="/" className={btn}>
            <ArrowLeft size={18} />
          </Link>

          <Clapperboard className="text-violet-400" />

          <div>
            <h1 className="font-bold">HAGY EDITOR PRO</h1>
            <p className="text-xs text-white/40">
              {videoName || "Yeni Proje"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className={btn}
            onClick={() => mainInput.current?.click()}
          >
            <Upload size={15} className="mr-1 inline" />
            Video Yükle
          </button>

          <button
            className={primary}
            disabled={!total || exporting}
            onClick={() => setExportOpen(true)}
          >
            <Download size={15} className="mr-1 inline" />
            {exporting
              ? `%${progress}`
              : "Dışa Aktar"}
          </button>
        </div>
      </header>

      <input
        ref={mainInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={uploadMain}
      />

      <input
        ref={layerInput}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={uploadLayer}
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
        {/* LEFT MENU */}
        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#141725] p-2 lg:w-24 lg:flex-col lg:border-r">
          {menu.map(({ id, name, Icon }) => (
            <button
              key={id}
              onClick={() => setTool(id)}
              className={`flex min-w-20 flex-col items-center gap-2 rounded-xl p-3 text-xs ${
                tool === id
                  ? "bg-violet-600/25 text-violet-300"
                  : "text-white/50 hover:bg-white/10"
              }`}
            >
              <Icon size={20} />
              {name}
            </button>
          ))}
        </nav>

        {/* CONTROL PANEL */}
        <aside className="w-full space-y-4 border-b border-white/10 bg-[#171a28] p-4 lg:max-h-[75vh] lg:w-80 lg:overflow-y-auto lg:border-r">
          {tool === "media" && (
            <>
              <h2 className="font-bold">Medya Kütüphanesi</h2>

              <button
                className={`${primary} w-full`}
                onClick={() => mainInput.current?.click()}
              >
                Ana Video Yükle
              </button>

              <button
                className={`${btn} w-full`}
                onClick={() => layerInput.current?.click()}
              >
                <Plus size={15} className="mr-1 inline" />
                İkinci Video Ekle
              </button>

              <div className={panel}>
                <p className="text-sm">
                  {videoName || "Video yüklenmedi"}
                </p>

                <p className="text-xs text-white/50">
                  Toplam: {fmt(total)}
                </p>
              </div>

              {segments.length > 1 && (
                <div className={panel}>
                  <h3 className="font-semibold">
                    Klip Geçişleri
                  </h3>

                  {segments.slice(0, -1).map((segment, i) => (
                    <label
                      key={segment.id}
                      className="block text-xs"
                    >
                      Klip {i + 1} → {i + 2}

                      <select
                        className={field}
                        value={segment.transition}
                        onChange={(e) =>
                          updateTransition(
                            i,
                            e.target.value as Transition
                          )
                        }
                      >
                        <option value="none">
                          Geçiş Yok
                        </option>
                        <option value="fade">
                          Karartma
                        </option>
                        <option value="flash">
                          Beyaz Flaş
                        </option>
                      </select>

                      <button
                        className={`${btn} mt-2 w-full`}
                        onClick={() => {
                          seek(boundaries[i]);
                          setTool("audio");
                        }}
                      >
                        Bu Noktaya Ses Ekle
                      </button>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {tool === "layers" && (
            <>
              <h2 className="font-bold">
                Çok Katmanlı Video
              </h2>

              <div className={panel}>
                <h3 className="font-semibold">
                  Ana Video
                </h3>

                {(
                  [
                    ["scale", "Boyut", 10, 200],
                    ["x", "Yatay Konum", 0, 100],
                    ["y", "Dikey Konum", 0, 100],
                  ] as const
                ).map(([key, name, min, max]) => (
                  <label key={key} className="block text-xs">
                    {name}: {mainLayout[key]}%

                    <input
                      className="w-full accent-violet-500"
                      type="range"
                      min={min}
                      max={max}
                      value={mainLayout[key]}
                      onChange={(e) =>
                        setMainLayout((old) => ({
                          ...old,
                          [key]: +e.target.value,
                        }))
                      }
                    />
                  </label>
                ))}

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={mainLayout.chroma}
                    onChange={(e) =>
                      setMainLayout((old) => ({
                        ...old,
                        chroma: e.target.checked,
                      }))
                    }
                  />
                  Ana Videoda Yeşil Ekran
                </label>

                {mainLayout.chroma && (
                  <label className="block text-xs">
                    Yeşil Ekran Hassasiyeti
                    <input
                      type="range"
                      min={10}
                      max={160}
                      value={mainLayout.threshold}
                      className="w-full"
                      onChange={(e) =>
                        setMainLayout((old) => ({
                          ...old,
                          threshold: +e.target.value,
                        }))
                      }
                    />
                  </label>
                )}

                <button
                  className={btn}
                  onClick={() => setMainLayout(defaultMain)}
                >
                  Ana Videoyu Sıfırla
                </button>
              </div>

              <button
                className={`${primary} w-full`}
                onClick={() => layerInput.current?.click()}
              >
                <Plus size={15} className="mr-1 inline" />
                {layer
                  ? "İkinci Videoyu Değiştir"
                  : "İkinci Video Ekle"}
              </button>

              {layer && (
                <div className={panel}>
                  <h3 className="break-all font-semibold">
                    {layer.name}
                  </h3>

                  <label className="block text-xs">
                    Katman Sırası

                    <select
                      className={field}
                      value={layer.position}
                      onChange={(e) =>
                        updateLayer({
                          position: e.target.value as
                            | "front"
                            | "back",
                        })
                      }
                    >
                      <option value="front">
                        Ana Videonun Önünde
                      </option>
                      <option value="back">
                        Ana Videonun Arkasında
                      </option>
                    </select>
                  </label>

                  {(
                    [
                      ["start", "Başlangıç (sn)", 0, total],
                      [
                        "trimStart",
                        "Videonun İçinden Başlat (sn)",
                        0,
                        layer.sourceDuration,
                      ],
                      [
                        "duration",
                        "Görünme Süresi (sn)",
                        0.1,
                        Math.max(0.1, total),
                      ],
                      ["scale", "Boyut", 10, 200],
                      ["x", "Yatay Konum", 0, 100],
                      ["y", "Dikey Konum", 0, 100],
                      ["cropLeft", "Soldan Kırp", 0, 90],
                      ["cropRight", "Sağdan Kırp", 0, 90],
                      ["cropTop", "Üstten Kırp", 0, 90],
                      ["cropBottom", "Alttan Kırp", 0, 90],
                      ["volume", "Ses Seviyesi", 0, 100],
                    ] as const
                  ).map(([key, name, min, max]) => (
                    <label key={key} className="block text-xs">
                      {name}: {layer[key]}

                      <input
                        className="w-full accent-violet-500"
                        type="range"
                        min={min}
                        max={max}
                        step={
                          key === "start" ||
                          key === "trimStart" ||
                          key === "duration"
                            ? 0.1
                            : 1
                        }
                        value={layer[key]}
                        onChange={(e) => {
                          const value = +e.target.value;

                          if (key === "start") {
                            updateLayer({
                              start: Math.min(
                                value,
                                Math.max(
                                  0,
                                  total - layer.duration
                                )
                              ),
                            });
                          } else if (key === "trimStart") {
                            updateLayer({
                              trimStart: value,
                              duration: Math.min(
                                layer.duration,
                                Math.max(
                                  0.1,
                                  layer.sourceDuration - value
                                )
                              ),
                            });
                          } else if (key === "duration") {
                            updateLayer({
                              duration: Math.max(
                                0.1,
                                Math.min(
                                  value,
                                  total - layer.start,
                                  layer.sourceDuration -
                                    layer.trimStart
                                )
                              ),
                            });
                          } else {
                            updateLayer({
                              [key]: value,
                            });
                          }
                        }}
                      />
                    </label>
                  ))}

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={layer.chroma}
                      onChange={(e) =>
                        updateLayer({
                          chroma: e.target.checked,
                        })
                      }
                    />
                    Yeşil Ekranı Kaldır
                  </label>

                  {layer.chroma && (
                    <label className="block text-xs">
                      Hassasiyet: {layer.chromaThreshold}

                      <input
                        type="range"
                        min={10}
                        max={160}
                        className="w-full"
                        value={layer.chromaThreshold}
                        onChange={(e) =>
                          updateLayer({
                            chromaThreshold: +e.target.value,
                          })
                        }
                      />
                    </label>
                  )}

                  <button
                    className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-red-300"
                    onClick={() => {
                      layerVideoRef.current?.pause();
                      setLayer(null);
                    }}
                  >
                    <Trash2 size={15} />
                    İkinci Videoyu Sil
                  </button>
                </div>
              )}
            </>
          )}

          {tool === "audio" && (
            <>
              <h2 className="font-bold">
                Ses Efektleri
              </h2>

              <button
                className={`${btn} w-full`}
                onClick={() => audioInput.current?.click()}
              >
                <Plus size={15} className="mr-1 inline" />
                Ses Dosyası Ekle
              </button>

              <div className={panel}>
                <MemeSounds onAdd={addSound} />
              </div>

              {audios.map((clip) => (
                <div key={clip.id} className={panel}>
                  <p className="break-all text-sm">
                    {clip.name}
                  </p>

                  <label className="block text-xs">
                    Başlangıç: {clip.start.toFixed(1)} sn

                    <input
                      className="w-full"
                      type="range"
                      min={0}
                      max={Math.max(
                        0,
                        total - clip.duration
                      )}
                      step={0.1}
                      value={clip.start}
                      onChange={(e) =>
                        setAudios((old) =>
                          old.map((a) =>
                            a.id === clip.id
                              ? {
                                  ...a,
                                  start: +e.target.value,
                                }
                              : a
                          )
                        )
                      }
                    />
                  </label>

                  <label className="block text-xs">
                    Ses: %{clip.volume}

                    <input
                      className="w-full"
                      type="range"
                      min={0}
                      max={100}
                      value={clip.volume}
                      onChange={(e) =>
                        setAudios((old) =>
                          old.map((a) =>
                            a.id === clip.id
                              ? {
                                  ...a,
                                  volume: +e.target.value,
                                }
                              : a
                          )
                        )
                      }
                    />
                  </label>

                  <button
                    className="flex items-center gap-2 rounded-lg bg-red-600/20 px-3 py-2 text-sm text-red-300"
                    onClick={() => deleteAudio(clip.id)}
                  >
                    <Trash2 size={15} />
                    Sesi Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "text" && (
            <>
              <h2 className="font-bold">
                Metin Katmanları
              </h2>

              <button
                className={`${primary} w-full`}
                onClick={addText}
              >
                <Plus size={15} className="mr-1 inline" />
                Metin Ekle
              </button>

              {texts.map((clip) => (
                <div key={clip.id} className={panel}>
                  <textarea
                    className={field}
                    rows={2}
                    value={clip.text}
                    onChange={(e) =>
                      setTexts((old) =>
                        old.map((t) =>
                          t.id === clip.id
                            ? {
                                ...t,
                                text: e.target.value,
                              }
                            : t
                        )
                      )
                    }
                  />

                  {(
                    [
                      ["start", "Başlangıç"],
                      ["duration", "Süre"],
                      ["x", "Yatay Konum"],
                      ["y", "Dikey Konum"],
                      ["size", "Yazı Boyutu"],
                    ] as const
                  ).map(([key, name]) => (
                    <label
                      key={key}
                      className="block text-xs"
                    >
                      {name}

                      <input
                        type="number"
                        step={0.1}
                        className={field}
                        value={clip[key]}
                        onChange={(e) =>
                          setTexts((old) =>
                            old.map((t) =>
                              t.id === clip.id
                                ? {
                                    ...t,
                                    [key]: +e.target.value,
                                  }
                                : t
                            )
                          )
                        }
                      />
                    </label>
                  ))}

                  <input
                    type="color"
                    value={clip.color}
                    onChange={(e) =>
                      setTexts((old) =>
                        old.map((t) =>
                          t.id === clip.id
                            ? {
                                ...t,
                                color: e.target.value,
                              }
                            : t
                        )
                      )
                    }
                  />

                  <button
                    className="flex items-center gap-2 text-sm text-red-300"
                    onClick={() =>
                      setTexts((old) =>
                        old.filter((t) => t.id !== clip.id)
                      )
                    }
                  >
                    <Trash2 size={15} />
                    Metni Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "effects" && (
            <>
              <h2 className="font-bold">
                Görüntü Efektleri
              </h2>

              {(
                [
                  ["Normal", "none"],
                  ["Siyah Beyaz", "grayscale(1)"],
                  ["Vintage", "sepia(.8)"],
                  ["Canlı", "saturate(1.8)"],
                  ["Kontrast", "contrast(1.5)"],
                  ["Parlak", "brightness(1.3)"],
                ] as const
              ).map(([name, value]) => (
                <button
                  key={name}
                  className={`${panel} block w-full text-left text-sm ${
                    filter === value
                      ? "border-violet-400"
                      : ""
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
              <h2 className="font-bold">
                Proje Ayarları
              </h2>

              <label className="block text-sm">
                Ana Video Sesi: %{mainVolume}

                <input
                  className="w-full"
                  type="range"
                  min={0}
                  max={100}
                  value={mainVolume}
                  onChange={(e) =>
                    setMainVolume(+e.target.value)
                  }
                />
              </label>

              <p className="text-xs text-white/50">
                Çözünürlük, video oranı ve FPS
                ayarlarını Dışa Aktar menüsünden
                değiştirebilirsin.
              </p>
            </>
          )}
        </aside>

        {/* PREVIEW */}
        <section className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-4 bg-[#0b0d16] p-4">
          {videoUrl ? (
            <div
              className="relative flex max-h-[65vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-black"
              style={{
                aspectRatio: ratio.replace(":", "/"),
              }}
            >
              <canvas
                ref={canvasRef}
                width={720}
                height={
                  ratio === "9:16"
                    ? 1280
                    : ratio === "1:1"
                    ? 720
                    : 405
                }
                className="h-full w-full object-contain"
              />

              <video
                ref={mainVideoRef}
                src={videoUrl}
                preload="auto"
                playsInline
                className="hidden"
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;

                  if (
                    Number.isFinite(d) &&
                    d > 0
                  ) {
                    setDuration(d);

                    setSegments([
                      {
                        id: uid(),
                        start: 0,
                        end: d,
                        transition: "none",
                      },
                    ]);
                  }
                }}
                onTimeUpdate={onMainTime}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />

              {layer && (
                <video
                  ref={layerVideoRef}
                  src={layer.url}
                  preload="auto"
                  playsInline
                  className="hidden"
                />
              )}
            </div>
          ) : (
            <button
              className="flex min-h-64 w-full max-w-xl flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-white/20"
              onClick={() => mainInput.current?.click()}
            >
              <Upload
                size={36}
                className="text-violet-400"
              />
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

      {/* TIMELINE */}
      <section className="space-y-3 border-t border-white/10 bg-[#141725] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">
              Çok Katmanlı Zaman Çizelgesi
            </h2>

            <p className="text-xs text-white/50">
              Videoları, sesleri ve metinleri
              ayrı katmanlarda düzenle
            </p>
          </div>

          <button
            className={btn}
            disabled={!duration}
            onClick={() => {
              mainVideoRef.current?.pause();

              setSegments([
                {
                  id: uid(),
                  start: 0,
                  end: duration,
                  transition: "none",
                },
              ]);

              segmentIndex.current = 0;
              setTime(0);

              if (mainVideoRef.current) {
                mainVideoRef.current.currentTime = 0;
              }
            }}
          >
            Kesimleri Sıfırla
          </button>
        </div>

        <div
          ref={timelineRef}
          className="relative overflow-hidden rounded-xl border border-white/10 bg-[#202438]"
        >
          {/* SCRUB BAR */}
          <div
            className="relative h-9 cursor-ew-resize touch-none border-b border-white/10 bg-[#30354c]"
            onPointerDown={(e) => {
              mainVideoRef.current?.pause();
              scrubActive.current = true;

              e.currentTarget.setPointerCapture(
                e.pointerId
              );

              scrub(e.clientX);
            }}
            onPointerMove={(e) => {
              if (scrubActive.current) {
                scrub(e.clientX);
              }
            }}
            onPointerUp={() => {
              scrubActive.current = false;
            }}
            onPointerCancel={() => {
              scrubActive.current = false;
            }}
          >
            <span className="absolute left-2 top-2 text-[10px] text-white/50">
              00:00
            </span>

            <span className="absolute right-2 top-2 text-[10px] text-white/50">
              {fmt(total)}
            </span>
          </div>

          {/* MAIN VIDEO */}
          <div className="relative h-20 border-b border-white/10">
            {segments.map((segment, i) => (
              <div
                key={segment.id}
                className="absolute inset-y-0 flex flex-col justify-between overflow-hidden border-r-2 border-[#141725] bg-blue-600/80 p-2"
                style={{
                  left: `${
                    total
                      ? (starts[i] / total) * 100
                      : 0
                  }%`,
                  width: `${
                    total
                      ? ((segment.end - segment.start) /
                          total) *
                        100
                      : 0
                  }%`,
                }}
              >
                <button
                  className="truncate text-left text-xs"
                  onClick={() => seek(starts[i])}
                >
                  Klip {i + 1}
                </button>

                <span className="text-[10px]">
                  {fmt(segment.end - segment.start)}
                </span>

                <button
                  title="Klibi sil"
                  className="absolute right-1 top-1 rounded bg-red-600 p-1"
                  onClick={() => deleteSegment(i)}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* SECOND VIDEO */}
          <div className="relative h-16 border-b border-white/10 bg-amber-950/30">
            {layer && (
              <div
                className="absolute inset-y-1 flex cursor-grab touch-none items-center gap-2 overflow-hidden rounded border border-amber-300 bg-amber-600/90 px-2 text-xs"
                style={{
                  left: `${
                    total
                      ? (layer.start / total) * 100
                      : 0
                  }%`,
                  width: `${
                    total
                      ? (layer.duration / total) * 100
                      : 0
                  }%`,
                }}
                onPointerDown={(e) =>
                  startDrag(
                    e,
                    "layer",
                    layer.id,
                    layer.start
                  )
                }
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <Layers size={14} />

                <span className="min-w-0 flex-1 truncate">
                  {layer.name}
                </span>

                <button
                  className="shrink-0 rounded bg-red-600 p-1"
                  onPointerDown={(e) =>
                    e.stopPropagation()
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    layerVideoRef.current?.pause();
                    setLayer(null);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>

          {/* AUDIO */}
          <div className="relative h-14 border-b border-white/10 bg-emerald-950/30">
            {audios.map((clip) => (
              <div
                key={clip.id}
                className="absolute inset-y-1 flex cursor-grab touch-none items-center gap-1 overflow-hidden rounded border border-emerald-300 bg-emerald-600/90 px-2 text-xs"
                style={{
                  left: `${
                    total
                      ? (clip.start / total) * 100
                      : 0
                  }%`,
                  width: `${
                    total
                      ? (clip.duration / total) * 100
                      : 0
                  }%`,
                }}
                onPointerDown={(e) =>
                  startDrag(
                    e,
                    "audio",
                    clip.id,
                    clip.start
                  )
                }
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
              >
                <Music2 size={13} />

                <span className="min-w-0 flex-1 truncate">
                  {clip.name}
                </span>

                <button
                  title="Sesi sil"
                  className="shrink-0 rounded bg-red-600 p-1"
                  onPointerDown={(e) =>
                    e.stopPropagation()
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAudio(clip.id);
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* TEXT */}
          <div className="relative h-12 bg-violet-950/30">
            {texts.map((clip) => (
              <div
                key={clip.id}
                className="absolute inset-y-1 flex cursor-grab touch-none items-center gap-1 overflow-hidden rounded border border-violet-300 bg-violet-600/90 px-2 text-xs"
                style={{
                  left: `${
                    total
                      ? (clip.start / total) * 100
                      : 0
                  }%`,
                  width: `${
                    total
                      ? (clip.duration / total) * 100
                      : 0
                  }%`,
                }}
                onPointerDown={(e) =>
                  startDrag(
                    e,
                    "text",
                    clip.id,
                    clip.start
                  )
                }
                onPointerMove={moveDrag}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onDoubleClick={() => {
                  setTool("text");
                  seek(clip.start);
                }}
              >
                <Type size={13} />

                <span className="min-w-0 flex-1 truncate">
                  {clip.text}
                </span>

                <button
                  title="Metni sil"
                  className="shrink-0 rounded bg-red-600 p-1"
                  onPointerDown={(e) =>
                    e.stopPropagation()
                  }
                  onClick={(e) => {
                    e.stopPropagation();

                    setTexts((old) =>
                      old.filter((t) => t.id !== clip.id)
                    );
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* PLAYHEAD */}
          {total > 0 && (
            <div
              className="pointer-events-none absolute bottom-0 top-0 z-30 w-[2px] bg-white"
              style={{
                left: `${(time / total) * 100}%`,
              }}
            >
              <div className="absolute -left-[5px] top-0 h-3 w-3 rounded-b bg-white" />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-white/60">
          <span>🔵 Ana Video</span>
          <span>🟠 İkinci Video</span>
          <span>🟢 Ses</span>
          <span>🟣 Metin</span>
        </div>
      </section>

      {/* EXPORT MODAL */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-2xl border border-white/20 bg-[#1a1d2e] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Dışa Aktarma Ayarları
              </h2>

              <button
                onClick={() => setExportOpen(false)}
              >
                ✕
              </button>
            </div>

            <label className="block text-sm">
              Video Oranı

              <select
                className={field}
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

            <label className="block text-sm">
              Çözünürlük

              <select
                className={field}
                value={quality}
                onChange={(e) =>
                  setQuality(+e.target.value)
                }
              >
                <option value={720}>720p</option>
                <option value={1080}>1080p</option>
              </select>
            </label>

            <label className="block text-sm">
              FPS

              <select
                className={field}
                value={fps}
                onChange={(e) =>
                  setFps(+e.target.value)
                }
              >
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
            </label>

            <button
              className={`${primary} w-full`}
              onClick={exportVideo}
            >
              <Download
                size={16}
                className="mr-2 inline"
              />
              Videoyu Oluştur ve İndir
            </button>

            <p className="text-xs text-white/40">
              MP4 veya WebM biçimi tarayıcı desteğine
              göre belirlenir.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
