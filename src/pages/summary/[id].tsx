import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import axios from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = "https://translation-api-backend.onrender.com";

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
  summary?: Partial<Summary>;
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

  useEffect(() => {
    const token = Cookies.get("token");
    if (!token) {
      router.push("/");
      return;
    }

    // wait until router has the id
    if (!consultationId) return;

    fetchConsultation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      alert("Summary saved successfully!");
      setIsEditing(false);
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

      alert("Consultation marked as completed!");
      router.push("/dashboard");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to complete consultation.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading consultation...</p>
        </div>
      </div>
    );
  }

  const sections: Array<{
    key: keyof Summary;
    title: string;
    rows: number;
    placeholder: string;
  }> = [
    { key: "identifiers", title: "1. Patient Identifiers", rows: 4, placeholder: "Enter patient name, age, sex, and location" },
    { key: "history", title: "2. History", rows: 6, placeholder: "Chief complaints, history of present illness, past medical history" },
    { key: "examination", title: "3. Examination / Findings", rows: 5, placeholder: "Physical examination findings and vital signs" },
    { key: "diagnoses", title: "4. Diagnoses / Assessment", rows: 4, placeholder: "Clinical assessment and diagnoses" },
    { key: "treatment", title: "5. Treatment / Plan", rows: 5, placeholder: "Medications, procedures, and treatment plan" },
    { key: "advice", title: "6. Advice / Counseling", rows: 4, placeholder: "Lifestyle changes, dietary advice, patient education" },
    { key: "next_steps", title: "7. Next Steps / Follow-up", rows: 4, placeholder: "Follow-up appointments and investigations" },
  ];

  const shortId = consultationId ? consultationId.slice(0, 8) : "Loading...";

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="card mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary-600 mb-2">Clinical Summary</h1>
              <p className="text-gray-600">Consultation ID: {shortId}</p>
            </div>

            <div className="flex gap-3">
              {consultation?.status !== "completed" && (
                <>
                  {isEditing ? (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-500 hover:bg-green-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "💾 Save"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                    >
                      ✏️ Edit
                    </button>
                  )}
                </>
              )}

              <button onClick={() => router.push("/dashboard")} className="btn-secondary">
                ← Back
              </button>
            </div>
          </div>
        </div>

        {/* Summary Sections */}
        <div className="card space-y-8">
          {sections.map((section) => (
            <div key={section.key} className="pb-8 border-b-2 border-gray-200 last:border-b-0">
              <h2 className="text-xl font-bold text-primary-600 mb-4 flex items-center gap-2">
                {section.title}
              </h2>

              <textarea
                value={summary[section.key]}
                onChange={(e) => handleChange(section.key, e.target.value)}
                disabled={!isEditing}
                placeholder={section.placeholder}
                rows={section.rows}
                className={`w-full px-4 py-3 border-2 rounded-lg font-sans text-gray-800 leading-relaxed resize-y transition-all ${
                  isEditing
                    ? "border-gray-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    : "border-gray-200 bg-gray-50 cursor-not-allowed"
                }`}
              />
            </div>
          ))}

          {/* Complete Section */}
          {consultation?.status !== "completed" && (
            <div className="pt-8 border-t-2 border-gray-200">
              <div className="text-center">
                <button
                  onClick={handleComplete}
                  disabled={isEditing}
                  className="btn-success text-lg px-12 py-4 disabled:opacity-50"
                >
                  ✅ Mark as Completed
                </button>

                {isEditing && (
                  <p className="text-sm text-gray-500 mt-4">
                    Save the summary before marking as completed
                  </p>
                )}
              </div>
            </div>
          )}

          {consultation?.status === "completed" && (
            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 text-center">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-2xl font-bold text-green-800 mb-2">Consultation Completed</p>
              <p className="text-green-700">
                Completed on:{" "}
                {consultation?.completed_at ? new Date(consultation.completed_at).toLocaleString() : "—"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
