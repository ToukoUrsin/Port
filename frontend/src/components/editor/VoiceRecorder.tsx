import { useState, useRef } from "react";
import { Mic, Square, X } from "lucide-react";

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
          className={`${btnClass} record-btn--active`}
          onClick={stopRecording}
        >
          <Square size={compact ? 14 : 20} />
          <span className="record-timer">{formatTime(elapsed)}</span>
        </button>
      ) : (
        <button type="button" className={btnClass} onClick={startRecording}>
          <Mic size={compact ? 18 : 24} />
        </button>
      )}
      {audioURL && !recording && (
        <div className="recording-strip">
          <audio src={audioURL} controls />
          <button
            type="button"
            onClick={() => {
              setAudioURL(null);
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
