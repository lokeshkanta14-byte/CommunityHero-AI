import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ShieldAlert, 
  Video, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  Activity, 
  MapPin, 
  Sparkles, 
  TrendingUp, 
  Send, 
  Users, 
  Bell, 
  Navigation, 
  Clock, 
  Compass, 
  Printer, 
  Share2, 
  RotateCw, 
  RefreshCw,
  Building2,
  Volume2,
  VolumeX,
  FileDown,
  Info,
  HeartHandshake,
  Check,
  Radio,
  Timer,
  ExternalLink,
  ShieldAlert as AlertIcon,
  ShieldCheck,
  UserCheck,
  Users2,
  Brain,
  Truck,
  Heart,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../lib/LanguageContext';

// Import the generated images
// @ts-ignore
import corridorFireImg from '../assets/images/corridor_fire_cctv_1782454567303.jpg';
// @ts-ignore
import kitchenCookingImg from '../assets/images/kitchen_cooking_cctv_1782454581780.jpg';
// @ts-ignore
import weldingSparksImg from '../assets/images/welding_sparks_cctv_1782454606060.jpg';

// Presets representing different CCTV scenarios
interface IncidentPreset {
  id: string;
  name: string;
  location: string;
  description: string;
  type: 'fire' | 'accident' | 'flood' | 'road_blockage' | 'medical' | 'safe';
  imageUrl: string;
  iconColor: string;
  telemetry: {
    temperature: number;
    smokeDensity: string;
    coLevel: string;
    duration: string;
  };
}

// Resident safety representation
interface ResidentStatus {
  unit: string;
  name: string;
  status: 'pending' | 'safe' | 'need_help' | 'no_response';
  locationShared: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

export default function BuildingGuardian() {
  const { t, language, voiceEnabled, toggleVoice } = useLanguage();
  const aiResultsCacheRef = useRef<Record<string, any>>({});

  // Selected preset/simulation scenario
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [activePreset, setActivePreset] = useState<IncidentPreset | null>(null);

  // Simulation running status
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanProgress, setScanProgress] = useState(0);

  // Gemini API analysis response state
  const [aiResult, setAiResult] = useState<{
    isRealFire: boolean;
    confidenceScore: number;
    reasoning: string;
    evacuationRoute: string;
    nearestExits: string;
    fireStation: string;
    hospital: string;
    
    // New Agentic Assessment Fields
    incidentType?: string;
    severityLevel?: 'Low' | 'Medium' | 'High' | 'Critical';
    estimatedPeopleAtRisk?: number;
    predictedImpactRadius?: string;
    possibleCause?: string;
    riskOfEscalation?: string;
    recommendedResponseTime?: string;
    
    actionRecommendations?: {
      evacuateOrStay: string;
      staircaseOrElevator: string;
      evacuationDirection: string;
      nearbySafeShelter: string;
      nearestHospital: string;
      nearestPoliceStation: string;
      nearestFireStation: string;
      roadsToAvoid: string;
      trafficDiversion: string;
      weatherWarnings: string;
    };
    
    resourceAllocation?: {
      fireEngines: { count: number; reason: string };
      ambulances: { count: number; reason: string };
      policeUnits: { count: number; reason: string };
      rescueTeam: { count: number; reason: string };
      disasterResponseTeam: { count: number; reason: string };
    };
    
    incidentSummary?: string;
    emergencyAnnouncement?: string;
  } | null>(null);

  // Simulation dispatched responders countdown
  const [dispatchTimer, setDispatchTimer] = useState<number>(0);
  const [dispatchStatus, setDispatchStatus] = useState<'idle' | 'dispatched' | 'arrived'>('idle');

  // Push notification alert mock log
  const [alertNotifications, setAlertNotifications] = useState<Array<{
    id: string;
    title: string;
    message: string;
    timestamp: string;
    type: 'broadcast' | 'dispatch' | 'security' | 'resident';
  }>>([]);

  // Active CCTV stream selection (for detail view)
  const [activeCameraId, setActiveCameraId] = useState<string>('cam2');

  // --- NEW STATES FOR ENHANCED FEATURES ---
  const [userSafetyStatus, setUserSafetyStatus] = useState<'pending' | 'safe' | 'need_help' | 'no_response'>('pending');
  const [countdownSeconds, setCountdownSeconds] = useState<number>(30);
  const [isCountdownActive, setIsCountdownActive] = useState<boolean>(false);
  const [familyNotified, setFamilyNotified] = useState<boolean>(false);
  const [locationShared, setLocationShared] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  
  // Interactive Simulation for dynamic evacuation path blocks
  const [isPathBlockedSimulation, setIsPathBlockedSimulation] = useState<boolean>(false);
  const [isRerouting, setIsRerouting] = useState<boolean>(false);

  // Live Incident Timeline milestones
  const [timelineState, setTimelineState] = useState<{
    fireDetected: boolean;
    aiVerification: boolean;
    residentsAlerted: boolean;
    evacuationStarted: boolean;
    rescueInProgress: boolean;
    resolved: boolean;
  }>({
    fireDetected: false,
    aiVerification: false,
    residentsAlerted: false,
    evacuationStarted: false,
    rescueInProgress: false,
    resolved: false
  });

  // Simulated Resident roll-call database
  const [residents, setResidents] = useState<ResidentStatus[]>([
    { unit: 'Apt 501', name: 'Sarah Jenkins', status: 'safe', locationShared: false, priority: 'low' },
    { unit: 'Apt 502', name: 'Marcus Vance', status: 'need_help', locationShared: true, priority: 'critical', details: 'Stuck in bedroom 2' },
    { unit: 'Apt 503', name: 'You (Resident Resident)', status: 'pending', locationShared: false, priority: 'medium' },
    { unit: 'Apt 504', name: 'Robert Chen', status: 'pending', locationShared: false, priority: 'high' }
  ]);

  const getEvacuationVoiceMessage = (res: any, lang: string, isRerouted: boolean = false) => {
    if (isRerouted) {
      switch (lang) {
        case 'Spanish':
          return `Atención, el humo se ha extendido por las escaleras B. Se ha activado la ruta alternativa. Por favor, evite la escalera B, proceda a la escalera A inmediatamente y salga por el escape oeste. Mantenga la calma.`;
        case 'Telugu':
          return `హెచ్చరిక, పొగ వ్యాపించింది. మెట్ల మార్గం బి నివారించండి. డైనమిక్ రీరూటింగ్ విజయవంతమైంది. మెట్ల మార్గం ఏ ద్వారా పడమర నిష్క్రమణ వైపు వెళ్లండి. ప్రశాంతంగా ఉండండి.`;
        case 'Hindi':
          return `चेतावनी, धुआं सीढ़ी बी में फैल गया है। वैकल्पिक मार्ग सक्रिय किया गया है। कृपया सीढ़ी बी से बचें, तुरंत सीढ़ी ए का उपयोग करें और पश्चिम निकास से बाहर निकलें। शांत रहें।`;
        case 'Japanese':
          return `非常事態アラート：煙が階段Bに広がりました。動的避難経路が有効です。階段Bを避け、ただちに階段Aを使用して西口から脱出してください。落ち着いて行動してください。`;
        default:
          return `Attention: Smoke has spread blocking Staircase B. Dynamic rerouting activated. Please avoid Staircase B, proceed immediately to Staircase A, and exit through the West Emergency Exit. Remain calm.`;
      }
    }
    
    const type = res.incidentType || 'emergency';
    const staircase = res.actionRecommendations?.staircaseOrElevator || 'Staircase B';
    const exit = res.nearestExits || 'the South Emergency Exit';
    const shelter = res.actionRecommendations?.nearbySafeShelter || 'the assembly point';
    
    switch (lang) {
      case 'Spanish':
        return `${type} detectado en el edificio. Por favor, mantenga la calma y no use el ascensor. Proceda de inmediato a ${staircase} y salga por la salida ${exit}. Diríjase a ${shelter}.`;
      case 'Telugu':
        return `భవనంలో ${type} కనుగొనబడింది. దయచేసి ప్రశాంతంగా ఉండండి మరియు లిఫ్ట్ ఉపయోగించవద్దు. వెంటనే ${staircase} కి వెళ్లి, ${exit} ద్వారా నిష్క్రమించండి. ${shelter} కి చేరుకోండి.`;
      case 'Hindi':
        return `भवन में ${type} का पता चला है। कृपया शांत रहें और लिफ्ट का उपयोग न करें। तुरंत ${staircase} पर जाएं और ${exit} से बाहर निकलें। ${shelter} की ओर बढ़ें।`;
      case 'Japanese':
        return `建物内で${type}が検出されました。落ち着いて行動し、エレベーターは使用しないでください。すぐに${staircase}に進み、${exit}から避難してください。${shelter}へ向かってください。`;
      default:
        return `${type} detected in the building. Please remain calm. Do not use the elevator. Proceed immediately to ${staircase} and exit through ${exit}. Move toward ${shelter}.`;
    }
  };

  // Audio vocal announcement generator (with support for multiple languages requested)
  const announcementsByLanguage: Record<string, string> = {
    English: "Critical fire detected in your building. Please remain calm and evacuate immediately using the nearest safe exit. Do not use elevators.",
    Spanish: "Fuego crítico detectado en su edificio. Por favor, mantenga la calma y evacúe de inmediato por la salida segura más cercana. No use los ascensores.",
    Telugu: "మీ భవనంలో తీవ్రమైన అగ్ని ప్రమాదం కనుగొనబడింది. దయచేసి ప్రశాంతంగా ఉండండి మరియు వెంటనే సమీపంలోని సురక్షితమైన నిష్క్రమణ ద్వారా ఖాళీ చేయండి. లిఫ్టులను ఉపయోగించవద్దు.",
    Hindi: "आपके भवन में गंभीर आग का पता चला है। कृपया शांत रहें और तुरंत निकटतम सुरक्षित निकास का उपयोग करके बाहर निकलें। लिफ्ट का उपयोग न करें.",
    Japanese: "建物内で重大な火災が検出されました。落ち着いて、すぐに最寄りの安全な出口から避難してください。エレベーターは使用しないでください。"
  };

  const speakReport = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Map preferred languages to standard speech Synthesis BCP-47 language codes
      let langCode = 'en-US';
      if (language === 'Spanish') langCode = 'es-ES';
      else if (language === 'Telugu') langCode = 'te-IN';
      else if (language === 'Hindi') langCode = 'hi-IN';
      else if (language === 'Japanese') langCode = 'ja-JP';
      else if (language === 'German') langCode = 'de-DE';
      else if (language === 'French') langCode = 'fr-FR';
      else if (language === 'Arabic') langCode = 'ar-AE';
      
      utterance.lang = langCode;

      // Gracefully attempt to search and bind a matching voice
      if (typeof window.speechSynthesis.getVoices === 'function') {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          const prefix = langCode.split('-')[0].toLowerCase();
          const targetVoices = voices.filter(v => v.lang.toLowerCase().startsWith(prefix));
          
          if (targetVoices.length > 0) {
            // Prefer local high quality services if available
            const preferredVoice = targetVoices.find(v => v.localService) || targetVoices[0];
            utterance.voice = preferredVoice;
          } else {
            // Graceful fallback to any English voice
            const englishVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
            if (englishVoice) {
              utterance.voice = englishVoice;
              utterance.lang = 'en-US';
            }
          }
        }
      }

      utterance.onerror = (e) => {
        console.warn("Speech synthesis synthesis warning (swallowed):", e);
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn("Speech synthesis engine failed (gracefully swallowed):", err);
    }
  };

  // Define Preset Incidents
  const PRESET_INCIDENTS: IncidentPreset[] = useMemo(() => [
    {
      id: 'corridor_fire',
      name: 'Uncontrolled Corridor Fire (Tower B)',
      location: 'Tower B – Floor 5 Hallway',
      description: 'CCTV camera detects intense orange flames rapidly spreading along carpets with thick, dense black smoke rising and obscuring fire alarm sensors.',
      type: 'fire',
      imageUrl: corridorFireImg,
      iconColor: 'bg-rose-500 text-white',
      telemetry: {
        temperature: 185,
        smokeDensity: '92% (CRITICAL)',
        coLevel: '450 ppm',
        duration: '18 seconds'
      }
    },
    {
      id: 'parking_fire',
      name: 'Car Engine Bay Combustion',
      location: 'Underground Parking – Level 1',
      description: 'Vehicle hood bursts open with visible expanding ignition and heavy thermal columns. Secondary cameras confirm smoke expanding towards stairwell doors.',
      type: 'fire',
      imageUrl: corridorFireImg, 
      iconColor: 'bg-rose-500 text-white',
      telemetry: {
        temperature: 142,
        smokeDensity: '78% (HIGH)',
        coLevel: '280 ppm',
        duration: '12 seconds'
      }
    },
    {
      id: 'kitchen_cooking',
      name: 'Sizzling Stir-Fry Pan (Safe)',
      location: 'Tower A – Floor 3 Kitchen',
      description: 'Resident is cooking. A frying pan experiences brief grease flares over a gas stovetop burner with safe, white cooking steam floating up to the exhaust hood.',
      type: 'safe',
      imageUrl: kitchenCookingImg,
      iconColor: 'bg-slate-100 text-slate-700',
      telemetry: {
        temperature: 38,
        smokeDensity: '12% (SAFE)',
        coLevel: '15 ppm',
        duration: '5 seconds'
      }
    },
    {
      id: 'welding_sparks',
      name: 'Maintenance Welder (Safe)',
      location: 'Tower A Lobby Staircase',
      description: 'Registered maintenance technician performing authorized structural welding repairs on metallic rails, producing bright, concentrated white sparks with minimal ambient dust.',
      type: 'safe',
      imageUrl: weldingSparksImg,
      iconColor: 'bg-slate-100 text-slate-700',
      telemetry: {
        temperature: 24,
        smokeDensity: '4% (SAFE)',
        coLevel: '8 ppm',
        duration: '45 seconds'
      }
    },
    {
      id: 'birthday_candles',
      name: 'Party Candle Celebration (Safe)',
      location: 'Tower C Lounge',
      description: 'Social lounge event celebrating a birthday. Multiple standard cake candles are lit on a table, emitting very small controlled flames with negligible transient smoke.',
      type: 'safe',
      imageUrl: kitchenCookingImg, 
      iconColor: 'bg-slate-100 text-slate-700',
      telemetry: {
        temperature: 22,
        smokeDensity: '2% (SAFE)',
        coLevel: '4 ppm',
        duration: '3 seconds'
      }
    },
    {
      id: 'road_accident',
      name: 'Multi-Vehicle Intersection Collision',
      location: 'South Access Gate Intersection',
      description: 'CCTV detects high-speed collision between a sedan and a delivery van. One vehicle has flipped onto its side with passenger entrapment. Active fluid leak observed with potential road blockage.',
      type: 'accident',
      imageUrl: 'https://images.unsplash.com/photo-1599507591144-c6a1619808a7?w=800',
      iconColor: 'bg-orange-500 text-white',
      telemetry: {
        temperature: 24,
        smokeDensity: '35% (OIL SPRAY)',
        coLevel: '45 ppm',
        duration: '10 seconds'
      }
    },
    {
      id: 'basement_flood',
      name: 'Rapid Basement Level 2 Inundation',
      location: 'Basement Utility Room B2',
      description: 'Main water distribution valve rupture combined with heavy storm backup. Water depth has reached 1.2 meters in electrical switch rooms. High risk of utility failure and electric shock.',
      type: 'flood',
      imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800',
      iconColor: 'bg-blue-500 text-white',
      telemetry: {
        temperature: 14,
        smokeDensity: '0% (CLEAR WATER)',
        coLevel: '2 ppm',
        duration: '5 minutes'
      }
    },
    {
      id: 'road_blockage',
      name: 'Fallen Heavy Oak & Power Pole Block',
      location: 'North Exit Road Access Path',
      description: 'Severe wind gust uprooted a 15-meter old oak tree, completely blocking both emergency lanes. Fallen power lines are arcing and live on the wet asphalt, presenting a critical electrocution hazard.',
      type: 'road_blockage',
      imageUrl: 'https://images.unsplash.com/photo-1513628253939-010e64ac66cd?w=800',
      iconColor: 'bg-amber-600 text-white',
      telemetry: {
        temperature: 18,
        smokeDensity: '5% (SPARKY DUST)',
        coLevel: '0 ppm',
        duration: '2 minutes'
      }
    },
    {
      id: 'medical_emergency',
      name: 'Lobby Cardiac Distress & Syncope',
      location: 'Tower A Main Reception Desk',
      description: 'Elderly resident collapsed suddenly on the lobby floor, unresponsive. Bystander administering chest compressions. Automated External Defibrillator (AED) retrieved and activated.',
      type: 'medical',
      imageUrl: 'https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=800',
      iconColor: 'bg-indigo-500 text-white',
      telemetry: {
        temperature: 21,
        smokeDensity: '0%',
        coLevel: '0 ppm',
        duration: '3 minutes'
      }
    }
  ], []);

  // Helper function to fetch and convert imported image to base64
  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Could not load local image as base64. Verifying via prompt contexts fallback.", e);
      return '';
    }
  };

  // Fetch with background retry capability to boost reliability
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 2, delay = 1000): Promise<any> => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      if (!data.success || !data.data) throw new Error("Invalid response payload from server");
      return data;
    } catch (err) {
      if (retries > 0) {
        console.warn(`AI Analysis failed. Retrying in ${delay}ms... (${retries} attempts left)`, err);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 1.5);
      }
      throw err;
    }
  };

  // Run or retrieve cached dynamic emergency analysis
  const runAnalysis = async (preset: IncidentPreset, isBlockedOverride: boolean) => {
    // Generate description depending on whether smoke has spread to block Staircase B
    const description = isBlockedOverride
      ? `${preset.description} [CRITICAL TELEMETRY OVERRIDE: Heavy smoke has spread and blocked Staircase B. Recommend alternative evacuation routes strictly via Staircase A using Exit C / West Exit.]`
      : preset.description;

    const cacheKey = `${preset.id}_${language}_${isBlockedOverride ? 'blocked' : 'normal'}`;
    
    // Return cached results if already resolved to save computation and bandwidth
    if (aiResultsCacheRef.current[cacheKey]) {
      return aiResultsCacheRef.current[cacheKey];
    }

    let base64Img = '';
    if (preset.imageUrl) {
      base64Img = await getBase64FromUrl(preset.imageUrl);
    }

    const payload = await fetchWithRetry('/api/analyze-guardian-fire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        presetId: preset.id,
        title: preset.location,
        description: description,
        imageUrl: base64Img,
        language: language
      })
    }, 2, 800);

    if (payload && payload.success && payload.data) {
      aiResultsCacheRef.current[cacheKey] = payload.data;
      return payload.data;
    }
    throw new Error('Analysis payload error');
  };

  // Run AI Guardian Verification Process
  const handleTriggerSimulation = async (preset: IncidentPreset) => {
    setActivePreset(preset);
    setSelectedPresetId(preset.id);
    setIsScanning(true);
    setAiResult(null);
    setDispatchStatus('idle');
    setDispatchTimer(0);
    setAlertNotifications([]);
    
    // Reset enhanced states
    setUserSafetyStatus('pending');
    setCountdownSeconds(30);
    setIsCountdownActive(false);
    setFamilyNotified(false);
    setLocationShared(false);
    setIsPathBlockedSimulation(false); // Reset path blocked status
    
    setTimelineState({
      fireDetected: true,
      aiVerification: false,
      residentsAlerted: false,
      evacuationStarted: false,
      rescueInProgress: false,
      resolved: false
    });

    setResidents([
      { unit: 'Apt 501', name: 'Sarah Jenkins', status: 'safe', locationShared: false, priority: 'low' },
      { unit: 'Apt 502', name: 'Marcus Vance', status: 'need_help', locationShared: true, priority: 'critical', details: 'Stuck in bedroom 2' },
      { unit: 'Apt 503', name: 'You (Resident Resident)', status: 'pending', locationShared: false, priority: 'medium' },
      { unit: 'Apt 504', name: 'Robert Chen', status: 'pending', locationShared: false, priority: 'high' }
    ]);

    // Fast, ultra-smooth dynamic progress tracking
    setScanProgress(0);
    setScanStep('Detecting thermal signatures & gas spikes...');
    
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 12) + 12; // Complete scan progress smoothly in ~1s
      if (currentProgress >= 95) {
        currentProgress = 95;
      }
      setScanProgress(currentProgress);

      if (currentProgress < 25) {
        setScanStep('Detecting thermal signatures & gas spikes...');
      } else if (currentProgress < 50) {
        setScanStep('Extracting key frames for Gemini analysis...');
      } else if (currentProgress < 70) {
        setScanStep('Reading telemetry logs (Thermal & Gas sensors)...');
      } else if (currentProgress < 85) {
        setScanStep('Contacting Gemini AI Guardian verification pipeline...');
      } else {
        setScanStep('Differentiating from Cooking, Candles, Welding or Steam...');
      }
    }, 100);

    try {
      // Trigger background analysis
      const res = await runAnalysis(preset, false);
      
      clearInterval(progressInterval);
      setScanProgress(100);
      setScanStep('Finalizing safety classification report...');

      // Fast, responsive update sequence (200ms delay for user visibility of full bar completion)
      setTimeout(() => {
        setIsScanning(false);
        setAiResult(res);

        // Handle Actionable steps if real emergency verified (>95% confidence)
        if (res.isRealFire && res.confidenceScore >= 95) {
          setTimelineState(prev => ({
            ...prev,
            aiVerification: true,
            residentsAlerted: true,
            evacuationStarted: true,
            rescueInProgress: true
          }));

          // Start 30-seconds safety response countdown timer for residents
          setIsCountdownActive(true);

          // Push Simulated alerts to logs
          const now = new Date().toLocaleTimeString();
          const notifications = [
            {
              id: 'n1',
              title: '🚨 CRITICAL FIRE DETECTED',
              message: `HIGH-PRIORITY PUSH NOTIFICATION: Broadcast sent ONLY to residents inside ${preset.location.split('–')[0]} (${preset.location}). Please evacuate immediately!`,
              timestamp: now,
              type: 'broadcast' as const
            },
            {
              id: 'n2',
              title: '🏢 Security, Management & First Responders Alarm',
              message: `Building Manager, On-site Security, Fire Dept (Sim), Ambulance (Sim), and Police (Sim) have been automatically alerted with live digital layout maps.`,
              timestamp: now,
              type: 'security' as const
            },
            {
              id: 'n3',
              title: '🚒 Rescue Teams Dispatched',
              message: `Dispatch simulator routing units to the scene. ETA estimated at 3 mins.`,
              timestamp: now,
              type: 'dispatch' as const
            }
          ];
          setAlertNotifications(notifications);

          // Initiate Simulated Dispatch vehicles
          setDispatchStatus('dispatched');
          setDispatchTimer(15); // 15 seconds fast simulation for UI presentation

          // Speak the smart emergency announcement generated natively in user's language by Gemini
          const announcementText = res.emergencyAnnouncement || getEvacuationVoiceMessage(res, language || 'English', false);
          speakReport(announcementText);

        } else {
          // No alert triggered since it is under threshold or is a false alarm
          setTimelineState(prev => ({
            ...prev,
            aiVerification: true,
            resolved: true
          }));
          
          // Log false alarm check
          const now = new Date().toLocaleTimeString();
          setAlertNotifications([
            {
              id: 'n_safe',
              title: '✓ Safe Anomaly Ignored',
              message: `AI analysis successfully verified "${preset.name}" at ${preset.location} is safe and harmless. Residents not disturbed. No sirens activated.`,
              timestamp: now,
              type: 'security'
            }
          ]);

          if (!isMuted) {
            const safeAlertText = res.emergencyAnnouncement || `CCTV system scanned. Harmless activity detected: ${preset.name}. The smart building guardian has verified no fire risk. Status green.`;
            speakReport(safeAlertText);
          }
        }
      }, 200);

    } catch (err: any) {
      clearInterval(progressInterval);
      setIsScanning(false);
      console.error("AI Analysis failed after retries:", err);
      alert('The Emergency Decision Engine experienced a network issue. Falling back to default local safety systems.');
    }
  };

  // Handle dynamic AI-powered route recalculation on smoke spreads / blockages
  const handleToggleSmokeReroute = async () => {
    if (!activePreset || !aiResult) return;
    
    setIsRerouting(true);
    const willBeBlocked = !isPathBlockedSimulation;
    
    try {
      // Re-analyze immediately with Gemini using updated block telemetry in background
      const res = await runAnalysis(activePreset, willBeBlocked);
      
      setIsPathBlockedSimulation(willBeBlocked);
      setAiResult(res);
      setIsRerouting(false);
      
      const now = new Date().toLocaleTimeString();
      setAlertNotifications(prev => [
        {
          id: `reroute_${Date.now()}`,
          title: willBeBlocked ? '⚠️ DYNAMIC REROUTING ACTIVATED' : '✓ EVACUATION ROUTE RESTORED',
          message: willBeBlocked 
            ? `CCTV Cam 4 detected heavy smoke block at Staircase B. Gemini calculated alternative safe route via Staircase A.`
            : `Staircase B sensors indicate clear path. Primary route restored to Exit B.`,
          timestamp: now,
          type: 'security'
        },
        ...prev
      ]);

      // Speak the updated model announcement or structured guidance fallback
      const announcement = res.emergencyAnnouncement || getEvacuationVoiceMessage(res, language || 'English', willBeBlocked);
      speakReport(announcement);
      
    } catch (err) {
      setIsRerouting(false);
      console.error("Dynamic rerouting API error, falling back to local simulation:", err);
      
      // Local fallback representation
      setIsPathBlockedSimulation(willBeBlocked);
      const speakAnnouncementText = getEvacuationVoiceMessage(aiResult, language || 'English', willBeBlocked);
      speakReport(speakAnnouncementText);
    }
  };

  // Timer Effect for resident safety countdown (30s limit)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCountdownActive && countdownSeconds > 0 && userSafetyStatus === 'pending') {
      interval = setInterval(() => {
        setCountdownSeconds((prev) => {
          if (prev <= 1) {
            // Timer expired - mark as "No Response" automatically
            setUserSafetyStatus('no_response');
            setIsCountdownActive(false);

            // Update safety list
            setResidents(prevList => prevList.map(res => 
              res.unit === 'Apt 503' ? { ...res, status: 'no_response', priority: 'critical' } : res
            ));

            // Push log
            const now = new Date().toLocaleTimeString();
            setAlertNotifications(prevNotifs => [
              {
                id: 'no_resp_alert',
                title: '⚠️ RESIDENT CHECK-IN TIMER EXPIRED',
                message: `Unit 503 (You) did not respond within 30 seconds. System has auto-flagged your status as 'No Response' and prioritized your unit for search and rescue operations.`,
                timestamp: now,
                type: 'resident'
              },
              ...prevNotifs
            ]);

            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCountdownActive, countdownSeconds, userSafetyStatus]);

  // Timer Effect for rescue vehicles
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (dispatchStatus === 'dispatched' && dispatchTimer > 0) {
      interval = setInterval(() => {
        setDispatchTimer((prev) => {
          if (prev <= 1) {
            setDispatchStatus('arrived');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [dispatchStatus, dispatchTimer]);

  // Handle manual Resident response buttons
  const handleSelectSafetyStatus = (status: 'safe' | 'need_help') => {
    if (!aiResult?.isRealFire) return;
    
    setUserSafetyStatus(status);
    setIsCountdownActive(false);
    const now = new Date().toLocaleTimeString();

    if (status === 'safe') {
      setFamilyNotified(true);
      
      // Update local resident list
      setResidents(prev => prev.map(res => 
        res.unit === 'Apt 503' ? { ...res, status: 'safe', priority: 'low' } : res
      ));

      setAlertNotifications(prev => [
        {
          id: `status_safe_${Date.now()}`,
          title: '🟢 RESIDENT MARKED SAFE',
          message: `Resident in Apt 503 declared safe. Family members have been automatically notified via emergency SMS integration.`,
          timestamp: now,
          type: 'resident'
        },
        ...prev
      ]);

      if (!isMuted) {
        speakReport("Status registered as safe. We have notified your emergency family contacts.");
      }
    } else {
      setLocationShared(true);

      // Update local resident list
      setResidents(prev => prev.map(res => 
        res.unit === 'Apt 503' ? { ...res, status: 'need_help', locationShared: true, priority: 'critical', details: 'Awaiting rescue' } : res
      ));

      setAlertNotifications(prev => [
        {
          id: `status_help_${Date.now()}`,
          title: '🔴 RESCUE PRIORITY RAISED',
          message: `Apt 503 (You) requested emergency rescue. Live coordinates shared. Unit highlighted on First Responders dashboard.`,
          timestamp: now,
          type: 'resident'
        },
        ...prev
      ]);

      if (!isMuted) {
        speakReport("Emergency rescue requested. Your location has been shared. Responders are coming to your apartment.");
      }
    }
  };

  // Reset/Resolve Incident flow
  const handleResolveIncident = () => {
    setActivePreset(null);
    setSelectedPresetId('');
    setAiResult(null);
    setDispatchStatus('idle');
    setDispatchTimer(0);
    setUserSafetyStatus('pending');
    setCountdownSeconds(30);
    setIsCountdownActive(false);
    setFamilyNotified(false);
    setLocationShared(false);
    setAlertNotifications([]);
    setIsPathBlockedSimulation(false);
    setIsRerouting(false);
    
    setTimelineState({
      fireDetected: false,
      aiVerification: false,
      residentsAlerted: false,
      evacuationStarted: false,
      rescueInProgress: false,
      resolved: false
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" id="building-guardian-stage">
      
      {/* Top Title Section */}
      <div className="mb-8 border-b border-slate-100 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
            <span className="text-xs uppercase font-extrabold tracking-widest">AI Safety Infrastructure</span>
          </div>
          <h1 className="font-sans font-black text-3xl text-slate-800 tracking-tight flex items-center gap-2">
            Smart Building Guardian <span className="text-rose-600 px-2 py-0.5 bg-rose-50 text-xs rounded-xl border border-rose-100 uppercase tracking-widest font-black">AI VERIFIED</span>
          </h1>
          <p className="text-slate-500 text-xs mt-1 max-w-3xl leading-relaxed">
            Continuous camera snapshot evaluations powered by Gemini AI. Differentiates uncontrolled apartment/corridor fire emergencies from controlled cooking flames, maintenance welding sparks, birthday candles, and bathroom steam.
          </p>
        </div>

        {/* Audio/Voice Assist Controls */}
        <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <span className="text-xs text-slate-500 font-medium px-1">Speech assist:</span>
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-xl border transition-all flex items-center space-x-1.5 ${
              isMuted 
                ? 'bg-slate-200 border-slate-300 text-slate-500' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold'
            }`}
            title="Toggle announcement audio voice"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-bounce" />}
            <span className="text-[11px] uppercase tracking-wider">{isMuted ? "Muted" : "Speaker ON"}</span>
          </button>
        </div>
      </div>

      {/* TARGET HIGH PRIORITY BROADCAST BAR FOR COMFIRMED REAL FIRE */}
      <AnimatePresence>
        {aiResult && aiResult.isRealFire && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-4 sm:p-5 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-2 border-rose-500 relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <Radio className="w-32 h-32 text-white" />
              </div>
              
              <div className="flex items-start space-x-3.5 z-10">
                <div className="p-3 bg-black/30 rounded-2xl text-white animate-pulse">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <span className="bg-black/40 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full text-rose-100 border border-white/10">
                    TARGETED TOWER BROADCAST ACTIVE
                  </span>
                  <h3 className="font-sans font-black text-lg text-white mt-1.5 leading-tight">
                    🚨 HIGH-PRIORITY EMERGENCY WARNING SENT TO {activePreset?.location.toUpperCase()} RESIDENTS
                  </h3>
                  <p className="text-xs text-rose-100 mt-1 max-w-4xl leading-relaxed">
                    "A verified major fire has been detected by the Smart Building Guardian AI. Please evacuate immediately using the nearest safe exit." Emergency sirens and audio vocal alarms are fully activated in corridors.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 z-10">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                <span className="text-xs font-mono text-rose-100 uppercase tracking-widest font-bold">SIRENS RUNNING</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8 cols): CCTV Monitor, Live Dashboard, Resident Safety Portal */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* CCTV Feed View Panel */}
          <div className="bg-slate-900 rounded-3xl p-5 shadow-lg border border-slate-800 relative overflow-hidden" id="cctv-monitor-panel">
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">LIVE SECURITY CAMERAS</span>
            </div>

            <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
              <span className="text-[10px] font-mono text-slate-400">TOWER SYSTEM: ONLINE</span>
            </div>

            {/* Cameras Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              
              {/* Cam 1: Kitchen camera */}
              <div 
                onClick={() => setActiveCameraId('cam1')}
                className={`relative rounded-2xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                  activeCameraId === 'cam1' ? 'ring-2 ring-rose-500 border-transparent scale-[1.01]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <img 
                  src={kitchenCookingImg} 
                  alt="CCTV Camera 1" 
                  className="w-full h-full object-cover grayscale opacity-40 hover:opacity-50 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[9px] text-white font-mono">CAM_01 // KITCHEN APTS</div>
                <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-slate-300">OK // MONITORED</span>
                </div>
              </div>

              {/* Cam 2: Active incident target frame (Main focus) */}
              <div 
                onClick={() => setActiveCameraId('cam2')}
                className={`relative rounded-2xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                  activeCameraId === 'cam2' ? 'ring-2 ring-rose-500 border-transparent scale-[1.01]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {activePreset ? (
                  <img 
                    src={activePreset.imageUrl} 
                    alt="Active Incident CCTV" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                    <Video className="w-8 h-8 text-slate-700 animate-pulse mb-2" />
                    <span className="text-[10px] font-mono text-slate-500">SYSTEM SECURE // WAITING PRESET</span>
                    <span className="text-[9px] text-slate-600 mt-1">Select an incident simulator preset below to launch the safety verify routine.</span>
                  </div>
                )}
                
                {/* Scan Overlay Lines */}
                {isScanning && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="w-full h-1 bg-rose-500/80 shadow-lg shadow-rose-500 animate-bounce absolute" style={{ top: `${scanProgress}%` }} />
                    <div className="absolute inset-0 bg-rose-500/5 animate-pulse" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[9px] text-white font-mono">CAM_02 // CCTV SCAN TARGET</div>
                <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                  {isScanning ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 text-rose-500 animate-spin" />
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase tracking-widest">GEMINI EVALUATING...</span>
                    </>
                  ) : activePreset ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[10px] font-mono text-rose-400 font-bold uppercase">FEED DETECTED EVENT</span>
                    </>
                  ) : (
                    <>
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-mono text-emerald-400">STANDBY // READY</span>
                    </>
                  )}
                </div>
              </div>

              {/* Cam 3: Lobby Stairwell */}
              <div 
                onClick={() => setActiveCameraId('cam3')}
                className={`relative rounded-2xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                  activeCameraId === 'cam3' ? 'ring-2 ring-rose-500 border-transparent scale-[1.01]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <img 
                  src={weldingSparksImg} 
                  alt="CCTV Camera 3" 
                  className="w-full h-full object-cover grayscale opacity-45 hover:opacity-50 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[9px] text-white font-mono">CAM_03 // LOBBY STAIRCASE</div>
                <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-slate-300">OK // MONITORED</span>
                </div>
              </div>

              {/* Cam 4: Emergency Assembly Point */}
              <div 
                onClick={() => setActiveCameraId('cam4')}
                className={`relative rounded-2xl overflow-hidden border cursor-pointer aspect-video transition-all ${
                  activeCameraId === 'cam4' ? 'ring-2 ring-rose-500 border-transparent scale-[1.01]' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center relative p-3">
                  <Users className="w-6 h-6 text-slate-700 mb-1" />
                  <span className="text-[9px] font-mono text-slate-500">CAM_04 // EAST ASSEMBLY COURTYARD</span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute top-2 left-2 bg-black/50 px-2 py-0.5 rounded text-[9px] text-white font-mono">CAM_04 // ASSEMBLY POINT</div>
                <div className="absolute bottom-2 left-2 flex items-center space-x-1">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400">OK // OPEN ZONE</span>
                </div>
              </div>

            </div>

            {/* Displaying Live Analysing Steps */}
            {isScanning && (
              <div className="mt-4 bg-slate-950/90 border border-slate-800 rounded-2xl p-4 animate-fade-in flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3 w-full md:w-auto">
                  <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl animate-pulse">
                    <RotateCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">AI Guardian Analyzing CCTV Snapshot...</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{scanStep}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full md:w-48 bg-slate-800 h-2 rounded-full overflow-hidden relative border border-slate-700">
                  <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Incident Preset Simulation Selectors */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <h2 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-rose-500" />
              <span>TEST SCENARIO INJECTORS</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {PRESET_INCIDENTS.map((preset) => (
                <button
                  key={preset.id}
                  id={`btn-preset-${preset.id}`}
                  onClick={() => handleTriggerSimulation(preset)}
                  disabled={isScanning}
                  className={`flex flex-col text-left p-4 rounded-2xl border transition-all relative ${
                    selectedPresetId === preset.id
                      ? 'bg-rose-50/20 border-rose-200 shadow-sm ring-1 ring-rose-200'
                      : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className={`absolute top-2 right-2 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    preset.type === 'fire' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {preset.type === 'fire' ? 'Critical' : 'Harmless'}
                  </span>

                  <div className="flex items-center space-x-2 mb-2">
                    <div className={`p-2 rounded-xl text-xs font-bold shrink-0 ${
                      preset.type === 'fire' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Video className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">{preset.location.split('–')[0]}</span>
                  </div>

                  <span className="text-xs font-bold text-slate-800 line-clamp-1">{preset.name}</span>
                  <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-normal">
                    {preset.description}
                  </p>

                  <div className="mt-3 pt-2 border-t border-slate-100/60 flex items-center justify-between text-[9px] font-mono text-slate-400">
                    <span>Temp: {preset.telemetry.temperature}°C</span>
                    <span>CO: {preset.telemetry.coLevel}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 🧠 AI EMERGENCY DECISION ENGINE PANEL */}
          <AnimatePresence>
            {aiResult && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-slate-900 border border-slate-850 rounded-3xl p-6 shadow-xl space-y-6 text-white"
                id="ai-emergency-decision-panel"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="flex items-center space-x-3">
                    <Brain className="w-6 h-6 text-indigo-400 animate-pulse" />
                    <div>
                      <h3 className="font-sans font-black text-sm uppercase tracking-widest text-indigo-100 flex items-center gap-1.5">
                        <span>Agentic Emergency Decision Engine</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Autonomous Incident Verification & Dispatch Decision Command</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${
                    aiResult.isRealFire 
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {aiResult.isRealFire ? '🚨 DISPATCH APPROVED' : '✓ STANDBY // HARMLESS ACTIVITY'}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* 🧠 AI Emergency Assessment */}
                  <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 space-y-4">
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span>🧠 AI Emergency Assessment</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Incident Type</span>
                        <span className="font-bold text-slate-200 block mt-0.5">{aiResult.incidentType || (aiResult.isRealFire ? 'Emergency Incident' : 'Harmless Activity')}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Severity Level</span>
                        <span className={`font-black uppercase block mt-0.5 ${
                          aiResult.isRealFire 
                            ? (aiResult.severityLevel === 'Critical' ? 'text-rose-400 animate-pulse' : 'text-orange-400')
                            : 'text-emerald-400'
                        }`}>
                          {aiResult.isRealFire ? (aiResult.severityLevel || 'Critical') : 'Low'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Confidence Score</span>
                        <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          {aiResult.confidenceScore}% Accuracy
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Est. People at Risk</span>
                        <span className="font-bold text-slate-200 block mt-0.5">
                          {aiResult.isRealFire ? (aiResult.estimatedPeopleAtRisk ?? 124) : 0} Occupants
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Predicted Impact Radius</span>
                        <span className="font-bold text-slate-200 block mt-0.5">
                          {aiResult.isRealFire ? (aiResult.predictedImpactRadius || '50 meters') : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Possible Cause</span>
                        <span className="font-bold text-slate-200 block mt-0.5 truncate" title={aiResult.possibleCause || 'N/A'}>
                          {aiResult.possibleCause || (aiResult.isRealFire ? 'Under investigation' : 'Normal routine activity')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Risk of Escalation</span>
                        <span className="font-bold text-slate-200 block mt-0.5">
                          {aiResult.isRealFire ? (aiResult.riskOfEscalation || 'High') : 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Rec. Response Time</span>
                        <span className="font-bold text-indigo-400 block mt-0.5">
                          {aiResult.isRealFire ? (aiResult.recommendedResponseTime || 'Immediate') : 'No dispatch needed'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 🧠 AI Action Recommendations */}
                  <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 space-y-4">
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                      <Compass className="w-4 h-4 text-indigo-400" />
                      <span>🧠 AI Action Recommendations</span>
                    </h4>
                    
                    <div className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 block">EVACUATE OR STAY</span>
                          <span className={`font-bold mt-0.5 block ${aiResult.isRealFire ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {aiResult.isRealFire ? (aiResult.actionRecommendations?.evacuateOrStay || 'Evacuate immediately') : 'Stay / Resume normalcy'}
                          </span>
                        </div>
                        <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 block">STAIRCASE OR ELEVATOR</span>
                          <span className="font-bold text-slate-200 mt-0.5 block">
                            {aiResult.isRealFire ? (aiResult.actionRecommendations?.staircaseOrElevator || 'Avoid elevators') : 'Elevators operational'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <span className="text-[8px] font-mono text-slate-500 block">SAFE EVACUATION DIRECTION</span>
                        <span className={`font-bold mt-0.5 block ${aiResult.isRealFire ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {aiResult.isRealFire ? (aiResult.actionRecommendations?.evacuationDirection || 'Toward nearest exit stair') : 'N/A - Fully safe'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-300">
                        <div>
                          <span className="font-mono text-slate-500 block text-[8px]">NEARBY SHELTER</span>
                          <span className="font-medium text-slate-300 block">{aiResult.isRealFire ? (aiResult.actionRecommendations?.nearbySafeShelter || 'Primary Assembly') : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-slate-500 block text-[8px]">NEAREST HOSPITAL</span>
                          <span className="font-medium text-slate-300 block">{aiResult.isRealFire ? (aiResult.actionRecommendations?.nearestHospital || 'Central Hospital') : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-slate-500 block text-[8px]">NEAREST FIRE STATION</span>
                          <span className="font-medium text-slate-300 block">{aiResult.isRealFire ? (aiResult.actionRecommendations?.nearestFireStation || 'Station 4') : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-slate-500 block text-[8px]">NEAREST POLICE</span>
                          <span className="font-medium text-slate-300 block">{aiResult.isRealFire ? (aiResult.actionRecommendations?.nearestPoliceStation || 'Precinct 9') : 'N/A'}</span>
                        </div>
                      </div>

                      <div className="border-t border-slate-800 pt-2 grid grid-cols-2 gap-3 text-[10px]">
                        <div>
                          <span className="font-mono text-slate-500 block text-[8px]">ROADS TO AVOID</span>
                          <span className="text-rose-400 font-medium block">{aiResult.isRealFire ? (aiResult.actionRecommendations?.roadsToAvoid || 'None') : 'None'}</span>
                        </div>
                        <div>
                          <span className="font-mono text-slate-500 block text-[8px]">TRAFFIC / WEATHER</span>
                          <span className="text-amber-400 font-medium block leading-normal">
                            {aiResult.isRealFire ? (aiResult.actionRecommendations?.trafficDiversion || 'N/A') : 'Clear'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 🚑 AI Resource Allocation */}
                <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800/80 space-y-4">
                  <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <Truck className="w-4 h-4 text-indigo-400" />
                    <span>🚑 AI Tactical Resource Allocation Recommendations</span>
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                    {/* Fire Engines */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Fire Engines</span>
                        <Flame className="w-4 h-4 text-rose-500" />
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-black text-white">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.fireEngines?.count ?? 3) : 0}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal line-clamp-2">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.fireEngines?.reason || 'Suppression & rescue') : 'No hazard present.'}
                        </p>
                      </div>
                    </div>

                    {/* Ambulances */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Ambulances</span>
                        <Heart className="w-4 h-4 text-emerald-500" />
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-black text-white">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.ambulances?.count ?? 2) : 0}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal line-clamp-2">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.ambulances?.reason || 'Medical standby') : 'No injuries possible.'}
                        </p>
                      </div>
                    </div>

                    {/* Police Units */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Police Units</span>
                        <ShieldAlert className="w-4 h-4 text-blue-500" />
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-black text-white">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.policeUnits?.count ?? 4) : 0}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal line-clamp-2">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.policeUnits?.reason || 'Traffic control & perimeter') : 'No crowd control needed.'}
                        </p>
                      </div>
                    </div>

                    {/* Rescue Team */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Rescue Team</span>
                        <Users className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-black text-white">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.rescueTeam?.count ?? 1) : 0}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal line-clamp-2">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.rescueTeam?.reason || 'Search & extraction') : 'No occupant trapped.'}
                        </p>
                      </div>
                    </div>

                    {/* Disaster Response */}
                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono text-slate-500 uppercase">Disaster Resp.</span>
                        <AlertIcon className="w-4 h-4 text-indigo-500" />
                      </div>
                      <div className="mt-2">
                        <span className="text-xl font-black text-white">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.disasterResponseTeam?.count ?? 0) : 0}
                        </span>
                        <p className="text-[9px] text-slate-400 mt-1 leading-normal line-clamp-2">
                          {aiResult.isRealFire ? (aiResult.resourceAllocation?.disasterResponseTeam?.reason || 'Standby for backup support') : 'No secondary threat.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 📝 AI Incident Summary */}
                <div className="bg-indigo-950/30 p-5 rounded-2xl border border-indigo-500/20 space-y-2">
                  <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-indigo-300 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>📝 AI Incident Tactical Dispatch Summary (For First Responders)</span>
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {aiResult.incidentSummary || aiResult.reasoning || 'System secure. All monitors normal.'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FEATURE 4: BUILDING EMERGENCY STATUS DASHBOARD */}
          <AnimatePresence>
            {aiResult && aiResult.isRealFire && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white border border-slate-150 rounded-3xl p-6 shadow-sm space-y-4"
                id="building-emergency-status-dashboard"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-5 h-5 text-rose-600 animate-pulse" />
                    <h3 className="font-sans font-black text-sm text-slate-850 uppercase tracking-wider">
                      Building Emergency Status Dashboard
                    </h3>
                  </div>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-3 py-1 rounded-full animate-bounce">
                    CRITICAL EMERGENCY IN PROGRESS
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Fire Severity */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Fire Severity</span>
                    <span className="text-sm font-black text-rose-600 flex items-center gap-1 mt-0.5 animate-pulse">
                      <Flame className="w-4 h-4 text-rose-600" />
                      UNCONTROLLED CRITICAL
                    </span>
                  </div>

                  {/* AI Confidence Score */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">AI Verification Score</span>
                    <span className="text-sm font-black text-slate-800 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      {aiResult.confidenceScore}% Confidence
                    </span>
                  </div>

                  {/* Floors Affected */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Floors Affected</span>
                    <span className="text-sm font-black text-slate-850 block mt-0.5">
                      5th Floor (Origin), Smoke 4-7
                    </span>
                  </div>

                  {/* Estimated People at Risk */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Est. People at Risk</span>
                    <span className="text-sm font-black text-slate-800 flex items-center gap-1 mt-0.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      124 Occupants
                    </span>
                  </div>

                  {/* Emergency Teams Dispatched */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl col-span-1 md:col-span-2">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Simulated Emergency Teams Dispatched</span>
                    <span className="text-xs font-bold text-slate-700 block mt-1 leading-normal">
                      🚒 Fire Engine 4 & 5, 🚑 Ambulance Crew 2, 🚓 Traffic Control Cruiser 9
                    </span>
                  </div>
                </div>

                {/* Simulated arrival timeline */}
                <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-rose-600 animate-spin" />
                    <span className="font-bold text-rose-950">Dispatched Rescue Arrival Countdown:</span>
                  </div>
                  <div className="text-sm font-black font-mono text-rose-600 bg-white px-3 py-1 rounded-xl border border-rose-200">
                    {dispatchStatus === 'dispatched' ? `ETA: 3m 45s (${dispatchTimer}s simulated)` : "🚒 RESCUE TEAMS ARRIVED"}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FEATURE 5: RESIDENT SAFETY CHECK-IN PORTAL */}
          <AnimatePresence>
            {aiResult && aiResult.isRealFire && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-4 shadow-xl"
                id="resident-safety-checkin-portal"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <HeartHandshake className="w-5 h-5 text-emerald-400 animate-pulse" />
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">
                        My Resident Emergency Safety Status Check-In
                      </h3>
                      <p className="text-[10px] text-slate-400">Please provide your status to aid search and rescue crews.</p>
                    </div>
                  </div>

                  {/* Countdown clock */}
                  {userSafetyStatus === 'pending' && (
                    <div className="flex items-center space-x-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full text-xs font-bold font-mono">
                      <Timer className="w-3.5 h-3.5 animate-spin" />
                      <span>Auto-Response in: {countdownSeconds}s</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Action Selector Buttons */}
                  <div className="space-y-4">
                    <div className="text-xs text-slate-300">
                      Select your status. Responders will immediately see this updated on their rescue tactical dashboards:
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      {/* I'm Safe */}
                      <button
                        onClick={() => handleSelectSafetyStatus('safe')}
                        className={`flex-1 p-4 rounded-2xl border transition-all text-left flex items-start space-x-3 ${
                          userSafetyStatus === 'safe'
                            ? 'bg-emerald-600 text-white border-transparent ring-2 ring-emerald-300'
                            : 'bg-slate-950/80 hover:bg-slate-850 text-slate-200 border-slate-800'
                        }`}
                      >
                        <div className={`p-2 rounded-xl text-white ${
                          userSafetyStatus === 'safe' ? 'bg-emerald-700' : 'bg-emerald-950 text-emerald-400'
                        }`}>
                          <Check className="w-4 h-4 font-black" />
                        </div>
                        <div>
                          <span className="text-xs font-black block">🟢 I'M SAFE</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                            Mark safe & notify family contacts via automated SMS.
                          </span>
                        </div>
                      </button>

                      {/* Need Help */}
                      <button
                        onClick={() => handleSelectSafetyStatus('need_help')}
                        className={`flex-1 p-4 rounded-2xl border transition-all text-left flex items-start space-x-3 ${
                          userSafetyStatus === 'need_help'
                            ? 'bg-rose-600 text-white border-transparent ring-2 ring-rose-300'
                            : 'bg-slate-950/80 hover:bg-slate-850 text-slate-200 border-slate-800'
                        }`}
                      >
                        <div className={`p-2 rounded-xl text-white ${
                          userSafetyStatus === 'need_help' ? 'bg-rose-700' : 'bg-rose-950 text-rose-400'
                        }`}>
                          <Flame className="w-4 h-4 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-xs font-black block">🔴 NEED HELP</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">
                            Share live location & raise rescue priority to CRITICAL.
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Feedback cards based on selected choices */}
                    {userSafetyStatus === 'safe' && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-400 flex items-start space-x-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                        <div>
                          <p className="font-bold">Family Notified Successfully!</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Automated safety messages have been broadcast to your registered emergency groups.</p>
                        </div>
                      </div>
                    )}

                    {userSafetyStatus === 'need_help' && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs text-rose-400 flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400 animate-bounce" />
                        <div>
                          <p className="font-bold">Live Location Shared with Rescuers</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Your apartment unit is highlighted in glowing red on search-and-rescue dashboards. Firefighters are routed to your coordinates.</p>
                        </div>
                      </div>
                    )}

                    {userSafetyStatus === 'no_response' && (
                      <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-xs text-yellow-400 flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-yellow-400" />
                        <div>
                          <p className="font-bold">Auto-Flagged: No Response</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Timer expired before response. Unit has been labeled as 'Prioritized Rescue' for safety protocols.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resident roll-call scoreboard */}
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Tower Block Roll-Call Ledger</span>
                      <span className="text-[9px] font-mono text-emerald-400">Total units: 4</span>
                    </div>

                    <div className="space-y-2.5">
                      {residents.map((res, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-slate-500 text-[10px]">{res.unit}</span>
                            <span className="font-bold text-slate-300">{res.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {res.locationShared && (
                              <span className="text-[8px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                                GPS SHARED
                              </span>
                            )}
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              res.status === 'safe' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : res.status === 'need_help'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                                : res.status === 'no_response'
                                ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {res.status === 'safe' ? "SAFE // OK" : res.status === 'need_help' ? "NEED HELP" : res.status === 'no_response' ? "NO RESP // ROUTED" : "AWAITING..."}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FEATURE 3: LIVE BUILDING EVACUATION MAP */}
          {aiResult && aiResult.isRealFire && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6"
              id="evacuation-evac-panel"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                  <Compass className={`w-6 h-6 text-emerald-400 ${isRerouting ? 'animate-spin' : 'animate-pulse'}`} />
                  <div>
                    <h3 className="font-sans font-black text-sm uppercase tracking-widest text-emerald-100 flex items-center gap-2">
                      <span>🚨 AI Emergency Evacuation Assistant</span>
                      {isRerouting && (
                        <span className="text-[9px] font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider">
                          Recalculating...
                        </span>
                      )}
                      {isPathBlockedSimulation && !isRerouting && (
                        <span className="text-[9px] font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full animate-bounce uppercase tracking-wider">
                          Rerouted Active
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400">Continuous AI layout mapping, exit optimization, and sensor spread telemetry</p>
                  </div>
                </div>

                {/* Simulation Trigger Button */}
                <button
                  disabled={isRerouting || !activePreset}
                  onClick={handleToggleSmokeReroute}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                    isRerouting
                      ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                      : isPathBlockedSimulation
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 animate-pulse'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRerouting ? 'animate-spin' : ''}`} />
                  <span>
                    {isPathBlockedSimulation ? 'Reset Evac Path' : 'Simulate Smoke Spread (Reroute)'}
                  </span>
                </button>
              </div>

              {/* Map & Guidance Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visual Map Component */}
                <div className="bg-slate-950 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between relative overflow-hidden">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Interactive CCTV Evacuation Map // Floor 5</span>
                    <span className="flex items-center gap-1 text-[8px] font-mono text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase border border-rose-500/25">
                      <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                      Live Feed
                    </span>
                  </div>

                  {/* SVG Floor Layout Map */}
                  <div className="relative aspect-square flex items-center justify-center bg-slate-950 rounded-xl p-1">
                    {isRerouting ? (
                      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 space-y-3">
                        <Brain className="w-8 h-8 text-indigo-400 animate-bounce" />
                        <span className="text-xs font-mono text-indigo-200 uppercase tracking-wider animate-pulse">
                          Gemini Analyzing Route Telemetry...
                        </span>
                      </div>
                    ) : null}

                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {/* Grid patterns */}
                      <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                          <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100" height="100" fill="url(#grid)" />

                      {/* Outer building boundary */}
                      <rect x="5" y="5" width="90" height="90" rx="6" fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="3 3" />
                      
                      {/* Corridors and Rooms */}
                      <line x1="50" y1="5" x2="50" y2="95" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" />
                      <line x1="5" y1="50" x2="95" y2="50" stroke="#0f172a" strokeWidth="14" strokeLinecap="round" />

                      {/* Rooms / Apartments */}
                      <rect x="10" y="10" width="28" height="28" rx="4" fill="#020617" stroke="#1e293b" strokeWidth="1.5" />
                      <rect x="62" y="10" width="28" height="28" rx="4" fill="#020617" stroke="#1e293b" strokeWidth="1.5" />
                      <rect x="10" y="62" width="28" height="28" rx="4" fill="#020617" stroke="#1e293b" strokeWidth="1.5" />
                      <rect x="62" y="62" width="28" height="28" rx="4" fill="#020617" stroke="#1e293b" strokeWidth="1.5" />

                      {/* Text Labels */}
                      <text x="24" y="24" fill="#475569" fontSize="3" fontWeight="bold" textAnchor="middle">UNIT 501</text>
                      <text x="76" y="24" fill="#475569" fontSize="3" fontWeight="bold" textAnchor="middle">UNIT 502</text>
                      <text x="24" y="76" fill="#6366f1" fontSize="3" fontWeight="black" textAnchor="middle">UNIT 503 (YOU)</text>
                      <text x="76" y="76" fill="#475569" fontSize="3" fontWeight="bold" textAnchor="middle">UNIT 504</text>

                      {/* FIRE ZONE (Red) */}
                      <circle cx="50" cy="50" r="12" fill="#ef4444" className="opacity-20 animate-ping" />
                      <circle cx="50" cy="50" r="7" fill="#ef4444" className="opacity-40 animate-pulse" />
                      <path d="M 48,47 L 52,47 L 50,43 Z" fill="#ffffff" />
                      <text x="50" y="55" fill="#ef4444" fontSize="3.5" fontWeight="black" textAnchor="middle">FIRE ORIGIN</text>

                      {/* NORTH EXIT (Exit A) - Always Red / Blocked by initial fire */}
                      <rect x="44" y="5" width="12" height="6" rx="1.5" fill="#ef4444" />
                      <text x="50" y="9.5" fill="#ffffff" fontSize="3" fontWeight="black" textAnchor="middle">✗ BLOCKED A</text>

                      {/* SOUTH EXIT B (Staircase B) */}
                      {/* If path is blocked, Staircase B turns RED/Yellow, otherwise Green */}
                      <rect 
                        x="44" 
                        y="89" 
                        width="12" 
                        height="6" 
                        rx="1.5" 
                        fill={isPathBlockedSimulation ? "#f59e0b" : "#10b981"} 
                      />
                      <text x="50" y="93.5" fill="#ffffff" fontSize="3" fontWeight="black" textAnchor="middle">
                        {isPathBlockedSimulation ? "⚠ EXIT B" : "✓ EXIT B"}
                      </text>

                      {/* WEST EXIT C (Alternative Staircase A) - Becomes Green when rerouted */}
                      <rect 
                        x="5" 
                        y="44" 
                        width="6" 
                        height="12" 
                        rx="1.5" 
                        fill={isPathBlockedSimulation ? "#10b981" : "#475569"} 
                      />
                      <text x="8" y="51.5" fill="#ffffff" fontSize="3" fontWeight="black" textAnchor="middle" transform="rotate(-90 8 51.5)">
                        {isPathBlockedSimulation ? "✓ EXIT C" : "EXIT C"}
                      </text>

                      {/* EMERGENCY ASSEMBLY POINT (Blue) */}
                      <rect x="74" y="89" width="20" height="6" rx="2" fill="#3b82f6" />
                      <text x="84" y="93.5" fill="#ffffff" fontSize="2.8" fontWeight="black" textAnchor="middle">ASSEMBLY ALPHA</text>

                      {/* SMOKE RISK (Yellow) and Smoke Spreads */}
                      <circle cx="50" cy="30" r="10" fill="#eab308" className="opacity-15" />
                      {isPathBlockedSimulation ? (
                        <>
                          {/* Smoke spreading down to South Exit Corridor */}
                          <circle cx="50" cy="75" r="12" fill="#eab308" className="opacity-40 animate-pulse" />
                          <circle cx="50" cy="85" r="8" fill="#ef4444" className="opacity-30 animate-pulse" />
                          <text x="50" y="76" fill="#eab308" fontSize="3.5" fontWeight="black" textAnchor="middle" className="animate-pulse">HEAVY SMOKE</text>
                        </>
                      ) : (
                        <>
                          <circle cx="50" cy="22" r="6" fill="#eab308" className="opacity-25 animate-pulse" />
                        </>
                      )}

                      {/* EVACUATION ROUTE PATHS (Glowing Green vs Red/Blocked) */}
                      {!isPathBlockedSimulation ? (
                        <>
                          {/* Green path from Unit 503 (bottom-left x=24, y=76) to EXIT B (bottom-center x=50, y=89) */}
                          <path 
                            d="M 24,76 L 50,76 L 50,89" 
                            stroke="#10b981" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            fill="none" 
                            className="animate-pulse" 
                            strokeDasharray="4 2"
                          />
                          {/* Extension to assembly area */}
                          <path 
                            d="M 50,89 L 74,92" 
                            stroke="#10b981" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            fill="none" 
                          />
                          {/* Animated Arrows */}
                          <polyline points="47,83 50,86 53,83" fill="none" stroke="#10b981" strokeWidth="1.5" />
                          <polyline points="59,91 63,92 59,93" fill="none" stroke="#10b981" strokeWidth="1.5" />
                        </>
                      ) : (
                        <>
                          {/* Blocked Path to South Exit B (Red / Yellow) */}
                          <path 
                            d="M 24,76 L 50,76 L 50,89" 
                            stroke="#ef4444" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            fill="none" 
                            strokeDasharray="2 2"
                          />
                          <text x="38" y="72" fill="#ef4444" fontSize="2.8" fontWeight="bold">PATH COMPROMISED</text>

                          {/* New Active Green Path to West Exit C */}
                          {/* Path from Unit 503 (x=24, y=76) up and left to Exit C (x=11, y=50) */}
                          <path 
                            d="M 24,76 L 24,50 L 11,50" 
                            stroke="#10b981" 
                            strokeWidth="2.5" 
                            strokeLinecap="round" 
                            fill="none" 
                            className="animate-pulse"
                            strokeDasharray="4 2"
                          />
                          {/* Animated Arrows to the left */}
                          <polyline points="20,53 17,50 20,47" fill="none" stroke="#10b981" strokeWidth="1.5" />
                          <polyline points="24,63 24,59" fill="none" stroke="#10b981" strokeWidth="1.5" />
                        </>
                      )}
                    </svg>
                  </div>

                  {/* Color Legend Map Markers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-[9px] font-mono">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 justify-center">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
                      Green: Safe Route
                    </span>
                    <span className="text-rose-400 font-bold flex items-center gap-1.5 justify-center">
                      <span className="w-2.5 h-2.5 rounded bg-rose-500 shrink-0" />
                      Red: Fire/Blocked
                    </span>
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 justify-center">
                      <span className="w-2.5 h-2.5 rounded bg-amber-500 shrink-0" />
                      Yellow: Smoke Risk
                    </span>
                    <span className="text-blue-400 font-bold flex items-center gap-1.5 justify-center">
                      <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
                      Blue: Assembly
                    </span>
                  </div>
                </div>

                {/* 🚨 Live Emergency Guidance Details */}
                <div className="flex flex-col justify-between space-y-4">
                  <div className="bg-slate-950/40 rounded-2xl p-5 border border-slate-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                      <span>🚨 Live Evacuation Guidance Directives</span>
                    </h4>

                    <div className="space-y-3.5 text-xs">
                      {/* Route Recommendation Card */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Best Evacuation Route</span>
                          <p className="text-xs text-slate-200 font-extrabold leading-normal">
                            {isPathBlockedSimulation 
                              ? "Proceed upwards from Room 503, turn left along West corridor towards Exit C." 
                              : (aiResult.evacuationRoute || "Evacuate South corridor using Staircase B towards open courtyard.")}
                          </p>
                        </div>
                      </div>

                      {/* Staircase Card */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
                          <Navigation className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Designated Safe Exit Door & Staircase</span>
                          <p className="text-xs text-slate-200 font-extrabold leading-normal">
                            {isPathBlockedSimulation 
                              ? "Staircase A // West Exit C (Staircase B is now blocked)" 
                              : `Staircase B // South Exit B (${aiResult.actionRecommendations?.staircaseOrElevator || 'Staircase B'})`}
                          </p>
                        </div>
                      </div>

                      {/* Exits Status / Hazards */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Hazard & Blocked Zones</span>
                          <span className="text-rose-400 font-black mt-1 block">
                            {isPathBlockedSimulation 
                              ? "North Exit A (Fire) & South Exit B (Heavy Smoke)" 
                              : "North Exit A (Severe Fire Anomaly)"}
                          </span>
                        </div>
                        <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Est. Evacuation Time</span>
                          <span className="text-emerald-400 font-black mt-1 block">
                            {isPathBlockedSimulation ? "2m 15s (Alternative)" : "1m 15s (Optimal)"}
                          </span>
                        </div>
                      </div>

                      {/* Recommended Assembly Point */}
                      <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-mono text-slate-500 uppercase block">Recommended Assembly Area Outside</span>
                          <p className="text-xs text-slate-200 font-extrabold leading-normal">
                            {isPathBlockedSimulation 
                              ? "West Courtyard Assembly Area Beta" 
                              : (aiResult.actionRecommendations?.nearbySafeShelter || "Primary Tower B Assembly Area Alpha")}
                          </p>
                        </div>
                      </div>

                      {/* NEVER USE ELEVATOR WARNING */}
                      <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center space-x-3 text-rose-400">
                        <AlertTriangle className="w-5 h-5 shrink-0 animate-bounce" />
                        <div className="text-[11px] leading-tight font-black uppercase">
                          ⚠️ EMERGENCY MANDATE: Never use elevators during evacuation. Lift shafts act as heavy smoke chimneys.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dispatch live ETA and response status */}
                  <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-2">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Responders Live Tracking HUD</span>
                      <span className="text-[9px] font-mono text-emerald-400 font-bold uppercase animate-pulse">Live Satellite Link</span>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <span className="text-[8px] font-mono text-slate-500 block">DISPATCHED RESPONDERS</span>
                        <span className="text-xs font-bold text-slate-200 block mt-0.5">
                          🚒 Fire Engines 4 & 5, 🚑 Medical Emergency Crew 2
                        </span>
                      </div>
                      <div className="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-3 py-1.5 rounded-xl font-mono text-xs font-black shrink-0">
                        {dispatchStatus === 'dispatched' ? `ETA: ${Math.floor(dispatchTimer / 60)}m ${dispatchTimer % 60}s` : "🚒 RESCUERS ON SCENE"}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap gap-3 border-t border-slate-800 pt-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-950 hover:bg-slate-850 text-white border border-slate-800 text-xs font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Printer className="w-4 h-4 text-slate-400" />
                  <span>Print Evacuation Layout Map</span>
                </button>
                <button
                  onClick={() => {
                    const statusMsg = isPathBlockedSimulation 
                      ? "Transmitting alternative route (Staircase A via Exit C) directly to first responder head-up displays."
                      : "Transmitting primary route (Staircase B via Exit B) directly to first responder head-up displays.";
                    alert(statusMsg);
                  }}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Transmit Live Blueprints to Responders</span>
                </button>
              </div>

            </motion.div>
          )}

        </div>

        {/* Right Column (4 cols): Timeline, Automatic Dispatch checklist, Audit Reports, Logs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* FEATURE 7: LIVE INCIDENT TIMELINE */}
          {activePreset && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Live Incident Timeline</span>
              
              <div className="space-y-4">
                {/* Milestone 1: Fire Detected */}
                <div className="flex items-start space-x-2.5 text-xs">
                  <div className={`p-1 rounded-full shrink-0 ${timelineState.fireDetected ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">CCTV Fire Detected</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Telemetry sensor anomaly triggered evaluation.</p>
                  </div>
                </div>

                {/* Milestone 2: AI Verification Complete */}
                <div className="flex items-start space-x-2.5 text-xs">
                  <div className={`p-1 rounded-full shrink-0 ${timelineState.aiVerification ? (aiResult?.isRealFire ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white') : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">AI Verification Complete</span>
                    {timelineState.aiVerification ? (
                      <p className={`text-[10px] font-bold mt-0.5 ${aiResult?.isRealFire ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {aiResult?.isRealFire ? `Critical Fire Confirmed (${aiResult.confidenceScore}%)` : "Harmless Anomaly Ignored - System Green"}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">Gemini verifying credentials...</p>
                    )}
                  </div>
                </div>

                {/* Milestone 3: Residents Alerted */}
                <div className="flex items-start space-x-2.5 text-xs">
                  <div className={`p-1 rounded-full shrink-0 ${timelineState.residentsAlerted ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Residents Alerted</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Targeted push alerts and voice synthesis broadcasts sent.</p>
                  </div>
                </div>

                {/* Milestone 4: Evacuation Started */}
                <div className="flex items-start space-x-2.5 text-xs">
                  <div className={`p-1 rounded-full shrink-0 ${timelineState.evacuationStarted ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Evacuation Started</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Visual floor exits mapped with green directional lighting.</p>
                  </div>
                </div>

                {/* Milestone 5: Rescue In Progress */}
                <div className="flex items-start space-x-2.5 text-xs">
                  <div className={`p-1 rounded-full shrink-0 ${timelineState.rescueInProgress ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Rescue In Progress</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">Resident check-in roll-call and countdown tracking.</p>
                  </div>
                </div>

                {/* Reset button to resolve simulation */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleResolveIncident}
                    className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs py-2 rounded-xl transition-all border border-slate-200 flex items-center justify-center space-x-1"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reset Incident Simulation</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FEATURE 6: AUTOMATIC EMERGENY AGENCIES NOTIFIED */}
          <AnimatePresence>
            {aiResult && aiResult.isRealFire && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4"
                id="automatic-dispatch-notifications-checklist"
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Automatic Dispatch Connections</span>
                
                <div className="space-y-3 text-xs">
                  {/* Agency 1: Building Security */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800">Building Security</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">NOTIFIED</span>
                  </div>

                  {/* Agency 2: Building Manager */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-800">Building Manager</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">NOTIFIED</span>
                  </div>

                  {/* Agency 3: Fire Department */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Flame className="w-4 h-4 text-rose-500" />
                      <span className="font-bold text-slate-800">Fire Department (Sim)</span>
                    </div>
                    <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">DISPATCHED</span>
                  </div>

                  {/* Agency 4: Ambulance */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4 text-rose-500" />
                      <span className="font-bold text-slate-800">Ambulance (Sim)</span>
                    </div>
                    <span className="bg-rose-100 text-rose-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">ROUTE ASSIGNED</span>
                  </div>

                  {/* Agency 5: Police */}
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center space-x-2">
                      <ShieldAlert className="w-4 h-4 text-indigo-500" />
                      <span className="font-bold text-slate-800">Police Department (Sim)</span>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">DISPATCHED</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI Verification Credentials Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-2 bg-slate-50 text-slate-700 rounded-xl shrink-0">
                <Building2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Verification Pipeline</span>
                <span className="text-xs font-black text-slate-800">CCTV Safety Credentials</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 leading-relaxed space-y-2">
              <p className="bg-emerald-50/50 text-emerald-800 p-2 rounded-xl border border-emerald-100/60 flex items-center space-x-1.5 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                <span>AI-Assisted Verification System Active</span>
              </p>
              <p>
                To avoid costly department false-alarms, Gemini AI performs advanced verification to safely dismiss controlled smoke or flames:
              </p>
              
              <div className="space-y-1.5 font-mono text-[10px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="flex items-center space-x-1">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>Cooking / Kitchen Flames / Stoves</span>
                </p>
                <p className="flex items-center space-x-1">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>Candles & Birthday Celebrations</span>
                </p>
                <p className="flex items-center space-x-1">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>Temple Lamps & Incense Sticks</span>
                </p>
                <p className="flex items-center space-x-1">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>Fireplaces & Furnace Exhaust</span>
                </p>
                <p className="flex items-center space-x-1">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>Technician Maintenance Welding Sparks</span>
                </p>
                <p className="flex items-center space-x-1">
                  <span className="text-rose-500 font-bold">✗</span>
                  <span>Temporary Steam or Fog</span>
                </p>
                <p className="flex items-center space-x-1 text-emerald-600 font-extrabold">
                  <span className="font-bold">✓</span>
                  <span>Uncontrolled Real Fires (&gt;95% Confidence)</span>
                </p>
              </div>
            </div>
          </div>

          {/* Detailed AI Verification Audit Ledger */}
          <AnimatePresence>
            {aiResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-slate-100 rounded-3xl p-5 shadow-md space-y-4"
                id="ai-audit-report-card"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-rose-500" />
                    <span className="text-xs font-black text-slate-850">CCTV AI Audit Ledger</span>
                  </div>
                  
                  {/* Confidence Rating Badge */}
                  <div className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center space-x-1 ${
                    aiResult.isRealFire ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    <span>Confidence: {aiResult.confidenceScore}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Verdict Status</span>
                    <span className={`text-xs font-black uppercase ${
                      aiResult.isRealFire ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {aiResult.isRealFire ? '🚨 Verified Real Critical Fire' : '✓ Safe - False Alarm Dismissed'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase block">Audit Verification Reason</span>
                    <p className="text-xs text-slate-600 leading-relaxed mt-0.5 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium">
                      {aiResult.reasoning || 'Reasoning text unavailable'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-100">
                    <div>
                      <span>Timestamp:</span>
                      <p className="font-bold text-slate-700 mt-0.5">{new Date().toLocaleTimeString()}</p>
                    </div>
                    <div>
                      <span>Location Point:</span>
                      <p className="font-bold text-slate-700 mt-0.5">{activePreset?.location || 'Central'}</p>
                    </div>
                  </div>

                  {/* Print / Save button for administrative records */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => window.print()}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-extrabold py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Log</span>
                    </button>
                    <button
                      onClick={() => alert('Incident audit report exported securely to localized dispatch archives.')}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-extrabold py-2 px-3 rounded-xl transition-all flex items-center justify-center space-x-1"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Logs Stream */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">SYSTEM LOGS STREAM</span>
            
            <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
              {alertNotifications.length > 0 ? (
                alertNotifications.map((notif) => (
                  <div key={notif.id} className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-[10px] leading-relaxed">
                    <div className="flex justify-between font-bold text-slate-800 mb-0.5">
                      <span>{notif.title}</span>
                      <span className="text-slate-400 font-normal">{notif.timestamp}</span>
                    </div>
                    <p className="text-slate-500">{notif.message}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-[10px] text-slate-400">
                  No active safety incidents triggered.
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
