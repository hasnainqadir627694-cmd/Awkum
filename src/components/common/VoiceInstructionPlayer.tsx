import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic } from 'lucide-react';

interface VoiceInstructionPlayerProps {
  audioUrl: string;
  durationFormatted?: string;
  compact?: boolean;
  title?: string;
  className?: string;
}

export const VoiceInstructionPlayer: React.FC<VoiceInstructionPlayerProps> = ({
  audioUrl,
  durationFormatted,
  compact = false,
  title = 'Teacher Voice Instructions',
  className = '',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setHasError(false);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const onError = () => {
      setHasError(true);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [audioUrl]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.info('[Voice Player] Playback blocked or failed:', err);
        setIsPlaying(false);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const seekTime = Number(e.target.value);
    audio.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const displayDuration = duration > 0 ? formatSeconds(duration) : (durationFormatted || '0:00');
  const displayCurrent = formatSeconds(currentTime);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (hasError) {
    return (
      <div className={`p-2.5 bg-[#FDE8E4] border border-[#F5C2B8] rounded-xl text-xs text-[#C84B31] flex items-center gap-2 ${className}`}>
        <Mic className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">Audio instruction file could not be loaded.</span>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`bg-white border border-[#E6D8C7] rounded-xl transition-all shadow-2xs select-none ${
        compact ? 'p-2' : 'p-3'
      } ${className}`}
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <div className="flex items-center gap-2.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 rounded-full bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-xs cursor-pointer"
          aria-label={isPlaying ? 'Pause voice instructions' : 'Play voice instructions'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Info & Progress */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-bold text-[#38271C] truncate flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="truncate">{title}</span>
            </span>
            <span className="font-mono text-[10px] text-[#806A56] shrink-0 font-semibold ml-2">
              {displayCurrent} / {displayDuration}
            </span>
          </div>

          {/* Progress / Seek bar */}
          <div className="relative w-full flex items-center">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-[#EFE3D3] rounded-lg appearance-none cursor-pointer accent-[#493222] focus:outline-none"
              style={{
                background: `linear-gradient(to right, #493222 ${progressPercent}%, #EFE3D3 ${progressPercent}%)`,
              }}
            />
          </div>
        </div>

        {/* Volume / Mute */}
        <button
          type="button"
          onClick={toggleMute}
          className="p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#F8F0E5] rounded-lg transition-colors cursor-pointer shrink-0"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-[#C84B31]" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};
