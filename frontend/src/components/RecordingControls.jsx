import { useState, useEffect } from "react";

export default function RecordingControls({
  isRecording,
  isLoading,
  onStart,
  onStop,
  onClear,
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!isRecording) {
      setSeconds(0);
      return;
    }
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Recording timer */}
      {isRecording && (
        <div className="flex items-center gap-2 text-red-600 font-mono text-lg">
          <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
          {formatTime(seconds)}
        </div>
      )}

      {/* Recording buttons */}
      <div className="flex gap-4">
        {!isRecording ? (
          <button
            onClick={onStart}
            disabled={isLoading}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-semibold rounded-full transition-colors flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </svg>
            Start Recording
          </button>
        ) : (
          <button
            onClick={onStop}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-colors flex items-center gap-2 animate-pulse"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            Stop Recording
          </button>
        )}
      </div>

      {/* Hint */}
      {isRecording && (
        <p className="text-sm text-gray-500">Speak clearly for at least 3 seconds</p>
      )}

      {/* Clear conversation */}
      <button
        onClick={onClear}
        disabled={isLoading}
        className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
      >
        Clear Conversation
      </button>
    </div>
  );
}
