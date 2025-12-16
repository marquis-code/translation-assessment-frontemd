import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";

// const API_BASE_URL = "http://localhost:8000";
const API_BASE_URL = "https://translation-api-backend.onrender.com"

type Summary = {
  identifiers: string;
  history: string;
  examination: string;
  diagnoses: string;
  treatment: string;
  advice: string;
  next_steps: string;
};

type Consultation = {
  status?: string;
  completed_at?: string;
  created_at?: string;
  summary?: Partial<Summary>;
  transcript?: Array<{ speaker: string; text: string }>;
  [key: string]: any;
};

export default function SummaryPage() {
  const router = useRouter();
  const consultationId = typeof router.query.id === "string" ? router.query.id : "";

  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [summary, setSummary] = useState<Summary>({
    identifiers: "",
    history: "",
    examination: "",
    diagnoses: "",
    treatment: "",
    advice: "",
    next_steps: "",
  });

  const [isEditing, setIsEditing] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
      return;
    }

    if (!consultationId) return;

    fetchConsultation();
  }, [consultationId, router]);

  const fetchConsultation = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get(`${API_BASE_URL}/api/consultations/${consultationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setConsultation(response.data);

      if (response.data?.summary) {
        setSummary((prev) => ({ ...prev, ...response.data.summary }));
        setIsEditing(false);
      } else {
        await generateSummary();
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to load consultation.");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    try {
      const token = Cookies.get("token");
      const response = await axios.post(
        `${API_BASE_URL}/api/consultations/${consultationId}/summary`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSummary((prev) => ({ ...prev, ...(response.data?.summary ?? {}) }));
    } catch (err) {
      console.error("Error:", err);
      setSummary({
        identifiers: "Name: [To be filled]\nAge: [To be filled]\nSex: [To be filled]\nLocation: [To be filled]",
        history: "Chief Complaint: [Document patient's main concerns]",
        examination: "Vital Signs: [Record examination findings]",
        diagnoses: "Assessment: [Clinical diagnosis]",
        treatment: "Treatment Plan: [Prescribed medications and procedures]",
        advice: "Patient Counseling: [Lifestyle advice and education]",
        next_steps: "Follow-up: [Schedule and investigations]",
      });
    }
  };

  const handleChange = (field: keyof Summary, value: string) => {
    setSummary((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = Cookies.get("token");
      await axios.put(`${API_BASE_URL}/api/consultations/${consultationId}/summary`, summary, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      setIsEditing(false);
      
      // Show success message
      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50 animate-pulse';
      successDiv.innerHTML = '✅ Summary saved successfully!';
      document.body.appendChild(successDiv);
      setTimeout(() => successDiv.remove(), 3000);
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to save summary.");
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (isEditing) {
      alert("Please save the summary before marking as completed.");
      return;
    }

    try {
      const token = Cookies.get("token");
      await axios.post(
        `${API_BASE_URL}/api/consultations/${consultationId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const successDiv = document.createElement('div');
      successDiv.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50';
      successDiv.innerHTML = '🎉 Consultation completed!';
      document.body.appendChild(successDiv);
      
      setTimeout(() => {
        successDiv.remove();
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to complete consultation.");
    }
  };

  const handleExport = () => {
    const text = Object.entries(summary)
      .map(([key, value]) => {
        const title = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
        return `${title}:\n${value}\n`;
      })
      .join('\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consultation-${consultationId.slice(0, 8)}.txt`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-800 text-lg font-medium">Loading consultation...</p>
        </div>
      </div>
    );
  }

  const sections: Array<{
    key: keyof Summary;
    title: string;
    icon: string;
    rows: number;
    placeholder: string;
    bgColor: string;
  }> = [
    { 
      key: "identifiers", 
      title: "Patient Identifiers", 
      icon: "👤",
      rows: 4, 
      placeholder: "Enter patient name, age, sex, and location",
      bgColor: "bg-blue-100"
    },
    { 
      key: "history", 
      title: "Medical History", 
      icon: "📋",
      rows: 6, 
      placeholder: "Chief complaints, history of present illness, past medical history",
      bgColor: "bg-blue-200"
    },
    { 
      key: "examination", 
      title: "Clinical Examination", 
      icon: "🔬",
      rows: 5, 
      placeholder: "Physical examination findings and vital signs",
      bgColor: "bg-gray-200"
    },
    { 
      key: "diagnoses", 
      title: "Diagnosis & Assessment", 
      icon: "🩺",
      rows: 4, 
      placeholder: "Clinical assessment and diagnoses",
      bgColor: "bg-blue-300"
    },
    { 
      key: "treatment", 
      title: "Treatment Plan", 
      icon: "💊",
      rows: 5, 
      placeholder: "Medications, procedures, and treatment plan",
      bgColor: "bg-gray-300"
    },
    { 
      key: "advice", 
      title: "Patient Counseling", 
      icon: "💬",
      rows: 4, 
      placeholder: "Lifestyle changes, dietary advice, patient education",
      bgColor: "bg-blue-100"
    },
    { 
      key: "next_steps", 
      title: "Follow-up & Next Steps", 
      icon: "📅",
      rows: 4, 
      placeholder: "Follow-up appointments and investigations",
      bgColor: "bg-blue-200"
    },
  ];

  const shortId = consultationId ? consultationId.slice(0, 8) : "Loading...";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-100 to-blue-100">
      {/* Header Bar */}
      <div className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="font-medium text-gray-800">Back</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Clinical Summary</h1>
                <p className="text-sm text-gray-600">ID: {shortId}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {consultation?.transcript && (
                <button
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
                >
                  <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-medium text-gray-800">Transcript</span>
                </button>
              )}

              <button
                onClick={handleExport}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-all"
              >
                <svg className="w-5 h-5 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-800">Export</span>
              </button>

              {consultation?.status !== "completed" && (
                <>
                  {isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all disabled:opacity-60"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>{saving ? "Saving..." : "Save"}</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center space-x-2 px-6 py-2 bg-gray-700 hover:bg-gray-800 text-white font-semibold rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Edit</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Banner */}
        {consultation?.status === "completed" && (
          <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-1">Consultation Completed</h3>
                <p className="text-blue-100">
                  Completed on: {consultation?.completed_at ? new Date(consultation.completed_at).toLocaleString() : "—"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {sections.map((section, index) => (
              <div key={section.key} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                <div className={`${section.bgColor} px-6 py-4 border-b border-gray-300`}>
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <span>{index + 1}. {section.title}</span>
                  </h2>
                </div>

                <div className="p-6">
                  <textarea
                    value={summary[section.key]}
                    onChange={(e) => handleChange(section.key, e.target.value)}
                    disabled={!isEditing}
                    placeholder={section.placeholder}
                    rows={section.rows}
                    className={`w-full px-4 py-3 border-2 rounded-xl font-sans text-gray-900 leading-relaxed resize-y transition-all ${
                      isEditing
                        ? "border-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                        : "border-gray-200 bg-gray-100 cursor-not-allowed"
                    }`}
                  />
                </div>
              </div>
            ))}

            {/* Complete Button */}
            {consultation?.status !== "completed" && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
                <div className="text-center">
                  <button
                    onClick={handleComplete}
                    disabled={isEditing}
                    className="inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white font-bold px-12 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Mark as Completed</span>
                  </button>

                  {isEditing && (
                    <p className="text-sm text-gray-600 mt-4">
                      💡 Save the summary before marking as completed
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Consultation Info */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Consultation Info
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <span className="text-gray-700">Status</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    consultation?.status === "completed"
                      ? "bg-blue-200 text-blue-900"
                      : "bg-gray-300 text-gray-800"
                  }`}>
                    {consultation?.status === "completed" ? "✓ Completed" : "⏳ In Progress"}
                  </span>
                </div>
                
                <div className="flex items-start justify-between pb-3 border-b border-gray-200">
                  <span className="text-gray-700">Created</span>
                  <span className="text-gray-900 text-right">
                    {consultation?.created_at ? new Date(consultation.created_at).toLocaleDateString() : "—"}
                  </span>
                </div>
                
                <div className="flex items-start justify-between">
                  <span className="text-gray-700">ID</span>
                  <span className="text-gray-900 font-mono text-xs">{shortId}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg p-6 text-white">
              <h3 className="text-lg font-bold mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 py-3 rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span className="font-medium">Print Summary</span>
                </button>

                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full flex items-center justify-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 py-3 rounded-xl transition-all"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <span className="font-medium">Back to Dashboard</span>
                </button>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-100 border-2 border-blue-300 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Tips
              </h3>
              <ul className="text-sm text-blue-900 space-y-2">
                <li className="flex items-start">
                  <span className="mr-2">💡</span>
                  <span>Use clear, concise medical terminology</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">📝</span>
                  <span>Save frequently to avoid losing changes</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">✅</span>
                  <span>Review before marking as completed</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Transcript Modal */}
      {showTranscript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-8 py-6 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Consultation Transcript</h3>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto max-h-[calc(80vh-100px)]">
              {consultation?.transcript && consultation.transcript.length > 0 ? (
                <div className="space-y-4">
                  {consultation.transcript.map((item: any, index: number) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl ${
                        item.speaker === "Doctor" ? "bg-blue-100 ml-8 border-l-4 border-blue-500" : "bg-gray-200 mr-8 border-l-4 border-gray-500"
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`font-bold text-sm ${
                          item.speaker === "Doctor" ? "text-blue-800" : "text-gray-800"
                        }`}>
                          {item.speaker}
                        </span>
                        <span className="text-xs text-gray-600">
                          {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ""}
                        </span>
                      </div>
                      <p className="text-gray-900">{item.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-600 py-12">No transcript available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}