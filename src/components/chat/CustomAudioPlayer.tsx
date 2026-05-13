import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CustomAudioPlayerProps {
  src: string;
  isMine?: boolean;
}

export function CustomAudioPlayer({ src, isMine }: CustomAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const requestRef = useRef<number | null>(null);

  const updateProgress = useCallback(() => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      requestRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (audioRef.current.currentTime >= audioRef.current.duration) {
        audioRef.current.currentTime = 0;
      }
      
      audioRef.current.play().catch(err => {
        if (err.name !== "AbortError") {
          toast.error("Không thể phát âm thanh.");
        }
      });
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(updateProgress);
    } else if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, updateProgress]);

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      if (audioRef.current.duration === Infinity) {
        audioRef.current.currentTime = 1e101;
        audioRef.current.ontimeupdate = () => {
          if (audioRef.current) {
            audioRef.current.ontimeupdate = null;
            setDuration(audioRef.current.duration);
            audioRef.current.currentTime = 0;
          }
        };
      } else {
        setDuration(audioRef.current.duration);
      }
      setLoadError(false);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time) || time === Infinity) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Generate a random but stable waveform pattern
  const bars = Array.from({ length: 40 }).map((_, i) => {
    const height = 15 + Math.abs(Math.sin(i * 0.4) * 20) + (i % 3) * 5;
    return height;
  });

  return (
    <div className={cn(
      "flex flex-col gap-1 p-2 rounded-xl w-full max-w-[340px] transition-all",
      isMine ? "bg-primary/5" : "bg-muted/50"
    )}>
      <audio
        ref={audioRef}
        src={src}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        onError={() => setLoadError(true)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="auto"
      />

      <div className="flex items-center gap-4">
        {/* Animated Play Button */}
        <button
          onClick={togglePlay}
          disabled={loadError}
          className={cn(
            "group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-all duration-300",
            loadError 
              ? "bg-muted text-muted-foreground" 
              : "bg-gradient-to-br from-[#0066FF] to-[#00A3FF] text-white shadow-[0_4px_15px_rgba(0,102,255,0.4)] hover:shadow-[0_6px_20px_rgba(0,102,255,0.6)] hover:scale-105 active:scale-95"
          )}
        >
          {/* Subtle pulse animation when playing */}
          {isPlaying && (
            <span className="absolute inset-0 rounded-full bg-[#0066FF] animate-ping opacity-20" />
          )}
          
          {isPlaying ? (
            <Pause className="h-6 w-6 fill-current transition-transform group-hover:scale-110" />
          ) : (
            <Play className="h-6 w-6 fill-current ml-1 transition-transform group-hover:scale-110" />
          )}
        </button>

        {/* Interactive Waveform Container */}
        <div className="flex flex-col flex-1 gap-2">
          <div 
            className="relative h-10 flex items-center gap-[2px] cursor-pointer group/wave"
            onClick={(e) => {
              if (!audioRef.current || loadError) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const percentage = Math.max(0, Math.min(1, x / rect.width));
              audioRef.current.currentTime = percentage * duration;
              setCurrentTime(audioRef.current.currentTime);
            }}
          >
            {bars.map((h, i) => {
              const barProgress = (i / bars.length) * 100;
              const isPast = barProgress <= progress;
              
              return (
                <div 
                  key={i}
                  className={cn(
                    "w-[2px] sm:w-[3px] rounded-full transition-all duration-300",
                    isPast ? "bg-[#0066FF]" : "bg-muted-foreground/20",
                    isPlaying && isPast ? "animate-pulse" : ""
                  )}
                  style={{ 
                    height: `${h}%`,
                    animationDelay: `${i * 0.05}s`,
                    animationDuration: '0.8s'
                  }}
                />
              );
            })}
            
            {/* Glossy Overlay for progress knob */}
            <div 
              className="absolute top-0 bottom-0 w-[4px] bg-white rounded-full shadow-[0_0_15px_#0066FF] z-10"
              style={{ 
                left: `calc(${progress}% - 2px)`,
                willChange: "left"
              }}
            />
          </div>
          
          {/* Time & Info */}
          <div className="flex justify-between items-center px-1">
            <span className={cn(
              "text-[11px] font-bold tabular-nums transition-colors",
              isPlaying ? "text-[#0066FF]" : "text-muted-foreground"
            )}>
              {formatTime(currentTime)}
            </span>
            <span className="text-[11px] font-bold text-muted-foreground opacity-60 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-1.5 text-[10px] text-destructive font-bold mt-1 px-1">
          <AlertCircle className="h-3 w-3" />
          <span>Lỗi phát bản ghi.</span>
        </div>
      )}
    </div>
  );
}
