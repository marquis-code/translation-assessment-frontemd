import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = "https://translation-api-backend.onrender.com"
const WS_BASE_URL = "ws://translation-api-backend.onrender.com"
// const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000";

export default function TranscriptionPage() {
  const router = useRouter();
  const { id: consultationId } = router.query;

  const [isRecording, setIsRecording] = useState(false) as any
  const [transcript, setTranscript] = useState([]) as any
  const [currentText, setCurrentText] = useState("") as any
  const [currentSpeaker, setCurrentSpeaker] = useState("Doctor") as any
  const [error, setError] = useState("") as any
  const [isGenerating, setIsGenerating] = useState(false) as any
  const [recordingDuration, setRecordingDuration] = useState(0) as any
  const [connectionStatus, setConnectionStatus] = useState("disconnected") as any
  const [audioLevel, setAudioLevel] = useState(0);

  const websocketRef = useRef(null) as any
  const audioContextRef = useRef(null) as any
  const mediaStreamRef = useRef(null) as any
  const processorRef = useRef(null) as any
  const transcriptEndRef = useRef(null) as any
  const durationIntervalRef = useRef(null) as any
  const analyserRef = useRef(null) as any
  const animationFrameRef = useRef(null) as any

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
      return;
    }

    if (!consultationId) return;

    // Auto-scroll to bottom when transcript updates
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, currentText, consultationId, router]);

  useEffect(() => {
    if (isRecording) {
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev: any) => prev + 1);
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

  const formatDuration = (seconds: any) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateAudioLevel = () => {
    if (!analyserRef.current || !isRecording) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(Math.min(100, (average / 128) * 100));
    
    animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
  };

  const startRecording = async () => {
    try {
      setConnectionStatus("connecting");
      setError("");
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Create analyzer for audio level visualization
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      // Build WebSocket URL
      const wsUrl = `${WS_BASE_URL}/ws/transcribe/${consultationId}`;
      console.log("Connecting to WebSocket:", wsUrl);
      
      const ws = new WebSocket(wsUrl);
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnectionStatus("connected");
        setError("");
        setIsRecording(true);
        updateAudioLevel();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received:", data);
          
          if (data.type === "transcript") {
            if (data.is_final) {
              setTranscript((prev: any) => [
                ...prev,
                {
                  text: data.text,
                  speaker: data.speaker,
                  timestamp: data.timestamp || new Date().toISOString(),
                  isFinal: true,
                  confidence: data.confidence || 0.95
                },
              ]);
              setCurrentText("");
            } else {
              setCurrentText(data.text);
              setCurrentSpeaker(data.speaker);
            }
          } else if (data.type === "status") {
            console.log("Status:", data.message);
            if (data.status === "error") {
              setError(data.message);
              setConnectionStatus("error");
            }
          }
        } catch (err) {
          console.error("Error parsing WebSocket message:", err);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error. Please try again.");
        setConnectionStatus("error");
      };

      ws.onclose = () => {
        console.log("WebSocket closed");
        setConnectionStatus("disconnected");
        setIsRecording(false);
      };

      // Process audio and send to WebSocket
      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Convert Float32Array to Int16Array (PCM 16-bit)
          const pcmData = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          ws.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

    } catch (err) {
      console.error("Microphone error:", err);
      setError("Failed to access microphone. Please check permissions.");
      setConnectionStatus("error");
    }
  };

  const stopRecording = () => {
    // Stop audio level animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    // Close WebSocket
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.close();
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    // Disconnect processor
    if (processorRef.current) {
      processorRef.current.disconnect();
    }

    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track: any) => track.stop());
    }

    setIsRecording(false);
    setConnectionStatus("disconnected");
    setAudioLevel(0);

    // Add current text as final if exists
    if (currentText) {
      setTranscript((prev: any) => [
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
  };

  const handleGenerateSummary = async () => {
    if (transcript.length === 0) {
      setError("No transcript available to generate summary");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const token = Cookies.get("token");
      const response = await fetch(
        `${API_BASE_URL}/api/consultations/${consultationId}/summary`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      // Navigate to summary page
      router.push(`/summary/${consultationId}`);
    } catch (err) {
      console.error("Error generating summary:", err);
      setError("Failed to generate summary. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    router.push("/dashboard");
  };

  if (!consultationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-800 text-lg font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  const shortId = typeof consultationId === "string" ? consultationId.slice(0, 8) : "Loading";
  const transcriptCount = transcript.length;
  const wordCount = transcript.reduce((acc: any, item: any) => acc + item.text.split(' ').length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with Stats */}
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
                  <p className="text-sm text-gray-600">
                    Session ID: <span className="font-mono text-gray-800">{shortId}</span>
                  </p>
                </div>
              </div>
            </div>

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
              
              <div className="flex items-center gap-4 flex-wrap">
                {!isRecording ? (
                  <button 
                    onClick={startRecording} 
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3 transform hover:scale-105"
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
                    className="bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                  >
                    <div className="bg-white/20 rounded-lg p-2">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-lg">Stop Recording</span>
                  </button>
                )}

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

                {isRecording && (
                  <div className="bg-white rounded-xl px-4 py-3 border border-gray-200 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-150"
                        style={{ width: `${audioLevel}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                connectionStatus === 'connected' ? 'bg-blue-100 text-blue-800' :
                connectionStatus === 'connecting' ? 'bg-gray-200 text-gray-700' :
                connectionStatus === 'error' ? 'bg-gray-200 text-gray-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                {connectionStatus === 'connected' ? '● Connected' :
                 connectionStatus === 'connecting' ? '○ Connecting...' :
                 connectionStatus === 'error' ? '✕ Connection Error' :
                 '○ Disconnected'}
              </div>
            </div>
          </div>

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

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[450px] max-h-[550px] overflow-y-auto border border-gray-200">
              
              {transcript.length === 0 && !currentText && (
                <div className="flex flex-col items-center justify-center h-full text-center py-16">
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-full p-6 mb-6">
                    <svg className="w-16 h-16 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Start</h3>
                  <p className="text-gray-600 max-w-md">Click "Start Recording" to begin capturing your consultation. Speech will be transcribed in real-time with automatic speaker detection.</p>
                </div>
              )}

              {transcript.map((item: any, index: any) => (
                <div
                  key={index}
                  className={`mb-4 p-4 rounded-xl transition-all hover:shadow-md ${
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
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
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
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
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
              <span>Real-time transcription with speaker detection</span>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleCancel}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-800 font-semibold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSummary}
                disabled={transcript.length === 0 || isGenerating || isRecording}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-900 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Generate Summary</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}