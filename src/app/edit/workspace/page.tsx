
"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft, Clapperboard, Download, Film, Music2,
  Pause, Play, Plus, Scissors, Sparkles, Trash2,
  Type, Upload, GripVertical, Captions, Settings2
} from "lucide-react";
import MemeSounds from "../MemeSounds";

type Segment = { id: string; start: number; end: number };
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
type Subtitle = {
  id: string;
  start: number;
  end: number;
  text: string;
};
type Tool = "media" | "audio" | "text" | "effects" | "captions" | "settings";

const uid = () => crypto.randomUUID();
const clamp = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
const fmt = (n: number) => {
  const x = Math.floor(Math.max(0, n || 0));
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

const effects = [
  ["Normal", "none"],
  ["Siyah Beyaz", "grayscale(1)"],
  ["Vintage", "sepia(.8)"],
  ["Canlı", "saturate(1.8)"],
  ["Kontrast", "contrast(1.5)"],
  ["Parlak", "brightness(1.3)"],
  ["Soğuk", "hue-rotate(35deg)"]
];

const menu = [
  { id: "media", label: "Medya", icon: Film },
  { id: "audio", label: "Sesler", icon: Music2 },
  { id: "text", label: "Metin", icon: Type },
  { id: "captions", label: "Altyazı", icon: Captions },
  { id: "effects", label: "Efektler", icon: Sparkles },
  { id: "settings", label: "Ayarlar", icon: Settings2 }
] as const;

export default function WorkspacePage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const audioInput = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const dragText = useRef(false);
  const players = useRef<Map<string, HTMLAudioElement>>(new Map());
  const urls = useRef<string[]>([]);
  const dragIndex = useRef<number | null>(null);

  const [tool, setTool] = useState<Tool>("media");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoName, setVideoName] = useState("");
  const [duration, setDuration] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clips, setClips] = useState<AudioClip[]>([]);
  const [text, setText] = useState("");
  const [textSize, setTextSize] = useState(36);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textPos, setTextPos] = useState({ x: 50, y: 50 });
  const [filter, setFilter] = useState("none");
  const [volume, setVolume] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [ratio, setRatio] = useState("9:16");
  const [quality, setQuality] = useState(720);
  const [fps, setFps] = useState(30);
  const [fit, setFit] = useState<"contain" | "cover">("contain");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const total = segments.reduce(
    (n, s) => n + s.end - s.start, 0
  );

  // Project timeline -> source video position.
  function sourceAt(projectTime: number) {
    let remaining = projectTime;
    for (const s of segments) {
      const len = s.end - s.start;
      if (remaining < len) return s.start + remaining;
      remaining -= len;
    }
    return segments.length
      ? segments[segments.length - 1].end
      : 0;
  }

  // Source video position -> project timeline.
  function projectAt(index: number, sourceTime: number) {
    const before = segments.slice(0, index).reduce(
      (n, s) => n + s.end - s.start, 0
    );
    return before + sourceTime - segments[index].start;
  }

  useEffect(() => {
    return () => {
      urls.current.forEach(URL.revokeObjectURL);
      players.current.forEach(a => a.pause());
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) {
      v.volume = volume / 100;
      v.playbackRate = speed;
    }
  }, [volume, speed, videoUrl]);

  useEffect(() => {
    for (const clip of clips) {
      let audio = players.current.get(clip.id);
      if (!audio) {
        audio = new Audio(clip.url);
        players.current.set(clip.id, audio);
      }
      const offset = time - clip.start;
      const active = playing && offset >= 0 &&
        offset < clip.duration;
      if (!active) {
        audio.pause();
      } else {
        if (audio.readyState >= 1 &&
            Math.abs(audio.currentTime - offset) > .4) {
          try { audio.currentTime = offset; } catch {}
        }
        if (audio.paused) audio.play().catch(() => {});
      }
    }
  }, [time, playing, clips]);

  function loadVideo(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("video/")) return;
    videoRef.current?.pause();
    const url = URL.createObjectURL(file);
    urls.current.push(url);
    players.current.forEach(a => a.pause());
    players.current.clear();
    setVideoUrl(url);
    setVideoName(file.name);
    setDuration(0);
    setSegments([]);
    setClips([]);
    setSubtitles([]);
    setTime(0);
    setPlaying(false);
    setMessage("");
    e.target.value = "";
  }

  function seek(t: number) {
    if (!videoRef.current || !segments.length) return;
    const p = clamp(t, 0, total);
    videoRef.current.currentTime = sourceAt(p);
    setTime(p);
  }

  async function togglePlay() {
    const v = videoRef.current;
    if (!v || !segments.length) return;
    if (!v.paused) return v.pause();
    if (time >= total - .05) seek(0);
    try { await v.play(); }
    catch { setMessage("Video oynatılamadı."); }
  }

  function onVideoTime() {
    const v = videoRef.current;
    if (!v || !segments.length) return;
    const current = v.currentTime;
    const i = segments.findIndex(
      s => current >= s.start - .02 &&
           current < s.end - .025
    );

    if (i >= 0) {
      setTime(projectAt(i, clamp(
        current, segments[i].start, segments[i].end
      )));
      return;
    }

    if (v.paused) return;

    const nextIndex = segments.findIndex(
      s => s.start > current + .02
    );

    if (nextIndex >= 0) {
      v.currentTime = segments[nextIndex].start;
      setTime(projectAt(nextIndex, segments[nextIndex].start));
    } else {
      v.pause();
      setTime(total);
    }
  }

  function split() {
    if (!segments.length) return;
    videoRef.current?.pause();

    let remaining = time;
    const i = segments.findIndex(s => {
      const len = s.end - s.start;
      if (remaining > .05 && remaining < len - .05)
        return true;
      remaining -= len;
      return false;
    });

    if (i < 0) {
      setMessage("Kesmek için klibin içinden bir nokta seç.");
      return;
    }

    const s = segments[i];
    const cut = s.start + remaining;
    const a = { id: uid(), start: s.start, end: cut };
    const b = { id: uid(), start: cut, end: s.end };

    setSegments(old => [
      ...old.slice(0, i), a, b, ...old.slice(i + 1)
    ]);
    setSelected(b.id);
    setMessage("Klip kesildi. Şimdi sürükleyebilir veya silebilirsin.");
  }

  function removeSegment(id: string) {
    const next = segments.filter(s => s.id !== id);
    videoRef.current?.pause();
    setSegments(next);
    setSelected(null);
    setTime(0);
    if (videoRef.current && next.length)
      videoRef.current.currentTime = next[0].start;
    setMessage("Klip silindi.");
  }

  function reorder(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    videoRef.current?.pause();
    const next = [...segments];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSegments(next);
    setTime(0);
    if (videoRef.current)
      videoRef.current.currentTime = next[0].start;
    setMessage("Klip sırası değiştirildi.");
  }

  function addSound(s: Sound) {
    if (!videoUrl || !total) {
      setMessage("Önce video yükle.");
      return;
    }
    setClips(old => [...old, {
      id: uid(),
      name: s.name,
      url: s.url,
      start: time,
      duration: Math.min(
        Number.isFinite(s.duration) && s.duration > 0
          ? s.duration : 5,
        Math.max(.1, total - time)
      )
    }]);
    setMessage(`${s.name} eklendi.`);
  }

  function loadAudio(e: ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files || []).forEach(file => {
      if (!file.type.startsWith("audio/")) return;
      const url = URL.createObjectURL(file);
      urls.current.push(url);
      const a = new Audio(url);
      a.onloadedmetadata = () => addSound({
        id: uid(), name: file.name, url,
        duration: a.duration, source: "local",
        category: "Kendi Sesim"
      });
    });
    e.target.value = "";
  }

  function moveText(e: PointerEvent<HTMLDivElement>) {
    if (!dragText.current || !previewRef.current) return;
    const r = previewRef.current.getBoundingClientRect();
    setTextPos({
      x: clamp((e.clientX - r.left) / r.width * 100, 5, 95),
      y: clamp((e.clientY - r.top) / r.height * 100, 5, 95)
    });
  }

  function addSubtitle() {
    if (!total) return;
    setShowSubtitles(true);
    setSubtitles(old => [...old, {
      id: uid(),
      start: time,
      end: Math.min(total, time + 3),
      text: "Yeni altyazı"
    }]);
  }

  // Browser speech recognition generally listens to a microphone,
  // not directly to the audio track of an uploaded video.
  function microphoneDictation() {
    type Result = {
      results: ArrayLike<ArrayLike<{ transcript: string }>>;
    };
    type Recognition = {
      lang: string;
      onresult: ((e: Result) => void) | null;
      onerror: (() => void) | null;
      start: () => void;
    };
    type RecognitionCtor = new () => Recognition;
    const w = window as Window & {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) {
      setMessage("Bu tarayıcı mikrofonla konuşma tanımayı desteklemiyor.");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "tr-TR";
    recognition.onresult = e => {
      const transcript = Array.from(e.results)
        .map(r => r[0]?.transcript || "").join(" ");
      setShowSubtitles(true);
      setSubtitles(old => [...old, {
        id: uid(), start: time,
        end: Math.min(total, time + 5),
        text: transcript
      }]);
    };
    recognition.onerror = () =>
      setMessage("Mikrofon tanıma işlemi başarısız.");
    recognition.start();
    setMessage("Mikrofona konuşabilirsin.");
  }

  const activeSubtitle = showSubtitles
    ? subtitles.find(s => time >= s.start && time < s.end)
    : undefined;

  function outputSize() {
    if (ratio === "9:16")
      return quality === 1080 ? [1080, 1920] : [720, 1280];
    if (ratio === "1:1")
      return quality === 1080 ? [1080, 1080] : [720, 720];
    return quality === 1080 ? [1920, 1080] : [1280, 720];
  }

  async function exportVideo() {
    if (!videoUrl || !segments.length || exporting) return;
    if (typeof MediaRecorder === "undefined" ||
        !HTMLCanvasElement.prototype.captureStream) {
      setMessage("Dışa aktarma için Chrome veya Edge dene.");
      return;
    }

    setExporting(true);
    setProgress(0);
    setMessage("");
    videoRef.current?.pause();

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

    const [w, h] = outputSize();
    canvas.width = w;
    canvas.height = h;

    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let recorder: MediaRecorder | null = null;
    let frame = 0;
    const soundElements: {
      audio: HTMLAudioElement;
      clip: AudioClip;
    }[] = [];

    try {
      await new Promise<void>((resolve, reject) => {
        if (source.readyState >= 1) return resolve();
        source.onloadedmetadata = () => resolve();
        source.onerror = () => reject(
          new Error("Kaynak video açılamadı.")
        );
      });

      audioContext = new AudioContext();
      const destination =
        audioContext.createMediaStreamDestination();

      const videoNode =
        audioContext.createMediaElementSource(source);
      const gain = audioContext.createGain();
      gain.gain.value = volume / 100;
      videoNode.connect(gain);
      gain.connect(destination);

      for (const clip of clips) {
        const audio = new Audio(clip.url);
        audio.crossOrigin = "anonymous";
        audio.preload = "auto";
        const node =
          audioContext.createMediaElementSource(audio);
        node.connect(destination);
        soundElements.push({ audio, clip });
      }

      stream = canvas.captureStream(fps);
      const combined = new MediaStream([
        ...stream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      const mime = [
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ].find(x => MediaRecorder.isTypeSupported(x));

      if (!mime) throw new Error("Desteklenen video formatı yok.");

      recorder = new MediaRecorder(combined, {
        mimeType: mime,
        videoBitsPerSecond: quality === 1080
          ? 10000000 : 5000000
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
      };

      const stopped = new Promise<void>((resolve, reject) => {
        recorder!.onstop = () => resolve();
        recorder!.onerror = () =>
          reject(new Error("Video kaydı başarısız."));
      });

      let outputTime = 0;

      function draw() {
        if (!ctx) return;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        if (source.readyState >= 2) {
          const vw = source.videoWidth || w;
          const vh = source.videoHeight || h;
          const scale = fit === "cover"
            ? Math.max(w / vw, h / vh)
            : Math.min(w / vw, h / vh);
          const dw = vw * scale;
          const dh = vh * scale;

          ctx.save();
          ctx.filter = filter;
          ctx.drawImage(
            source, (w - dw) / 2, (h - dh) / 2, dw, dh
          );
          ctx.restore();
        }

        if (text.trim()) {
          ctx.save();
          ctx.fillStyle = textColor;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.font = `bold ${Math.round(textSize * w / 720)}px Arial`;
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 8;
          ctx.fillText(
            text,
            w * textPos.x / 100,
            h * textPos.y / 100,
            w * .9
          );
          ctx.restore();
        }

        if (showSubtitles) {
          const s = subtitles.find(
            x => outputTime >= x.start && outputTime < x.end
          );
          if (s?.text) {
            ctx.save();
            ctx.font = `bold ${Math.round(w * .047)}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = "#fff";
            ctx.strokeStyle = "#000";
            ctx.lineWidth = Math.max(3, w * .006);
            const y = h * .84;
            ctx.strokeText(s.text, w / 2, y, w * .9);
            ctx.fillText(s.text, w / 2, y, w * .9);
            ctx.restore();
          }
        }

        frame = requestAnimationFrame(draw);
      }

      await audioContext.resume();
      recorder.start(500);
      draw();

      let completed = 0;
      const totalExport = total / speed;

      for (const segment of segments) {
        source.pause();

        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Video konumu ayarlanamadı.")),
            15000
          );
          source.addEventListener("seeked", () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
          source.currentTime = segment.start;
        });

        await source.play();
        const started = performance.now();
        const length = (segment.end - segment.start) / speed;

        await new Promise<void>(resolve => {
          const timer = window.setInterval(() => {
            const elapsed = (performance.now() - started) / 1000;
            outputTime = completed * speed +
              Math.min(elapsed * speed, segment.end - segment.start);

            for (const { audio, clip } of soundElements) {
              const offset = outputTime - clip.start;
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

            setProgress(Math.min(100, Math.round(
              (completed + elapsed) / totalExport * 100
            )));

            if (elapsed >= length || source.ended) {
              clearInterval(timer);
              source.pause();
              soundElements.forEach(x => x.audio.pause());
              resolve();
            }
          }, 50);
        });

        completed += length;
      }

      recorder.stop();
      await stopped;

      const blob = new Blob(chunks, { type: mime });
      if (!blob.size) throw new Error("Boş video oluşturuldu.");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hagy-${ratio.replace(":", "x")}-${Date.now()}.${
        mime.includes("mp4") ? "mp4" : "webm"
      }`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      setMessage("Video indirildi.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Dışa aktarma hatası.");
    } finally {
      if (recorder?.state === "recording") recorder.stop();
      cancelAnimationFrame(frame);
      source.pause();
      soundElements.forEach(x => x.audio.pause());
      stream?.getTracks().forEach(x => x.stop());
      await audioContext?.close().catch(() => {});
      setExporting(false);
      setProgress(0);
    }
  }

  const btn = "rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15";
  const primary = "rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold hover:bg-violet-500";
  const panel = "rounded-xl border border-white/10 bg-white/5 p-3";

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
          <button className={btn}
            onClick={() => videoInput.current?.click()}>
            <Upload size={16} className="inline mr-2" />
            Video Yükle
          </button>
          <button className={primary}
            disabled={!segments.length || exporting}
            onClick={exportVideo}>
            <Download size={16} className="inline mr-2" />
            {exporting ? `%${progress}` : "Dışa Aktar"}
          </button>
        </div>
      </header>

      <input ref={videoInput} type="file" accept="video/*"
        className="hidden" onChange={loadVideo} />
      <input ref={audioInput} type="file" accept="audio/*"
        multiple className="hidden" onChange={loadAudio} />

      {message && (
        <div className="bg-violet-500/10 p-3 text-sm text-violet-200">
          {message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <nav className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#141725] p-2 lg:w-24 lg:flex-col lg:border-r">
          {menu.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setTool(m.id)}
                className={`flex min-w-20 flex-col items-center gap-2 rounded-xl p-3 text-xs ${
                  tool === m.id
                    ? "bg-violet-600/25 text-violet-300"
                    : "text-white/50 hover:bg-white/10"
                }`}>
                <Icon size={21} />{m.label}
              </button>
            );
          })}
        </nav>

        <aside className="w-full space-y-4 border-b border-white/10 bg-[#171a28] p-4 lg:w-80 lg:border-r">
          {tool === "media" && (
            <>
              <h2 className="font-bold">Medya</h2>
              <button className={`${primary} w-full`}
                onClick={() => videoInput.current?.click()}>
                <Upload size={17} className="inline mr-2" />
                Video Seç
              </button>
              {videoName && (
                <div className={panel}>
                  <Film className="mb-2 text-violet-400" />
                  <p className="break-all text-sm">{videoName}</p>
                  <p className="text-xs text-white/50">
                    {fmt(duration)}
                  </p>
                </div>
              )}
            </>
          )}

          {tool === "audio" && (
            <>
              <h2 className="font-bold">Sesler</h2>
              <button className={`${btn} w-full`}
                onClick={() => audioInput.current?.click()}>
                <Plus size={16} className="inline mr-2" />
                Kendi Sesini Ekle
              </button>
              <div className={panel}>
                <h3 className="mb-3 font-semibold">
                  Global Meme Sounds
                </h3>
                <MemeSounds onAdd={addSound} />
              </div>
              {clips.map(c => (
                <div key={c.id} className={panel}>
                  <p className="break-all text-sm">{c.name}</p>
                  <p className="text-xs text-white/50">
                    {fmt(c.start)} başlangıç
                  </p>
                  <button className="mt-2 text-xs text-red-300"
                    onClick={() => {
                      players.current.get(c.id)?.pause();
                      players.current.delete(c.id);
                      setClips(old => old.filter(x => x.id !== c.id));
                    }}>
                    <Trash2 size={14} className="inline" /> Sesi Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "text" && (
            <>
              <h2 className="font-bold">Metin</h2>
              <textarea className={`${panel} w-full`}
                rows={4} value={text}
                placeholder="Videoya yazı ekle"
                onChange={e => setText(e.target.value)} />
              <p className="text-xs text-violet-300">
                Metni video üzerinde tutup sürükle.
              </p>
              <label className="block text-sm">
                Yazı Boyutu: {textSize}
              </label>
              <input type="range" min={16} max={72}
                className="w-full accent-violet-500"
                value={textSize}
                onChange={e => setTextSize(+e.target.value)} />
              <input type="color" value={textColor}
                onChange={e => setTextColor(e.target.value)} />
              <div className="flex gap-2">
                <button className={btn}
                  onClick={() => setTextPos({ x: 50, y: 50 })}>
                  Ortala
                </button>
                <button className={btn} onClick={() => setText("")}>
                  Metni Sil
                </button>
              </div>
            </>
          )}

          {tool === "captions" && (
            <>
              <h2 className="font-bold">Altyazılar</h2>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={showSubtitles}
                  onChange={e => setShowSubtitles(e.target.checked)} />
                Altyazıları Göster
              </label>
              <button className={`${primary} w-full`}
                onClick={addSubtitle}>
                <Plus size={16} className="inline mr-2" />
                Altyazı Ekle
              </button>
              <button className={`${btn} w-full`}
                onClick={microphoneDictation}>
                <Captions size={16} className="inline mr-2" />
                Mikrofondan Metne
              </button>
              <p className="text-xs leading-5 text-white/50">
                Mikrofonla konuşmayı yazıya çevirme tarayıcı
                desteğine bağlıdır. Yüklediğin videonun sesini
                otomatik çözümleme bu sürümde bulunmuyor.
              </p>
              {subtitles.map(s => (
                <div key={s.id} className={`${panel} space-y-2`}>
                  <textarea className="w-full rounded-lg bg-black/20 p-2 text-sm"
                    value={s.text}
                    onChange={e => setSubtitles(old =>
                      old.map(x => x.id === s.id
                        ? { ...x, text: e.target.value } : x)
                    )} />
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs">
                      Başlangıç (sn)
                      <input type="number" min={0} max={total}
                        step=".1" value={s.start}
                        className="mt-1 w-full rounded bg-black/20 p-2"
                        onChange={e => setSubtitles(old =>
                          old.map(x => x.id === s.id
                            ? { ...x, start: clamp(+e.target.value, 0, total) }
                            : x)
                        )} />
                    </label>
                    <label className="text-xs">
                      Bitiş (sn)
                      <input type="number" min={0} max={total}
                        step=".1" value={s.end}
                        className="mt-1 w-full rounded bg-black/20 p-2"
                        onChange={e => setSubtitles(old =>
                          old.map(x => x.id === s.id
                            ? { ...x, end: clamp(+e.target.value, 0, total) }
                            : x)
                        )} />
                    </label>
                  </div>
                  <button className="text-xs text-red-300"
                    onClick={() => setSubtitles(old =>
                      old.filter(x => x.id !== s.id)
                    )}>
                    <Trash2 size={14} className="inline" /> Sil
                  </button>
                </div>
              ))}
            </>
          )}

          {tool === "effects" && (
            <>
              <h2 className="font-bold">Efektler</h2>
              {effects.map(([name, value]) => (
                <button key={name}
                  className={`block w-full text-left ${panel} ${
                    filter === value ? "border-violet-400" : ""
                  }`}
                  onClick={() => setFilter(value)}>
                  {name}
                </button>
              ))}
            </>
          )}

          {tool === "settings" && (
            <>
              <h2 className="font-bold">Video Ayarları</h2>
              <label className="block text-sm">Video Sesi %{volume}</label>
              <input type="range" min={0} max={100}
                className="w-full accent-violet-500"
                value={volume}
                onChange={e => setVolume(+e.target.value)} />
              <label className="block text-sm">Hız</label>
              <select className={`${panel} w-full`} value={speed}
                onChange={e => setSpeed(+e.target.value)}>
                {[.5, .75, 1, 1.25, 1.5, 2].map(n =>
                  <option key={n} value={n}>{n}x</option>
                )}
              </select>
              <h3 className="font-semibold">Dışa Aktarma</h3>
              <label className="block text-sm">Video Oranı</label>
              <select className={`${panel} w-full`} value={ratio}
                onChange={e => setRatio(e.target.value)}>
                <option value="9:16">9:16 - TikTok / Reels</option>
                <option value="16:9">16:9 - YouTube</option>
                <option value="1:1">1:1 - Kare</option>
              </select>
              <label className="block text-sm">Çözünürlük</label>
              <select className={`${panel} w-full`} value={quality}
                onChange={e => setQuality(+e.target.value)}>
                <option value={720}>720p</option>
                <option value={1080}>1080p</option>
              </select>
              <label className="block text-sm">FPS</label>
              <select className={`${panel} w-full`} value={fps}
                onChange={e => setFps(+e.target.value)}>
                <option value={24}>24 FPS</option>
                <option value={30}>30 FPS</option>
                <option value={60}>60 FPS</option>
              </select>
              <label className="block text-sm">Görüntü Yerleşimi</label>
              <select className={`${panel} w-full`} value={fit}
                onChange={e => setFit(
                  e.target.value as "contain" | "cover"
                )}>
                <option value="contain">Tam Sığdır</option>
                <option value="cover">Ekranı Doldur (Kırp)</option>
              </select>
            </>
          )}
        </aside>

        <section className="flex min-h-[500px] flex-1 flex-col items-center justify-center gap-5 bg-[#0b0d16] p-4">
          {videoUrl ? (
            <div ref={previewRef}
              className="relative flex max-h-[65vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-xl bg-black"
              style={{ aspectRatio: ratio.replace(":", "/") }}>
              <video ref={videoRef} src={videoUrl}
                playsInline preload="metadata"
                className="h-full w-full"
                style={{ filter, objectFit: fit }}
                onLoadedMetadata={e => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) {
                    setDuration(d);
                    setSegments([{
                      id: uid(), start: 0, end: d
                    }]);
                  }
                }}
                onTimeUpdate={onVideoTime}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />

              {!!text.trim() && (
                <div className="absolute z-10 cursor-move select-none rounded-lg border border-dashed border-white/50 bg-black/10 px-3 py-2"
                  style={{
                    left: `${textPos.x}%`,
                    top: `${textPos.y}%`,
                    transform: "translate(-50%, -50%)",
                    touchAction: "none"
                  }}
                  onPointerDown={e => {
                    dragText.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    moveText(e);
                  }}
                  onPointerMove={moveText}
                  onPointerUp={() => { dragText.current = false; }}
                  onPointerCancel={() => { dragText.current = false; }}>
                  <p className="max-w-[70vw] break-words text-center font-bold"
                    style={{
                      fontSize: textSize,
                      color: textColor,
                      textShadow: "0 2px 8px black"
                    }}>
                    {text}
                  </p>
                </div>
              )}

              {activeSubtitle && (
                <div className="pointer-events-none absolute bottom-[13%] left-[5%] w-[90%] text-center text-xl font-bold text-white"
                  style={{ textShadow: "0 2px 5px black" }}>
                  {activeSubtitle.text}
                </div>
              )}
            </div>
          ) : (
            <button className="flex min-h-72 w-full max-w-2xl flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-white/20 bg-[#171a28]"
              onClick={() => videoInput.current?.click()}>
              <Upload size={36} className="text-violet-400" />
              <span className="font-bold">Videonu Yükle</span>
              <span className={primary}>Video Seç</span>
            </button>
          )}

          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-5">
              <button className={btn} disabled={!videoUrl}
                onClick={() => seek(time - 5)}>-5 sn</button>
              <button className="rounded-full bg-violet-600 p-4 disabled:opacity-40"
                disabled={!segments.length || exporting}
                onClick={togglePlay}>
                {playing ? <Pause /> : <Play />}
              </button>
              <button className={btn} disabled={!videoUrl}
                onClick={() => seek(time + 5)}>+5 sn</button>
            </div>

            <button className="flex items-center gap-2 rounded-xl bg-violet-600/20 px-5 py-3 text-sm font-semibold text-violet-200 disabled:opacity-40"
              disabled={!segments.length || exporting}
              onClick={split}>
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
          <h2 className="font-semibold">Zaman Çizelgesi</h2>
          <button className={btn} disabled={!duration}
            onClick={() => {
              videoRef.current?.pause();
              setSegments([{ id: uid(), start: 0, end: duration }]);
              setSelected(null);
              seek(0);
            }}>
            Kesimleri Sıfırla
          </button>
        </div>

        <input type="range" min={0}
          max={Math.max(total, .1)} step=".05"
          value={time} disabled={!segments.length}
          className="w-full accent-violet-500"
          onChange={e => seek(+e.target.value)} />

        <div className="flex gap-2 overflow-x-auto rounded-xl bg-[#222638] p-3">
          {segments.length ? segments.map((s, i) => (
            <div key={s.id} draggable
              onDragStart={e => {
                dragIndex.current = i;
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                if (dragIndex.current !== null)
                  reorder(dragIndex.current, i);
                dragIndex.current = null;
              }}
              onDragEnd={() => { dragIndex.current = null; }}
              className={`relative flex min-w-28 flex-col justify-between gap-2 rounded-lg border-2 p-3 ${
                selected === s.id
                  ? "border-white bg-violet-600"
                  : "border-blue-400 bg-blue-600/60"
              }`}
              style={{
                flexGrow: Math.max(.2, s.end - s.start)
              }}>
              <button className="flex items-center gap-1 text-left text-xs"
                onClick={() => {
                  setSelected(s.id);
                  seek(projectAt(i, s.start));
                }}>
                <GripVertical size={15} />
                Klip {i + 1}
              </button>
              <span className="text-xs text-white/70">
                {fmt(s.end - s.start)}
              </span>
              <button className="absolute right-1 top-1 rounded bg-red-600 p-1"
                title="Klibi Sil"
                onClick={() => removeSegment(s.id)}>
                <Trash2 size={13} />
              </button>
            </div>
          )) : (
            <p className="p-4 text-sm text-white/40">
              Video yükleyerek başla.
            </p>
          )}
        </div>

        <p className="text-xs text-white/50">
          Klipleri tutup sağa sola sürükleyerek sıralarını değiştir.
          Kırmızı çöp kutusu klibi siler.
        </p>

        <div className="flex min-h-12 items-center gap-2 rounded-xl bg-emerald-500/10 p-3">
          <Music2 size={17} className="text-emerald-400" />
          <span className="text-xs text-white/50">Ses:</span>
          {clips.map(c => (
            <span key={c.id}
              className="rounded-lg bg-emerald-600/40 px-2 py-1 text-xs">
              {c.name} ({fmt(c.start)})
            </span>
          ))}
        </div>

        <div className="flex min-h-12 items-center gap-2 rounded-xl bg-violet-500/10 p-3">
          <Type size={17} className="text-violet-400" />
          <span className="text-xs text-white/50">Metin:</span>
          <span className="text-xs">{text || "Metin yok"}</span>
        </div>
      </section>
    </main>
  );
}
