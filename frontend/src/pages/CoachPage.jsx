import { useState, useRef, useCallback, useEffect } from "react";
import RecordingControls from "../components/RecordingControls";
import MessageDisplay from "../components/MessageDisplay";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { useToast } from "../components/toast-context";

export default function CoachPage() {
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [textInput, setTextInput] = useState("");

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const conversationHistoryRef = useRef([]);
  const audioRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const showToast = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const playAudio = useCallback(
    (base64Audio, contentType, text = "") => {
      if (!voiceEnabled) return;

      const speakWithBrowser = () => {
        if (!text || !window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      };

      if (!base64Audio) {
        speakWithBrowser();
        return;
      }

      try {
        const binary = atob(base64Audio);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: contentType || "audio/wav" });
        const url = URL.createObjectURL(blob);

        if (audioRef.current) {
          audioRef.current.pause();
        }
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }

        const audio = new Audio(url);
        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          setIsSpeaking(false);
        };
        audio.play().catch(() => {
          URL.revokeObjectURL(url);
          speakWithBrowser();
        });
        audioRef.current = audio;
      } catch (err) {
        console.error("Failed to play audio:", err);
        speakWithBrowser();
      }
    },
    [voiceEnabled]
  );

  const startRecording = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try webm first, fall back to default
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = undefined; // let browser choose
        }
      }

      const options = mimeType ? { mimeType } : {};
      const mediaRecorder = new MediaRecorder(stream, options);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        if (blob.size < 1000) {
          setError("Recording too short. Please hold the button and speak for at least 2 seconds.");
          setIsLoading(false);
          showToast("error", "Recording too short. Please speak for at least 2 seconds.");
          return;
        }

        await sendAudio(blob);
      };

      // Collect data every 1 second for reliability
      mediaRecorder.start(1000);
      setIsRecording(true);
    } catch (err) {
      setError("Micro access denied. Please allow microphone access and try again.");
      showToast("error", "Microphone access denied. Please allow microphone access and try again.");
      console.error("Recording error:", err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  const sendAudio = async (audioBlob) => {
    setIsLoading(true);
    setError("");

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce(
          (data, byte) => data + String.fromCharCode(byte),
          ""
        )
      );

      const response = await fetch("/api/voice/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: base64,
          history: conversationHistoryRef.current,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to process voice";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Update conversation history
      const userMessage = { role: "user", content: data.transcript };
      const assistantMessage = { role: "assistant", content: data.aiResponse };

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        userMessage,
        assistantMessage,
      ];

      setMessages((prev) => [
        ...prev,
        userMessage,
        assistantMessage,
      ]);

      showToast("success", "Got your voice reply from the AI coach.");
      // Speak the AI response back
      playAudio(data.audio, data.audioContentType, data.aiResponse);
    } catch (err) {
      setError(err.message || "Something went wrong");
      showToast("error", err.message || "Something went wrong");
      console.error("Send audio error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    stopSpeaking();
    setMessages([]);
    conversationHistoryRef.current = [];
    setError("");
    setTextInput("");
    showToast("info", "Conversation cleared.");
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const sendText = async () => {
    if (!textInput.trim() || isLoading) return;

    const userText = textInput.trim();
    setTextInput("");
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/voice/process-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: userText,
          history: conversationHistoryRef.current,
        }),
      });

      if (!response.ok) {
        let errorMsg = "Failed to get response";
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      const data = await response.json();

      const userMessage = { role: "user", content: data.transcript || userText };
      const assistantMessage = { role: "assistant", content: data.aiResponse };

      conversationHistoryRef.current = [
        ...conversationHistoryRef.current,
        userMessage,
        assistantMessage,
      ];

      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      showToast("success", "Sent. Check the AI coach's reply below.");
      // Speak the AI response back
      playAudio(data.audio, data.audioContentType, data.aiResponse);
    } catch (err) {
      setError(err.message || "Something went wrong");
      showToast("error", err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    setVoiceEnabled((v) => {
      const willEnable = !v;
      if (!willEnable) stopSpeaking();
      showToast("info", willEnable ? "AI voice enabled." : "AI voice muted.");
      return willEnable;
    });
  };

  return (
    <div className="bg-gradient-to-b from-slate-50 to-slate-100">
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Page heading */}
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Voice Career Coach</h1>
          <p className="text-sm text-slate-500 mt-1">
            Speak naturally or type a message. The AI coach replies with personalized career
            guidance — and reads it back to you.
          </p>
        </header>

        {/* Error display */}
        <ErrorMessage message={error} onDismiss={() => setError("")} />

        {/* Messages area */}
        <div
          aria-live="polite"
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-6 min-h-[300px] max-h-[60vh] overflow-y-auto"
        >
          <MessageDisplay messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center mb-4">
            <LoadingSpinner message={isRecording ? "Processing your voice..." : "Talking to the AI coach..."} />
          </div>
        )}

        {/* AI speaking state */}
        {isSpeaking && (
          <div className="flex justify-center mb-4">
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-2">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
              AI is speaking...
            </div>
          </div>
        )}

        {/* Recording controls */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <RecordingControls
            isRecording={isRecording}
            isLoading={isLoading}
            onStart={startRecording}
            onStop={stopRecording}
            onClear={clearConversation}
          />

          {/* AI voice toggle */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={toggleVoice}
              title={voiceEnabled ? "Mute AI voice" : "Enable AI voice"}
              className={`px-3 py-2 rounded-full border text-sm font-medium transition-colors ${
                voiceEnabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
          </div>

          {/* Text input fallback */}
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-400 mb-2 text-center">Or type instead of speaking</p>
            <div className="flex gap-2 w-full min-w-0">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendText()}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 min-w-0 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
              />
              <button
                onClick={sendText}
                disabled={!textInput.trim() || isLoading}
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}