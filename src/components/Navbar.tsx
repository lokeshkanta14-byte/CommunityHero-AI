import { useState, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { LogIn, LogOut, User as UserIcon, Shield, Activity, PlusCircle, LayoutDashboard, Navigation, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';
import { AppUser } from '../types';
import { useLanguage } from '../lib/LanguageContext';

interface NavbarProps {
  user: AppUser | null;
  onUserChange: (user: AppUser | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  appMode: 'citizen' | 'admin';
  onToggleMode: () => void;
}

export default function Navbar({ user, onUserChange, activeTab, setActiveTab, appMode, onToggleMode }: NavbarProps) {
  const [loading, setLoading] = useState(true);
  const [showDemoLogin, setShowDemoLogin] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const isAdminMode = appMode === 'admin';
        const appUser: AppUser = {
          uid: isAdminMode ? 'mock_admin_123' : firebaseUser.uid,
          email: isAdminMode ? 'admin@communityhero.org' : (firebaseUser.email || 'jane.citizen@gmail.com'),
          displayName: isAdminMode 
            ? 'City Superintendent (Admin)' 
            : 'Jane Doe (Citizen)',
          photoURL: isAdminMode 
            ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' 
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          isAdmin: isAdminMode,
          role: isAdminMode ? 'admin' : 'citizen'
        };
        onUserChange(appUser);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [appMode]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      const isAdminMode = appMode === 'admin';
      const appUser: AppUser = {
        uid: isAdminMode ? 'mock_admin_123' : firebaseUser.uid,
        email: isAdminMode ? 'admin@communityhero.org' : (firebaseUser.email || 'jane.citizen@gmail.com'),
        displayName: isAdminMode 
          ? 'City Superintendent (Admin)' 
          : 'Jane Doe (Citizen)',
        photoURL: isAdminMode 
          ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150' 
          : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
        isAdmin: isAdminMode,
        role: isAdminMode ? 'admin' : 'citizen'
      };
      localStorage.removeItem('mock_user');
      onUserChange(appUser);
    } catch (error: any) {
      console.warn("Popup blocked or sign-in error, displaying demo backup options.", error);
      setShowDemoLogin(true);
    }
  };

  const handleDemoSignIn = (role: 'citizen' | 'admin') => {
    const mockUser: AppUser = role === 'admin' 
      ? {
          uid: 'mock_admin_123',
          email: 'admin@communityhero.org',
          displayName: 'City Superintendent (Admin)',
          photoURL: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
          isAdmin: true,
          role: 'admin'
        }
      : {
          uid: 'mock_citizen_456',
          email: 'jane.citizen@gmail.com',
          displayName: 'Jane Doe (Citizen)',
          photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          isAdmin: false,
          role: 'citizen'
        };
    
    localStorage.setItem('mock_user', JSON.stringify(mockUser));
    onUserChange(mockUser);
    setShowDemoLogin(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('mock_user');
    onUserChange(null);
  };

  return (
    <nav className="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm" id="main-navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Brand */}
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-md shadow-emerald-200">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <span className="font-sans font-bold text-lg tracking-tight text-slate-800">CommunityHero</span>
              <span className="text-emerald-600 font-sans font-black ml-1 text-lg">AI</span>
            </div>
          </div>

          {/* Tab Navigation Controls (Visible if logged in) */}
          {user && (
            <div className="hidden md:flex space-x-1 items-center">
              {appMode === 'citizen' ? (
                <>
                  <button
                    id="btn-nav-dashboard"
                    onClick={() => setActiveTab('dashboard')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'dashboard'
                        ? 'bg-slate-50 text-slate-900 border-b-2 border-emerald-600 rounded-b-none'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>{t('nav_dashboard')}</span>
                  </button>

                  <button
                    id="btn-nav-report"
                    onClick={() => setActiveTab('report')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'report'
                        ? 'bg-slate-50 text-slate-900 border-b-2 border-emerald-600 rounded-b-none'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{t('nav_report_issue')}</span>
                  </button>

                  <button
                    id="btn-nav-journey"
                    onClick={() => setActiveTab('journey')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'journey'
                        ? 'bg-slate-50 text-rose-600 border-b-2 border-rose-500 rounded-b-none'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <Navigation className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span className="flex items-center gap-1">
                      <span>{t('nav_safe_journey')}</span>
                      <span className="bg-rose-100 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase scale-90 tracking-wide">AI</span>
                    </span>
                  </button>

                  <button
                    id="btn-nav-guardian"
                    onClick={() => setActiveTab('guardian')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'guardian'
                        ? 'bg-slate-50 text-rose-600 border-b-2 border-rose-500 rounded-b-none'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                    <span className="flex items-center gap-1">
                      <span>{t('nav_guardian')}</span>
                      <span className="bg-rose-100 text-rose-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase scale-90 tracking-wide">NEW</span>
                    </span>
                  </button>
                </>
              ) : (
                <button
                  id="btn-nav-admin"
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === 'admin'
                      ? 'bg-emerald-50 text-emerald-800 border-b-2 border-emerald-600 rounded-b-none'
                      : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/50'
                  }`}
                >
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>{t('nav_admin_panel')}</span>
                </button>
              )}

              <button
                id="btn-nav-settings"
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'settings'
                    ? 'bg-slate-50 text-slate-900 border-b-2 border-emerald-600 rounded-b-none'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <SettingsIcon className="w-4 h-4 text-emerald-600" />
                <span>{t('nav_settings')}</span>
              </button>
            </div>
          )}

          {/* Right Action Section */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Demo Admin Toggle Tooltip */}
                <button
                  id="btn-toggle-role"
                  onClick={onToggleMode}
                  className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    appMode === 'admin'
                      ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Click to toggle between Admin and Citizen privilege for demo testing"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>{appMode === 'admin' ? 'Admin Mode' : 'Citizen Mode'}</span>
                </button>

                <div className="flex items-center space-x-2">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full border border-slate-200"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                      {user.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden lg:inline text-sm font-medium text-slate-700 max-w-[120px] truncate">
                    {user.displayName}
                  </span>
                </div>

                <button
                  id="btn-signout"
                  onClick={handleSignOut}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  id="btn-demo-menu"
                  onClick={() => setShowDemoLogin(!showDemoLogin)}
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-emerald-600 border border-emerald-200 hover:bg-emerald-50 transition-colors"
                >
                  Demo Logins
                </button>
                <button
                  id="btn-signin-google"
                  onClick={handleGoogleSignIn}
                  className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Demo Sign In Overlay Drawer */}
      {showDemoLogin && !user && (
        <div className="bg-emerald-50/90 border-b border-emerald-100 px-4 py-3 text-center transition-all animate-fade-in flex flex-col sm:flex-row justify-center items-center gap-3">
          <span className="text-xs font-medium text-emerald-800">
            🔒 Sandbox Environment detected. If standard Google Sign In popups are restricted in this window, bypass using:
          </span>
          <div className="flex gap-2">
            <button
              id="btn-demo-citizen"
              onClick={() => handleDemoSignIn('citizen')}
              className="bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md text-xs font-semibold shadow-sm transition-all"
            >
              Log In as Citizen Demo
            </button>
            <button
              id="btn-demo-admin"
              onClick={() => handleDemoSignIn('admin')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-md text-xs font-semibold shadow-sm transition-all"
            >
              Log In as Admin Demo
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
