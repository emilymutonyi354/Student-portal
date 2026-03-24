'use client';

import React, { useState } from 'react';
import { useFirebase } from './FirebaseProvider';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/firebase';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, ShieldCheck, Loader2 } from 'lucide-react';

export const RoleSelection: React.FC = () => {
  const { user } = useFirebase();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty' | 'admin' | null>(null);

  const handleRoleSelect = async () => {
    if (!user || !selectedRole || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const newProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'User',
        role: selectedRole,
        photoURL: user.photoURL || '',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', user.uid), newProfile);
      // The FirebaseProvider onAuthStateChanged will pick up the new profile 
      // when it re-runs or when the page is refreshed, but we might need 
      // a manual refresh or a state update in FirebaseProvider if it doesn't.
      // Actually, onAuthStateChanged won't re-run, but the user is already logged in.
      // We should probably have a way to refresh the profile in FirebaseProvider.
      window.location.reload(); 
    } catch (error) {
      console.error("Error setting role:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full bg-white rounded-[40px] shadow-sm border border-black/5 p-12 text-center"
      >
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Identify Your Role</h1>
          <p className="text-slate-500 text-lg">Welcome to CampusConnect. Please select your primary role to continue.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <RoleCard 
            icon={<GraduationCap size={32} />}
            title="Student"
            desc="Access your timetable, attendance, and campus news."
            selected={selectedRole === 'student'}
            onClick={() => setSelectedRole('student')}
          />
          <RoleCard 
            icon={<BookOpen size={32} />}
            title="Lecturer"
            desc="Manage courses, record attendance, and post announcements."
            selected={selectedRole === 'faculty'}
            onClick={() => setSelectedRole('faculty')}
          />
          <RoleCard 
            icon={<ShieldCheck size={32} />}
            title="Admin"
            desc="System-wide management and oversight."
            selected={selectedRole === 'admin'}
            onClick={() => setSelectedRole('admin')}
          />
        </div>

        <button 
          onClick={handleRoleSelect}
          disabled={!selectedRole || isSubmitting}
          className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-3 mx-auto"
        >
          {isSubmitting && <Loader2 className="animate-spin" size={20} />}
          {isSubmitting ? 'Finalizing...' : 'Complete Registration'}
        </button>
      </motion.div>
    </div>
  );
};

const RoleCard: React.FC<{ 
  icon: React.ReactNode; 
  title: string; 
  desc: string; 
  selected: boolean; 
  onClick: () => void 
}> = ({ icon, title, desc, selected, onClick }) => (
  <button 
    onClick={onClick}
    className={`p-8 rounded-[32px] border-2 transition-all text-left flex flex-col gap-4 group ${
      selected 
        ? 'border-slate-900 bg-slate-50' 
        : 'border-slate-100 hover:border-slate-200 bg-white'
    }`}
  >
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
      selected ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-slate-600'
    }`}>
      {icon}
    </div>
    <div>
      <h3 className="font-bold text-xl text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
    </div>
  </button>
);
