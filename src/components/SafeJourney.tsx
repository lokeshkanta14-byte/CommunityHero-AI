import React, { useState, useEffect, useRef } from 'react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { AppUser, EmergencyIncident } from '../types';
import { 
  Sparkles, MapPin, Activity, ShieldAlert, Navigation, Compass, Clock, Flame, 
  UserCheck, AlertCircle, PhoneCall, BellRing, HeartPulse, Locate, RotateCcw, 
  CheckCircle, Plus, Trash2, ArrowRight, ShieldCheck, Siren, Send,
  Volume2, Mic, MicOff, Car, Shield, Check, RefreshCw, Eye, Info, VolumeX, FileDown, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/LanguageContext';
import AudioVisualizer from './AudioVisualizer';

// Custom Type definition for Emergency Records in firestore
interface FirestoreEmergency {
  id?: string;
  userId: string;
  userName: string;
  userEmail: string;
  source: string;
  destination: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  status: 'active' | 'responded' | 'resolved';
  createdAt: string;
  updatedAt: string;
  nearbyUsersAlerted: boolean;
  respondersCount: number;
  digitalAlerts: {
    ambulance?: string;
    police?: string;
    fireDepartment?: string;
  };
  noResponse?: boolean;
  unconscious?: boolean;
}

interface SafeJourneyProps {
  user: AppUser | null;
}

// Interactive Nearby stations
interface AssistanceStation {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'ambulance' | 'petrol' | 'repair';
  distance: string;
  status: string;
  phone: string;
  latOffset: number;
  lngOffset: number;
}

const CONSTANT_ASSISTANCE_STATIONS: AssistanceStation[] = [
  { id: 'h1', name: "Apollo Trauma & Critical Care", type: 'hospital', distance: "0.6 km", status: "Active • 24 Emergency Beds Open", phone: "+91 40 2360 7777", latOffset: 0.15, lngOffset: -0.1 },
  { id: 'h2', name: "Rainbow Children's & General Emergency", type: 'hospital', distance: "1.2 km", status: "Active • Pediatric ICU On Duty", phone: "+91 40 4488 5000", latOffset: -0.08, lngOffset: 0.18 },
  { id: 'p1', name: "Gachibowli Law Enforcement Division", type: 'police', distance: "0.9 km", status: "Patrol Units Active • SOS Response Ready", phone: "+91 40 2785 2400", latOffset: 0.05, lngOffset: 0.22 },
  { id: 'p2', name: "Madhapur Highway Patrol Division", type: 'police', distance: "1.8 km", status: "Highway Units Active", phone: "+91 40 2785 2500", latOffset: -0.15, lngOffset: -0.12 },
  { id: 'a1', name: "Resolute LifeSupport Ambulance Core", type: 'ambulance', distance: "0.4 km", status: "3 Advanced Cardiac Ambulances Active", phone: "108", latOffset: 0.08, lngOffset: -0.05 },
  { id: 'a2', name: "Red Cross Emergency Dispatch Hub", type: 'ambulance', distance: "1.5 km", status: "Standby Dispatch Mode", phone: "102", latOffset: -0.22, lngOffset: 0.05 },
  { id: 'f1', name: "Indian Oil Mega Fuel & EV Charging", type: 'petrol', distance: "0.5 km", status: "Open • 24/7 Superchargers Active", phone: "+91 90000 11223", latOffset: -0.02, lngOffset: -0.15 },
  { id: 'f2', name: "HP Premium Station & Convenience Hub", type: 'petrol', distance: "2.1 km", status: "Open • Free Nitrogen Air Station", phone: "+91 91111 22233", latOffset: 0.22, lngOffset: 0.08 },
  { id: 'r1', name: "Bosch Premium Car Service & Recovery", type: 'repair', distance: "1.1 km", status: "Open • Roadside Flat-Bed Tow Active", phone: "+91 40 6633 4455", latOffset: -0.12, lngOffset: -0.08 },
  { id: 'r2', name: "Express Wheel Alignment & Garage Group", type: 'repair', distance: "2.5 km", status: "Open • Quick Diagnostic Bay", phone: "+91 92222 33344", latOffset: 0.12, lngOffset: 0.15 }
];

export default function SafeJourney({ user }: SafeJourneyProps) {
  const {
    t,
    country,
    language,
    voiceEnabled,
    currentCountryConfig
  } = useLanguage();

  const [subTab, setSubTab] = useState<'my-trip' | 'control-room'>('my-trip');
  const [isJourneyActive, setIsJourneyActive] = useState(false);
  
  // Trip coordinates & setup
  const [source, setSource] = useState('Nampally Railway Station, Hyderabad');
  const [destination, setDestination] = useState('Gachibowli Financial District, Hyderabad');
  const [currentAddress, setCurrentAddress] = useState('Nampally Railway Station, Hyderabad');
  const [lat, setLat] = useState(17.3850);
  const [lng, setLng] = useState(78.4867);
  const [isLocating, setIsLocating] = useState(false);

  // Synchronize trip setup dynamically whenever selected country changes!
  useEffect(() => {
    if (currentCountryConfig) {
      setSource(currentCountryConfig.source);
      setDestination(currentCountryConfig.destination);
      setCurrentAddress(currentCountryConfig.source);
      setLat(currentCountryConfig.lat);
      setLng(currentCountryConfig.lng);
    }
  }, [currentCountryConfig]);

  // Active Map assistance filter
  const [assistanceFilter, setAssistanceFilter] = useState<'hospital' | 'police' | 'ambulance' | 'petrol' | 'repair'>('hospital');

  // Journey Metrics & Analytics
  const [speed, setSpeed] = useState(0);
  const [averageSpeed, setAverageSpeed] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceCovered, setDistanceCovered] = useState(0); // km
  const [remainingDistance, setRemainingDistance] = useState(12.4); // km
  const [gForce, setGForce] = useState(1.0);
  const [safetyScore, setSafetyScore] = useState(100);
  const [peakGForce, setPeakGForce] = useState(1.0);
  const [routeProgress, setRouteProgress] = useState(0); // 0 to 100 percentage of journey completed

  // Warnings & Safety guard states
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [recentAnomalies, setRecentAnomalies] = useState<string[]>([]);
  const [sensorLogs, setSensorLogs] = useState<string[]>(["Premium AI Telemetry Guard initialized.", "Awaiting Start Journey command..."]);
  const [timelineEvents, setTimelineEvents] = useState<{ id: string; time: string; text: string; iconType: 'success' | 'warning' | 'critical' | 'info' }[]>([
    { id: 't0', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: "AI Guard Mode Booted successfully", iconType: 'success' }
  ]);

  // Voice AI Assistant settings
  const [voiceLang, setVoiceLang] = useState<'English' | 'Telugu' | 'Hindi'>('English');
  const [isVoiceActive, setIsVoiceActive] = useState(true);
  const [voiceCommandActive, setVoiceCommandActive] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceAssistantReply, setVoiceAssistantReply] = useState('Awaiting safety commands. Focus on driving, I am here as your road safety co-pilot.');
  const [assistantLogs, setAssistantLogs] = useState<string[]>(["Voice Engine online. Listening for 'Start Journey', 'Call Help', 'Stop Monitoring', 'Share My Location'."]);

  // Emergency Verification Popup states
  const [showVerification, setShowVerification] = useState(false);
  const [countdown, setCountdown] = useState(15); // Strict 15-second countdown
  const [triggeredEventType, setTriggeredEventType] = useState<'impact' | 'deceleration' | 'inactivity' | 'manual'>('manual');
  const [detectedSeverity, setDetectedSeverity] = useState<'low' | 'medium' | 'critical'>('critical');

  // Completed Safe Trip stats state
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Firestore emergencies sync
  const [globalIncidents, setGlobalIncidents] = useState<EmergencyIncident[]>([]);
  const [activeEmergency, setActiveEmergency] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // AI Command Center advanced states
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [aiBriefings, setAiBriefings] = useState<Record<string, any>>({});
  const [dispatchStatus, setDispatchStatus] = useState<Record<string, any>>({});
  const [activeResponders, setActiveResponders] = useState<Record<string, any>>({});
  const prevIncidentsRef = useRef<string[]>([]);

  // Web Audio API Synthesized High-Tech Siren Sound
  const playSirenSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 1.8;
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'sine';

      // Advanced pitch modulation
      osc1.frequency.setValueAtTime(700, audioCtx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 0.35);
      osc1.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 0.7);
      osc1.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 1.05);
      osc1.frequency.exponentialRampToValueAtTime(700, audioCtx.currentTime + 1.4);
      osc1.frequency.exponentialRampToValueAtTime(1300, audioCtx.currentTime + 1.75);

      osc2.frequency.setValueAtTime(350, audioCtx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(650, audioCtx.currentTime + 0.6);
      osc2.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + 1.25);

      gainNode.gain.setValueAtTime(0.18, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(audioCtx.currentTime + duration);
      osc2.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Web Audio Context not allowed or blocked:", e);
    }
  };

  // AI Voice Synthesis announcement speaker
  const playVoiceAnnouncement = (text: string) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = 1.0;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')));
      if (enVoice) utterance.voice = enVoice;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis failed:", err);
    }
  };

  // Fetch AI Response and recommendation plan from server
  const fetchAiBriefing = async (incident: EmergencyIncident) => {
    if (aiBriefings[incident.id] && !aiBriefings[incident.id].loading) return;

    setAiBriefings(prev => ({
      ...prev,
      [incident.id]: { loading: true }
    }));

    try {
      const res = await fetch('/api/ai-command-center-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incident })
      });
      const result = await res.json();
      if (result.success && result.data) {
        setAiBriefings(prev => ({
          ...prev,
          [incident.id]: { ...result.data, loading: false }
        }));

        if (!dispatchStatus[incident.id]) {
          setDispatchStatus(prev => ({
            ...prev,
            [incident.id]: {
              step: incident.status === 'resolved' ? 'Resolved' : incident.status === 'responded' ? 'En Route' : 'AI Verified',
              vehicles: {
                ambulance: incident.status === 'responded' || incident.status === 'resolved',
                police: incident.status === 'responded' || incident.status === 'resolved',
                fire: false
              },
              eta: result.data.estimatedResponseTimeMinutes || 7,
              timeline: [
                { time: new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: "Incident signal received from telemetry sensors." },
                { time: new Date(new Date(incident.createdAt).getTime() + 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: `AI Verification completed. Severity classified as ${incident.severity.toUpperCase()}.` }
              ]
            }
          }));
        }
      } else {
        throw new Error("API call returned false");
      }
    } catch (err) {
      console.error("AI briefing fetch error, generating offline:", err);
      const estTime = incident.severity === 'critical' ? 5 : incident.severity === 'high' ? 7 : incident.severity === 'medium' ? 9 : 12;
      const offlineBrief = {
        classification: incident.severity === 'critical' ? "Critical Trauma / Road Accident" : "Active Security Alert",
        recommendedResponse: `Dispatch nearest rescue team to coordinates near ${incident.address.split(',')[0]}. Coordinate traffic diversion.`,
        estimatedResponseTimeMinutes: estTime,
        incidentAnalysisSummary: `Automatic sensor alert detected. Impact force telemetry indicates potential high severity. Real-time GPS synced with Hyderabad HUD map.`,
        loading: false
      };
      setAiBriefings(prev => ({ ...prev, [incident.id]: offlineBrief }));

      if (!dispatchStatus[incident.id]) {
        setDispatchStatus(prev => ({
          ...prev,
          [incident.id]: {
            step: incident.status === 'resolved' ? 'Resolved' : incident.status === 'responded' ? 'En Route' : 'AI Verified',
            vehicles: {
              ambulance: incident.status === 'responded' || incident.status === 'resolved',
              police: false,
              fire: false
            },
            eta: estTime,
            timeline: [
              { time: new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: "Incident signal received from telemetry sensors." },
              { time: new Date(new Date(incident.createdAt).getTime() + 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: "AI verified incident severity classification." }
            ]
          }
        }));
      }
    }
  };

  // Dispatch Action Button Click Handler
  const handleDispatch = async (incident: EmergencyIncident, type: 'ambulance' | 'police' | 'fire') => {
    const currentBrief = aiBriefings[incident.id] || {};
    const etaVal = currentBrief.estimatedResponseTimeMinutes || 6;

    setDispatchStatus(prev => {
      const existing = prev[incident.id] || {
        step: 'Vehicle Assigned',
        vehicles: {},
        eta: etaVal,
        timeline: []
      };

      const hasVehicle = existing.vehicles && existing.vehicles[type];
      if (hasVehicle) return prev; // Already dispatched this type

      return {
        ...prev,
        [incident.id]: {
          ...existing,
          step: 'Vehicle Assigned',
          vehicles: {
            ...existing.vehicles,
            [type]: true
          },
          timeline: [
            ...existing.timeline,
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: `Authorized manual dispatch of ${type.toUpperCase()} emergency responders.` }
          ]
        }
      };
    });

    // Spawn vehicle animation
    const targetX = 250 + (Math.sin(incident.latitude) * 120);
    const targetY = 150 - (Math.cos(incident.longitude) * 90);
    const startX = type === 'ambulance' ? 50 : type === 'police' ? 450 : 250;
    const startY = type === 'ambulance' ? 50 : type === 'police' ? 250 : 10;

    const newVehicle = {
      id: incident.id,
      type,
      x: startX,
      y: startY,
      startX,
      startY,
      targetX: Math.max(30, Math.min(470, targetX)),
      targetY: Math.max(30, Math.min(270, targetY)),
      progress: 0,
      speed: 3
    };

    setActiveResponders(prev => ({
      ...prev,
      [incident.id]: [...(prev[incident.id] || []), newVehicle]
    }));

    // Voice Copilot audio broadcast
    playVoiceAnnouncement(`Critical alert dispatch. ${type.toUpperCase()} unit assigned and deploying to coordinates near ${incident.address.split(',')[0]}.`);

    try {
      await updateDoc(doc(db, 'emergencies', incident.id), {
        status: 'responded',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to sync dispatch state to firestore:", err);
    }
  };

  // Mark Incident as Resolved
  const handleResolve = async (incident: EmergencyIncident) => {
    setDispatchStatus(prev => {
      const existing = prev[incident.id];
      return {
        ...prev,
        [incident.id]: {
          ...existing,
          step: 'Resolved',
          timeline: [
            ...(existing?.timeline || []),
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: "Incident marked as fully resolved. Responders cleared." }
          ]
        }
      };
    });

    setActiveResponders(prev => {
      const copy = { ...prev };
      delete copy[incident.id];
      return copy;
    });

    playVoiceAnnouncement(`Emergency incident near ${incident.address.split(',')[0]} has been resolved successfully. Responders returning to headquarters.`);

    try {
      await updateDoc(doc(db, 'emergencies', incident.id), {
        status: 'resolved',
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to sync resolve state to firestore:", err);
    }
  };

  // PDF Export Function
  const exportIncidentReport = (incident: EmergencyIncident) => {
    const brief = aiBriefings[incident.id] || {};
    const statusInfo = dispatchStatus[incident.id] || {};
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please enable popups to print/export PDF report.");
      return;
    }

    const timelineHtml = (statusInfo.timeline || [])
      .map((evt: any) => `
        <div style="margin-bottom: 10px; border-left: 3px solid #f43f5e; padding-left: 15px; margin-left: 5px;">
          <div style="font-size: 10px; color: #64748b; font-family: monospace; font-weight: bold;">${evt.time}</div>
          <div style="font-size: 13px; color: #1e293b; font-weight: 600; margin-top: 2px;">${evt.text}</div>
        </div>
      `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Emergency_Incident_Report_${incident.id}.pdf</title>
          <style>
            body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
            .header { border-bottom: 3px solid #ef4444; padding-bottom: 15px; margin-bottom: 35px; text-align: center; }
            .logo { font-size: 26px; font-weight: 900; color: #ef4444; letter-spacing: 2px; }
            .title { font-size: 18px; color: #475569; margin-top: 6px; font-weight: bold; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 35px; }
            .card { border: 1px solid #e2e8f0; padding: 18px; border-radius: 12px; background: #f8fafc; }
            .card h3 { margin: 0 0 8px 0; font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; font-weight: 800; }
            .card p { margin: 0; font-size: 15px; font-weight: bold; color: #0f172a; }
            .section-title { font-size: 14px; text-transform: uppercase; color: #ef4444; border-bottom: 2px solid #fee2e2; padding-bottom: 6px; margin-bottom: 20px; font-weight: 800; letter-spacing: 1px; }
            .content-box { border: 1px solid #fee2e2; background: #fff5f5; padding: 20px; border-radius: 12px; margin-bottom: 35px; }
            .timeline { margin-top: 25px; }
            .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">🚨 COMMUNITY HERO AI COMMAND CENTER</div>
            <div class="title">OFFICIAL EMERGENCY INCIDENT BRIEF</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 8px; font-family: monospace;">INCIDENT REFRESH ID: ${incident.id}</div>
          </div>

          <div class="grid">
            <div class="card">
              <h3>REPORTER IDENTITY</h3>
              <p>${incident.userName}</p>
              <span style="font-size: 12px; color: #64748b;">${incident.userEmail}</span>
            </div>
            <div class="card">
              <h3>INCIDENT STATUS</h3>
              <p style="text-transform: uppercase; color: ${incident.status === 'resolved' ? '#10b981' : '#f59e0b'}">${incident.status}</p>
              <span style="font-size: 12px; color: #64748b;">Dispatch Level: ${statusInfo.step || 'AI Verified'}</span>
            </div>
            <div class="card">
              <h3>LOCATION COORDINATES</h3>
              <p>${incident.latitude.toFixed(5)}, ${incident.longitude.toFixed(5)}</p>
              <span style="font-size: 12px; color: #64748b;">${incident.address}</span>
            </div>
            <div class="card">
              <h3>EMERGENCY SEVERITY</h3>
              <p style="color: #ef4444; text-transform: uppercase; font-weight: 900;">${incident.severity}</p>
              <span style="font-size: 12px; color: #64748b;">ETA to Site: ${brief.estimatedResponseTimeMinutes || 6} Minutes</span>
            </div>
          </div>

          <div class="section-title">AI COMMAND ASSESSMENT</div>
          <div class="content-box">
            <div style="font-weight: 800; font-size: 16px; color: #991b1b; margin-bottom: 8px;">Classification: ${brief.classification || 'Critical Telemetry Shock'}</div>
            <p style="font-size: 14px; color: #374151; margin: 12px 0; font-style: italic; line-height: 1.6;">"${incident.description}"</p>
            <div style="margin-top: 18px; border-top: 1px solid #fecaca; padding-top: 12px;">
              <strong style="font-size: 11px; color: #991b1b; display: block; text-transform: uppercase; letter-spacing: 1px;">AI Recommended Response Plan</strong>
              <span style="font-size: 14px; color: #1f2937;">${brief.recommendedResponse || 'Deploy primary responders.'}</span>
            </div>
            <div style="margin-top: 18px;">
              <strong style="font-size: 11px; color: #991b1b; display: block; text-transform: uppercase; letter-spacing: 1px;">AI Briefing Summary</strong>
              <span style="font-size: 14px; color: #1f2937;">${brief.incidentAnalysisSummary || 'Telemetry evaluation completed.'}</span>
            </div>
          </div>

          <div class="section-title">CHRONOLOGICAL DISPATCH TIMELINE</div>
          <div class="timeline">
            ${timelineHtml || '<p style="font-size: 13px; color: #64748b;">No timeline logged.</p>'}
          </div>

          <div class="footer">
            DOCUMENT GENERATED AUTOMATICALLY BY INTEL COMMAND SUITE • LOCAL TIME: ${new Date().toLocaleString()} • CONFIDENTIAL INTERNAL USE ONLY
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const telemetryIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // Speed and Gforce chart arrays (sparkline)
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [gForceHistory, setGForceHistory] = useState<number[]>([]);

  // Emergency Contacts State
  const [contacts, setContacts] = useState<string[]>(() => {
    const saved = localStorage.getItem('emergency_contacts');
    return saved ? JSON.parse(saved) : ["Mother (+91 98765 43210)", "Brother (+91 87654 32109)"];
  });
  const [newContact, setNewContact] = useState('');

  const addContact = () => {
    const trimmed = newContact.trim();
    if (!trimmed) return;
    const updated = [...contacts, trimmed];
    setContacts(updated);
    localStorage.setItem('emergency_contacts', JSON.stringify(updated));
    setNewContact('');
    addTimelineEvent("Added trusted contact: " + trimmed, 'success');
  };

  const removeContact = (index: number) => {
    const updated = contacts.filter((_, idx) => idx !== index);
    setContacts(updated);
    localStorage.setItem('emergency_contacts', JSON.stringify(updated));
    addTimelineEvent("Removed trusted contact", 'info');
  };

  // Fetch coordinates
  useEffect(() => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setIsLocating(false);
          addTimelineEvent("Current physical GPS location synchronized successfully", 'success');
        },
        () => {
          setIsLocating(false);
          addTimelineEvent("GPS restriction active. Initialized simulated Hyderabad safety map path", 'info');
        }
      );
    }
  }, []);

  // Sync Emergencies from Firestore
  useEffect(() => {
    const q = query(collection(db, 'emergencies'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidents: EmergencyIncident[] = [];
      snapshot.forEach((doc) => {
        incidents.push({ id: doc.id, ...doc.data() } as EmergencyIncident);
      });
      setGlobalIncidents(incidents);
    }, (error) => {
      console.error("Emergencies onSnapshot error:", error);
      handleFirestoreError(error, OperationType.GET, 'emergencies');
    });

    return () => unsubscribe();
  }, []);

  // AI Command Center selected incident effect
  useEffect(() => {
    if (globalIncidents.length > 0) {
      if (!selectedIncidentId) {
        setSelectedIncidentId(globalIncidents[0].id);
      } else {
        const active = globalIncidents.find(i => i.id === selectedIncidentId);
        if (active) {
          fetchAiBriefing(active);
        }
      }
    }
  }, [selectedIncidentId, globalIncidents]);

  // Alert on brand-new critical emergencies
  useEffect(() => {
    if (globalIncidents.length > 0) {
      const currentIds = globalIncidents.map(i => i.id);
      const newIncidents = globalIncidents.filter(i => !prevIncidentsRef.current.includes(i.id));
      
      if (prevIncidentsRef.current.length > 0 && newIncidents.length > 0) {
        newIncidents.forEach(incident => {
          if (incident.severity === 'critical') {
            playSirenSound();
            const alertText = `Critical emergency detected near ${incident.address.split(',')[0]}. Dispatching ambulance.`;
            playVoiceAnnouncement(alertText);
          } else {
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.frequency.setValueAtTime(600, audioCtx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(1000, audioCtx.currentTime + 0.15);
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.15);
            } catch(e) {}
            playVoiceAnnouncement(`New alert received: ${incident.severity.toUpperCase()} incident near ${incident.address.split(',')[0]}.`);
          }
        });
      }
      prevIncidentsRef.current = currentIds;
    }
  }, [globalIncidents]);

  // Real-time animation interval for dispatched responder units
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveResponders(prev => {
        const updated = { ...prev };
        let changed = false;

        Object.keys(updated).forEach(incidentId => {
          const list = updated[incidentId] || [];
          const newList = list.map(vehicle => {
            if (vehicle.progress < 100) {
              changed = true;
              const nextProgress = Math.min(100, vehicle.progress + 3.5);
              const nextX = vehicle.startX + (vehicle.targetX - vehicle.startX) * (nextProgress / 100);
              const nextY = vehicle.startY + (vehicle.targetY - vehicle.startY) * (nextProgress / 100);

              if (nextProgress >= 100) {
                playVoiceAnnouncement(`Attention. Responder unit ${vehicle.type.toUpperCase()} has arrived at incident coordinates near ${incidentId.substring(0, 4)}.`);
                setDispatchStatus(prevStatus => {
                  const existing = prevStatus[incidentId];
                  if (existing) {
                    return {
                      ...prevStatus,
                      [incidentId]: {
                        ...existing,
                        step: 'Arrived',
                        timeline: [
                          ...existing.timeline,
                          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: `Dispatch ${vehicle.type.toUpperCase()} unit has arrived at scene.` }
                        ]
                      }
                    };
                  }
                  return prevStatus;
                });
              } else if (vehicle.progress === 0 && nextProgress > 0) {
                setDispatchStatus(prevStatus => {
                  const existing = prevStatus[incidentId];
                  if (existing) {
                    return {
                      ...prevStatus,
                      [incidentId]: {
                        ...existing,
                        step: 'En Route',
                        timeline: [
                          ...existing.timeline,
                          { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: `${vehicle.type.toUpperCase()} unit is now en route to location.` }
                        ]
                      }
                    };
                  }
                  return prevStatus;
                });
              }

              return {
                ...vehicle,
                progress: nextProgress,
                x: nextX,
                y: nextY
               };
             }
             return vehicle;
           });
           updated[incidentId] = newList;
         });

         return changed ? updated : prev;
       });
     }, 150);

     return () => clearInterval(interval);
   }, []);

  // Web Speech API Synthesis voice function
  const speakVoice = (text: string, langCode: 'English' | 'Telugu' | 'Hindi' = voiceLang) => {
    if (!isVoiceActive || !window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Map language code to system voice tags
    if (langCode === 'Hindi') {
      utterance.lang = 'hi-IN';
    } else if (langCode === 'Telugu') {
      utterance.lang = 'te-IN';
    } else {
      utterance.lang = 'en-US';
    }

    // Try to find native support voices
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    if (langCode === 'Hindi') {
      selectedVoice = voices.find(v => v.lang.startsWith('hi') || v.name.includes('Hindi') || v.name.includes('Lekha') || v.name.includes('Kalpana'));
    } else if (langCode === 'Telugu') {
      selectedVoice = voices.find(v => v.lang.startsWith('te') || v.name.includes('Telugu') || v.name.includes('Shruti'));
    } else {
      selectedVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Natural')));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  // Helper to add timeline events
  const addTimelineEvent = (text: string, iconType: 'success' | 'warning' | 'critical' | 'info') => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTimelineEvents(prev => [
      { id: Math.random().toString(), time, text, iconType },
      ...prev
    ]);
  };

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      
      rec.onstart = () => {
        setVoiceCommandActive(true);
        setVoiceTranscript('Listening to voice input...');
      };

      rec.onresult = async (event: any) => {
        const resultText = event.results[0][0].transcript;
        setVoiceTranscript(resultText);
        setAssistantLogs(prev => [`Driver said: "${resultText}"`, ...prev]);
        handleVoiceCommand(resultText);
      };

      rec.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setVoiceCommandActive(false);
      };

      rec.onend = () => {
        setVoiceCommandActive(false);
      };

      recognitionRef.current = rec;
    }
  }, [isJourneyActive, source, destination, voiceLang]);

  // Handle voice commands
  const handleVoiceCommand = async (command: string) => {
    const cleanCommand = command.toLowerCase().trim();
    
    // Command 1: Start Journey
    if (cleanCommand.includes("start journey") || cleanCommand.includes("begin journey") || cleanCommand.includes("start trip")) {
      if (!isJourneyActive) {
        startJourney();
        const msg = voiceLang === 'Telugu' ? 'ప్రయాణం ప్రారంభించబడింది. జాగ్రత్తగా నడపండి.' : voiceLang === 'Hindi' ? 'यात्रा शुरू हो गई है। सुरक्षित ड्राइव करें।' : 'Journey started. Monitoring active. Drive safely.';
        setVoiceAssistantReply(msg);
        speakVoice(msg);
      } else {
        const msg = 'Journey is already active.';
        setVoiceAssistantReply(msg);
        speakVoice(msg);
      }
      return;
    }

    // Command 2: Call Help / SOS
    if (cleanCommand.includes("call help") || cleanCommand.includes("emergency") || cleanCommand.includes("sos") || cleanCommand.includes("help me")) {
      triggerVerification('manual', 1.0);
      const msg = voiceLang === 'Telugu' ? 'అత్యవసర సహాయం సక్రియం చేయబడింది. సహాయక బృందాలకు తెలియజేస్తున్నాము.' : voiceLang === 'Hindi' ? 'आपातकालीन सहायता सक्रिय हो गई है। सहायता भेजी जा रही है।' : 'Emergency help triggered. Critical dispatch evaluation running.';
      setVoiceAssistantReply(msg);
      speakVoice(msg);
      return;
    }

    // Command 3: Share My Location
    if (cleanCommand.includes("share my location") || cleanCommand.includes("share location") || cleanCommand.includes("location share")) {
      const locMsg = `My current coordinates are latitude ${lat.toFixed(4)}, longitude ${lng.toFixed(4)} near Gachibowli sector. Live GPS tracking URL generated and sent to trusted contacts.`;
      setVoiceAssistantReply(locMsg);
      speakVoice(locMsg);
      addTimelineEvent("Live GPS Location packet dispatched to emergency server & trusted contacts", 'info');
      setSensorLogs(prev => ["Location update shared with emergency cloud nodes.", ...prev]);
      return;
    }

    // Command 4: Stop Monitoring
    if (cleanCommand.includes("stop monitoring") || cleanCommand.includes("stop journey") || cleanCommand.includes("end trip") || cleanCommand.includes("complete journey")) {
      if (isJourneyActive) {
        completeJourneySafely();
      } else {
        const msg = 'No active journey is currently monitored.';
        setVoiceAssistantReply(msg);
        speakVoice(msg);
      }
      return;
    }

    // Dynamic co-pilot AI fallback using Gemini Server Voice Endpoint
    try {
      const res = await fetch('/api/ai-safe-journey-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: command,
          language: voiceLang,
          speed,
          safetyScore,
          isEmergency: showVerification || activeEmergency !== null
        })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setVoiceAssistantReply(data.reply);
        speakVoice(data.reply);
      } else {
        speakVoice("I am monitoring your safety. Please focus on the road.");
      }
    } catch (err) {
      speakVoice("Safe journey monitoring is active. No immediate hazards detected.");
    }
  };

  // Toggle voice listening manually
  const toggleListening = () => {
    if (voiceCommandActive) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(60); } catch (e) {}
      }
      recognitionRef.current?.stop();
    } else {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([40, 30, 40]); } catch (e) {}
      }
      if (recognitionRef.current) {
        recognitionRef.current.lang = voiceLang === 'Hindi' ? 'hi-IN' : voiceLang === 'Telugu' ? 'te-IN' : 'en-US';
        recognitionRef.current.start();
      } else {
        // Fallback for environment without microphone api
        const typedCmd = prompt("Enter voice command (Simulated):\n- Start Journey\n- Call Help\n- Share My Location\n- Stop Monitoring");
        if (typedCmd) {
          setVoiceTranscript(typedCmd);
          setAssistantLogs(prev => [`Simulated input: "${typedCmd}"`, ...prev]);
          handleVoiceCommand(typedCmd);
        }
      }
    }
  };

  // Interactive Map vehicle movement & Sensor fluctuation
  useEffect(() => {
    if (isJourneyActive) {
      telemetryIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const nextSecs = prev + 1;
          
          // Progress speed and path route movement
          setRouteProgress(p => {
            const nextP = Math.min(100, p + 0.6);
            if (nextP >= 100) {
              completeJourneySafely();
              return 100;
            }
            return nextP;
          });

          return nextSecs;
        });

        // Speed fluctuation simulation (between 45 and 78 normally)
        setSpeed(prev => {
          const change = Math.floor(Math.random() * 11) - 5;
          let nextSpeed = prev + change;
          if (nextSpeed < 45) nextSpeed = 45;
          if (nextSpeed > 82) nextSpeed = 82;

          // Push into history sparkline limit to 20 items
          setSpeedHistory(hist => [...hist.slice(-19), nextSpeed]);
          return nextSpeed;
        });

        // G-Force vibration simulation
        setGForce(prev => {
          const vibr = parseFloat((1.0 + Math.random() * 0.12).toFixed(2));
          setGForceHistory(hist => [...hist.slice(-19), vibr]);
          if (vibr > peakGForce) {
            setPeakGForce(vibr);
          }
          return vibr;
        });

        // Distance & Analytics increment
        setDistanceCovered(d => {
          const added = parseFloat((0.015 + Math.random() * 0.01).toFixed(3));
          const nextDist = parseFloat((d + added).toFixed(2));
          setRemainingDistance(rem => {
            const nextRem = parseFloat(Math.max(0, 12.4 - nextDist).toFixed(2));
            return nextRem;
          });
          return nextDist;
        });

        // Safety Score continuous calculation
        setSafetyScore(score => {
          let penalty = 0;
          // Overspeed warning penalty
          if (speed > 80) {
            penalty += 1;
          }
          // Peak G vibration penalty
          if (gForce > 1.3) {
            penalty += 0.5;
          }
          const nextScore = Math.max(55, Math.min(100, parseFloat((score - penalty).toFixed(1))));
          return nextScore;
        });

        // AI Safety Guard continuous active sweep evaluation
        evaluateAiSafetyGuard();

      }, 1000);
    } else {
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      setSpeed(0);
      setGForce(1.0);
    }

    return () => {
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
    };
  }, [isJourneyActive, speed, gForce, safetyScore]);

  // Evaluates simulated triggers and raises warnings/updates alerts
  const evaluateAiSafetyGuard = () => {
    const warnings: string[] = [];
    
    // 1. Overspeed check (> 80 km/h)
    if (speed > 80) {
      warnings.push("Overspeed Detected (80km/h Limit)");
      if (!aiWarnings.includes("Overspeed Detected (80km/h Limit)")) {
        addTimelineEvent("Overspeed hazard flag: Current speed exceeds safety guidelines", 'warning');
        setSensorLogs(prev => ["⚠️ SAFETY NOTICE: Driver exceeds sector speed limits.", ...prev]);
        speakVoice("Warning: You are overspeeding. Please slow down.");
      }
    }

    // 2. Dangerous Driving check
    if (speed > 72 && gForce > 1.25) {
      warnings.push("Dangerous Driving Pattern");
      if (!aiWarnings.includes("Dangerous Driving Pattern")) {
        addTimelineEvent("AI Alert: Reckless driving flagged from high speed and high G-vibrations", 'warning');
        speakVoice("Dangerous driving detected. Maintain proper lane spacing.");
      }
    }

    // 3. Simulated Obstacle/Possible Collision Ahead (Random check at 15% probability)
    if (Math.random() < 0.08) {
      warnings.push("Possible Collision Ahead");
      addTimelineEvent("Collision Guard active: Approaching slower vehicle ahead", 'warning');
      setSensorLogs(prev => ["⚠️ HAZARD PROXIMITY: Slow moving object detected 45 meters ahead.", ...prev]);
      speakVoice("Possible collision threat detected ahead. Maintain brake alert.");
    }

    // 4. Unsafe Area ahead (Segment check based on route progress)
    if (routeProgress > 40 && routeProgress < 55) {
      warnings.push("Unsafe Area Ahead");
      if (!aiWarnings.includes("Unsafe Area Ahead")) {
        addTimelineEvent("AI Route Scan: Entering segment with historical pothole cluster & dark lanes", 'warning');
        speakVoice("Caution, unsafe road area ahead. Watch out for potential potholes.");
      }
    }

    setAiWarnings(warnings);
  };

  // Actions to simulate different driving anomalies to test safety scores
  const simulateAnomaly = (type: 'brake' | 'sharp-turn' | 'speed-up') => {
    if (!isJourneyActive) {
      alert("Please start the journey first before simulating telemetry anomalies.");
      return;
    }

    if (type === 'brake') {
      setSpeed(12);
      setGForce(2.85);
      setSafetyScore(prev => Math.max(60, prev - 12));
      addTimelineEvent("Abrupt deceleration triggered: Sudden emergency braking", 'warning');
      setSensorLogs(prev => ["🚨 TELEMETRY CRITICAL: Sudden braking force registered at 2.85G.", ...prev]);
      speakVoice("Sudden brake recorded. Re-evaluating driver safety state.");
      
      // 12% probability of accident verification
      if (Math.random() < 0.4) {
        triggerVerification('deceleration', 2.85);
      }
    } else if (type === 'sharp-turn') {
      setGForce(1.95);
      setSafetyScore(prev => Math.max(60, prev - 8));
      addTimelineEvent("Heavy centrifugal pull: Sharp turn anomaly flagged", 'warning');
      setSensorLogs(prev => ["⚠️ ACCELEROMETER ALARM: High lateral turn rate at 1.95G.", ...prev]);
      speakVoice("Sharp vehicle turn registered. Please stabilize.");
    } else if (type === 'speed-up') {
      setSpeed(92);
      setGForce(1.4);
      setSafetyScore(prev => Math.max(60, prev - 15));
      addTimelineEvent("Excessive throttle input: Vehicle accelerating to 92 km/h", 'warning');
      setSensorLogs(prev => ["🚨 SYSTEM EXCEEDED: Extreme overspeeding sector violation.", ...prev]);
      speakVoice("Warning, high velocity detected. Decelerate immediately.");
    }
  };

  // Start journey handler
  const startJourney = () => {
    if (!source || !destination) {
      alert("Please enter a valid start location and destination address.");
      return;
    }
    setIsJourneyActive(true);
    setElapsedSeconds(0);
    setDistanceCovered(0);
    setRemainingDistance(12.4);
    setRouteProgress(0);
    setSafetyScore(100);
    setPeakGForce(1.0);
    setSpeed(48);
    setSpeedHistory([48]);
    setGForceHistory([1.0]);
    setAiWarnings([]);
    setActiveEmergency(null);
    setSensorLogs([`Safe Journey Mode initiated from ${source} to ${destination}. Premium telemetry guard running.`]);
    addTimelineEvent(`Trip started safely: ${source} ➡️ ${destination}`, 'success');
    
    const speakText = voiceLang === 'Telugu' ? `ప్రయాణం ప్రారంభించబడింది. గమ్యస్థానం: ${destination}. మీ ప్రయాణాన్ని రక్షిస్తున్నాము.` : voiceLang === 'Hindi' ? `यात्रा शुरू हो गई है। गंतव्य स्थान है ${destination}. हम आपकी सुरक्षा की निगरानी कर रहे हैं।` : `Premium Guard activated. Safe journey started from ${source} to ${destination}. Directing monitoring system.`;
    speakVoice(speakText);
  };

  // Complete journey safely (large green button handler)
  const completeJourneySafely = () => {
    setIsJourneyActive(false);
    
    const stats = {
      duration: formatDuration(elapsedSeconds),
      avgSpeed: parseFloat((52 + Math.random() * 8).toFixed(1)),
      distance: distanceCovered > 0 ? distanceCovered : 12.4,
      peakG: peakGForce.toFixed(2),
      safetyScore: Math.round(safetyScore)
    };

    setSummaryData(stats);
    setShowSummaryModal(true);
    setIsJourneyActive(false);
    setActiveEmergency(null);
    setSpeed(0);
    setGForce(1.0);
    
    addTimelineEvent("Commute completed successfully. High safety score logged", 'success');
    setSensorLogs(prev => ["Trip terminated normally. Driver arrived safely.", ...prev]);

    const congratulationsText = voiceLang === 'Telugu' ? `అభినందనలు! మీరు క్షేమంగా చేరుకున్నారు. మీ భద్రత స్కోరు: 100 కి ${Math.round(safetyScore)}` : voiceLang === 'Hindi' ? `बधाई हो! आप सुरक्षित पहुँच गए हैं। आपका सुरक्षा स्कोर: 100 में से ${Math.round(safetyScore)}` : `Congratulations! You have reached your destination safely. Your final AI Safety Score is ${Math.round(safetyScore)} out of 100. Excellent driving performance.`;
    speakVoice(congratulationsText);
  };

  // Start countdown of 15 seconds when verification screen opens
  useEffect(() => {
    if (showVerification) {
      setCountdown(15);
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            triggerAutomatedDispatch(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showVerification]);

  // Triggers countdown confirmation modal
  const triggerVerification = (type: 'impact' | 'deceleration' | 'inactivity' | 'manual', forceVal?: number) => {
    setTriggeredEventType(type);
    const logForce = forceVal || (type === 'impact' ? 4.9 : type === 'deceleration' ? 2.8 : 1.0);
    setGForce(logForce);
    setSpeed(0);

    // Set auto detected severity
    if (type === 'impact' && logForce > 4.2) {
      setDetectedSeverity('critical');
    } else if (type === 'deceleration' || logForce > 2.5) {
      setDetectedSeverity('medium');
    } else {
      setDetectedSeverity('low');
    }

    setSensorLogs(prev => [`🚨 CRITICAL EVENT THRESHOLD [${type.toUpperCase()}] triggered at ${logForce}G. Confirming driver safety.`, ...prev]);
    addTimelineEvent(`AI Incident Alarm: Sensor registered potential crash event type ${type.toUpperCase()}`, 'critical');
    
    // Voice prompt driver to cancel within 15 seconds
    const warningVoice = voiceLang === 'Telugu' ? `ప్రమాదం గుర్తించబడింది. మీరు సురక్షితంగా ఉన్నారో లేదో నిర్ధారించడానికి స్క్రీన్ పై నొక్కండి. లేనిచో పదిహేను సెకన్లలో రెస్క్యూ సేవలు పంపబడతాయి.` : voiceLang === 'Hindi' ? `दुर्घटना की चेतावनी। यदि आप सुरक्षित हैं तो रद्द करें, अन्यथा पंद्रह सेकंड में आपातकालीन सेवाएं भेजी जाएंगी।` : `Incident alarm. Emergency sensor triggered. Click I Am Safe to cancel immediately, or automated rescue teams will be dispatched in fifteen seconds.`;
    speakVoice(warningVoice);
    
    setShowVerification(true);
  };

  // User canceled the alarm
  const handleImSafe = () => {
    setShowVerification(false);
    setCountdown(15);
    setSpeed(48);
    setGForce(1.0);
    setSensorLogs(prev => ["💚 Dispatch aborted: Driver verified active safety status.", ...prev]);
    addTimelineEvent("Driver confirmed safety manually. Emergency rescue loop aborted", 'success');
    
    const safeVoice = voiceLang === 'Telugu' ? `రెస్క్యూ అభ్యర్థన రద్దు చేయబడింది.` : voiceLang === 'Hindi' ? `बचाव दल का अलर्ट रद्द कर दिया गया है।` : `Emergency dispatch canceled. Safe journey monitoring resumed.`;
    speakVoice(safeVoice);
  };

  // Countdown hit zero: Send full live location, notify nearby stations, trusted contacts, and write to Firebase
  const triggerAutomatedDispatch = async (noResponse: boolean = false) => {
    setShowVerification(false);
    setIsEvaluating(true);

    const sensorData = {
      gForce,
      speed: triggeredEventType === 'impact' ? 70 : 45,
      impactDetected: triggeredEventType === 'impact' || triggeredEventType === 'deceleration',
      inactivityDurationMs: triggeredEventType === 'inactivity' ? 15000 : 3000,
      offRoute: triggeredEventType === 'inactivity'
    };

    const tripData = {
      source,
      destination,
      currentAddress,
      durationMinutes: Math.ceil(elapsedSeconds / 60)
    };

    try {
      // Server-side evaluation using modern Gemini API endpoint
      const response = await fetch('/api/ai-safe-journey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sensorData, tripData, eventType: triggeredEventType })
      });

      const result = await response.json();
      if (result.success && result.data) {
        const payload = result.data;
        setActiveEmergency(payload);

        // Save emergency incident in Firestore
        const emergencyRecord: Omit<FirestoreEmergency, 'id'> = {
          userId: user?.uid || 'guest_citizen',
          userName: user?.displayName || 'Jane Citizen',
          userEmail: user?.email || 'jane.citizen@gmail.com',
          source,
          destination,
          latitude: lat,
          longitude: lng,
          address: currentAddress,
          severity: payload.severity || 'critical',
          description: noResponse 
            ? "No response detected from driver. Assuming driver is unconscious. Automated rescue dispatch active. " + (payload.emergencySummary || 'Automated accident rescue dispatched.')
            : (payload.emergencySummary || 'Automated accident rescue dispatched.'),
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          nearbyUsersAlerted: true,
          respondersCount: 1,
          digitalAlerts: payload.digitalAlerts || {
            ambulance: "Deploy active critical care team to Hyderabad GPS Sector immediately.",
            police: "Highway roadblock active. Dispatch squad.",
            fireDepartment: "Vessel damage flagged, dispatch rescue squad."
          },
          noResponse,
          unconscious: noResponse
        };

        const docRef = await addDoc(collection(db, 'emergencies'), emergencyRecord);
        setSelectedIncidentId(docRef.id);
        setSensorLogs(prev => [
          `🚨 AUTOMATED EMERGENCY RESCUE ENROUTE. Database ID: ${docRef.id}`,
          ...(noResponse ? ["No user response detected.", "Emergency contacts notified (simulation).", "Ambulance, police and nearby hospital dispatched (simulation)."] : []),
          ...prev
        ]);
        addTimelineEvent(`EMERGENCY TEAM ENROUTE: Database Incident registered (${payload.severity.toUpperCase()})`, 'critical');
        if (noResponse) {
          addTimelineEvent("No user response detected.", 'critical');
          addTimelineEvent("Emergency contacts notified (simulation)", 'critical');
          addTimelineEvent("Ambulance, police and nearby hospital dispatched (simulation)", 'critical');
        }

        // Speak instructions aloud
        const instructVoice = noResponse 
          ? "No user response detected. Assuming driver is unconscious. Emergency rescue services have been dispatched. Emergency contacts have been notified."
          : `Automated dispatch successful. Emergency services are now tracking your live location coordinates. Remain calm, help is arriving near ${currentAddress}.`;
        speakVoice(instructVoice);
      } else {
        throw new Error("Invalid API response data");
      }
    } catch (error) {
      console.error("Failed AI evaluation:", error);
      // Fallback local crash incident registered
      const fallbackRecord: Omit<FirestoreEmergency, 'id'> = {
        userId: user?.uid || 'guest_citizen',
        userName: user?.displayName || 'Jane Citizen',
        userEmail: user?.email || 'jane.citizen@gmail.com',
        source,
        destination,
        latitude: lat,
        longitude: lng,
        address: currentAddress,
        severity: 'critical',
        description: noResponse 
          ? `No user response detected. Driver assumed unconscious. Crash telemetry incident triggered near ${currentAddress}. Rescue teams dispatched.`
          : `Impact event triggered at ${gForce}G near ${currentAddress}. Automated safety countdown expired. Rescue teams dispatched.`,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nearbyUsersAlerted: true,
        respondersCount: 1,
        digitalAlerts: {
          ambulance: "Dispatched immediate life support paramedic units to Hyderabad Sector.",
          police: "Blockage clearance and law enforcement dispatch engaged.",
          fireDepartment: "High-G containment safety dispatch instructions active."
        },
        noResponse,
        unconscious: noResponse
      };

      const docRef = await addDoc(collection(db, 'emergencies'), fallbackRecord);
      setSelectedIncidentId(docRef.id);
      setActiveEmergency({
        isLikelyEmergency: true,
        severity: 'critical',
        emergencySummary: fallbackRecord.description,
        digitalAlerts: fallbackRecord.digitalAlerts
      });
      setSensorLogs(prev => [
        `🚨 FALLBACK EMERGENCY PROTOCOL ACTIVE. Database ID: ${docRef.id}`,
        ...(noResponse ? ["No user response detected.", "Emergency contacts notified (simulation).", "Ambulance, police and nearby hospital dispatched (simulation)."] : []),
        ...prev
      ]);
      addTimelineEvent("Database incident registered under emergency alert fallback protocol", 'critical');
      if (noResponse) {
        addTimelineEvent("No user response detected.", 'critical');
        addTimelineEvent("Emergency contacts notified (simulation)", 'critical');
        addTimelineEvent("Ambulance, police and nearby hospital dispatched (simulation)", 'critical');
      }
      speakVoice(noResponse 
        ? "No user response detected. Assuming driver is unconscious. Fallback rescue dispatch initiated automatically." 
        : "Fallback emergency dispatch successful. Paramedics and highway patrol notified.");
    } finally {
      setIsEvaluating(false);
      setSubTab('control-room');
    }
  };

  // Helper formats duration
  const formatDuration = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Dynamic localized assistance stations based on country config
  const assistanceStations = React.useMemo(() => {
    const config = currentCountryConfig;
    if (!config) return [];
    return [
      {
        id: 'h1',
        name: `${config.name} General Trauma Hospital`,
        type: 'hospital',
        distance: "0.6 km",
        status: "Emergency Beds Available",
        phone: config.ambulanceNumber,
        latOffset: 0.015,
        lngOffset: -0.01
      },
      {
        id: 'h2',
        name: `Red Cross Medical Dispatch`,
        type: 'hospital',
        distance: "1.4 km",
        status: "Ambulance Crew Ready",
        phone: config.ambulanceNumber,
        latOffset: -0.008,
        lngOffset: 0.018
      },
      {
        id: 'p1',
        name: `${config.city || config.name} Central Police Station`,
        type: 'police',
        distance: "0.9 km",
        status: "Active Highway Units",
        phone: config.policeNumber,
        latOffset: 0.005,
        lngOffset: 0.022
      },
      {
        id: 'p2',
        name: `Highway Safety Patrol Unit`,
        type: 'police',
        distance: "1.8 km",
        status: "Patrol Cars Active",
        phone: config.policeNumber,
        latOffset: -0.015,
        lngOffset: -0.012
      },
      {
        id: 'a1',
        name: `Paramedic Ambulance Hub`,
        type: 'ambulance',
        distance: "0.4 km",
        status: "Emergency Unit Standby",
        phone: config.ambulanceNumber,
        latOffset: 0.008,
        lngOffset: -0.005
      },
      {
        id: 'f1',
        name: `${config.city || config.name} Fire & Rescue Services`,
        type: 'fire',
        distance: "0.7 km",
        status: "Rescue Crews Ready",
        phone: config.fireNumber,
        latOffset: 0.012,
        lngOffset: -0.015
      },
      {
        id: 's1',
        name: config.shelterName || "Emergency Transit Shelter",
        type: 'shelter',
        distance: "2.3 km",
        status: "Active Shelter Facility",
        phone: config.emergencyNumber,
        latOffset: -0.018,
        lngOffset: -0.01
      },
      {
        id: 'f2',
        name: config.fuelStation || "Green Grid Station & EV Power",
        type: 'petrol',
        distance: "1.1 km",
        status: "Open 24 Hours",
        phone: config.emergencyNumber,
        latOffset: 0.022,
        lngOffset: 0.008
      },
      {
        id: 'r1',
        name: config.repairShop || "Premium Towing & Road Recovery",
        type: 'repair',
        distance: "1.3 km",
        status: "Roadside Service Active",
        phone: config.emergencyNumber,
        latOffset: -0.012,
        lngOffset: -0.008
      }
    ];
  }, [currentCountryConfig]);

  // Filtered assistance stations
  const filteredStations = assistanceStations.filter(s => s.type === assistanceFilter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="safe-journey-core-viewport">
      {/* Premium modern header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="inline-flex items-center space-x-1.5 bg-rose-950/60 text-rose-400 px-3 py-1 rounded-full text-xs font-bold border border-rose-900/60 mb-2.5 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
            <Siren className="w-3.5 h-3.5 animate-pulse text-rose-500" />
            <span className="tracking-wide">AI PRE-CRASH PREDICTIVE GUARD</span>
          </div>
          <h1 className="text-3xl font-sans font-black tracking-tight text-white flex items-center gap-2">
            Safe Journey <span className="text-rose-500">Premium AI Co-Pilot</span>
          </h1>
          <p className="text-slate-400 text-xs mt-1 max-w-xl leading-relaxed">
            Continuously evaluates speed limits, sudden brakes, lateral turn forces, and driver inactivity using machine learning models. Automatically initiates high-precision medical & police dispatches.
          </p>
        </div>

        {/* Tab switch controller */}
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 max-w-md shrink-0 self-start lg:self-center">
          <button
            onClick={() => setSubTab('my-trip')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'my-trip' 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Navigation className="w-4 h-4" />
            <span>My Safe Commute</span>
          </button>
          <button
            onClick={() => setSubTab('control-room')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'control-room' 
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30 font-extrabold' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Control Center ({globalIncidents.length})</span>
          </button>
        </div>
      </div>

      {/* Main View Grid: Deep Premium Dark HUD */}
      {subTab === 'my-trip' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-white bg-slate-950 p-1 rounded-3xl">
          
          {/* LEFT: Telemetry HUD Panel & Inputs (Col Span 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Input Trip Segment */}
            {!isJourneyActive ? (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
                <h3 className="font-sans font-bold text-sm text-slate-200 mb-4 flex items-center space-x-2">
                  <Car className="w-4 h-4 text-rose-500" />
                  <span>Configure Safe Trip Route</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Start Address</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-rose-500" />
                      <input
                        type="text"
                        value={source}
                        onChange={(e) => setSource(e.target.value)}
                        placeholder="Starting coordinate address..."
                        className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl pl-9 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">Destination Location</label>
                    <div className="relative">
                      <Compass className="absolute left-3 top-3.5 w-4 h-4 text-emerald-500 animate-spin-slow" />
                      <input
                        type="text"
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="Destination address..."
                        className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold rounded-xl pl-9 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    onClick={startJourney}
                    id="btn-start-journey"
                    className="w-full py-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 active:scale-95 text-xs font-black uppercase tracking-wider text-white rounded-xl shadow-lg shadow-rose-900/40 transition-all flex items-center justify-center space-x-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Engage AI Co-Pilot & Start Journey</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    ACTIVE CO-PILOT SHIELD
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">{formatDuration(elapsedSeconds)}</span>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 mb-5">
                  <div className="flex items-center space-x-2.5 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></div>
                    <span className="text-[11px] font-bold text-slate-300 truncate">{source}</span>
                  </div>
                  <div className="w-0.5 h-4 bg-slate-800 ml-1 mb-2"></div>
                  <div className="flex items-center space-x-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></div>
                    <span className="text-[11px] font-bold text-slate-300 truncate">{destination}</span>
                  </div>
                </div>

                {/* Simulated dangerous driving triggers */}
                <div className="space-y-2 mb-4">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Simulator Trigger Injectors</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => simulateAnomaly('brake')}
                      className="px-2 py-2 bg-slate-950 border border-slate-800 hover:border-amber-600 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 flex flex-col items-center gap-1"
                      title="Simulate sudden hard brake deceleration"
                    >
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                      <span>Hard Brake</span>
                    </button>
                    <button
                      onClick={() => simulateAnomaly('sharp-turn')}
                      className="px-2 py-2 bg-slate-950 border border-slate-800 hover:border-amber-600 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 flex flex-col items-center gap-1"
                      title="Simulate sudden sharp lateral turn"
                    >
                      <Compass className="w-3.5 h-3.5 text-amber-500" />
                      <span>Sharp Turn</span>
                    </button>
                    <button
                      onClick={() => simulateAnomaly('speed-up')}
                      className="px-2 py-2 bg-slate-950 border border-slate-800 hover:border-rose-600 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 flex flex-col items-center gap-1"
                      title="Simulate vehicle accelerating over speed limit"
                    >
                      <Car className="w-3.5 h-3.5 text-rose-500" />
                      <span>Speed Up</span>
                    </button>
                  </div>
                </div>

                {/* Accident & Inactivity Simulators */}
                <div className="space-y-2 mb-4">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Accident & Inactivity Simulators</span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => triggerVerification('impact', 6.5)}
                      className="px-2 py-2 bg-slate-950 border border-slate-800 hover:border-rose-500 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 flex flex-col items-center gap-1"
                      title="Simulate high impact Major Collision"
                    >
                      <Flame className="w-3.5 h-3.5 text-rose-500" />
                      <span>Major Collision</span>
                    </button>
                    <button
                      onClick={() => triggerVerification('deceleration', 3.5)}
                      className="px-2 py-2 bg-slate-950 border border-slate-800 hover:border-rose-500 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 flex flex-col items-center gap-1"
                      title="Simulate sudden absolute deceleration stop"
                    >
                      <Activity className="w-3.5 h-3.5 text-rose-500" />
                      <span>Sudden Stop</span>
                    </button>
                    <button
                      onClick={() => triggerVerification('inactivity', 1.0)}
                      className="px-2 py-2 bg-slate-950 border border-slate-800 hover:border-rose-500 rounded-xl text-[10px] font-bold text-slate-300 transition-all active:scale-95 flex flex-col items-center gap-1"
                      title="Simulate prolonged vehicle/driver inactivity"
                    >
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>Long Inactivity</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => triggerVerification('manual', 1.0)}
                    className="py-3 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 active:scale-95 shadow-sm"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Trigger Manual SOS</span>
                  </button>

                  <button
                    onClick={completeJourneySafely}
                    id="btn-complete-journey-safely"
                    className="py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-emerald-950 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-xs font-extrabold uppercase rounded-xl transition-all flex items-center justify-center space-x-1 shadow-lg shadow-emerald-900/20"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Arrived Safely</span>
                  </button>
                </div>
              </div>
            )}

            {/* Voice AI Assistant widget */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-sans font-bold text-xs text-slate-300 flex items-center space-x-2">
                  <Volume2 className="w-4 h-4 text-rose-500" />
                  <span>Voice AI Co-Pilot (Gemini)</span>
                </h3>
                <div className="flex items-center space-x-2">
                  <select
                    value={voiceLang}
                    onChange={(e) => {
                      setVoiceLang(e.target.value as any);
                      speakVoice("Language updated", e.target.value as any);
                    }}
                    className="bg-slate-950 border border-slate-800 text-[10px] text-rose-400 rounded-lg p-1 focus:outline-none"
                  >
                    <option value="English">English</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                  </select>
                  <button
                    onClick={() => {
                      setIsVoiceActive(!isVoiceActive);
                      if (isVoiceActive) window.speechSynthesis?.cancel();
                    }}
                    className="p-1 text-slate-400 hover:text-white bg-slate-950 rounded-lg border border-slate-800"
                    title={isVoiceActive ? "Mute speech" : "Unmute speech"}
                  >
                    {isVoiceActive ? <Volume2 className="w-3 h-3 text-emerald-400" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
                  </button>
                </div>
              </div>

              {/* Glowing micro-animation for mic */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-3 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block mb-1">Copilot Feed</span>
                  <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                    "{voiceAssistantReply}"
                  </p>
                  {voiceTranscript && (
                    <div className="mt-2 text-[10px] text-rose-400 font-mono bg-rose-950/20 border border-rose-900/40 p-1.5 rounded-lg">
                      🎤 "{voiceTranscript}"
                    </div>
                  )}
                  {voiceCommandActive && (
                    <div className="mt-2 max-w-[140px]">
                      <AudioVisualizer isRecording={voiceCommandActive} color="#f43f5e" barCount={14} height={16} />
                    </div>
                  )}
                </div>
                <button
                  onClick={toggleListening}
                  className={`p-4 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                    voiceCommandActive 
                      ? 'bg-rose-600 text-white animate-bounce shadow-lg shadow-rose-600/50' 
                      : 'bg-slate-900 hover:bg-slate-800 text-rose-500 border border-slate-800'
                  }`}
                  title="Speak to Assistant"
                >
                  <Mic className="w-5 h-5" />
                </button>
              </div>

              {/* Instructions banner */}
              <div className="text-[10px] text-slate-500 leading-relaxed bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl font-mono">
                <span className="font-bold text-slate-400 uppercase tracking-wide block mb-1">SUPPORTED COMMANDS:</span>
                • "Start Journey" <br />
                • "Call Help" / "SOS" <br />
                • "Share My Location" <br />
                • "Stop Monitoring"
              </div>
            </div>

            {/* Trusted Contacts Panel */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h3 className="font-sans font-bold text-xs text-slate-300 mb-3 flex items-center justify-between">
                <span className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Trusted Emergency Contacts</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono font-bold">SMS Dispatch Active</span>
              </h3>

              <div className="space-y-2 mb-4">
                {contacts.map((contact, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                    <span className="text-xs text-slate-300 font-bold">{contact}</span>
                    <button
                      onClick={() => removeContact(idx)}
                      className="text-slate-500 hover:text-rose-500 transition-colors p-1"
                      title="Remove contact"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="Name / Phone Number..."
                  className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-lg px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none"
                />
                <button
                  onClick={addContact}
                  className="p-2 bg-slate-950 border border-slate-800 hover:border-rose-500 rounded-lg text-rose-500 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* MIDDLE: Live Interactive SVG Map & Stations Hub (Col Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Interactive SVG Vector Map */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col h-[380px]">
              <div className="flex items-center justify-between mb-3 z-10">
                <div className="flex items-center space-x-2">
                  <Compass className="w-4 h-4 text-rose-500 animate-spin-slow" />
                  <div>
                    <span className="text-xs font-bold text-slate-200 block">Active Road Security Scan Map</span>
                    <span className="text-[9px] font-mono text-slate-400">GPS Track: 17.3850, 78.4867 • Hyderabad HUD</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1 bg-slate-950/80 px-2 py-1 rounded-lg border border-slate-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span className="text-[10px] font-mono font-bold text-slate-300">GPS SYNC</span>
                </div>
              </div>

              {/* Map Canvas Simulated with Custom SVG path */}
              <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 relative overflow-hidden">
                <svg className="w-full h-full" viewBox="0 0 500 300">
                  {/* Grid Lines */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Simulated Winding Road Map */}
                  <path 
                    d="M 50,250 C 150,250 120,80 250,80 C 380,80 350,220 450,220" 
                    fill="none" 
                    stroke="#1e293b" 
                    strokeWidth="16" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path 
                    id="route-path"
                    d="M 50,250 C 150,250 120,80 250,80 C 380,80 350,220 450,220" 
                    fill="none" 
                    stroke="#4f46e5" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-40"
                  />
                  
                  {/* Active covered path segment */}
                  {isJourneyActive && (
                    <path 
                      d="M 50,250 C 150,250 120,80 250,80 C 380,80 350,220 450,220" 
                      fill="none" 
                      stroke="#f43f5e" 
                      strokeWidth="5" 
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="500"
                      strokeDashoffset={500 - (5 * routeProgress)}
                      className="transition-all duration-1000"
                    />
                  )}

                  {/* Start Point Pin */}
                  <g transform="translate(50, 250)">
                    <circle r="8" fill="#10b981" fillOpacity="0.2" className="animate-ping" />
                    <circle r="4" fill="#10b981" />
                    <text y="-10" textAnchor="middle" fill="#10b981" className="text-[10px] font-bold font-mono">START</text>
                  </g>

                  {/* End Point Pin */}
                  <g transform="translate(450, 220)">
                    <circle r="8" fill="#ef4444" fillOpacity="0.2" className="animate-ping" />
                    <circle r="4" fill="#ef4444" />
                    <text y="-10" textAnchor="middle" fill="#ef4444" className="text-[10px] font-bold font-mono">FINISH</text>
                  </g>

                  {/* Filtered Station Pins on Map */}
                  {filteredStations.map((station) => {
                    // Position calculations relative to path segment
                    const x = 250 + (station.latOffset * 300);
                    const y = 150 + (station.lngOffset * 200);
                    
                    return (
                      <g key={station.id} transform={`translate(${x}, ${y})`}>
                        <circle r="6" fill={assistanceFilter === 'hospital' ? '#f43f5e' : assistanceFilter === 'police' ? '#3b82f6' : assistanceFilter === 'ambulance' ? '#10b981' : assistanceFilter === 'petrol' ? '#eab308' : '#a855f7'} fillOpacity="0.2" className="animate-pulse" />
                        <circle r="3.5" fill={assistanceFilter === 'hospital' ? '#f43f5e' : assistanceFilter === 'police' ? '#3b82f6' : assistanceFilter === 'ambulance' ? '#10b981' : assistanceFilter === 'petrol' ? '#eab308' : '#a855f7'} />
                        <text y="-10" textAnchor="middle" fill="#94a3b8" className="text-[8px] font-bold bg-slate-900 px-1 font-sans">{station.name.split(' ')[0]}</text>
                      </g>
                    );
                  })}

                  {/* Active Moving Vehicle Indicator along the SVG path */}
                  {isJourneyActive && (
                    <g transform={`translate(${50 + (4 * routeProgress)}, ${250 - (0.3 * routeProgress) - (routeProgress > 50 ? -30 : 50)})`}>
                      <circle r="12" fill="#3b82f6" fillOpacity="0.2" className="animate-ping" />
                      <circle r="6" fill="#3b82f6" />
                      <path d="M -4 -4 L 4 0 L -4 4 Z" fill="#ffffff" transform="rotate(20)" />
                    </g>
                  )}
                </svg>

                {/* Simulated Floating warnings on the map */}
                {aiWarnings.map((warning, idx) => (
                  <div key={idx} className="absolute bottom-3 left-3 bg-rose-950/90 text-rose-400 border border-rose-900 text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-lg animate-pulse z-20">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Nearby Assistance Stations Hub */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-sans font-bold text-xs text-slate-300 flex items-center space-x-2">
                  <Siren className="w-4 h-4 text-rose-500 animate-pulse" />
                  <span>Real-Time Nearest Emergency Stations</span>
                </h3>
                <span className="text-[9px] font-mono text-slate-500">Sorted by Live GPS Proximity</span>
              </div>

              {/* Station Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 mb-4 bg-slate-950 p-1.5 rounded-2xl border border-slate-850">
                {(['hospital', 'police', 'ambulance', 'petrol', 'repair'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setAssistanceFilter(type)}
                    className={`flex-1 min-w-[70px] text-center capitalize py-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all ${
                      assistanceFilter === type 
                        ? 'bg-rose-950 border border-rose-800 text-rose-400 font-extrabold' 
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                    }`}
                  >
                    {type === 'hospital' ? '🏥 Hospital' : type === 'police' ? '👮 Police' : type === 'ambulance' ? '🚑 Amb.' : type === 'petrol' ? '⛽ Fuel' : '🔧 Repair'}
                  </button>
                ))}
              </div>

              <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                {filteredStations.map((station) => (
                  <div key={station.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-850/80 hover:border-slate-700 transition-all flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-slate-200 truncate block">{station.name}</span>
                        <span className="text-[9px] bg-slate-900 text-rose-400 border border-rose-950 px-1.5 py-0.5 rounded-lg shrink-0 font-mono font-bold">{station.distance}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5 block truncate font-medium">{station.status}</span>
                    </div>
                    
                    <a
                      href={`tel:${station.phone}`}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-rose-950 border border-slate-800 hover:border-rose-900 text-[10px] font-bold text-rose-400 hover:text-white rounded-lg transition-colors flex items-center space-x-1 shrink-0"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>SOS Dial</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT: Live Safety Analytics, Status Indicators, Timeline (Col Span 3) */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Speedometer Gauges & Safety Donut */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
              <h3 className="font-sans font-bold text-xs text-slate-300 mb-4 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-rose-500" />
                <span>Live Commute Telemetry Index</span>
              </h3>

              <div className="grid grid-cols-2 gap-4 items-center mb-4">
                {/* Speedometer Radial Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke={speed > 80 ? '#ef4444' : speed > 65 ? '#f59e0b' : '#10b981'} 
                        strokeWidth="6" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (2.5 * speed)} 
                        strokeLinecap="round"
                        fill="transparent" 
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <span className="text-2xl font-black text-white block leading-none font-sans">{speed}</span>
                      <span className="text-[8px] text-slate-400 uppercase font-mono block mt-1 font-bold">KM/H SPEED</span>
                    </div>
                  </div>
                </div>

                {/* Safety Score Radial Gauge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="40" 
                        stroke={safetyScore > 85 ? '#10b981' : safetyScore > 70 ? '#f59e0b' : '#ef4444'} 
                        strokeWidth="6" 
                        strokeDasharray="251.2" 
                        strokeDashoffset={251.2 - (2.5 * safetyScore)} 
                        strokeLinecap="round"
                        fill="transparent" 
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="text-center z-10">
                      <span className="text-2xl font-black text-white block leading-none font-sans">{Math.round(safetyScore)}</span>
                      <span className="text-[8px] text-slate-400 uppercase font-mono block mt-1 font-bold">SAFETY INDEX</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Telemetry Sparklines */}
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850 mb-3">
                <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider block mb-1">G-Force Acceleration Curve</span>
                <div className="flex items-end justify-between h-8 gap-0.5 pt-1">
                  {gForceHistory.map((val, idx) => (
                    <div 
                      key={idx} 
                      className="flex-1 bg-rose-500 rounded-sm transition-all" 
                      style={{ height: `${Math.min(100, Math.max(10, (val - 0.9) * 200))}%`, opacity: idx / 20 }}
                      title={`${val} Gs`}
                    ></div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-[8px] text-slate-500 font-mono mt-1">
                  <span>Current: {gForce}G</span>
                  <span>Peak Force: {peakGForce.toFixed(2)}G</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider block">Est. Remaining</span>
                  <span className="text-xs font-bold text-slate-200 block font-mono mt-0.5">{remainingDistance} km</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                  <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider block">Covered Range</span>
                  <span className="text-xs font-bold text-slate-200 block font-mono mt-0.5">{distanceCovered} km</span>
                </div>
              </div>

            </div>

            {/* Timeline Live Ledger */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col h-[340px]">
              <div className="flex items-center justify-between mb-3 shrink-0">
                <h3 className="font-sans font-bold text-xs text-slate-300 flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-rose-500" />
                  <span>Real-Time Journey Timeline</span>
                </h3>
                <span className="text-[8px] bg-slate-950 text-slate-400 border border-slate-850 px-1.5 py-0.5 rounded-lg shrink-0 font-mono font-bold">Ledger Logs</span>
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3">
                {timelineEvents.map((evt) => (
                  <div key={evt.id} className="relative pl-5 before:absolute before:left-1.5 before:top-2 before:bottom-[-20px] before:w-[1px] before:bg-slate-800 last:before:hidden">
                    <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full flex items-center justify-center shrink-0">
                      <span className={`w-2 h-2 rounded-full ${
                        evt.iconType === 'success' ? 'bg-emerald-500' :
                        evt.iconType === 'warning' ? 'bg-amber-500 animate-pulse' :
                        evt.iconType === 'critical' ? 'bg-rose-500 animate-ping' : 'bg-slate-400'
                      }`}></span>
                    </span>
                    <div className="text-[10px] leading-relaxed">
                      <div className="flex items-center justify-between font-mono text-[8px] text-slate-500">
                        <span>{evt.time}</span>
                      </div>
                      <p className="font-semibold text-slate-300 mt-0.5">
                        {evt.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Tab 2: Control Room / Emergency Dashboard */}
      {subTab === 'control-room' && (
        <div className="space-y-6">
          {/* Top Analytics Dashboard Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Total Active Cases</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {globalIncidents.filter(i => i.status !== 'resolved').length}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block"></span>
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Resolved Today</span>
              <span className="text-3xl font-extrabold text-emerald-400 tracking-tight mt-2 font-mono">
                {globalIncidents.filter(i => i.status === 'resolved').length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Avg Response Time</span>
              <span className="text-3xl font-extrabold text-amber-400 tracking-tight mt-2 font-mono font-bold">
                5.8 Mins
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Critical Threats</span>
              <span className="text-3xl font-extrabold text-rose-500 tracking-tight mt-2 animate-pulse font-mono">
                {globalIncidents.filter(i => i.severity === 'critical' && i.status !== 'resolved').length}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between col-span-2 lg:col-span-1 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold font-mono">Resources Available</span>
              <div className="space-y-1.5 mt-2 text-[9px] text-slate-400 font-mono">
                <div className="flex justify-between items-center">
                  <span>🚑 Ambulance</span>
                  <span className="text-emerald-400 font-bold">5 / 8 Units</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1">
                  <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <div className="flex justify-between items-center">
                  <span>👮 Police</span>
                  <span className="text-emerald-400 font-bold">12 / 15 Units</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1">
                  <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Workspace Frame */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: Live Feed Panel (col-span-4) */}
            <div className="lg:col-span-4 bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-2xl h-[640px] flex flex-col">
              <div className="border-b border-slate-800 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span>LIVE INCIDENT STREAM</span>
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-0.5">Real-time sync with citizen telemetry devices.</p>
                </div>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 rounded-md border border-emerald-800/50 text-[8px] font-mono font-bold uppercase tracking-widest animate-pulse">
                  Connected
                </span>
              </div>

              {globalIncidents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                  <Siren className="w-8 h-8 text-slate-700 mb-3 animate-bounce" />
                  <span>No active incident alerts registered.</span>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                  {globalIncidents.map((incident) => {
                    const isSelected = selectedIncidentId === incident.id;
                    return (
                      <div
                        key={incident.id}
                        onClick={() => setSelectedIncidentId(incident.id)}
                        className={`p-4 rounded-2xl cursor-pointer border transition-all duration-350 text-left relative overflow-hidden ${
                          isSelected 
                            ? 'bg-slate-850 border-rose-500/80 shadow-[0_0_20px_rgba(239,68,68,0.15)]' 
                            : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                        )}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-mono tracking-widest border font-bold flex items-center gap-1 ${
                            incident.severity === 'critical' ? 'bg-rose-950/50 text-rose-400 border-rose-800/80' :
                            incident.severity === 'high' ? 'bg-amber-950/50 text-amber-400 border-amber-800/80' :
                            'bg-sky-950/50 text-sky-400 border-sky-800/80'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              incident.severity === 'critical' ? 'bg-rose-500 animate-ping' :
                              incident.severity === 'high' ? 'bg-amber-400' : 'bg-sky-400'
                            }`}></span>
                            <span>{incident.severity}</span>
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">
                            {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="font-bold text-slate-200 text-xs truncate flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                          <span>{incident.userName}</span>
                        </div>

                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 text-rose-500 shrink-0" />
                          <span className="truncate">{incident.address.split(',')[0]}</span>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-2 font-mono line-clamp-1 bg-slate-950/40 p-1.5 rounded border border-slate-850">
                          {incident.description}
                        </p>

                        <div className="flex items-center justify-between mt-3 text-[9px] border-t border-slate-800/40 pt-2 font-mono">
                          <span className="text-slate-500">Status: <span className="text-amber-400 capitalize">{incident.status}</span></span>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to permanently delete this emergency incident?")) {
                                try {
                                  await deleteDoc(doc(db, 'emergencies', incident.id));
                                  if (selectedIncidentId === incident.id) {
                                    setSelectedIncidentId(null);
                                  }
                                } catch (err) {
                                  console.error("Delete failed:", err);
                                }
                              }
                            }}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* CENTER & RIGHT COLUMN COMBINED AREA FOR SELECTED INCIDENT */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {selectedIncidentId && globalIncidents.find(i => i.id === selectedIncidentId) ? (
                (() => {
                  const incident = globalIncidents.find(i => i.id === selectedIncidentId)!;
                  const briefing = aiBriefings[incident.id] || {};
                  const statusInfo = dispatchStatus[incident.id] || {
                    step: incident.status === 'resolved' ? 'Resolved' : incident.status === 'responded' ? 'En Route' : 'AI Verified',
                    vehicles: { ambulance: incident.status === 'responded' || incident.status === 'resolved', police: incident.status === 'responded' || incident.status === 'resolved', fire: false },
                    eta: briefing.estimatedResponseTimeMinutes || 6,
                    timeline: [
                      { time: new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: "Incident telemetry received." },
                      { time: new Date(new Date(incident.createdAt).getTime() + 4000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), text: "AI verified incident severity classification." }
                    ]
                  };
                  const responders = activeResponders[incident.id] || [];

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      
                      {/* CENTER PANEL: Interactive Map & Manual Dispatch (col-span-7) */}
                      <div className="md:col-span-7 space-y-6 flex flex-col justify-between">
                        
                        {/* UNCONSCIOUS DRIVER WARNING BANNER */}
                        {incident.noResponse && (
                          <div className="bg-rose-950/40 border-2 border-rose-600/70 p-4.5 rounded-3xl shadow-lg relative overflow-hidden text-left flex items-start gap-4">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>
                            <div className="w-10 h-10 bg-rose-950 rounded-full border border-rose-500 flex items-center justify-center shrink-0">
                              <Siren className="w-5 h-5 text-rose-500 animate-pulse" />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-xs font-sans font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                                Possible Accident Detected — Driver Unconscious
                              </h4>
                              <p className="text-[11px] text-slate-350 font-bold leading-relaxed mb-1.5">
                                No user response was detected during the 15-second safety verification countdown. Automated emergency rescue mode was engaged.
                              </p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-rose-300">
                                <span className="flex items-center gap-1">👥 Trusted Contacts: <strong className="text-emerald-400">Notified (Sim)</strong></span>
                                <span className="flex items-center gap-1">🚑 Ambulance Service: <strong className="text-emerald-400">Dispatched (Sim)</strong></span>
                                <span className="flex items-center gap-1">🚓 Police Dispatch: <strong className="text-emerald-400">Dispatched (Sim)</strong></span>
                                <span className="flex items-center gap-1">🏥 Nearby Hospital: <strong className="text-emerald-400">Dispatched (Sim)</strong></span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Map & Header Section */}
                        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-2xl flex-1 flex flex-col">
                          <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-4">
                            <div>
                              <span className="text-[10px] font-mono text-rose-400 font-extrabold uppercase tracking-widest block">TACTICAL TARGET SITE MAP</span>
                              <h3 className="text-sm font-extrabold text-white mt-1 uppercase truncate max-w-[200px]">{incident.userName} Incident Map</h3>
                            </div>
                            <button
                              onClick={() => exportIncidentReport(incident)}
                              className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-700 transition flex items-center gap-1.5"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>PDF Export Report</span>
                            </button>
                          </div>

                          {/* Tactical SVG Map */}
                          <div className="relative aspect-video w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex-1 flex items-center justify-center min-h-[250px]">
                            {/* Grid overlay */}
                            <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.04)_1px,transparent_1px)] bg-[size:16px_16px]"></div>
                            
                            {/* Sweeping Radar effect */}
                            <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-500/10 pointer-events-none overflow-hidden">
                              <div className="absolute top-1/2 left-1/2 w-[350px] h-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-500/20"></div>
                              <div className="absolute top-1/2 left-1/2 w-[200px] h-[200px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-500/20"></div>
                              <div className="absolute top-1/2 left-1/2 w-[100px] h-[100px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-500/20"></div>
                              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,rgba(239,68,68,0.15),transparent_40%)] animate-[spin_4s_linear_infinite]"></div>
                            </div>

                            {/* Stations & Key Landmarks */}
                            <div className="absolute top-[30%] left-[10%] text-center opacity-60 pointer-events-none">
                              <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.8)] mx-auto mb-1"></div>
                              <span className="text-[7px] font-mono text-sky-400">MED STATION 01</span>
                            </div>
                            <div className="absolute bottom-[20%] right-[15%] text-center opacity-60 pointer-events-none">
                              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)] mx-auto mb-1"></div>
                              <span className="text-[7px] font-mono text-blue-400">POLICE HQ 02</span>
                            </div>
                            <div className="absolute top-[10%] right-[30%] text-center opacity-60 pointer-events-none">
                              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-auto mb-1"></div>
                              <span className="text-[7px] font-mono text-amber-400">FIRE UNIT 03</span>
                            </div>

                            {/* Active Incident target beacon */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10">
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full border border-rose-500 animate-ping"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border border-rose-500 bg-rose-500/20"></div>
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-rose-600"></div>
                              <span className="text-[9px] font-mono text-rose-400 font-bold bg-slate-950/80 px-2 py-0.5 rounded border border-rose-500/30 whitespace-nowrap absolute top-7 -left-1/2">
                                EMER-COORDS
                              </span>
                            </div>

                            {/* Interactive Dispatched moving vehicles */}
                            {responders.map((v, i) => (
                              <div 
                                key={i} 
                                className="absolute transition-all duration-150 z-20 text-center"
                                style={{ left: `${v.x}%`, top: `${v.y}%` }}
                              >
                                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-extrabold text-white animate-pulse shadow-lg ${
                                  v.type === 'ambulance' ? 'bg-red-500' : v.type === 'police' ? 'bg-blue-500' : 'bg-orange-500'
                                }`}>
                                  {v.type === 'ambulance' ? '🚑' : v.type === 'police' ? '👮' : '🚒'}
                                </span>
                                <span className="text-[6px] font-mono bg-slate-900/95 text-slate-300 px-1 rounded block mt-0.5 whitespace-nowrap">
                                  {v.type.toUpperCase()} ({Math.round(v.progress)}%)
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Dynamic Dispatch Status Steps Progress bar */}
                          <div className="mt-4 grid grid-cols-6 gap-1 text-[8px] font-mono text-center text-slate-500 bg-slate-950 p-2 rounded-xl border border-slate-800">
                            {[
                              { label: 'Received', color: 'text-emerald-400' },
                              { label: 'AI Verified', color: 'text-emerald-400' },
                              { label: 'Vehicle Assigned', color: statusInfo.step !== 'Received' && statusInfo.step !== 'AI Verified' ? 'text-emerald-400' : '' },
                              { label: 'En Route', color: statusInfo.step === 'En Route' || statusInfo.step === 'Arrived' || statusInfo.step === 'Resolved' ? 'text-emerald-400' : '' },
                              { label: 'Arrived', color: statusInfo.step === 'Arrived' || statusInfo.step === 'Resolved' ? 'text-emerald-400' : '' },
                              { label: 'Resolved', color: statusInfo.step === 'Resolved' ? 'text-emerald-400' : '' }
                            ].map((stepItem, idx) => (
                              <div key={idx} className={`p-1 rounded ${stepItem.color ? 'bg-emerald-950/40 font-bold border border-emerald-900/40 text-emerald-400' : ''}`}>
                                <div>{stepItem.label}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* One-Click dispatch controls */}
                        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-2xl space-y-4">
                          <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider font-mono">
                            TACTICAL ACTION COMMAND SUITE
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              onClick={() => handleDispatch(incident, 'ambulance')}
                              disabled={statusInfo.vehicles?.ambulance}
                              className={`py-3 px-2 rounded-2xl font-bold font-sans text-xs flex flex-col items-center justify-center gap-2 border transition ${
                                statusInfo.vehicles?.ambulance 
                                  ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed' 
                                  : 'bg-rose-950/30 hover:bg-rose-900/40 border-rose-900/50 text-rose-400 hover:text-rose-300'
                              }`}
                            >
                              <HeartPulse className="w-5 h-5 shrink-0" />
                              <span>ASSIGN AMBULANCE</span>
                            </button>
                            <button
                              onClick={() => handleDispatch(incident, 'police')}
                              disabled={statusInfo.vehicles?.police}
                              className={`py-3 px-2 rounded-2xl font-bold font-sans text-xs flex flex-col items-center justify-center gap-2 border transition ${
                                statusInfo.vehicles?.police 
                                  ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed' 
                                  : 'bg-blue-950/30 hover:bg-blue-900/40 border-blue-900/50 text-blue-400 hover:text-blue-300'
                              }`}
                            >
                              <ShieldCheck className="w-5 h-5 shrink-0" />
                              <span>ASSIGN POLICE</span>
                            </button>
                            <button
                              onClick={() => handleDispatch(incident, 'fire')}
                              disabled={statusInfo.vehicles?.fire}
                              className={`py-3 px-2 rounded-2xl font-bold font-sans text-xs flex flex-col items-center justify-center gap-2 border transition ${
                                statusInfo.vehicles?.fire 
                                  ? 'bg-slate-950 border-slate-800 text-slate-600 cursor-not-allowed' 
                                  : 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-900/50 text-amber-400 hover:text-amber-300'
                              }`}
                            >
                              <Flame className="w-5 h-5 shrink-0" />
                              <span>ASSIGN FIRE DEPT</span>
                            </button>
                          </div>

                          <div className="flex gap-3 pt-2">
                            {incident.status !== 'resolved' ? (
                              <button
                                onClick={() => handleResolve(incident)}
                                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-sans font-bold text-xs rounded-xl shadow-lg transition uppercase tracking-wider"
                              >
                                Mark Incident as Resolved
                              </button>
                            ) : (
                              <div className="flex-1 text-center py-2 bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 rounded-xl text-xs font-bold font-mono">
                                COMPLETED COMMUNITY HERO INTERVENTION
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* RIGHT PANEL: AI Smart Analysis & Timeline logs (col-span-5) */}
                      <div className="md:col-span-5 space-y-6">
                        
                        {/* AI Intel Summary Card */}
                        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                          <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl"></div>

                          <div className="border-b border-slate-800 pb-3 mb-4 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-rose-500 animate-spin" />
                            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                              AI COGNITIVE ASSESSMENT
                            </h4>
                          </div>

                          {briefing.loading ? (
                            <div className="py-12 text-center text-slate-500 text-xs font-bold space-y-3">
                              <RefreshCw className="w-6 h-6 text-rose-500 animate-spin mx-auto" />
                              <span className="block animate-pulse font-mono text-[10px]">COGNITIVE MODEL EVALUATING TELEMETRY...</span>
                            </div>
                          ) : (
                            <div className="space-y-4 text-left">
                              <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-2xl">
                                <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider font-extrabold">AI Classification</span>
                                <span className="text-xs font-bold text-slate-200 mt-1 block">
                                  {briefing.classification || "Critical High-G Telemetry Shock"}
                                </span>
                              </div>

                              <div className="bg-rose-950/15 border border-rose-900/30 p-3.5 rounded-2xl">
                                <span className="text-[9px] font-mono text-rose-400 uppercase block tracking-wider font-extrabold">Recommended response plan</span>
                                <p className="text-[11px] text-slate-300 font-medium mt-1 leading-relaxed">
                                  {briefing.recommendedResponse || "Dispatch primary paramedics to coordinates. Initiate contact with emergency contacts logged."}
                                </p>
                              </div>

                              <div className="bg-slate-950/40 p-3.5 rounded-2xl border border-slate-850">
                                <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider font-extrabold">Estimated response time (ETA)</span>
                                <span className="text-lg font-extrabold text-amber-400 mt-1 block font-mono">
                                  {briefing.estimatedResponseTimeMinutes || 6} Minutes
                                </span>
                              </div>

                              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-850">
                                <span className="text-[9px] font-mono text-slate-500 uppercase block tracking-wider font-extrabold">Incident analysis summary</span>
                                <p className="text-[11px] text-slate-400 font-mono mt-1.5 leading-relaxed bg-slate-950 p-2 rounded border border-slate-900">
                                  {briefing.incidentAnalysisSummary || "Automatic critical telemetry alert recorded near Hyderabad. Severity evaluation passed."}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Chronological Action Timeline Logs */}
                        <div className="bg-slate-900 border border-slate-800/80 rounded-3xl p-5 shadow-2xl h-[280px] flex flex-col">
                          <h4 className="text-xs font-extrabold text-white border-b border-slate-800 pb-3 mb-4 uppercase tracking-wider font-mono">
                            TACTICAL TIMELINE LOGS
                          </h4>
                          <div className="flex-1 overflow-y-auto space-y-3 text-left pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                            {(statusInfo.timeline || []).map((evt: any, idx: number) => (
                              <div key={idx} className="border-l-2 border-rose-500/60 pl-3 ml-1 relative">
                                <div className="absolute w-2 h-2 rounded-full bg-rose-500 -left-[5px] top-1"></div>
                                <span className="text-[8px] font-mono text-slate-500">{evt.time}</span>
                                <p className="text-[10px] text-slate-300 font-medium mt-0.5 leading-relaxed">
                                  {evt.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })()
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-16 text-center text-slate-500 text-xs shadow-2xl h-[640px] flex flex-col items-center justify-center">
                  <Activity className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
                  <span className="font-bold text-slate-400 font-sans">SELECT AN ACTIVE EMERGENCY SIGNAL FROM THE STREAM TO BROADCAST DIRECTIVES</span>
                  <p className="text-[10px] text-slate-600 mt-2 font-mono">AI assessment recommendations and live tactical maps will initialize on signal lock.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* EMERGENCY DISPATCH VERIFICATION OVERLAY POPUP */}
      {showVerification && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 z-50 animate-fade-in" id="emergency-dispatch-verification-portal">
          <div className="bg-slate-900 border-2 border-rose-500 max-w-2xl w-full p-8 rounded-3xl shadow-[0_0_100px_rgba(244,63,94,0.4)] relative overflow-hidden transform transition-all text-center">
            
            <div className="absolute inset-0 bg-gradient-to-b from-rose-950/20 to-transparent pointer-events-none"></div>

            <div className="w-20 h-20 bg-rose-950/80 rounded-full border-2 border-rose-500 flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Siren className="w-10 h-10 text-rose-500" />
            </div>

            <h2 className="text-3xl font-sans font-black text-rose-500 tracking-tight flex items-center justify-center gap-2">
              🚨 Possible Accident Detected
            </h2>
            <p className="text-sm text-slate-350 font-semibold mt-2 max-w-md mx-auto">
              Gemini AI believes you may have been involved in an accident.
            </p>

            {/* Circular Countdown Progress */}
            <div className="my-8 relative flex items-center justify-center">
              <div className="w-28 h-28 rounded-full border-4 border-rose-950 flex items-center justify-center bg-slate-950/60 relative">
                <span className="text-5xl font-sans font-black text-rose-500 animate-ping absolute">{countdown}</span>
                <span className="text-5xl font-sans font-black text-white z-10">{countdown}</span>
              </div>
            </div>

            {/* Action Grid Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
              {/* I'M SAFE BUTTON CARD */}
              <div className="bg-slate-950/60 border border-emerald-800/40 p-5 rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 transition-all text-left">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>🟢 I'M SAFE</span>
                  </h4>
                  <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                    <li>Stop emergency process.</li>
                    <li>Cancel all alerts.</li>
                    <li>Resume journey monitoring.</li>
                  </ul>
                </div>
                <button
                  onClick={handleImSafe}
                  id="btn-safety-bypass"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 shadow-emerald-500/20 cursor-pointer"
                >
                  🟢 I'M SAFE
                </button>
              </div>

              {/* NEED HELP BUTTON CARD */}
              <div className="bg-slate-950/60 border border-rose-800/40 p-5 rounded-2xl flex flex-col justify-between hover:border-rose-500/50 transition-all text-left">
                <div className="mb-4">
                  <h4 className="text-sm font-black text-rose-550 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                    <span>🔴 NEED HELP</span>
                  </h4>
                  <ul className="text-[11px] text-slate-400 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                    <li>Immediately activate emergency mode.</li>
                    <li>Notify trusted contacts.</li>
                    <li>Share live GPS location.</li>
                    <li>Create an emergency incident.</li>
                    <li>Send incident to Control Tower.</li>
                  </ul>
                </div>
                <button
                  onClick={() => triggerAutomatedDispatch(false)}
                  id="btn-need-help"
                  className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 shadow-rose-500/20 cursor-pointer"
                >
                  🔴 NEED HELP
                </button>
              </div>

            </div>

            <p className="text-[10px] text-slate-500 font-mono mt-6">
              SYSTEM LEVEL: ACTIVE ACCELEROMETER GUARD • AUTODISPATCH TIMER WILL DEPLOY IN {countdown} SECONDS
            </p>
          </div>
        </div>
      )}

      {/* SUMMARY MODAL ON SUCCESSFUL ARRIVAL */}
      {showSummaryModal && summaryData && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50" id="safe-arrival-celebration-portal">
          <div className="bg-slate-900 border border-emerald-600/60 max-w-lg w-full p-8 rounded-3xl shadow-[0_0_80px_rgba(16,185,129,0.35)] relative overflow-hidden text-center">
            
            <div className="absolute top-[-50px] left-1/2 transform -translate-x-1/2 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="w-16 h-16 bg-emerald-950/60 rounded-full border border-emerald-600/40 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-sans font-black text-white">
              You Have Arrived Safely!
            </h2>
            <p className="text-xs text-emerald-400 font-mono font-bold uppercase tracking-wider mt-1">
              Safe commute monitoring successfully terminated
            </p>

            {/* Statistics summary container */}
            <div className="grid grid-cols-2 gap-4 my-6 text-left">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Trip Duration</span>
                <span className="text-base font-bold text-slate-200 block font-mono mt-0.5">{summaryData.duration}</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Average Velocity</span>
                <span className="text-base font-bold text-slate-200 block font-mono mt-0.5">{summaryData.avgSpeed} KM/H</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850">
                <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">Peak Centrifugal Gs</span>
                <span className="text-base font-bold text-slate-200 block font-mono mt-0.5">{summaryData.peakG} G Force</span>
              </div>
              <div className="bg-slate-950 p-4 rounded-2xl border border-emerald-950/60 shadow-[inset_0_0_12px_rgba(16,185,129,0.1)]">
                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400">AI Safety Score</span>
                <span className="text-lg font-black text-emerald-400 block font-mono mt-0.5">{summaryData.safetyScore} / 100</span>
              </div>
            </div>

            {/* Driving feedback based on safety score */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 text-xs text-slate-300 leading-relaxed font-semibold mb-6">
              {summaryData.safetyScore > 85 
                ? "🏆 Professional Rating! You maintained pristine speeds and safe braking intervals. Keep up the amazing driving habits!"
                : "🚗 Good journey commute. Our safety guard recommends smoothing your cornering lateral accelerations to increase brake longevity."
              }
            </div>

            <button
              onClick={() => {
                setShowSummaryModal(false);
                setSummaryData(null);
              }}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
            >
              Return to HUD
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
