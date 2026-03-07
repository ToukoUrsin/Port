import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Upload, Mic, Square, ArrowLeft, Send, X, Loader2 } from "lucide-react";
import "./PostPage.css";

const CATEGORIES = [
  { value: "council", label: "Council" },
  { value: "schools", label: "Schools" },
  { value: "business", label: "Business" },
  { value: "events", label: "Events" },
  { value: "sports", label: "Sports" },
  { value: "community", label: "Community" },
];

export default function PostPage() {
  const [category, setCategory] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newPhotos = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 4));
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function toggleRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      // Microphone access denied or unavailable
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: wire up to backend API
    setTimeout(() => setIsSubmitting(false), 2000);
  }

  return (
    <div className="post-page">
      <header className="post-header">
        <Link to="/" className="post-back">
          <ArrowLeft size={20} />
          <span>Back</span>
        </Link>
        <h1 className="post-title">Submit a Story</h1>
      </header>

      <form className="post-form" onSubmit={handleSubmit}>
        {/* What happened */}
        <div className="post-field">
          <Label htmlFor="headline">Headline</Label>
          <Input
            id="headline"
            placeholder="What happened?"
            className="h-10"
          />
        </div>

        {/* Category */}
        <div className="post-field">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full !h-10 px-2.5">
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Details */}
        <div className="post-field">
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            placeholder="Share what you know — who, what, where, when..."
            className="min-h-[120px]"
          />
        </div>

        {/* Location */}
        <div className="post-field">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            placeholder="Where did this happen?"
            className="h-10"
          />
        </div>

        {/* Media section */}
        <div className="post-field">
          <Label>Add Media</Label>
          <div className="post-media-buttons">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="post-media-btn"
            >
              <Camera size={20} />
              Photo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              className="post-media-btn"
            >
              <Upload size={20} />
              File
            </Button>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="lg"
              onClick={toggleRecording}
              className="post-media-btn"
            >
              {isRecording ? <Square size={18} /> : <Mic size={20} />}
              {isRecording ? "Stop" : "Record"}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />

          {/* Photo previews */}
          {photos.length > 0 && (
            <div className="post-photos">
              {photos.map((photo, i) => (
                <div key={i} className="post-photo">
                  <img src={photo.preview} alt={`Upload ${i + 1}`} />
                  <button
                    type="button"
                    className="post-photo-remove"
                    onClick={() => removePhoto(i)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Audio indicator */}
          {audioBlob && !isRecording && (
            <div className="post-audio-indicator">
              <Mic size={16} />
              <span>Audio recorded</span>
              <button
                type="button"
                className="post-audio-remove"
                onClick={() => setAudioBlob(null)}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="post-recording-indicator">
              <span className="post-recording-dot" />
              <span>Recording...</span>
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="post-submit"
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Send size={18} />
          )}
          {isSubmitting ? "Submitting..." : "Submit Story"}
        </Button>
      </form>
    </div>
  );
}
