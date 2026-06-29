import React, { useState } from 'react';
import { useLanguage, COUNTRY_PRESETS, CountryConfig } from '../lib/LanguageContext';
import { 
  Globe, 
  Languages, 
  Volume2, 
  VolumeX, 
  Sun, 
  Moon, 
  Type, 
  Sparkles, 
  Navigation, 
  Plus, 
  Trash2, 
  Check,
  Eye,
  Settings as SettingsIcon,
  RefreshCw,
  Compass
} from 'lucide-react';

export default function Settings() {
  const {
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
  } = useLanguage();

  // Local state for custom country form
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customEmergency, setCustomEmergency] = useState('');
  const [customPolice, setCustomPolice] = useState('');
  const [customAmbulance, setCustomAmbulance] = useState('');
  const [customFire, setCustomFire] = useState('');
  const [customDefaultLang, setCustomDefaultLang] = useState('English');
  const [customLat, setCustomLat] = useState('0.0');
  const [customLng, setCustomLng] = useState('0.0');
  const [customCity, setCustomCity] = useState('');
  const [customSource, setCustomSource] = useState('');
  const [customDestination, setCustomDestination] = useState('');

  // Custom language input
  const [isCustomLangInputActive, setIsCustomLangInputActive] = useState(false);
  const [customLangText, setCustomLangText] = useState('');

  // Notification feedback
  const [savedNotify, setSavedNotify] = useState<string | null>(null);

  // Core predefined language options
  const STANDARD_LANGUAGES = [
    'English', 'Telugu', 'Hindi', 'Spanish', 'French', 'German', 
    'Japanese', 'Arabic', 'Portuguese', 'Russian', 'Chinese', 
    'Italian', 'Korean', 'Dutch', 'Turkish', 'Vietnamese'
  ];

  const handleSaveNotify = (msg: string) => {
    setSavedNotify(msg);
    setTimeout(() => setSavedNotify(null), 3000);
  };

  const handleAddCountrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !customCode || !customEmergency) {
      alert("Please fill out Country Name, ISO Code and general Emergency Number.");
      return;
    }

    const newCountry: CountryConfig = {
      name: customName,
      code: customCode.toUpperCase(),
      emergencyNumber: customEmergency,
      policeNumber: customPolice || customEmergency,
      ambulanceNumber: customAmbulance || customEmergency,
      fireNumber: customFire || customEmergency,
      defaultLanguage: customDefaultLang,
      lat: parseFloat(customLat) || 0.0,
      lng: parseFloat(customLng) || 0.0,
      city: customCity || customName,
      source: customSource || `Main Station, ${customCity || customName}`,
      destination: customDestination || `City Square, ${customCity || customName}`,
      shelterName: `${customName} Emergency Transit Hub`,
      fuelStation: `${customName} Grid Station`,
      repairShop: `${customName} Recovery Workshop`
    };

    addCustomCountry(newCountry);
    setCountry(newCountry.name);
    
    // Reset form
    setCustomName('');
    setCustomCode('');
    setCustomEmergency('');
    setCustomPolice('');
    setCustomAmbulance('');
    setCustomFire('');
    setCustomCity('');
    setCustomSource('');
    setCustomDestination('');
    setShowAddCustom(false);

    handleSaveNotify(`Custom country "${newCountry.name}" registered and activated successfully!`);
  };

  const handleCustomLangSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customLangText.trim()) {
      setLanguage(customLangText.trim(), true);
      setIsCustomLangInputActive(false);
      handleSaveNotify(`System language set to custom: "${customLangText.trim()}"!`);
    }
  };

  const allCountries = [...COUNTRY_PRESETS, ...customCountries];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8" id="settings-view-stage">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-emerald-600 mb-1">
            <SettingsIcon className="w-5 h-5 animate-spin" />
            <span className="text-xs uppercase font-extrabold tracking-widest">{t('st_title')}</span>
          </div>
          <h1 className="font-sans font-black text-3xl text-slate-800 tracking-tight">
            {t('st_title')}
          </h1>
          <p className="text-slate-500 text-xs mt-1 max-w-2xl">
            {t('st_subtitle')}
          </p>
        </div>

        {/* Global Translation Loading Badge */}
        {isTranslating && (
          <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 animate-pulse text-xs font-semibold shadow-sm">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>AI Translation Active (Gemini API)...</span>
          </div>
        )}
      </div>

      {/* Success Notification Alert */}
      {savedNotify && (
        <div className="mb-6 bg-emerald-550 bg-emerald-600 text-white p-4 rounded-2xl text-xs font-bold shadow-md shadow-emerald-200 flex items-center justify-between animate-fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{savedNotify}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Side Quick Controls */}
        <div className="md:col-span-1 space-y-6">
          {/* Quick Stats Card */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Active Localization</span>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Country</span>
                  <span className="text-xs font-bold text-slate-700">{country} ({currentCountryConfig.code})</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">System Language</span>
                  <span className="text-xs font-bold text-slate-700">{language}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-mono">Emergency Number</span>
                  <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{currentCountryConfig.emergencyNumber}</span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                id="btn-trigger-autodetect"
                onClick={runAutoDetection}
                disabled={autoDetectActive}
                className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoDetectActive ? 'animate-spin' : ''}`} />
                <span>{autoDetectActive ? "Detecting..." : "Auto-Detect Location"}</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center leading-relaxed">
                Uses smart IP-lookups and browser attributes to identify your country instantly.
              </p>
            </div>
          </div>

          {/* Quick Preferences Toggle */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">General Switches</span>

            {/* Voice Assistant Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl border ${voiceEnabled ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Voice Co-Pilot</span>
                  <span className="text-[10px] text-slate-400 block">Read safety logs aloud</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => {
                    setVoiceEnabled(e.target.checked);
                    handleSaveNotify(`Voice system ${e.target.checked ? 'enabled' : 'disabled (muted)'}.`);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-xl border ${theme === 'dark' ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">{t('st_theme')}</span>
                  <span className="text-[10px] text-slate-400 block">{theme === 'dark' ? t('st_theme_dark') : t('st_theme_light')}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  const nextTheme = theme === 'light' ? 'dark' : 'light';
                  setTheme(nextTheme);
                  handleSaveNotify(`Theme changed to ${nextTheme === 'dark' ? 'Dark Slate' : 'Light'}.`);
                }}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-all text-[11px] font-bold"
              >
                Switch
              </button>
            </div>
          </div>
        </div>

        {/* Right Side Settings Configuration Forms */}
        <div className="md:col-span-2 space-y-6">
          {/* Main Selectors */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h2 className="font-sans font-bold text-lg text-slate-800 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-emerald-600" />
              <span>Localization Configuration</span>
            </h2>

            {/* Country Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">{t('st_country')}</label>
              <div className="flex gap-3">
                <select
                  id="select-settings-country"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    handleSaveNotify(`Country updated to ${e.target.value}. Default settings restored.`);
                  }}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-emerald-500 text-slate-700 font-semibold"
                >
                  {allCountries.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddCustom(!showAddCustom)}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Custom Country</span>
                </button>
              </div>
            </div>

            {/* Custom Country Form Drawer */}
            {showAddCustom && (
              <form onSubmit={handleAddCountrySubmit} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4 animate-fade-in" id="form-custom-country">
                <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                  <span className="text-xs font-extrabold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    Configure New Country
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddCustom(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Country Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. France"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">ISO Country Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={3}
                      placeholder="e.g. FR"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">General Emergency *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 112"
                      value={customEmergency}
                      onChange={(e) => setCustomEmergency(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1 text-center font-bold"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Police Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 17"
                      value={customPolice}
                      onChange={(e) => setCustomPolice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1 text-center"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Ambulance Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 15"
                      value={customAmbulance}
                      onChange={(e) => setCustomAmbulance(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1 text-center"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-slate-400 block uppercase">Fire Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 18"
                      value={customFire}
                      onChange={(e) => setCustomFire(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1 text-center"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200/60 my-2 pt-3">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Telemetry Safe Journey Mapping</span>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Capital City</label>
                      <input
                        type="text"
                        placeholder="e.g. Paris"
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Latitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 48.8566"
                        value={customLat}
                        onChange={(e) => setCustomLat(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Longitude</label>
                      <input
                        type="text"
                        placeholder="e.g. 2.3522"
                        value={customLng}
                        onChange={(e) => setCustomLng(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Trip Start Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Gare du Nord, Paris"
                        value={customSource}
                        onChange={(e) => setCustomSource(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Trip End Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Eiffel Tower, Paris"
                        value={customDestination}
                        onChange={(e) => setCustomDestination(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 mt-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    value={customDefaultLang}
                    onChange={(e) => setCustomDefaultLang(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600"
                  >
                    {STANDARD_LANGUAGES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm transition-all"
                  >
                    Save & Activate Country
                  </button>
                </div>
              </form>
            )}

            {/* Language Selector */}
            <div className="space-y-2 border-t border-slate-100 pt-5">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">{t('st_language')}</label>
              
              <div className="flex flex-wrap gap-2">
                {STANDARD_LANGUAGES.slice(0, 10).map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      setLanguage(l, true);
                      handleSaveNotify(`System language set to "${l}". Generating translations...`);
                    }}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all ${
                      language === l
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200/45'
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                    }`}
                  >
                    {l}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setIsCustomLangInputActive(!isCustomLangInputActive)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all ${
                    isCustomLangInputActive || !STANDARD_LANGUAGES.slice(0, 10).includes(language)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  + Other Language (Universal AI)
                </button>
              </div>

              {/* Other Language Input */}
              {isCustomLangInputActive && (
                <form onSubmit={handleCustomLangSubmit} className="flex gap-2 mt-3 animate-fade-in" id="form-custom-language">
                  <input
                    type="text"
                    required
                    placeholder="Type literally any language name, e.g. Spanish, Telugu, Swedish..."
                    value={customLangText}
                    onChange={(e) => setCustomLangText(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-slate-800 transition-all"
                  >
                    Apply Language
                  </button>
                </form>
              )}

              <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                Any selected language is translated on-the-fly using the server-side Gemini AI engine.
              </p>
            </div>
          </div>

          {/* Accessibility Settings */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h2 className="font-sans font-bold text-lg text-slate-800 flex items-center space-x-2">
              <Eye className="w-5 h-5 text-emerald-600" />
              <span>{t('st_accessibility')}</span>
            </h2>

            {/* Font Size Configuration */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block uppercase tracking-wide">{t('st_font_size')}</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setFontSize('normal');
                    handleSaveNotify("Font size updated to normal.");
                  }}
                  className={`py-3 px-4 border rounded-2xl text-xs font-bold transition-all text-center ${
                    fontSize === 'normal'
                      ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {t('st_font_normal')} (100%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontSize('large');
                    handleSaveNotify("Font size updated to large.");
                  }}
                  className={`py-3 px-4 border rounded-2xl text-sm font-bold transition-all text-center ${
                    fontSize === 'large'
                      ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {t('st_font_large')} (125%)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFontSize('xl');
                    handleSaveNotify("Font size updated to extra large.");
                  }}
                  className={`py-3 px-4 border rounded-2xl text-base font-bold transition-all text-center ${
                    fontSize === 'xl'
                      ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  {t('st_font_xl')} (150%)
                </button>
              </div>
            </div>

            {/* High Contrast */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-5">
              <div>
                <span className="text-xs font-bold text-slate-700 block">{t('st_high_contrast')}</span>
                <span className="text-[10px] text-slate-400 block">Increases structural borders and contrast ratios for visual impairments</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={highContrast}
                  onChange={(e) => {
                    setHighContrast(e.target.checked);
                    handleSaveNotify(`High Contrast Mode ${e.target.checked ? 'enabled' : 'disabled'}.`);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
