import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = "https://translation-api-backend.onrender.com";

type TranscriptItem = {
  text: string;
  speaker: "Doctor" | "Patient";
  timestamp: string;
  isFinal: boolean;
};

export default function TranscriptionPage() {
  const router = useRouter();
  const consultationId = typeof router.query.id === "string" ? router.query.id : "";

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [currentText, setCurrentText] = useState("");
  const [currentSpeaker, setCurrentSpeaker] = useState<TranscriptItem["speaker"]>("Doctor");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentText]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });

      // pick a supported mimeType
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) simulateTranscription();
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setError("");
    } catch (err) {
      console.error("Microphone error:", err);
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (currentText) {
        setTranscript((prev) => [
          ...prev,
          {
            text: currentText,
            speaker: currentSpeaker,
            timestamp: new Date().toISOString(),
            isFinal: true,
          },
        ]);
        setCurrentText("");
      }
    }
  };

  const simulateTranscription = () => {
    const demoTexts: Array<{ text: string; speaker: TranscriptItem["speaker"] }> = [
      { text: "Hello, how are you feeling today?", speaker: "Doctor" },
      { text: "I've been having a headache for the past three days.", speaker: "Patient" },
      { text: "Can you describe the pain? Is it constant or intermittent?", speaker: "Doctor" },
      { text: "It's mostly on the right side and comes and goes.", speaker: "Patient" },
      { text: "Have you taken any medication for it?", speaker: "Doctor" },
      { text: "Yes, I took paracetamol but it didn't help much.", speaker: "Patient" },
      { text: "Let me check your blood pressure and temperature.", speaker: "Doctor" },
      { text: "Your blood pressure is 130/85 and temperature is 98.6°F.", speaker: "Doctor" },
      { text: "This appears to be a tension headache.", speaker: "Doctor" },
      { text: "I'll prescribe medication and advise you to rest more.", speaker: "Doctor" },
    ];

    const demo = demoTexts[Math.floor(Math.random() * demoTexts.length)];

    setTimeout(() => {
      setCurrentText(demo.text);
      setCurrentSpeaker(demo.speaker);

      setTimeout(() => {
        setTranscript((prev) => [
          ...prev,
          {
            text: demo.text,
            speaker: demo.speaker,
            timestamp: new Date().toISOString(),
            isFinal: true,
          },
        ]);
        setCurrentText("");
      }, 2000);
    }, 500);
  };

  const handleGenerateSummary = async () => {
    if (!consultationId) return; // wait until router is ready

    setIsGenerating(true);
    setError("");

    try {
      const token = Cookies.get("token");

      // ✅ FIXED: Changed from POST to PUT and added /transcript to the endpoint
      await axios.put(
        `${API_BASE_URL}/api/consultations/${consultationId}/transcript`,
        { transcript },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Generate the summary
      await axios.post(
        `${API_BASE_URL}/api/consultations/${consultationId}/summary`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      router.push(`/summary/${consultationId}`);
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const shortId = consultationId ? consultationId.slice(0, 8) : "Loading...";

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="card mb-6">
          <h1 className="text-3xl font-bold text-primary-600 mb-2">
            Live Consultation Transcription
          </h1>
          <p className="text-gray-600">Consultation ID: {shortId}</p>
        </div>

        {/* Main Content */}
        <div className="card">
          {/* Controls */}
          <div className="flex justify-between items-center pb-6 mb-6 border-b-2 border-gray-200">
            <div className="flex items-center gap-4">
              {!isRecording ? (
                <button onClick={startRecording} className="btn-success flex items-center gap-2">
                  <span className="text-2xl">🎤</span>
                  Start Recording
                </button>
              ) : (
                <button onClick={stopRecording} className="btn-danger flex items-center gap-2">
                  <span className="text-2xl">⏹️</span>
                  Stop Recording
                </button>
              )}

              {isRecording && (
                <div className="flex items-center gap-2 text-red-600 font-semibold">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Recording...
                </div>
              )}
            </div>

            <div className="text-right text-sm text-gray-600">
              <p>🌐 Languages: English, Hindi</p>
              <p>👥 Speaker Detection: Active</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
              {error}
            </div>
          )}

          {/* Transcript */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Live Transcript</h2>
            <div className="bg-gray-50 rounded-xl p-6 min-h-[400px] max-h-[500px] overflow-y-auto">
              {transcript.length === 0 && !currentText && (
                <div className="text-center py-20 text-gray-400">
                  <svg className="mx-auto h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  <p className="text-lg">Start recording to see live transcription...</p>
                </div>
              )}

              {transcript.map((item, index) => (
                <div
                  key={index}
                  className={item.speaker === "Doctor" ? "transcript-doctor" : "transcript-patient"}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`font-bold text-sm uppercase ${
                        item.speaker === "Doctor" ? "text-primary-600" : "text-green-600"
                      }`}
                    >
                      {item.speaker}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{item.text}</p>
                </div>
              ))}

              {currentText && (
                <div
                  className={`${
                    currentSpeaker === "Doctor" ? "transcript-doctor" : "transcript-patient"
                  } opacity-80`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span
                      className={`font-bold text-sm uppercase ${
                        currentSpeaker === "Doctor" ? "text-primary-600" : "text-green-600"
                      }`}
                    >
                      {currentSpeaker}
                    </span>
                    <span className="text-primary-500 animate-pulse">●●●</span>
                  </div>
                  <p className="text-gray-800 leading-relaxed">{currentText}</p>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button onClick={() => router.push("/dashboard")} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleGenerateSummary}
              disabled={!consultationId || transcript.length === 0 || isGenerating}
              className="btn-primary"
            >
              {isGenerating ? "Generating..." : "Generate Summary →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}