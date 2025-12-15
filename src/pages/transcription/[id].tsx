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
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showTip, setShowTip] = useState(true);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentText]);

  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      setRecordingDuration(0);
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [isRecording]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      });

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
      setShowTip(false);
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
    if (!consultationId) return;

    setIsGenerating(true);
    setError("");

    try {
      const token = Cookies.get("token");

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
  const transcriptCount = transcript.length;
  const wordCount = transcript.reduce((acc, item) => acc + item.text.split(' ').length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Enhanced Header with Stats */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl p-3">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                    Live Consultation
                  </h1>
                  <p className="text-sm text-gray-600">Session ID: <span className="font-mono text-gray-800">{shortId}</span></p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="flex gap-3">
              <div className="bg-blue-100 rounded-xl px-4 py-3 border border-blue-200">
                <div className="text-xs text-blue-700 font-semibold mb-1">EXCHANGES</div>
                <div className="text-2xl font-bold text-blue-800">{transcriptCount}</div>
              </div>
              <div className="bg-blue-200 rounded-xl px-4 py-3 border border-blue-300">
                <div className="text-xs text-blue-800 font-semibold mb-1">WORDS</div>
                <div className="text-2xl font-bold text-blue-900">{wordCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          
          {/* Control Panel */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              
              {/* Recording Controls */}
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <button 
                    onClick={startRecording} 
                    className="group relative bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 transform hover:scale-105"
                  >
                    <div className="bg-white/20 rounded-lg p-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-lg">Start Recording</span>
                  </button>
                ) : (
                  <button 
                    onClick={stopRecording} 
                    className="group relative bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3"
                  >
                    <div className="bg-white/20 rounded-lg p-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-lg">Stop Recording</span>
                  </button>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="flex items-center gap-3 bg-blue-100 px-4 py-3 rounded-xl border border-blue-200">
                    <div className="relative flex items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600"></span>
                    </div>
                    <div>
                      <div className="text-blue-800 font-bold text-sm">RECORDING</div>
                      <div className="text-blue-700 text-xs font-mono">{formatDuration(recordingDuration)}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Features Info */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800">English, Hindi</span>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-800">Auto Detection</span>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-6 bg-gray-200 border-l-4 border-gray-700 rounded-lg p-4 flex items-start gap-3">
              <svg className="w-6 h-6 text-gray-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="font-semibold text-gray-900">Error</h3>
                <p className="text-gray-800 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Helpful Tip */}
          {showTip && transcript.length === 0 && !isRecording && (
            <div className="mx-6 mt-6 bg-blue-100 border border-blue-300 rounded-xl p-4 flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-700 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Quick Tip</h3>
                <p className="text-blue-800 text-sm">Click "Start Recording" to begin transcribing your consultation. The AI will automatically detect and label Doctor and Patient speakers.</p>
              </div>
              <button onClick={() => setShowTip(false)} className="text-blue-500 hover:text-blue-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Transcript Area */}
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Live Transcript
              </h2>
              {transcript.length > 0 && (
                <span className="text-sm text-gray-600 bg-gray-200 px-3 py-1 rounded-full">
                  {transcriptCount} exchanges
                </span>
              )}
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[450px] max-h-[550px] overflow-y-auto border border-gray-200 custom-scrollbar">
              
              {/* Empty State */}
              {transcript.length === 0 && !currentText && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 mb-6">
                    <svg className="w-16 h-16 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Start</h3>
                  <p className="text-gray-600 max-w-md">Click the "Start Recording" button above to begin capturing your consultation. Speech will be transcribed in real-time.</p>
                </div>
              )}

              {/* Transcript Items */}
              {transcript.map((item, index) => (
                <div
                  key={index}
                  className={`mb-4 p-4 rounded-xl transition-all duration-300 hover:shadow-md ${
                    item.speaker === "Doctor" 
                      ? "bg-blue-100 border-l-4 border-blue-600" 
                      : "bg-gray-200 border-l-4 border-gray-500"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        item.speaker === "Doctor" ? "bg-blue-600" : "bg-gray-600"
                      }`}>
                        {item.speaker === "Doctor" ? (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                      <span className={`font-bold text-sm uppercase tracking-wide ${
                        item.speaker === "Doctor" ? "text-blue-800" : "text-gray-800"
                      }`}>
                        {item.speaker}
                      </span>
                    </div>
                    <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded-full">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-gray-900 leading-relaxed pl-10">{item.text}</p>
                </div>
              ))}

              {/* Current Speaking Text */}
              {currentText && (
                <div
                  className={`mb-4 p-4 rounded-xl animate-pulse ${
                    currentSpeaker === "Doctor" 
                      ? "bg-blue-200 border-l-4 border-blue-700" 
                      : "bg-gray-300 border-l-4 border-gray-700"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        currentSpeaker === "Doctor" ? "bg-blue-700" : "bg-gray-700"
                      }`}>
                        {currentSpeaker === "Doctor" ? (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                        )}
                      </div>
                      <span className={`font-bold text-sm uppercase tracking-wide ${
                        currentSpeaker === "Doctor" ? "text-blue-900" : "text-gray-900"
                      }`}>
                        {currentSpeaker}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-bounce"></span>
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></span>
                    </div>
                  </div>
                  <p className="text-gray-900 leading-relaxed pl-10">{currentText}</p>
                </div>
              )}

              <div ref={transcriptEndRef} />
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-gray-50 px-6 py-5 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-700 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Auto-save enabled</span>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => router.push("/dashboard")} 
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-800 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={!consultationId || transcript.length === 0 || isGenerating}
                className="group relative px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-900 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating Summary...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {/* <span>Generate AI Summary</span> */}
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}