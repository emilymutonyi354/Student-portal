'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useFirebase } from './FirebaseProvider';
import { auth, db } from '@/firebase';
import { signOut, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { LogOut, User as UserIcon, Bell, Calendar, ClipboardCheck, LayoutDashboard, Loader2, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

export const Navbar: React.FC = () => {
  const { user, profile } = useFirebase();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error("Login failed:", error);
      alert(`Login failed: ${error.message || error.code || 'Unknown error'}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const switchRole = async (newRole: 'student' | 'faculty' | 'admin') => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        ...profile,
        role: newRole
      }, { merge: true });
      window.location.reload();
    } catch (error) {
      console.error("Error switching role:", error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform">
            C
          </div>
          <span className="font-semibold text-lg tracking-tight hidden sm:block">CampusConnect</span>
        </Link>

        {user && profile && (
          <div className="hidden md:flex items-center gap-1">
            <NavLink href="/" icon={<LayoutDashboard size={18} />} label="Dashboard" />
            
            {profile.role === 'student' && (
              <>
                <NavLink href="/courses" icon={<BookOpen size={18} />} label="Courses" />
                <NavLink href="/timetable" icon={<Calendar size={18} />} label="Timetable" />
                <NavLink href="/attendance" icon={<ClipboardCheck size={18} />} label="Attendance" />
              </>
            )}

            {profile.role === 'faculty' && (
              <>
                <NavLink href="/courses" icon={<Calendar size={18} />} label="My Courses" />
                <NavLink href="/attendance/record" icon={<ClipboardCheck size={18} />} label="Record Attendance" />
              </>
            )}

            {profile.role === 'admin' && (
              <>
                <NavLink href="/users" icon={<UserIcon size={18} />} label="Users" />
                <NavLink href="/system" icon={<ClipboardCheck size={18} />} label="System" />
              </>
            )}

            <NavLink href="/announcements" icon={<Bell size={18} />} label="Announcements" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            {/* Role Switcher for Testing */}
            <div className="hidden lg:flex items-center bg-slate-100 rounded-lg p-1 gap-1">
              <button 
                onClick={() => switchRole('student')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${profile?.role === 'student' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                STU
              </button>
              <button 
                onClick={() => switchRole('faculty')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${profile?.role === 'faculty' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                FAC
              </button>
              <button 
                onClick={() => switchRole('admin')}
                className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${profile?.role === 'admin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
              >
                ADM
              </button>
            </div>

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{profile?.displayName || user.displayName}</p>
              <p className="text-xs text-slate-500 capitalize">{profile?.role || 'Student'}</p>
            </div>
            <div className="relative group">
              <button className="w-10 h-10 rounded-full bg-slate-100 border border-black/5 overflow-hidden flex items-center justify-center">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={20} className="text-slate-400" />
                )}
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-black/5 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <button 
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoggingIn && <Loader2 className="animate-spin" size={16} />}
            {isLoggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        )}
      </div>
    </nav>
  );
};

const NavLink: React.FC<{ href: string; icon: React.ReactNode; label: string }> = ({ href, icon, label }) => (
  <Link 
    href={href}
    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all"
  >
    {icon}
    <span>{label}</span>
  </Link>
);
