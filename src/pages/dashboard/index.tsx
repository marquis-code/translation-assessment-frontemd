import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Cookies from "js-cookie";

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_BASE_URL = "https://translation-api-backend.onrender.com"

export default function DashboardPage() {
  const router = useRouter() as any
  const [user, setUser] = useState(null) as any
  const [consultations, setConsultations] = useState([]) as any
  const [loading, setLoading] = useState(true) as any
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    today: 0
  }) as any
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [startingConsultation, setStartingConsultation] = useState(false);

  const languages = [
    { code: "en", name: "English", flag: "🇬🇧" },
    { code: "hi", name: "हिंदी (Hindi)", flag: "🇮🇳" },
    { code: "ta", name: "தமிழ் (Tamil)", flag: "🇮🇳" },
    { code: "id", name: "Bahasa Indonesia", flag: "🇮🇩" },
  ];

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
      return;
    }

    // Get user info from cookie
    const userInfo = Cookies.get("user");
    if (userInfo) {
      try {
        setUser(JSON.parse(userInfo));
      } catch (e) {
        console.error("Error parsing user info:", e);
        router.push("/");
        return;
      }
    }

    fetchConsultations();
  }, [router]);

  const fetchConsultations = async () => {
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${API_BASE_URL}/api/consultations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch consultations");
      }

      const data = await response.json();
      setConsultations(data);

      // Calculate stats
      const total = data.length;
      const completed = data.filter((c: any) => c.status === "completed").length;
      const inProgress = data.filter((c: any) => c.status === "in_progress").length;
      const today = data.filter((c: any) => {
        const createdDate = new Date(c.created_at);
        const todayDate = new Date();
        return createdDate.toDateString() === todayDate.toDateString();
      }).length;

      setStats({ total, completed, inProgress, today });
    } catch (err) {
      console.error("Error fetching consultations:", err);
    } finally {
      setLoading(false);
    }
  };

  const startNewConsultation = async () => {
    setStartingConsultation(true);
    try {
      const token = Cookies.get("token");
      const response = await fetch(`${API_BASE_URL}/api/consultations/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to start consultation");
      }

      const data = await response.json();
      const consultationId = data.consultation_id;

      // Store selected language in session storage for the transcription page
      sessionStorage.setItem("selectedLanguage", selectedLanguage);

      // Navigate to transcription page
      router.push(`/transcription/${consultationId}`);
    } catch (err) {
      console.error("Error starting consultation:", err);
      alert("Failed to start consultation. Please try again.");
    } finally {
      setStartingConsultation(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/");
  };

  const formatDate = (dateString: any) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (hours < 48) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const handleViewConsultation = (consultationId: any) => {
    router.push(`/summary/${consultationId}`);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-700 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-gray-100 to-blue-100">
      {/* Header */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">MediScribe AI</h1>
                <p className="text-sm text-gray-600">Medical Transcription Platform</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            {getTimeOfDay()}, {user.full_name?.split(" ")[0] || "Doctor"} 👋
          </h2>
          <p className="text-gray-700">Ready to document your next patient consultation?</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.total}</h3>
            <p className="text-sm text-gray-700">Total Consultations</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.completed}</h3>
            <p className="text-sm text-gray-700">Completed</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-gray-300 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.inProgress}</h3>
            <p className="text-sm text-gray-700">In Progress</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-300 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{stats.today}</h3>
            <p className="text-sm text-gray-700">Today</p>
          </div>
        </div>

        {/* New Consultation Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-8 mb-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-10 rounded-full -ml-24 -mb-24"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2">Start New Consultation</h3>
              <p className="text-blue-100 mb-6 max-w-xl">
                Record patient interactions with real-time transcription, automatic speaker detection, and AI-powered clinical summaries
              </p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowLanguageModal(true)}
                  disabled={startingConsultation}
                  className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">{languages.find(l => l.code === selectedLanguage)?.flag}</span>
                  <span>{languages.find(l => l.code === selectedLanguage)?.name}</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button
                  onClick={startNewConsultation}
                  disabled={startingConsultation}
                  className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {startingConsultation ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      <span>Begin Recording</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Consultations */}
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-100 to-white">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <svg className="w-7 h-7 mr-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Recent Consultations
            </h2>
          </div>

          {consultations.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-16 h-16 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No consultations yet</h3>
              <p className="text-gray-600 mb-6">Start your first consultation to see it appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {consultations.map((consultation: any) => (
                <div
                  key={consultation.id}
                  className="p-6 hover:bg-gray-100 transition-all cursor-pointer group"
                  onClick={() => handleViewConsultation(consultation.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        consultation.status === "completed" 
                          ? "bg-blue-200" 
                          : "bg-gray-300"
                      }`}>
                        {consultation.status === "completed" ? (
                          <svg className="w-7 h-7 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        ) : (
                          <svg className="w-7 h-7 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                            Consultation #{consultation.id.slice(0, 8)}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            consultation.status === "completed"
                              ? "bg-blue-200 text-blue-900"
                              : "bg-gray-300 text-gray-800"
                          }`}>
                            {consultation.status === "completed" ? "✓ Completed" : "⏳ In Progress"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(consultation.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <button className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-xl group-hover:bg-blue-200 transition-all">
                      <span>View Details</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Language Selection Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Select Language</h3>
              <button
                onClick={() => setShowLanguageModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setSelectedLanguage(lang.code);
                    setShowLanguageModal(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    selectedLanguage === lang.code
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-3xl">{lang.flag}</span>
                    <span className="font-semibold text-gray-900">{lang.name}</span>
                  </div>
                  {selectedLanguage === lang.code && (
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}