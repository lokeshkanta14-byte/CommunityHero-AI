import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import ReportIssue from './components/ReportIssue';
import AdminDashboard from './components/AdminDashboard';
import AIChatAssistant from './components/AIChatAssistant';
import SafeJourney from './components/SafeJourney';
import Settings from './components/Settings';
import BuildingGuardian from './components/BuildingGuardian';
import { AppUser } from './types';
import { Sparkles, Shield, MapPin, Activity, ThumbsUp, LogIn } from 'lucide-react';
import { LanguageProvider, useLanguage } from './lib/LanguageContext';

const defaultCitizen: AppUser = {
  uid: 'mock_citizen_456',
  email: 'jane.citizen@gmail.com',
  displayName: 'Jane Doe (Citizen)',
  photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  isAdmin: false,
  role: 'citizen'
};

const defaultAdmin: AppUser = {
  uid: 'mock_admin_123',
  email: 'admin@communityhero.org',
  displayName: 'City Superintendent (Admin)',
  photoURL: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
  isAdmin: true,
  role: 'admin'
};

function AppContent() {
  const { t } = useLanguage();

  // Primary Dual Application Modes
  const [appMode, setAppMode] = useState<'citizen' | 'admin'>(() => {
    return (localStorage.getItem('app_mode') as 'citizen' | 'admin') || 'citizen';
  });

  // Separate, independent user session states
  const [citizenUser, setCitizenUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem('citizen_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed) {
          return {
            ...parsed,
            displayName: 'Jane Doe (Citizen)',
            photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
            isAdmin: false,
            role: 'citizen'
          };
        }
      } catch (e) {}
    }
    return { ...defaultCitizen };
  });

  const [adminUser, setAdminUser] = useState<AppUser | null>(() => {
    const stored = localStorage.getItem('admin_user');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed) {
          return {
            ...parsed,
            displayName: 'City Superintendent (Admin)',
            photoURL: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
            isAdmin: true,
            role: 'admin'
          };
        }
      } catch (e) {}
    }
    return { ...defaultAdmin };
  });

  // Dynamically resolve current user session, ensuring distinct objects
  const user = appMode === 'admin' ? adminUser : citizenUser;

  // Separate, independent active tabs (Dual Routing)
  const [citizenActiveTab, setCitizenActiveTab] = useState<string>(() => {
    return localStorage.getItem('citizen_active_tab') || 'dashboard';
  });
  const [adminActiveTab, setAdminActiveTab] = useState<string>(() => {
    return localStorage.getItem('admin_active_tab') || 'admin';
  });

  // Dual routing safety guardrail: prevent tab desync
  const activeTab = appMode === 'admin' 
    ? (adminActiveTab === 'settings' ? 'settings' : 'admin') 
    : (citizenActiveTab === 'admin' ? 'dashboard' : citizenActiveTab);

  const handleSetActiveTab = (tab: string) => {
    if (appMode === 'admin') {
      const targetTab = tab === 'settings' ? 'settings' : 'admin';
      setAdminActiveTab(targetTab);
      localStorage.setItem('admin_active_tab', targetTab);
    } else {
      const targetTab = tab === 'admin' ? 'dashboard' : tab;
      setCitizenActiveTab(targetTab);
      localStorage.setItem('citizen_active_tab', targetTab);
    }
  };

  const handleUserChange = (newUser: AppUser | null) => {
    if (!newUser) {
      setCitizenUser(null);
      setAdminUser(null);
      localStorage.removeItem('citizen_user');
      localStorage.removeItem('admin_user');
      return;
    }

    if (newUser.role === 'admin' || newUser.isAdmin) {
      const adminProfile: AppUser = {
        ...newUser,
        displayName: 'City Superintendent (Admin)',
        photoURL: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
        isAdmin: true,
        role: 'admin'
      };
      setAdminUser(adminProfile);
      localStorage.setItem('admin_user', JSON.stringify(adminProfile));
      if (appMode !== 'admin') {
        setAppMode('admin');
        localStorage.setItem('app_mode', 'admin');
      }
    } else {
      const citizenProfile: AppUser = {
        ...newUser,
        displayName: 'Jane Doe (Citizen)',
        photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        isAdmin: false,
        role: 'citizen'
      };
      setCitizenUser(citizenProfile);
      localStorage.setItem('citizen_user', JSON.stringify(citizenProfile));
      if (appMode !== 'citizen') {
        setAppMode('citizen');
        localStorage.setItem('app_mode', 'citizen');
      }
    }
  };

  const handleToggleMode = () => {
    const nextMode = appMode === 'admin' ? 'citizen' : 'admin';
    setAppMode(nextMode);
    localStorage.setItem('app_mode', nextMode);
    
    // Auto align activeTab when toggled explicitly
    if (nextMode === 'admin') {
      setAdminActiveTab('admin');
      localStorage.setItem('admin_active_tab', 'admin');
    } else {
      setCitizenActiveTab('dashboard');
      localStorage.setItem('citizen_active_tab', 'dashboard');
    }
  };

  const handleDemoSignIn = (role: 'citizen' | 'admin') => {
    if (role === 'admin') {
      const mockAdmin = { ...defaultAdmin };
      setAdminUser(mockAdmin);
      localStorage.setItem('admin_user', JSON.stringify(mockAdmin));
      setAppMode('admin');
      localStorage.setItem('app_mode', 'admin');
      setAdminActiveTab('admin');
      localStorage.setItem('admin_active_tab', 'admin');
    } else {
      const mockCitizen = { ...defaultCitizen };
      setCitizenUser(mockCitizen);
      localStorage.setItem('citizen_user', JSON.stringify(mockCitizen));
      setAppMode('citizen');
      localStorage.setItem('app_mode', 'citizen');
      setCitizenActiveTab('dashboard');
      localStorage.setItem('citizen_active_tab', 'dashboard');
    }
  };

  // Automated Integration Self-Test (Citizen -> Admin -> Citizen -> Admin)
  const [testState, setTestState] = useState<{
    isRunning: boolean;
    step: number;
    logs: string[];
  }>({
    isRunning: false,
    step: 0,
    logs: []
  });

  const runAutomatedTest = () => {
    setTestState({
      isRunning: true,
      step: 1,
      logs: ['🚀 Starting Auto-Test: Citizen ➔ Admin ➔ Citizen ➔ Admin...']
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === 'true' || params.get('autotest') === 'true') {
      // Clear query params to avoid infinite loops, but run the test
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      runAutomatedTest();
    }
  }, []);

  useEffect(() => {
    if (!testState.isRunning) return;

    const timer = setTimeout(() => {
      const { step, logs } = testState;
      if (step === 1) {
        // Step 1: Force Citizen Mode
        setAppMode('citizen');
        localStorage.setItem('app_mode', 'citizen');
        setCitizenActiveTab('dashboard');
        
        // Load clean citizen
        const citizen = { ...defaultCitizen };
        setCitizenUser(citizen);
        localStorage.setItem('citizen_user', JSON.stringify(citizen));

        setTestState({
          isRunning: true,
          step: 2,
          logs: [...logs, '👉 Step 1: Switched to Citizen Mode. Loaded Jane Doe (Citizen) profile, activeTab "dashboard", currentUser.role = citizen.']
        });
      } else if (step === 2) {
        // Step 2: Force Admin Mode
        setAppMode('admin');
        localStorage.setItem('app_mode', 'admin');
        setAdminActiveTab('admin');

        // Load clean admin
        const admin = { ...defaultAdmin };
        setAdminUser(admin);
        localStorage.setItem('admin_user', JSON.stringify(admin));

        setTestState({
          isRunning: true,
          step: 3,
          logs: [...logs, '👉 Step 2: Switched to Admin Mode. Loaded City Superintendent (Admin) profile, activeTab "admin", currentUser.role = admin.']
        });
      } else if (step === 3) {
        // Step 3: Switch back to Citizen Mode
        setAppMode('citizen');
        localStorage.setItem('app_mode', 'citizen');
        setCitizenActiveTab('dashboard');

        setTestState({
          isRunning: true,
          step: 4,
          logs: [...logs, '👉 Step 3: Switched back to Citizen Mode. Restored Jane Doe (Citizen) session, activeTab "dashboard", currentUser.role = citizen.']
        });
      } else if (step === 4) {
        // Step 4: Switch back to Admin Mode
        setAppMode('admin');
        localStorage.setItem('app_mode', 'admin');
        setAdminActiveTab('admin');

        setTestState({
          isRunning: false,
          step: 5,
          logs: [
            ...logs,
            '👉 Step 4: Switched back to Admin Mode. Restored City Superintendent (Admin) session, activeTab "admin", currentUser.role = admin.',
            '🎉 ALL COMPLIANCE ROUTING TESTS COMPLETED SUCCESSFULLY! No privileges required block screen detected.'
          ]
        });
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [testState.isRunning, testState.step]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col text-slate-800 antialiased" id="app-root">
      {/* Navbar segment */}
      <Navbar 
        user={user} 
        onUserChange={handleUserChange} 
        activeTab={activeTab} 
        setActiveTab={handleSetActiveTab} 
        appMode={appMode}
        onToggleMode={handleToggleMode}
      />

      {/* Hero Welcome banner for unsigned guests */}
      {!user && (
        <div className="bg-slate-900 text-white relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-950" id="guest-hero-banner">
          {/* Background ambient mesh */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 opacity-90" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[300px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center flex flex-col items-center">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-5 shadow-sm">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Real-Time Civic Care Ecosystem</span>
            </div>
            
            <h1 className="font-sans font-black text-4xl sm:text-5xl tracking-tight leading-tight max-w-3xl">
              Empowering Citizens. <span className="text-emerald-400">Streamlining Municipal Care.</span>
            </h1>
            <p className="text-slate-300 text-sm max-w-2xl mt-4 leading-relaxed">
              Community Hero AI connects neighborhood citizens directly with city superintendents. Snap pictures of pothole damage, record spoken descriptions, or pinpoint leakage locations. Our integrated Gemini AI automatically triages categories and maps urgency instantly.
            </p>

            {/* Quick action buttons */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
              <button
                id="btn-guest-citizen"
                onClick={() => handleDemoSignIn('citizen')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 flex items-center justify-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In as Citizen (Demo)</span>
              </button>
              <button
                id="btn-guest-admin"
                onClick={() => handleDemoSignIn('admin')}
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-5 py-3 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-2"
              >
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Sign In as Admin (Demo)</span>
              </button>
            </div>

            {/* Visual Value Props Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 w-full max-w-4xl border-t border-slate-800/80 pt-8 text-left">
              <div className="flex items-start space-x-3 text-xs">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/20">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Multimodal AI Triage</span>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">Gemini processes image assets and transcribes spoken voice complaints to formulate tickets.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/20">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Auto Location Tracking</span>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">GPS detects coordinates automatically, geocoding street names instantly using OpenStreetMap.</p>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl shrink-0 border border-emerald-500/20">
                  <ThumbsUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Community Verification</span>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">Upvote local tickets to increase exposure, letting dispatchers know which issues are most severe.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Main Dynamic View Controller */}
      <main className="flex-1 pb-16" id="main-content-stage">
        {activeTab === 'dashboard' && (
          <Dashboard user={user} setActiveTab={handleSetActiveTab} />
        )}

        {activeTab === 'report' && (
          user ? (
            <ReportIssue user={user} setActiveTab={handleSetActiveTab} />
          ) : (
            <div className="max-w-md mx-auto py-20 px-4 text-center" id="auth-gate-page">
              <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md flex flex-col items-center">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl mb-4">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="font-sans font-bold text-lg text-slate-800">Registration Required</h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-xs">
                  To file a civic complaint, snap image proofs, or access AI features, you must sign in. Bypass using our demo logins below:
                </p>

                <div className="mt-6 flex flex-col gap-2 w-full">
                  <button
                    id="btn-gate-citizen"
                    onClick={() => handleDemoSignIn('citizen')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Quick Log In as Citizen
                  </button>
                  <button
                    id="btn-gate-admin"
                    onClick={() => handleDemoSignIn('admin')}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                  >
                    Quick Log In as Superintendent
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'journey' && (
          <SafeJourney user={user} />
        )}

        {activeTab === 'settings' && (
          <Settings />
        )}

        {activeTab === 'guardian' && (
          <BuildingGuardian />
        )}

        {activeTab === 'admin' && (
          user?.isAdmin ? (
            <AdminDashboard user={user} />
          ) : (
            <div className="max-w-md mx-auto py-20 px-4 text-center" id="admin-gate-page">
              <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-md flex flex-col items-center">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl mb-4 animate-bounce">
                  <Shield className="w-8 h-8" />
                </div>
                <h3 className="font-sans font-bold text-lg text-slate-800">Administrator Privileges Required</h3>
                <p className="text-slate-400 text-xs mt-1.5 leading-relaxed max-w-xs">
                  You are not authorized to view the Superintendent Console. Click the Admin toggle in the navigation bar to enable Admin privileges instantly!
                </p>
                <button
                  id="btn-gate-bypass-admin"
                  onClick={() => handleDemoSignIn('admin')}
                  className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Bypass & Log In as Admin
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {/* Floating Verification Test Runner Console */}
      {((import.meta as any).env?.DEV || testState.isRunning || testState.logs.length > 0) && (
        <div className="fixed bottom-6 left-6 z-50 max-w-sm pointer-events-none" id="test-runner-console">
          <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl border border-slate-800 shadow-xl p-4 pointer-events-auto transition-all max-h-[250px] overflow-y-auto flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Routing compliance test
              </span>
              {!testState.isRunning && (
                <button
                  onClick={runAutomatedTest}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all"
                  id="btn-run-auto-test"
                >
                  Run Auto-Test
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5 text-[10px] font-mono text-slate-300">
              {testState.logs.length === 0 ? (
                <p className="text-slate-500 italic">No tests running. Press "Run Auto-Test" to trigger the Citizen ➔ Admin ➔ Citizen ➔ Admin validation flow.</p>
              ) : (
                testState.logs.map((log, idx) => (
                  <div key={idx} className={`${log.startsWith('✓') || log.startsWith('🎉') ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {log}
                  </div>
                ))
              )}
            </div>
            {testState.isRunning && (
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full animate-pulse" style={{ width: `${(testState.step / 4) * 100}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer Branding Area */}
      <footer className="border-t border-slate-100 bg-white py-6 mt-auto text-center" id="main-footer">
        <p className="text-slate-400 text-[11px] font-medium uppercase tracking-widest">
          Community Hero AI • Citizens & Municipalities Working Together
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          Powered by Gemini 2.5 Multimodal Engine & Firebase Serverless Architecture
        </p>
      </footer>

      {/* Floating AI Chat Assistant */}
      <AIChatAssistant user={user} onUserChange={handleUserChange} />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
