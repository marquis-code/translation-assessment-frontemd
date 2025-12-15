import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = "https://translation-api-backend.onrender.com";

type User = {
  full_name: string;
  [key: string]: any;
};

type Consultation = {
  id: string;
  created_at: string;
  status: "completed" | "in_progress" | string;
  completed_at?: string;
  transcript?: Array<{ speaker: string; text: string }>;
};

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    today: 0
  });

  useEffect(() => {
    const token = Cookies.get("token");
    const userData = Cookies.get("user");

    if (!token) {
      router.push("/");
      return;
    }

    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        Cookies.remove("token");
        Cookies.remove("user");
        router.push("/");
        return;
      }
    } else {
      router.push("/");
      return;
    }

    fetchConsultations(token);
  }, [router]);

  const fetchConsultations = async (token: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/consultations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data ?? [];
      setConsultations(data);
      
      // Calculate stats
      const today = new Date().toDateString();
      setStats({
        total: data.length,
        completed: data.filter((c: Consultation) => c.status === "completed").length,
        inProgress: data.filter((c: Consultation) => c.status === "in_progress").length,
        today: data.filter((c: Consultation) => 
          new Date(c.created_at).toDateString() === today
        ).length
      });
    } catch (err) {
      console.error("Error fetching consultations:", err);
    }
  };

  const startNewConsultation = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("token");

      const response = await axios.post(
        `${API_BASE_URL}/api/consultations/start`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const id = response.data?.consultation_id as string | undefined;
      if (!id) throw new Error("Missing consultation_id from response");

      router.push(`/transcription/${id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to start consultation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove("token");
    Cookies.remove("user");
    router.push("/");
  };

  const formatDate = (dateString: string) => {
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

  if (!user) {
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
            {getTimeOfDay()}, {user.full_name.split(" ")[0]} 👋
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
              <button
                onClick={startNewConsultation}
                disabled={loading}
                className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
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
            <div className="hidden lg:block">
              <div className="w-48 h-48 bg-white bg-opacity-10 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
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
              <button
                onClick={startNewConsultation}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create First Consultation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {consultations.map((consultation, index) => (
                <div
                  key={consultation.id}
                  className="p-6 hover:bg-gray-100 transition-all cursor-pointer group"
                  onClick={() => router.push(`/summary/${consultation.id}`)}
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
                            Consultation #{consultation.id?.slice?.(0, 8) ?? ""}
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

        {/* Quick Tips */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 mb-2">Real-time Transcription</h4>
            <p className="text-sm text-gray-700">Speech automatically converted to text with speaker detection</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <div className="w-12 h-12 bg-blue-300 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 mb-2">AI-Powered Summaries</h4>
            <p className="text-sm text-gray-700">Automatically generate structured clinical documentation</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-200">
            <div className="w-12 h-12 bg-gray-300 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-bold text-gray-900 mb-2">HIPAA Compliant</h4>
            <p className="text-sm text-gray-700">Secure storage with end-to-end encryption for patient data</p>
          </div>
        </div>
      </div>
    </div>
  );
}