import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, X, Play, Pause } from "lucide-react";

function AudioPlayer({ src, onRemove }: { src: string; onRemove: () => void }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTimeUpdate = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnded = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play(); }
    setPlaying(!playing);
  }, [playing]);

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !audio.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * audio.duration;
    setProgress(pct);
  }, []);

  function fmt(s: number) {
    if (!s || !isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }

  return (
    <div className="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button type="button" className="audio-player-play" onClick={togglePlay}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span className="audio-player-time">{fmt(audioRef.current?.currentTime ?? 0)}</span>
      <div className="audio-player-track" onClick={seek}>
        <div className="audio-player-fill" style={{ width: `${progress * 100}%` }} />
      </div>
      <span className="audio-player-time">{fmt(duration)}</span>
      <button type="button" className="audio-player-remove" onClick={onRemove}>
        <X size={14} />
      </button>
    </div>
  );
}

export function VoiceRecorder({
  onRecording,
  compact,
}: {
  onRecording: (blob: Blob) => void;
  compact?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number>(0);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunks.current = [];
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      setAudioURL(URL.createObjectURL(blob));
      onRecording(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
    setElapsed(0);
    timer.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
  }

  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
    clearInterval(timer.current);
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  const btnClass = compact ? "record-btn record-btn--compact" : "record-btn";

  return (
    <div className="voice-recorder">
      {recording ? (
        <button
          type="button"
          className="record-active-strip"
          onClick={stopRecording}
        >
          <span className="record-dot" />
          <span className="record-timer">{formatTime(elapsed)}</span>
          <Square size={14} />
        </button>
      ) : audioURL ? (
        <AudioPlayer
          src={audioURL}
          onRemove={() => setAudioURL(null)}
        />
      ) : (
        <button type="button" className={btnClass} onClick={startRecording}>
          <Mic size={compact ? 18 : 24} />
        </button>
      )}
    </div>
  );
}
