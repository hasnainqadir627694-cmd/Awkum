import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Trash2,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import { VoiceInstructionPlayer } from '../common/VoiceInstructionPlayer';

interface VoiceRecorderProps {
  onAudioReady: (audioBlob: Blob | null, durationSeconds: number, durationFormatted: string) => void;
  initialAudioUrl?: string;
  disabled?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onAudioReady,
  initialAudioUrl,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHolding, setIsHolding] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const holdStartTimestampRef = useRef<number>(0);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const MAX_SECONDS = 180; // 3 minutes max

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = Math.floor(totalSec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const startRecording = async () => {
    if (disabled || isRecording) return;
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMessage(
        'Voice recording is not supported in this browser. Please use Chrome, Edge, or Firefox.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      activeStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Get final seconds
        setRecordingSeconds((finalSec) => {
          const formatted = formatTime(finalSec || 1);
          onAudioReady(audioBlob, finalSec || 1, formatted);
          return finalSec;
        });

        // Release hardware mic
        stream.getTracks().forEach((track) => track.stop());
        activeStreamRef.current = null;
      };

      recorder.start(200); // 200ms slices
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev + 1 >= MAX_SECONDS) {
            stopRecording();
            return MAX_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('[Voice Recorder] Microphone access issue:', err?.message || err);
      const isPermissionDenied =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err).includes('Permission denied') ||
        String(err).includes('NotAllowedError');

      if (isPermissionDenied) {
        setErrorMessage(
          'Microphone permission is blocked. Please allow microphone access in your browser settings to record voice notes.'
        );
      } else {
        setErrorMessage(
          err?.message || 'Unable to access your microphone hardware. Please check audio settings.'
        );
      }
    }
  };

  const stopRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    setIsHolding(false);
  }, []);

  const discardAudio = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }

    setIsRecording(false);
    setIsHolding(false);
    setAudioUrl(null);
    setRecordingSeconds(0);
    setErrorMessage('');
    onAudioReady(null, 0, '0:00');
  };

  // WhatsApp-Style Hold to Record handlers
  const handlePointerDown = () => {
    if (disabled || audioUrl) return;
    holdStartTimestampRef.current = Date.now();
    setIsHolding(true);
    startRecording();
  };

  const handlePointerUp = () => {
    if (!isRecording) {
      setIsHolding(false);
      return;
    }
    // If hold was very short (< 400ms), let it continue recording so tap works as toggle
    const duration = Date.now() - holdStartTimestampRef.current;
    if (duration > 400 && isHolding) {
      stopRecording();
    }
  };

  return (
    <div className="space-y-3">
      {/* Error Message */}
      {errorMessage && (
        <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs rounded-2xl flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="text-[11px] font-bold text-[#806A56] hover:text-[#38271C] underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* State 1: Active Live Recording (WhatsApp Style) */}
      {isRecording ? (
        <div className="p-4 bg-gradient-to-r from-[#FDE8E4] to-[#FFF3E8] border-2 border-[#C84B31]/40 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
          {/* Pulsing indicator and waveform simulation */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex h-4 w-4 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-extrabold text-[#C84B31] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Recording Spoken Voice Instructions</span>
              </span>
              <span className="text-xs font-mono font-bold text-[#493222]">
                {formatTime(recordingSeconds)} / {formatTime(MAX_SECONDS)}
              </span>
            </div>

            {/* Visualizer Wave Bars */}
            <div className="flex items-center gap-1 ml-auto sm:ml-4 h-6">
              {[40, 70, 100, 60, 85, 45, 90, 65, 30, 80].map((h, i) => (
                <span
                  key={i}
                  className="w-1 bg-[#C84B31] rounded-full animate-pulse"
                  style={{
                    height: `${Math.max(20, (h * (recordingSeconds % 3 + 1)) / 3)}%`,
                    animationDuration: `${0.4 + (i % 4) * 0.15}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={discardAudio}
              className="px-3 py-2 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#806A56] hover:text-[#C84B31] text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="px-4 py-2 bg-[#C84B31] hover:bg-[#A73B24] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop & Listen</span>
            </button>
          </div>
        </div>
      ) : audioUrl ? (
        /* State 2: Voice Note Recorded & Ready for Review */
        <div className="space-y-3 p-4 bg-white border border-[#E6D8C7] rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#668064] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#668064]" />
              <span>Voice Note Recorded Successfully</span>
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={startRecording}
                disabled={disabled}
                className="px-2.5 py-1 text-[11px] font-bold text-[#493222] hover:bg-[#F8F0E5] rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Discard and record fresh voice note"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Re-record</span>
              </button>
              <button
                type="button"
                onClick={discardAudio}
                disabled={disabled}
                className="px-2.5 py-1 text-[11px] font-bold text-[#C84B31] hover:bg-[#FDE8E4] rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Remove voice note"
              >
                <Trash2 className="w-3 h-3" />
                <span>Discard</span>
              </button>
            </div>
          </div>

          {/* Interactive Player with Scrubber */}
          <VoiceInstructionPlayer
            audioUrl={audioUrl}
            durationFormatted={formatTime(recordingSeconds)}
            title="Spoken Assignment Instructions Preview"
            compact={false}
          />
        </div>
      ) : (
        /* State 3: Ready to Record (WhatsApp Style: Hold or Tap) */
        <div className="relative">
          <div
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            className={`w-full p-4.5 bg-[#FFFDF9] hover:bg-[#FFF9F1] border-2 border-dashed border-[#D8C7B4] hover:border-[#493222] rounded-2xl transition-all cursor-pointer group select-none flex items-center justify-between gap-3 ${
              disabled ? 'opacity-50 pointer-events-none' : ''
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#493222] text-[#FFF9F1] flex items-center justify-center shadow-xs group-hover:scale-105 group-active:scale-95 transition-transform shrink-0">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-[#38271C] block group-hover:text-[#493222]">
                  Hold or Tap to Record Spoken Instructions
                </span>
                <span className="text-xs text-[#806A56] block">
                  Speak instructions directly on the spot (up to 3 min). Upload button is disabled.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                startRecording();
              }}
              disabled={disabled}
              className="px-3.5 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Tap to Record</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
