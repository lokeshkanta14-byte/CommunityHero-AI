import React, { useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { AppUser, IssueCategory, IssuePriority, CivicIssue } from '../types';
import MapComponent from './MapComponent';
import { 
  Sparkles, Camera, Mic, MicOff, AlertCircle, Play, Square, 
  Trash2, Send, CheckCircle2, Loader2, ArrowRight, HelpCircle
} from 'lucide-react';
import { useLanguage } from '../lib/LanguageContext';
import AudioVisualizer from './AudioVisualizer';

interface ReportIssueProps {
  user: AppUser;
  setActiveTab: (tab: string) => void;
}

export default function ReportIssue({ user, setActiveTab }: ReportIssueProps) {
  const { language, t } = useLanguage();
  // Map and Location States
  const [lat, setLat] = useState(37.7749); // Default SF coordinates
  const [lng, setLng] = useState(-122.4194);
  const [address, setAddress] = useState('');

  // Image Upload States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Audio/Voice states
  const [recording, setRecording] = useState(false);
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Manual & AI Auto-Filled States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('other');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [categoryExplanation, setCategoryExplanation] = useState<string | null>(null);
  const [priorityExplanation, setPriorityExplanation] = useState<string | null>(null);

  // Status & Utility States
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle Location changes
  const handleLocationChange = (newLat: number, newLng: number, newAddress: string) => {
    setLat(newLat);
    setLng(newLng);
    setAddress(newAddress);
  };

  // Convert uploaded image to base64 for preview and AI analysis
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Image Input dialog
  const triggerImageSelect = () => {
    fileInputRef.current?.click();
  };

  // Start Voice Complaint Recording
  const startRecording = async () => {
    // Gentle start recording haptic pulse
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([40, 30, 40]); } catch (e) {}
    }
    try {
      setErrorMsg(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setRecordingStream(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert blob to base64 for server delivery
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioBase64(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);

        // Turn off microphone streams safely
        stream.getTracks().forEach(track => track.stop());
        setRecordingStream(null);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err: any) {
      console.error("Microphone access error", err);
      setRecordingStream(null);
      setErrorMsg("Unable to access your microphone. Please verify site permissions.");
    }
  };

  // Stop Voice Recording
  const stopRecording = () => {
    // Gentle stop recording haptic click
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(60); } catch (e) {}
    }
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setRecordingStream(null);
    }
  };

  // Reset Audio Recorder
  const resetRecording = () => {
    // Small reset haptic click
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(25); } catch (e) {}
    }
    setAudioUrl(null);
    setAudioBase64(null);
  };

  // Call Express route to perform Multimodal AI analysis on inputs
  const handleAIAnalyze = async () => {
    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/analyze-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          category,
          imageUrl: imagePreview,
          audioData: audioBase64,
          language: language,
        }),
      });

      const result = await response.json();
      if (result.success) {
        const { title: aiTitle, description: aiDesc, category: aiCat, priority: aiPrio, categoryExplanation: catExp, priorityExplanation: prioExp, summary } = result.data;
        
        setTitle(aiTitle || '');
        setDescription(aiDesc || '');
        setCategory(aiCat || 'other');
        setPriority(aiPrio || 'medium');
        setCategoryExplanation(catExp || '');
        setPriorityExplanation(prioExp || '');
        setAiSummary(summary || '');
      } else {
        throw new Error(result.error || "Failed analyzing details.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("AI Assistant service was unable to parse input. You can still fill out the form manually.");
    } finally {
      setAnalyzing(false);
    }
  };

  // Submit verified ticket to Firestore
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMsg("Please fill out the issue title and detailed description.");
      return;
    }
    if (!address) {
      setErrorMsg("Please select or auto-detect the geospatial location coordinates.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const issueData: any = {
        title: title.trim(),
        description: description.trim(),
        category,
        status: 'pending',
        priority,
        reporterName: user.displayName,
        reporterEmail: user.email,
        reporterUid: user.uid,
        latitude: lat,
        longitude: lng,
        address,
        upvotes: [],
        createdAt: new Date().toISOString(),
        statusHistory: [
          {
            status: 'pending',
            note: 'Civic complaint registered successfully in the portal.',
            updatedBy: 'System',
            updatedAt: new Date().toISOString(),
          }
        ],
      };

      if (imagePreview) {
        issueData.imageUrl = imagePreview;
      }
      if (audioUrl) {
        issueData.audioUrl = audioUrl;
      }
      if (aiSummary) {
        issueData.aiAnalysis = {
          categoryExplanation: categoryExplanation || 'Auto-categorized by Community Hero AI',
          priorityExplanation: priorityExplanation || 'Auto-prioritized based on hazard levels',
          summary: aiSummary,
        };
      }

      await addDoc(collection(db, 'issues'), issueData);
      setSuccess(true);
    } catch (err: any) {
      console.error("Firestore database submission error:", err);
      setErrorMsg(`Failed to upload ticket to database: ${err?.message || String(err)}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4" id="success-view">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 text-center shadow-xl shadow-slate-100/50 flex flex-col items-center">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <CheckCircle2 className="w-10 h-10 animate-bounce" />
          </div>
          <span className="font-sans font-bold text-2xl text-slate-800 tracking-tight">Complaint Registered Successfully!</span>
          <p className="text-slate-500 mt-2 text-sm max-w-md">
            Your incident has been cataloged, priority evaluated, and queued for administrative review. Thank you for making our neighborhood safer!
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs justify-center">
            <button
              id="btn-go-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              id="btn-report-another"
              onClick={() => {
                setSuccess(false);
                setTitle('');
                setDescription('');
                setImagePreview(null);
                setAudioUrl(null);
                setAudioBase64(null);
                setAiSummary(null);
                setCategoryExplanation(null);
                setPriorityExplanation(null);
              }}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Report New Issue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4" id="report-issue-page">
      {/* Platform Title Banner */}
      <div className="mb-8">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>Multimodal AI-Assisted Dispatch</span>
        </div>
        <h1 className="font-sans font-extrabold text-3xl text-slate-800 tracking-tight">Report a Local Civic Incident</h1>
        <p className="text-slate-500 text-sm mt-1">
          Upload an image, record a voice description, or fill manually. Our AI engine will automatically optimize category, priority, and summary.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Multimodal Capture Wing (Left Columns) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Section: Image Upload Component */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">1. Upload Visual Evidence</span>
            
            <input 
              id="input-file-image"
              type="file" 
              ref={fileInputRef}
              accept="image/*"
              className="hidden" 
              onChange={handleImageChange}
            />

            {imagePreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-slate-100">
                <img 
                  id="preview-uploaded-image"
                  src={imagePreview} 
                  alt="Incident Visual Preview" 
                  className="w-full h-44 object-cover filter brightness-[0.95]"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                  <button
                    id="btn-replace-image"
                    type="button"
                    onClick={triggerImageSelect}
                    className="p-2 bg-white rounded-xl text-slate-700 hover:bg-slate-100 transition-colors shadow-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Camera className="w-4 h-4" /> Change
                  </button>
                  <button
                    id="btn-delete-image"
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="p-2 bg-rose-600 rounded-xl text-white hover:bg-rose-700 transition-colors shadow-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div 
                id="drop-zone-image"
                onClick={triggerImageSelect}
                className="border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/20 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all"
              >
                <div className="p-3 bg-slate-50 text-slate-400 rounded-xl mb-3">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700">Browse Image File</span>
                <p className="text-[10px] text-slate-400 text-center mt-1">Drag and drop photos of potholes, garbage, leakage, etc.</p>
              </div>
            )}
          </div>

          {/* Section: Voice Recorder Component */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-3">2. Voice Complaint Recording</span>
            
            {!audioUrl ? (
              <div className="flex flex-col items-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                {recording ? (
                  <div className="flex flex-col items-center gap-3 w-full px-4 text-center">
                    <div className="relative flex items-center justify-center">
                      <span className="absolute w-12 h-12 bg-rose-500/20 rounded-full animate-ping" />
                      <span className="absolute w-10 h-10 bg-rose-500/40 rounded-full animate-pulse" />
                      <button
                        id="btn-stop-recording"
                        type="button"
                        onClick={stopRecording}
                        className="relative z-10 w-8 h-8 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                      >
                        <Square className="w-3.5 h-3.5 fill-white" />
                      </button>
                    </div>
                    <span className="text-xs font-semibold text-rose-600 animate-pulse">Recording voice note... Spoken details are translated!</span>
                    <AudioVisualizer stream={recordingStream} isRecording={recording} color="#e11d48" barCount={26} height={36} />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <button
                      id="btn-start-recording"
                      type="button"
                      onClick={startRecording}
                      className="w-10 h-10 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-full flex items-center justify-center shadow-sm transition-all"
                    >
                      <Mic className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-bold text-slate-700">Record Voice Complaint</span>
                    <p className="text-[10px] text-slate-400 text-center max-w-[200px]">Describe the issue in your voice and the AI will auto-fill the complaint form.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                    <Play className="w-4 h-4 fill-emerald-700" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-700 block">Voice Complaint</span>
                    <audio id="audio-playback" src={audioUrl} controls className="h-6 mt-1 w-40 sm:w-48 text-xs" />
                  </div>
                </div>
                <button
                  id="btn-delete-audio"
                  type="button"
                  onClick={resetRecording}
                  className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors"
                  title="Delete Voice Record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Location Picker Component */}
          <MapComponent
            latitude={lat}
            longitude={lng}
            address={address}
            onChangeLocation={handleLocationChange}
          />

        </div>

        {/* Complaint Details Wing (Right Columns) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* AI Trigger Dispatch Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg shadow-slate-950/20">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                  <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <span className="text-sm font-extrabold text-white block">Auto-Fill Form with Gemini AI</span>
                  <p className="text-[11px] text-slate-300">Merges speech details, photo, and draft text into a rich ticket.</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              If you uploaded an image or spoke a voice message, hit <strong className="text-emerald-400">Generate Details</strong>. Gemini will analyze the assets, detect the severity, auto-classify the category, and formulate a compliant filing template.
            </p>

            <button
              id="btn-generate-ai-analysis"
              type="button"
              disabled={analyzing}
              onClick={handleAIAnalyze}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI is processing image & audio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Details with AI Assist</span>
                </>
              )}
            </button>
          </div>

          {/* Incident Registration Form */}
          <form onSubmit={handleSubmitReport} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col gap-5" id="form-report-incident">
            
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">3. Verify and Submit Complaint Details</h2>

            {/* Form element: Title */}
            <div>
              <label htmlFor="input-incident-title" className="text-xs font-bold text-slate-700 block mb-1">Incident Title</label>
              <input
                id="input-incident-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Major deep pothole in middle of crossing lane"
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            {/* Category and Priority selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="select-incident-category" className="text-xs font-bold text-slate-700 block mb-1">Incident Category</label>
                <select
                  id="select-incident-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as IssueCategory)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                >
                  <option value="potholes">🛠️ Potholes</option>
                  <option value="water_leakage">💧 Water Leakage</option>
                  <option value="garbage">🚮 Garbage & Waste</option>
                  <option value="damaged_streetlights">💡 Broken Streetlight</option>
                  <option value="road_accidents">⚠️ Road Accident</option>
                  <option value="drainage_problems">🌊 Drainage Problems</option>
                  <option value="other">❓ Other Public Hazard</option>
                </select>
                {categoryExplanation && (
                  <span className="text-[10px] text-emerald-600 font-medium block mt-1 leading-snug">
                    💡 {categoryExplanation}
                  </span>
                )}
              </div>

              <div>
                <label htmlFor="select-incident-priority" className="text-xs font-bold text-slate-700 block mb-1">Emergency Priority</label>
                <select
                  id="select-incident-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-semibold"
                >
                  <option value="low">🟢 Low (No immediate risk)</option>
                  <option value="medium">🟡 Medium (Moderate inconvenience)</option>
                  <option value="high">🟠 High (Hazard / Safety concern)</option>
                  <option value="critical">🔴 Critical (Immediate emergency)</option>
                </select>
                {priorityExplanation && (
                  <span className="text-[10px] text-amber-600 font-medium block mt-1 leading-snug">
                    ⚠️ {priorityExplanation}
                  </span>
                )}
              </div>
            </div>

            {/* Description Textarea */}
            <div>
              <label htmlFor="textarea-incident-description" className="text-xs font-bold text-slate-700 block mb-1">Detailed Description</label>
              <textarea
                id="textarea-incident-description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Give exact details of the location, dimensions of damage, time of occurrence or hazard risk details..."
                className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                required
              />
            </div>

            {/* AI Generated Executive Summary Panel */}
            {aiSummary && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3.5 flex items-start space-x-2">
                <Sparkles className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '4s' }} />
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">AI Generated Complaint Executive Summary</span>
                  <p className="text-xs text-emerald-900 font-medium mt-0.5 leading-relaxed">{aiSummary}</p>
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              id="btn-submit-incident"
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-400 py-3 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Ticket...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>File Verified Complaint</span>
                </>
              )}
            </button>

          </form>

        </div>

      </div>
    </div>
  );
}
