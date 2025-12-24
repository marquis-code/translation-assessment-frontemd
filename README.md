# Medical Transcription System - Frontend Documentation

## Table of Contents
1. [Frontend Overview](#frontend-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Key Features](#key-features)
5. [Pages & Components](#pages--components)
6. [Internationalization (i18n)](#internationalization-i18n)
7. [State Management](#state-management)
8. [API Integration](#api-integration)
9. [Real-Time Communication](#real-time-communication)
10. [Audio Processing](#audio-processing)
11. [Deployment](#deployment)

---

## Frontend Overview

The frontend is a modern, responsive web application built with **Next.js 13+**, **React 18**, and **TypeScript**. It provides an intuitive interface for doctors to manage medical consultations with real-time transcription, multilingual support, and structured clinical note generation.

### Key Characteristics
- **Framework:** Next.js 13+ (App Router + Pages Router hybrid)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 3.x
- **State Management:** React Hooks (useState, useRef, useEffect)
- **Real-Time:** WebSocket API
- **Internationalization:** next-i18next (English, Hindi, Tamil, Indonesian)
- **Authentication:** Cookie-based JWT storage

---

## Technology Stack

### Core Dependencies
```json
{
  "next": "13.x",
  "react": "18.x",
  "react-dom": "18.x",
  "typescript": "5.x",
  "tailwindcss": "3.x",
  "next-i18next": "^13.x",
  "axios": "^1.x",
  "js-cookie": "^3.x"
}
```

### Key Libraries
- **next-i18next:** Multi-language support (English, Hindi, Tamil, Indonesian)
- **axios:** HTTP client for REST API calls
- **js-cookie:** Cookie management for authentication tokens
- **Tailwind CSS:** Utility-first CSS framework for rapid UI development

### Browser APIs Used
- **MediaDevices API:** Microphone access for audio recording
- **Web Audio API:** Real-time audio processing (AudioContext, ScriptProcessor)
- **WebSocket API:** Bidirectional real-time communication
- **AudioContext:** 16kHz audio resampling and PCM encoding

---

## Project Structure

```
frontend/
├── public/
│   ├── locales/                    # Translation files
│   │   ├── en/                     # English translations
│   │   │   └── common.json
│   │   ├── hi/                     # Hindi translations
│   │   │   └── common.json
│   │   ├── ta/                     # Tamil translations
│   │   │   └── common.json
│   │   └── id/                     # Indonesian translations
│   │       └── common.json
│   └── assets/                     # Static assets (icons, images)
├── src/
│   ├── components/
│   │   └── LanguageSwitcher.tsx    # Language selection component
│   ├── pages/
│   │   ├── index.tsx               # Login page (/)
│   │   ├── dashboard/
│   │   │   └── index.tsx           # Dashboard (/dashboard)
│   │   ├── transcription/
│   │   │   └── [id].tsx            # Live transcription (/transcription/:id)
│   │   └── summary/
│   │       └── [id].tsx            # Clinical summary (/summary/:id)
│   ├── styles/
│   │   └── globals.css             # Global styles + Tailwind imports
│   └── utils/                      # Utility functions (if needed)
├── next-i18next.config.js          # i18n configuration
├── next.config.js                  # Next.js configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Dependencies
```

---

## Key Features

### 1. **Multi-Language Support (i18n)**
- **Supported Languages:** English (en), Hindi (hi), Tamil (ta), Indonesian (id)
- **Implementation:** `next-i18next` with server-side translations
- **Language Switcher:** Dropdown component in header (all pages)
- **Persistence:** Selected language stored in browser `localStorage`
- **Dynamic Content:** All UI text, labels, and placeholders translated

### 2. **Responsive Design**
- **Mobile-First:** Optimized for devices from 320px to 4K displays
- **Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
- **Touch-Friendly:** Large buttons, swipe gestures on mobile
- **Adaptive Layout:** Single-column (mobile) → multi-column (desktop)

### 3. **Real-Time Features**
- **Live Transcription:** Sub-second latency audio → text conversion
- **WebSocket Connection:** Persistent bidirectional communication
- **Connection Status:** Visual indicators (🟢 connected, 🟡 connecting, 🔴 error)
- **Auto-Reconnect:** Handles temporary disconnections gracefully
- **Audio Level Visualization:** Real-time waveform display during recording

### 4. **Audio Processing**
- **Microphone Access:** Requests user permission via MediaDevices API
- **Audio Constraints:**
  - Sample Rate: 16kHz
  - Channels: Mono (1 channel)
  - Echo Cancellation: Enabled
  - Noise Suppression: Enabled
  - Auto Gain Control: Enabled
- **PCM Encoding:** Converts Float32 audio to Int16 PCM for transmission
- **Chunk Size:** 4096 samples (~256ms per chunk)
- **Buffering:** Client-side buffering for smooth streaming

### 5. **State Management**
- **React Hooks:** `useState`, `useEffect`, `useRef` for local state
- **Cookie Storage:** JWT tokens and user info persisted in cookies
- **Session Storage:** Temporary data (selected language) during consultation
- **No Global State:** Intentionally simple; no Redux/MobX (MVP scope)

---

## Pages & Components

### 1. **Login Page** (`/pages/index.tsx`)

**Purpose:** Authenticate doctors before accessing the system.

**Features:**
- **Demo Credentials:** Pre-filled for quick testing
  - Email: `doctor@clinic.com`
  - Password: `password123`
- **Form Validation:** Email format and required fields
- **Password Toggle:** Show/hide password visibility
- **Error Handling:** Displays API errors (invalid credentials, network issues)
- **Loading State:** Disables form during authentication
- **Auto-Redirect:** Redirects to dashboard if already logged in

**Key Code Snippets:**
```typescript
const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, formData);
    const { access_token, user } = response.data;
    
    // Store JWT and user info in cookies
    Cookies.set("token", access_token, { expires: 1 }); // 1 day
    Cookies.set("user", JSON.stringify(user), { expires: 1 });
    
    router.push("/dashboard");
  } catch (err) {
    setError(err?.response?.data?.detail || t('auth.loginFailed'));
  } finally {
    setLoading(false);
  }
};
```

**UI/UX Highlights:**
- **Gradient Background:** Animated blob shapes for visual appeal
- **Focus States:** Blue border on active inputs
- **Language Switcher:** Top-right corner for global language selection
- **Accessibility:** Proper labels, ARIA attributes, keyboard navigation

---

### 2. **Dashboard Page** (`/pages/dashboard/index.tsx`)

**Purpose:** Central hub for doctors to view consultation history and start new sessions.

**Features:**
- **Statistics Cards:**
  - Total Consultations
  - Completed Consultations
  - In-Progress Consultations
  - Today's Consultations
- **New Consultation CTA:**
  - Language selection dropdown (en, hi, ta, id)
  - Start recording button
  - Generates unique consultation ID via backend API
- **Recent Consultations List:**
  - Displays last 10 consultations
  - Status badges (✓ Completed, ⏳ In Progress)
  - Click to view summary
  - Timestamp (relative: "2h ago", "Yesterday")
- **User Welcome:** Personalized greeting based on time of day
- **Logout:** Clears cookies and redirects to login

**Key Code Snippets:**
```typescript
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
      body: JSON.stringify({ language: selectedLanguage })
    });
    
    const data = await response.json();
    const consultationId = data.consultation_id;
    
    // Store language in session for transcription page
    sessionStorage.setItem("selectedLanguage", selectedLanguage);
    
    router.push(`/transcription/${consultationId}`);
  } catch (err) {
    alert("Failed to start consultation");
  } finally {
    setStartingConsultation(false);
  }
};
```

**Data Flow:**
1. Fetch consultations from `/api/consultations` (authenticated)
2. Calculate statistics from consultation array
3. Display in cards with icons and colors
4. User selects language → clicks "Begin Recording"
5. API creates consultation → redirects to transcription page

---

### 3. **Transcription Page** (`/pages/transcription/[id].tsx`)

**Purpose:** Real-time audio recording and transcription with speaker diarization.

**Features:**
- **Recording Controls:**
  - Start/Stop recording button
  - Recording duration timer (MM:SS)
  - Audio level meter (visualizes microphone input)
  - Connection status indicator
- **Live Transcript Display:**
  - Auto-scrolls to latest entry
  - Color-coded speakers (Doctor: blue, Patient: gray)
  - Timestamps for each turn
  - Translation indicator (if language ≠ English)
  - Original text preservation (hover/expand)
- **Statistics Header:**
  - Session ID (first 8 characters)
  - Language flag + code
  - Exchange count (number of turns)
  - Word count (total words spoken)
- **Actions:**
  - Cancel (returns to dashboard)
  - Generate Summary (processes transcript → navigates to summary)

**Key Code Snippets:**

**Starting Recording:**
```typescript
const startRecording = async () => {
  setConnectionStatus("connecting");
  
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
  
  // WebSocket connection with language parameter
  const wsUrl = `${WS_BASE_URL}/ws/transcribe/${consultationId}?language=${selectedLanguage}`;
  const ws = new WebSocket(wsUrl);
  websocketRef.current = ws;
  
  ws.onopen = () => {
    setConnectionStatus("connected");
    setIsRecording(true);
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === "transcript") {
      // Add to transcript display (backend handles deduplication)
      setTranscript(prev => [
        ...prev,
        {
          text: data.text,
          originalText: data.original_text || data.text,
          speaker: data.speaker,
          timestamp: data.timestamp,
          isFinal: true,
          confidence: data.confidence,
          language: data.language
        },
      ]);
    } else if (data.type === "status") {
      console.log("Status:", data.message);
    }
  };
  
  // Audio processing: convert Float32 → Int16 PCM
  processor.onaudioprocess = (e) => {
    if (ws.readyState === WebSocket.OPEN) {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmData = new Int16Array(inputData.length);
      
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      ws.send(pcmData.buffer); // Send binary audio data
    }
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
};
```

**Audio Level Visualization:**
```typescript
const updateAudioLevel = () => {
  if (!analyserRef.current || !isRecording) return;
  
  const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
  analyserRef.current.getByteFrequencyData(dataArray);
  
  const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  setAudioLevel(Math.min(100, (average / 128) * 100));
  
  animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
};
```

**Generate Summary:**
```typescript
const handleGenerateSummary = async () => {
  if (transcript.length === 0) {
    setError(t('transcription.noTranscript'));
    return;
  }
  
  setIsGenerating(true);
  
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
    
    if (!response.ok) throw new Error("Failed to generate summary");
    
    router.push(`/summary/${consultationId}`);
  } catch (err) {
    setError(t('transcription.generating'));
  } finally {
    setIsGenerating(false);
  }
};
```

**UI/UX Highlights:**
- **Auto-Scroll:** Transcript auto-scrolls to latest entry using `useRef` + `scrollIntoView`
- **Color Coding:** Doctor (blue background), Patient (gray background)
- **Timestamps:** Localized time format (e.g., "10:30 AM" in US, "10:30" in EU)
- **Translation Badge:** Yellow badge if language ≠ English
- **Error Handling:** Displays connection errors prominently
- **Responsive:** Single column on mobile, stats collapse into smaller cards

---

### 4. **Summary Page** (`/pages/summary/[id].tsx`)

**Purpose:** Display and edit structured clinical notes generated from the transcript.

**Features:**
- **7 Editable Sections:**
  1. **Identifiers:** Name, Age, Sex, Location
  2. **History:** Chief Complaint, Past Medical History
  3. **Examination:** Vital Signs, Physical Findings
  4. **Diagnoses:** Clinical Assessment
  5. **Treatment:** Medications, Procedures
  6. **Advice:** Lifestyle Counseling
  7. **Next Steps:** Follow-up, Investigations
- **Edit Mode Toggle:** Switch between view and edit modes
- **Save Changes:** Updates summary via PUT `/api/consultations/{id}/summary`
- **Mark Completed:** Finalizes consultation (cannot edit after)
- **Actions:**
  - Export as TXT file
  - Print summary
  - View transcript (modal overlay)
  - Back to dashboard
- **Sidebar:**
  - Consultation info (status, created date, ID)
  - Quick actions (print, back to dashboard)
  - Tips for better documentation

**Key Code Snippets:**

**Fetching Consultation:**
```typescript
const fetchConsultation = async () => {
  try {
    const token = Cookies.get("token");
    const response = await axios.get(
      `${API_BASE_URL}/api/consultations/${consultationId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    setConsultation(response.data);
    
    if (response.data?.summary) {
      // Summary already exists
      setSummary(prev => ({ ...prev, ...response.data.summary }));
      setIsEditing(false);
    } else {
      // Generate new summary
      await generateSummary();
    }
  } catch (err) {
    alert(t('common.error'));
    router.push("/dashboard");
  } finally {
    setLoading(false);
  }
};
```

**Saving Changes:**
```typescript
const handleSave = async () => {
  setSaving(true);
  
  try {
    const token = Cookies.get("token");
    await axios.put(
      `${API_BASE_URL}/api/consultations/${consultationId}/summary`,
      summary,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    setIsEditing(false);
    
    // Show success notification
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50';
    successDiv.innerHTML = `✅ ${t('summary.savedSuccessfully')}`;
    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
  } catch (err) {
    alert(t('common.error'));
  } finally {
    setSaving(false);
  }
};
```

**Marking Complete:**
```typescript
const handleComplete = async () => {
  if (isEditing) {
    alert(t('summary.saveBeforeComplete'));
    return;
  }
  
  try {
    const token = Cookies.get("token");
    await axios.post(
      `${API_BASE_URL}/api/consultations/${consultationId}/complete`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Show success and redirect
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-xl shadow-2xl z-50';
    successDiv.innerHTML = `🎉 ${t('summary.completedSuccessfully')}`;
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
      successDiv.remove();
      router.push("/dashboard");
    }, 2000);
  } catch (err) {
    alert(t('common.error'));
  }
};
```

**Exporting Summary:**
```typescript
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
  URL.revokeObjectURL(url);
};
```

**UI/UX Highlights:**
- **Section Icons:** Each section has emoji icon (👤 Identifiers, 📋 History, etc.)
- **Color-Coded Headers:** Alternating background colors for visual separation
- **Textarea Styling:** Auto-expanding textareas, rounded corners, focus states
- **Edit/Save Toggle:** Clear button states (Edit: gray, Save: blue)
- **Completion Banner:** Green gradient banner if consultation completed
- **Modal Transcript:** Full-screen overlay to view original transcript
- **Responsive Layout:** 2-column (sidebar + content) on desktop, single column on mobile

---

## Internationalization (i18n)

### Implementation

**Configuration** (`next-i18next.config.js`):
```javascript
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'hi', 'ta', 'id'],
    localeDetection: true,
  },
  react: {
    useSuspense: false,
  },
};
```

**Translation Files** (`public/locales/{lang}/common.json`):
```json
{
  "app": {
    "title": "MediScript AI",
    "subtitle": "Real-Time Medical Transcription"
  },
  "auth": {
    "welcomeBack": "Welcome Back",
    "emailAddress": "Email Address",
    "password": "Password",
    "signIn": "Sign In",
    "loggingIn": "Logging In..."
  },
  "dashboard": {
    "greeting": {
      "morning": "Good Morning",
      "afternoon": "Good Afternoon",
      "evening": "Good Evening"
    },
    "stats": {
      "total": "Total Consultations",
      "completed": "Completed",
      "inProgress": "In Progress",
      "today": "Today"
    }
  },
  "transcription": {
    "liveConsultation": "Live Consultation",
    "startRecording": "Start Recording",
    "stopRecording": "Stop Recording",
    "doctor": "Doctor",
    "patient": "Patient",
    "translated": "Translated"
  },
  "summary": {
    "sections": {
      "identifiers": "Patient Identifiers",
      "history": "History & Complaints",
      "examination": "Examination Findings",
      "diagnoses": "Diagnoses & Assessment",
      "treatment": "Treatment Plan",
      "advice": "Patient Advice",
      "nextSteps": "Next Steps & Follow-up"
    }
  },
  "languages": {
    "en": "English",
    "hi": "हिन्दी (Hindi)",
    "ta": "தமிழ் (Tamil)",
    "id": "Bahasa Indonesia"
  }
}
```

### Usage in Components

```typescript
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export default function MyPage() {
  const { t } = useTranslation('common');
  
  return (
    <div>
      <h1>{t('app.title')}</h1>
      <p>{t('dashboard.greeting.morning')}</p>
    </div>
  );
}

// Server-side translation loading
export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
```

### Language Switcher Component

**File:** `src/components/LanguageSwitcher.tsx`

```typescript
import { useRouter } from 'next/router';
import { useState } from 'react';

export default function LanguageSwitcher() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'id', name: 'Bahasa', flag: '🇮🇩' },
  ];
  
  const currentLanguage = languages.find(l => l.code === router.locale);
  
  const changeLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale });
    setIsOpen(false);
  };
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border"
      >
        <span className="text-2xl">{currentLanguage?.flag}</span>
        <span>{currentLanguage?.name}</span>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg border">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 w-full"
            >
              <span className="text-2xl">{lang.flag}</span>
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## State Management

### Local State (React Hooks)

**useState Examples:**
```typescript
// Authentication
const [user, setUser] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

// Recording
const [isRecording, setIsRecording] = useState(false);
const [transcript, setTranscript] = useState([]);
const [recordingDuration, setRecordingDuration] = useState(0);
const [connectionStatus, setConnectionStatus] = useState("disconnected");

// Summary
const [summary, setSummary] = useState({
  identifiers: "",
  history: "",
  examination: "",
  diagnoses: "",
  treatment: "",
  advice: "",
  next_steps: "",
});
const [isEditing, setIsEditing] = useState(true);
const [saving, setSaving] = useState(false);
```

### Refs for DOM/Audio Resources

**useRef Examples:**
```typescript
// WebSocket
const websocketRef = useRef(null);

// Audio processing
const audioContextRef = useRef(null);
const mediaStreamRef = useRef(null);
const processorRef = useRef(null);
const analyserRef = useRef(null);

// UI elements
const transcriptEndRef = useRef(null);

// Timers
const durationIntervalRef = useRef(null);
const animationFrameRef = useRef(null);
```

### Cookie Storage (Persistence)

```typescript
import Cookies from "js-cookie";

// Store JWT token (1 day expiration)
Cookies.set("token", access_token, { expires: 1 });

// Store user info
Cookies.set("user", JSON.stringify(user), { expires: 1 });

// Retrieve token
const token = Cookies.get("token");

// Remove on logout
Cookies.remove("token");
Cookies.remove("user");
```

### Session Storage (Temporary)

```typescript
// Store selected language for consultation
sessionStorage.setItem("selectedLanguage", selectedLanguage);

// Retrieve on transcription page
const storedLanguage = sessionStorage.getItem("selectedLanguage");
```

---

## API Integration

### Base Configuration

```typescript
const API_BASE_URL = "https://translation-api-backend.onrender.com";
// const API_BASE_URL = "http://localhost:8000"; // Development
```

### Authentication Header

```typescript
import Cookies from "js-cookie";

const token = Cookies.get("token");

const headers = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
};
```

### API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Authenticate doctor |
| POST | `/api/consultations/start` | Create new consultation |
| GET | `/api/consultations` | List all consultations |
| GET | `/api/consultations/{id}` | Get single consultation |
| POST | `/api/consultations/{id}/summary` | Generate summary |
| PUT | `/api/consultations/{id}/summary` | Update summary |
| POST | `/api/consultations/{id}/complete` | Mark completed |
| WS | `/ws/transcribe/{id}?language={lang}` | Real-time transcription |

### Example API Calls

**Login:**
```typescript
const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
  username: "doctor@clinic.com",
  password: "password123"
});

const { access_token, user } = response.data;
```

**Start Consultation:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/consultations/start`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ language: "hi" })
});

const { consultation_id } = await response.json();
```

**Generate Summary:**
```typescript
const response = await axios.post(
  `${API_BASE_URL}/api/consultations/${consultationId}/summary`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);

const { summary } = response.data;
```

---

## Real-Time Communication

### WebSocket Connection

```typescript
const WS_BASE_URL = "wss://translation-api-backend.onrender.com";
// const WS_BASE_URL = "ws://localhost:8000"; // Development

const wsUrl = `${WS_BASE_URL}/ws/transcribe/${consultationId}?language=${selectedLanguage}`;
const ws = new WebSocket(wsUrl);
websocketRef.current = ws;
```

### Event Handlers

```typescript
ws.onopen = () => {
  console.log("✅ WebSocket connected");
  setConnectionStatus("connected");
  setIsRecording(true);
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === "transcript") {
    // Add to transcript display
    setTranscript(prev => [...prev, {
      text: data.text,
      originalText: data.original_text,
      speaker: data.speaker,
      timestamp: data.timestamp,
      confidence: data.confidence,
      language: data.language
    }]);
  } else if (data.type === "status") {
    console.log("Status:", data.message);
    if (data.status === "error") {
      setError(data.message);
    }
  }
};

ws.onerror = (error) => {
  console.error("❌ WebSocket error:", error);
  setConnectionStatus("error");
};

ws.onclose = () => {
  console.log("🔌 WebSocket closed");
  setConnectionStatus("disconnected");
  setIsRecording(false);
};
```

### Sending Audio Data

```typescript
processor.onaudioprocess = (e) => {
  if (ws.readyState === WebSocket.OPEN) {
    const inputData = e.inputBuffer.getChannelData(0);
    
    // Convert Float32 to Int16 PCM
    const pcmData = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm
      Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    // Send binary audio
    ws.send(pcmData.buffer);
  }
};
```

---

## Audio Processing

### Microphone Access

```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,          // Mono
    sampleRate: 16000,        // 16kHz (AssemblyAI requirement)
    echoCancellation: true,   // Remove echo
    noiseSuppression: true,   // Reduce background noise
    autoGainControl: true,    // Normalize volume
  },
});

mediaStreamRef.current = stream;
```

### Audio Context Setup

```typescript
const audioContext = new AudioContext({ sampleRate: 16000 });
audioContextRef.current = audioContext;

const source = audioContext.createMediaStreamSource(stream);
const processor = audioContext.createScriptProcessor(4096, 1, 1);
const analyser = audioContext.createAnalyser();

analyser.fftSize = 256; // For audio level visualization

source.connect(analyser);
source.connect(processor);
processor.connect(audioContext.destination);
```

### PCM Encoding

```typescript
// Convert Float32Array [-1.0, 1.0] to Int16Array [-32768, 32767]
const convertToPCM = (inputData: Float32Array): Int16Array => {
  const pcmData = new Int16Array(inputData.length);
  
  for (let i = 0; i < inputData.length; i++) {
    // Clamp to [-1, 1]
    const sample = Math.max(-1, Math.min(1, inputData[i]));
    
    // Convert to 16-bit integer
    pcmData[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
  }
  
  return pcmData;
};
```

### Audio Level Visualization

```typescript
const updateAudioLevel = () => {
  if (!analyserRef.current || !isRecording) return;
  
  const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
  analyserRef.current.getByteFrequencyData(dataArray);
  
  // Calculate average frequency intensity
  const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  
  // Normalize to 0-100 range
  const level = Math.min(100, (average / 128) * 100);
  setAudioLevel(level);
  
  // Request next frame
  animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
};
```

### Cleanup

```typescript
const stopRecording = () => {
  // Cancel animation frame
  if (animationFrameRef.current) {
    cancelAnimationFrame(animationFrameRef.current);
  }
  
  // Close WebSocket
  if (websocketRef.current?.readyState === WebSocket.OPEN) {
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
  
  // Stop media tracks
  if (mediaStreamRef.current) {
    mediaStreamRef.current.getTracks().forEach(track => track.stop());
  }
  
  setIsRecording(false);
  setConnectionStatus("disconnected");
  setAudioLevel(0);
};
```

---

## Deployment

### Build Configuration

**package.json scripts:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### Environment Variables

Create `.env.local` file:
```env
NEXT_PUBLIC_API_BASE_URL=https://translation-api-backend.onrender.com
NEXT_PUBLIC_WS_BASE_URL=wss://translation-api-backend.onrender.com
```

### Production Build

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start
```

### Deployment Platforms

**Recommended:**
- **Vercel:** Native Next.js support, automatic deployments
- **Netlify:** Static site hosting with serverless functions
- **AWS Amplify:** Full-stack deployment with CI/CD

**Vercel Deployment:**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Performance Optimizations

1. **Code Splitting:** Next.js automatically splits routes
2. **Image Optimization:** Use `next/image` for optimized images
3. **Lazy Loading:** Dynamic imports for heavy components
4. **Caching:** Browser caching for static assets
5. **Compression:** Gzip/Brotli compression enabled by default

---

## Conclusion

The frontend provides a modern, responsive, and multilingual interface for medical consultation transcription. Key strengths include:

✅ **Real-Time Performance:** Sub-second WebSocket communication
✅ **Multilingual Support:** 4 languages with easy expansion
✅ **Responsive Design:** Mobile-first, works on all devices
✅ **Intuitive UX:** Clear navigation, visual feedback, error handling
✅ **Audio Processing:** Professional-grade audio capture and encoding
✅ **State Management:** Simple, maintainable React Hooks pattern
✅ **Production-Ready:** Deployed on Vercel/Render with HTTPS

**Next Steps for Enhancement:**
1. Add offline support (PWA, Service Workers)
2. Implement audio playback (review recorded consultations)
3. Add data visualization (charts for consultation trends)
4. Enhanced error recovery (auto-reconnect WebSocket)
5. Real-time collaboration (multi-doctor consultations)
                                                                                                                                                                  
