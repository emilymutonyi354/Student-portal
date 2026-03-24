'use client';

import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/firebase';
import { motion } from 'motion/react';
import { GraduationCap, ShieldCheck, Zap, Globe, Loader2, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    setAuthError(null);
    
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameters to force account selection and potentially avoid some race conditions
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      
      // Handle the internal assertion error specifically if it bubbles up
      if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        setAuthError("A temporary authentication error occurred. Please refresh the page and try again.");
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("The login popup was blocked by your browser. Please allow popups for this site.");
      } else if (error.code === 'auth/cancelled-popup-request') {
        setAuthError("Login request was cancelled. Please try again.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("Login window was closed before completion.");
      } else {
        setAuthError(`Login failed: ${error.message || error.code || 'Unknown error'}`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      {/* Left Side: Branding & Info */}
      <div className="flex-1 bg-slate-900 text-white p-8 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-900 font-bold text-xl">
              C
            </div>
            <span className="text-2xl font-bold tracking-tight">CampusConnect</span>
          </div>

          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl lg:text-7xl font-bold leading-[0.9] tracking-tight mb-8"
          >
            THE DIGITAL <br />
            <span className="text-slate-400 italic font-serif">NERVOUS SYSTEM</span> <br />
            OF YOUR CAMPUS.
          </motion.h1>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-12">
            <Feature icon={<ShieldCheck className="text-emerald-400" />} title="Secure Access" desc="Verified university-only authentication." />
            <Feature icon={<Zap className="text-orange-400" />} title="Real-time Sync" desc="Instant updates for timetables and news." />
            <Feature icon={<Globe className="text-blue-400" />} title="Centralized Hub" desc="One platform for all academic needs." />
            <Feature icon={<GraduationCap className="text-indigo-400" />} title="Academic Focus" desc="Tailored for students and faculty." />
          </div>
        </div>

        <div className="relative z-10 mt-16 pt-8 border-t border-white/10 text-slate-500 text-xs flex justify-between items-center">
          <span>© 2026 CampusConnect Platform</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -ml-48 -mb-48" />
      </div>

      {/* Right Side: Login Action */}
      <div className="flex-1 bg-[#f5f5f5] flex items-center justify-center p-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-10 rounded-[32px] shadow-sm border border-black/5 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <GraduationCap size={32} className="text-slate-900" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to CampusConnect</h2>
          <p className="text-slate-500 mb-8">Sign in with your university Google account to access your portal.</p>
          
          {authError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-left"
            >
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">{authError}</p>
            </motion.div>
          )}

          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoggingIn ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            {isLoggingIn ? 'Signing in...' : 'Continue with Google'}
          </button>

          <p className="mt-8 text-xs text-slate-400 leading-relaxed">
            By signing in, you agree to our university&apos;s digital code of conduct and academic integrity policies.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

const Feature: React.FC<{ icon: React.ReactNode; title: string; desc: string }> = ({ icon, title, desc }) => (
  <div className="flex gap-4">
    <div className="shrink-0 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
    </div>
  </div>
);
