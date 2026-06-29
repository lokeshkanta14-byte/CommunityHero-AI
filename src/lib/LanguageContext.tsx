import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CountryConfig {
  name: string;
  code: string;
  emergencyNumber: string;
  policeNumber: string;
  ambulanceNumber: string;
  fireNumber: string;
  defaultLanguage: string;
  lat: number;
  lng: number;
  source: string;
  destination: string;
  city: string;
  shelterName?: string;
  fuelStation?: string;
  repairShop?: string;
}

export const COUNTRY_PRESETS: CountryConfig[] = [
  {
    name: "India",
    code: "IN",
    emergencyNumber: "112",
    policeNumber: "100",
    ambulanceNumber: "108",
    fireNumber: "101",
    defaultLanguage: "Hindi",
    lat: 17.3850,
    lng: 78.4867,
    source: "Nampally Railway Station, Hyderabad",
    destination: "Gachibowli Financial District, Hyderabad",
    city: "Hyderabad",
    shelterName: "Gachibowli Stadium Transit Camp",
    fuelStation: "Indian Oil Mega Fuel & EV Charging",
    repairShop: "Bosch Premium Car Service"
  },
  {
    name: "United States",
    code: "US",
    emergencyNumber: "911",
    policeNumber: "911",
    ambulanceNumber: "911",
    fireNumber: "911",
    defaultLanguage: "English",
    lat: 40.7128,
    lng: -74.0060,
    source: "Grand Central Terminal, New York",
    destination: "Times Square, New York",
    city: "New York",
    shelterName: "Manhattan Community Crisis Center",
    fuelStation: "Shell Super Fuel & EV Grid",
    repairShop: "Pep Boys Auto Repair"
  },
  {
    name: "United Kingdom",
    code: "GB",
    emergencyNumber: "999",
    policeNumber: "999",
    ambulanceNumber: "999",
    fireNumber: "999",
    defaultLanguage: "English",
    lat: 51.5074,
    lng: -0.1278,
    source: "Paddington Station, London",
    destination: "Trafalgar Square, London",
    city: "London",
    shelterName: "Westminster Emergency Haven",
    fuelStation: "BP Pulse Petrol & Charging",
    repairShop: "Kwik Fit London Centre"
  },
  {
    name: "Australia",
    code: "AU",
    emergencyNumber: "000",
    policeNumber: "000",
    ambulanceNumber: "000",
    fireNumber: "000",
    defaultLanguage: "English",
    lat: -33.8688,
    lng: 151.2093,
    source: "Central Station, Sydney",
    destination: "Sydney Opera House, Sydney",
    city: "Sydney",
    shelterName: "Sydney Red Cross Emergency Shelter",
    fuelStation: "Caltex Premium Charging Star",
    repairShop: "UltrTune Auto Service Sydney"
  },
  {
    name: "Japan",
    code: "JP",
    emergencyNumber: "119",
    policeNumber: "110",
    ambulanceNumber: "119",
    fireNumber: "119",
    defaultLanguage: "Japanese",
    lat: 35.6762,
    lng: 139.6503,
    source: "Tokyo Station, Tokyo",
    destination: "Shibuya Crossing, Tokyo",
    city: "Tokyo",
    shelterName: "Tokyo Metropolitan Disaster Refuge",
    fuelStation: "Eneos Smart Fuel Station",
    repairShop: "Autobacs Super Service Tokyo"
  },
  {
    name: "Canada",
    code: "CA",
    emergencyNumber: "911",
    policeNumber: "911",
    ambulanceNumber: "911",
    fireNumber: "911",
    defaultLanguage: "English",
    lat: 43.6532,
    lng: -79.3832,
    source: "Union Station, Toronto",
    destination: "CN Tower, Toronto",
    city: "Toronto",
    shelterName: "Toronto Central Shelter Services",
    fuelStation: "Petro-Canada Electric & Gas",
    repairShop: "Canadian Tire Auto Centre"
  },
  {
    name: "UAE",
    code: "AE",
    emergencyNumber: "999",
    policeNumber: "999",
    ambulanceNumber: "998",
    fireNumber: "997",
    defaultLanguage: "Arabic",
    lat: 25.2048,
    lng: 55.2708,
    source: "Dubai Mall, Dubai",
    destination: "Burj Khalifa, Dubai",
    city: "Dubai",
    shelterName: "Dubai Red Crescent Disaster Haven",
    fuelStation: "ADNOC Oasis & Fast Charging",
    repairShop: "Dynatrade Multi-Brand Workshop"
  },
  {
    name: "Germany",
    code: "DE",
    emergencyNumber: "112",
    policeNumber: "110",
    ambulanceNumber: "112",
    fireNumber: "112",
    defaultLanguage: "German",
    lat: 52.5200,
    lng: 13.4050,
    source: "Hauptbahnhof, Berlin",
    destination: "Brandenburg Gate, Berlin",
    city: "Berlin",
    shelterName: "Deutsches Rotes Kreuz Notunterkunft",
    fuelStation: "Aral Pulse Gas & Charger",
    repairShop: "A.T.U Auto-Teile-Unger Berlin"
  }
];

export const DEFAULT_DICTIONARY: Record<string, string> = {
  // Navigation
  "nav_dashboard": "Dashboard",
  "nav_report_issue": "Report Issue",
  "nav_safe_journey": "Safe Journey",
  "nav_admin_panel": "Admin Panel",
  "nav_settings": "Settings",
  "nav_guardian": "Building Guardian",

  // Dashboard / General
  "db_title": "Civic Care Dashboard",
  "db_subtitle": "Active issues and community requests in your region.",
  "db_recent_alerts": "Recent Alerts",
  "db_report_button": "Report a New Issue",
  "db_all_issues": "All Public Issues",
  "db_category_filter": "Filter by Category",
  "db_priority_filter": "Filter by Priority",
  "db_upvote": "Upvote",
  "db_comments": "Comments",
  "db_add_comment": "Add a comment...",
  "db_submit_comment": "Post",
  "db_status": "Status",
  "db_priority": "Priority",
  "db_location": "Location",
  "db_reporter": "Reporter",
  "db_created": "Created",
  "db_view_details": "View Details",

  // Report Issue
  "rep_title": "Submit a Civic Issue",
  "rep_subtitle": "Help us locate and resolve municipal issues in your neighborhood.",
  "rep_field_title": "Issue Title",
  "rep_field_desc": "Detailed Description",
  "rep_field_category": "Category",
  "rep_field_priority": "Estimated Priority",
  "rep_field_address": "Location Address",
  "rep_btn_gps": "Auto GPS Address",
  "rep_voice_desc": "Voice Complaint (Optional)",
  "rep_voice_start": "Start Recording Voice",
  "rep_voice_stop": "Stop Recording Voice",
  "rep_image_upload": "Upload Image Evidence (Optional)",
  "rep_image_drag": "Drag & drop an image here, or click to select",
  "rep_btn_ai": "Analyze with Gemini AI",
  "rep_btn_submit": "File Ticket",
  "rep_submitting": "Filing ticket...",

  // Safe Journey
  "sj_title": "Safe Journey Monitoring",
  "sj_subtitle": "Active crash detection, driver safety scoring, and emergency control tower.",
  "sj_start_trip": "Start Safe Journey Monitoring",
  "sj_stop_trip": "Stop Journey Monitoring",
  "sj_trip_active": "Safe Journey Active",
  "sj_trip_inactive": "Monitoring Inactive",
  "sj_speed": "Current Speed",
  "sj_safety_score": "Safety Score",
  "sj_sensor_telemetry": "Live Telemetry Sensors",
  "sj_gforce": "G-Force Impact",
  "sj_inactivity": "Inactivity Timer",
  "sj_emergency_contacts": "Emergency Contacts",
  "sj_trusted_contacts": "Trusted Contacts",
  "sj_contacts_desc": "These contacts will be notified automatically if an accident is detected.",
  "sj_sim_controls": "Emergency Event Simulators",
  "sj_sim_collision": "Simulate Major Collision",
  "sj_sim_stop": "Simulate Sudden Stop",
  "sj_sim_inactivity": "Simulate Long Inactivity",

  // Emergency Popup
  "ep_title": "Possible Accident Detected",
  "ep_subtitle": "Gemini AI believes you may have been involved in an accident.",
  "ep_countdown": "Secs remaining before dispatch",
  "ep_im_safe": "I'M SAFE",
  "ep_need_help": "NEED HELP",
  "ep_safe_clicked": "Emergency canceled. Monitoring resumed.",
  "ep_help_clicked": "Emergency activated! Dispatching help.",
  "ep_unconscious": "No user response detected. Critical Incident created.",

  // Control Tower / Admin
  "ct_title": "Emergency Dispatch Control Tower",
  "ct_subtitle": "Real-time command center for managing critical highway and street safety incidents.",
  "ct_live_stream": "Live Incident Stream",
  "ct_dispatch_sim": "Emergency Dispatch Simulation",
  "ct_ambulance": "Ambulance",
  "ct_police": "Police Patrol",
  "ct_hospital": "Nearby Hospital",
  "ct_dispatched": "Dispatched",
  "ct_route": "Route Active",
  "ct_eta": "ETA",
  "ct_resolved": "Resolved",

  // Settings Page
  "st_title": "System Settings",
  "st_subtitle": "Configure localization, voice feedback, accessibility options, and global safety configurations.",
  "st_country": "Country Region",
  "st_language": "System Language",
  "st_voice": "Voice Assistant Announcements",
  "st_voice_on": "Voice ON",
  "st_voice_off": "Voice OFF (Muted)",
  "st_theme": "Visual Theme",
  "st_theme_light": "Light Theme",
  "st_theme_dark": "Dark Slate Theme",
  "st_accessibility": "Accessibility Options",
  "st_font_size": "Text Font Size",
  "st_font_normal": "Normal Size",
  "st_font_large": "Large Size",
  "st_font_xl": "Extra Large Size",
  "st_high_contrast": "High Contrast Colors",
  "st_btn_save": "Save Preferences",
  "st_btn_reset": "Reset to Default",

  // Common Buttons & Labels
  "btn_submit": "Submit",
  "btn_cancel": "Cancel",
  "btn_save": "Save Changes",
  "btn_loading": "Please wait...",
  "lbl_active": "Active",
  "lbl_critical": "Critical",
  "lbl_high": "High",
  "lbl_medium": "Medium",
  "lbl_low": "Low"
};

interface LanguageContextType {
  country: string;
  setCountry: (country: string) => void;
  language: string;
  setLanguage: (lang: string, isManual?: boolean) => void;
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  fontSize: 'normal' | 'large' | 'xl';
  setFontSize: (size: 'normal' | 'large' | 'xl') => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  t: (key: string) => string;
  isTranslating: boolean;
  currentCountryConfig: CountryConfig;
  customCountries: CountryConfig[];
  addCustomCountry: (config: CountryConfig) => void;
  autoDetectActive: boolean;
  runAutoDetection: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Load preferences from local storage or set defaults
  const [country, setCountryState] = useState<string>(() => localStorage.getItem('pref_country') || 'United States');
  const [language, setLanguageState] = useState<string>(() => {
    const appMode = localStorage.getItem('app_mode') || 'citizen';
    const saved = localStorage.getItem('pref_language');
    const manuallySet = localStorage.getItem('pref_language_manually_set') === 'true';
    if (appMode === 'citizen') {
      if (!manuallySet && (!saved || saved === 'Hindi')) {
        return 'English';
      }
    }
    return saved || 'English';
  });
  const [voiceEnabled, setVoiceEnabledState] = useState<boolean>(() => localStorage.getItem('pref_voice') !== 'false');
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => (localStorage.getItem('pref_theme') as 'light' | 'dark') || 'light');
  const [fontSize, setFontSizeState] = useState<'normal' | 'large' | 'xl'>(() => (localStorage.getItem('pref_font_size') as 'normal' | 'large' | 'xl') || 'normal');
  const [highContrast, setHighContrastState] = useState<boolean>(() => localStorage.getItem('pref_high_contrast') === 'true');
  const [customCountries, setCustomCountries] = useState<CountryConfig[]>(() => {
    try {
      const saved = localStorage.getItem('custom_countries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [translations, setTranslations] = useState<Record<string, string>>(DEFAULT_DICTIONARY);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [autoDetectActive, setAutoDetectActive] = useState<boolean>(false);

  // Synchronize state setters with localStorage
  const setCountry = (val: string) => {
    localStorage.setItem('pref_country', val);
    setCountryState(val);
    
    // Automatically switch default language if user changes country
    const matched = [...COUNTRY_PRESETS, ...customCountries].find(c => c.name === val);
    if (matched) {
      setLanguage(matched.defaultLanguage);
    }
  };

  const setLanguage = (val: string, isManual = false) => {
    const appMode = localStorage.getItem('app_mode') || 'citizen';
    if (isManual) {
      localStorage.setItem('pref_language_manually_set', 'true');
    }
    if (appMode === 'citizen' && !isManual && val === 'Hindi') {
      val = 'English';
    }
    localStorage.setItem('pref_language', val);
    setLanguageState(val);
  };

  const setVoiceEnabled = (val: boolean) => {
    localStorage.setItem('pref_voice', String(val));
    setVoiceEnabledState(val);
  };

  const setTheme = (val: 'light' | 'dark') => {
    localStorage.setItem('pref_theme', val);
    setThemeState(val);
  };

  const setFontSize = (val: 'normal' | 'large' | 'xl') => {
    localStorage.setItem('pref_font_size', val);
    setFontSizeState(val);
  };

  const setHighContrast = (val: boolean) => {
    localStorage.setItem('pref_high_contrast', String(val));
    setHighContrastState(val);
  };

  const addCustomCountry = (config: CountryConfig) => {
    const updated = [...customCountries.filter(c => c.name !== config.name), config];
    setCustomCountries(updated);
    localStorage.setItem('custom_countries', JSON.stringify(updated));
  };

  // Find country config
  const currentCountryConfig = [...COUNTRY_PRESETS, ...customCountries].find(c => c.name === country) || COUNTRY_PRESETS[1]; // default US

  // Auto-detect country, region, and language
  const runAutoDetection = async () => {
    setAutoDetectActive(true);
    try {
      // 1. Detect language from browser
      const browserLang = navigator.language || 'en-US';
      let autoLang = 'English';
      if (browserLang.startsWith('te')) autoLang = 'Telugu';
      else if (browserLang.startsWith('hi')) autoLang = 'Hindi';
      else if (browserLang.startsWith('es')) autoLang = 'Spanish';
      else if (browserLang.startsWith('fr')) autoLang = 'French';
      else if (browserLang.startsWith('ja')) autoLang = 'Japanese';
      else if (browserLang.startsWith('ar')) autoLang = 'Arabic';
      else if (browserLang.startsWith('de')) autoLang = 'German';

      // 2. Resolve Country using IP and timezone fallback
      let autoCountry = 'United States';
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("Kolkata")) autoCountry = "India";
      else if (tz.includes("London")) autoCountry = "United Kingdom";
      else if (tz.includes("Sydney") || tz.includes("Melbourne")) autoCountry = "Australia";
      else if (tz.includes("Tokyo")) autoCountry = "Japan";
      else if (tz.includes("Dubai")) autoCountry = "UAE";
      else if (tz.includes("Toronto") || tz.includes("Vancouver")) autoCountry = "Canada";
      else if (tz.includes("Berlin") || tz.includes("Europe")) autoCountry = "Germany";

      // 3. Optional network fetch for precise country with short timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1800);

      try {
        const ipResponse = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        clearTimeout(timeoutId);
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.country_name) {
            autoCountry = ipData.country_name;
            const matched = COUNTRY_PRESETS.find(c => c.name === ipData.country_name || c.code === ipData.country_code);
            if (matched) {
              autoCountry = matched.name;
              autoLang = matched.defaultLanguage;
            }
          }
        }
      } catch (e) {
        console.warn("IP Geolocation call timed out or failed. Utilizing high-fidelity local timezone fallback.", e);
      }

      setCountry(autoCountry);
      setLanguage(autoLang);
      
    } catch (err) {
      console.error("Auto detection failed:", err);
    } finally {
      setAutoDetectActive(false);
    }
  };

  // Perform automatic detection on first time boot
  useEffect(() => {
    const isFirstBoot = !localStorage.getItem('pref_country');
    if (isFirstBoot) {
      runAutoDetection();
    }
  }, []);

  // Fetch translations when language changes using single call to backend
  useEffect(() => {
    if (language === 'English') {
      setTranslations(DEFAULT_DICTIONARY);
      return;
    }

    const cachedKey = `trans_cache_${language.toLowerCase()}`;
    const cached = localStorage.getItem(cachedKey);
    if (cached) {
      try {
        setTranslations(JSON.parse(cached));
        return;
      } catch (e) {
        console.warn("Stale cache found, refreshing from server", e);
      }
    }

    // Trigger translate API
    const fetchTranslations = async () => {
      setIsTranslating(true);
      try {
        const res = await fetch('/api/translate-dictionary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dictionary: DEFAULT_DICTIONARY,
            targetLanguage: language
          })
        });

        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data) {
            setTranslations(body.data);
            localStorage.setItem(cachedKey, JSON.stringify(body.data));
          }
        }
      } catch (error) {
        console.error("Gemini Translation API call failed. Falling back to default language assets.", error);
      } finally {
        setIsTranslating(false);
      }
    };

    fetchTranslations();
  }, [language]);

  // Translate function
  const t = (key: string): string => {
    return translations[key] || DEFAULT_DICTIONARY[key] || key;
  };

  // Global visual changes based on theme, font size, high contrast
  useEffect(() => {
    const root = document.getElementById('app-root');
    if (!root) return;

    // Apply dark class
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.backgroundColor = '#0f172a'; // slate-900
    } else {
      root.classList.remove('dark');
      root.style.backgroundColor = '';
    }

    // Apply high contrast
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Apply font size class
    root.classList.remove('text-size-normal', 'text-size-large', 'text-size-xl');
    if (fontSize === 'large') {
      root.classList.add('text-size-large');
    } else if (fontSize === 'xl') {
      root.classList.add('text-size-xl');
    } else {
      root.classList.add('text-size-normal');
    }

  }, [theme, fontSize, highContrast]);

  return (
    <LanguageContext.Provider value={{
      country,
      setCountry,
      language,
      setLanguage,
      voiceEnabled,
      setVoiceEnabled,
      theme,
      setTheme,
      fontSize,
      setFontSize,
      highContrast,
      setHighContrast,
      t,
      isTranslating,
      currentCountryConfig,
      customCountries,
      addCustomCountry,
      autoDetectActive,
      runAutoDetection
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
