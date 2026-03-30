'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/components/FirebaseProvider';
import { Navbar } from '@/components/Navbar';
import { Dashboard } from '@/components/Dashboard';
import { Timetable } from '@/components/Timetable';
import { Attendance } from '@/components/Attendance';
import { Announcements } from '@/components/Announcements';
import { Courses } from '@/components/Courses';
import { RecordAttendance } from '@/components/RecordAttendance';
import { Users } from '@/components/Users';
import { System } from '@/components/System';
import { LoginView } from '@/components/LoginView';
import { RoleSelection } from '@/components/RoleSelection';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

export type View = 'dashboard' | 'timetable' | 'attendance' | 'announcements' | 'courses' | 'attendance-record' | 'users' | 'system';

interface PortalLayoutProps {
  initialView?: View;
}

export const PortalLayout: React.FC<PortalLayoutProps> = ({ initialView = 'dashboard' }) => {
  const { user, profile, loading, isAuthReady } = useFirebase();
  const [currentView, setCurrentView] = useState<View>(initialView);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as View;
      const validViews: View[] = ['dashboard', 'timetable', 'attendance', 'announcements', 'courses', 'attendance-record', 'users', 'system'];
      if (validViews.includes(hash)) {
        setCurrentView(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!isAuthReady || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-slate-900" size={48} />
          <p className="text-slate-500 font-medium animate-pulse">Initializing Portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginView />;
  }

  if (!profile) {
    return <RoleSelection />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'timetable': return <Timetable />;
      case 'attendance': return <Attendance />;
      case 'announcements': return <Announcements />;
      case 'courses': return <Courses />;
      case 'attendance-record': return <RecordAttendance />;
      case 'users': return <Users />;
      case 'system': return <System />;
      default: return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
        
        <div className="md:hidden sticky bottom-0 bg-white border-t border-black/5 px-6 py-3 flex justify-between items-center z-50">
          <MobileNavLink active={currentView === 'dashboard'} onClick={() => window.location.hash = 'dashboard'} label="Home" />
          <MobileNavLink active={currentView === 'timetable'} onClick={() => window.location.hash = 'timetable'} label="Schedule" />
          <MobileNavLink active={currentView === 'attendance'} onClick={() => window.location.hash = 'attendance'} label="Logs" />
          <MobileNavLink active={currentView === 'announcements'} onClick={() => window.location.hash = 'announcements'} label="News" />
        </div>
      </div>
    </ErrorBoundary>
  );
};

const MobileNavLink: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${active ? 'text-slate-900' : 'text-slate-400'}`}
  >
    {label}
  </button>
);
