import { useState, useRef, useEffect, useMemo } from "react";
import { Mic, Square, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { CustomAudioPlayer } from "./CustomAudioPlayer";

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function VoiceRecorder({ onRecordingComplete, onCancel, isUploading }: VoiceRecorderProps) {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      
      // Audio level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        audioContext.close();
        if (chunksRef.current.length === 0) {
          toast.error("Không thu thập được dữ liệu âm thanh. Thử lại.");
          onCancel();
          return;
        }
        const blob = new Blob(chunksRef.current, { type: "audio/webm" }); // Force webm for consistency
        chunksRef.current = [];
        stream.getTracks().forEach(t => t.stop());
        if (blob.size > 0) {
          setAudioBlob(blob);
        } else {
          toast.error("Bản ghi bị trống. Vui lòng thử lại.");
          onCancel();
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setDuration(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setDuration(prev => prev + 1), 1000);
    } catch (err) {
      console.error("Microphone error:", err);
      toast.error("Không thể truy cập microphone.");
      onCancel();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
    };
  }, []);

  const previewUrl = useMemo(() => audioBlob ? URL.createObjectURL(audioBlob) : null, [audioBlob]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className={cn(
      "flex items-center gap-2 bg-card/90 border border-primary/20 backdrop-blur-md px-2 py-1.5 rounded-2xl animate-in fade-in slide-in-from-right-4 duration-300 w-full max-w-[340px]",
      audioBlob ? "flex-1" : "w-fit"
    )}>
      {isRecording ? (
        <>
          <div className="flex items-center gap-2 px-2">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-bold font-mono tabular-nums">{formatDuration(duration)}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="icon" variant="ghost"
              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10"
              onClick={() => { stopRecording(); onCancel(); }}>
              <X className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="default"
              className="h-9 w-9 rounded-full bg-destructive text-white hover:bg-destructive/90 shadow-lg animate-pulse"
              onClick={stopRecording}>
              <Square className="h-4 w-4 fill-current" />
            </Button>
          </div>
        </>
      ) : audioBlob && previewUrl ? (
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between mb-1 px-1">
             <span className="text-[10px] font-bold uppercase tracking-wider text-primary opacity-80">{t("chat.voice.preview")}</span>
             <span className="text-[10px] font-medium opacity-60">{formatDuration(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted/30 rounded-xl">
              <CustomAudioPlayer src={previewUrl} />
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost"
                className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
                onClick={() => { setAudioBlob(null); onCancel(); }}
                disabled={isUploading}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="default"
                className="h-10 w-10 rounded-full bg-gradient-primary text-white shadow-lg shadow-primary/20"
                onClick={() => onRecordingComplete(audioBlob)}
                disabled={isUploading}>
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-4 py-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground font-medium">{t("chat.voice.preparing")}</span>
        </div>
      )}
    </div>
  );
}
