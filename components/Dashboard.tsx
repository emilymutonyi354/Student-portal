'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { Bell, Calendar, ClipboardCheck, ArrowRight, Info } from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: any;
  authorName: string;
}

export const Dashboard: React.FC = () => {
  const { profile } = useFirebase();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching announcements:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderRoleSpecificContent = () => {
    switch (profile?.role) {
      case 'faculty':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard 
              icon={<Calendar className="text-emerald-500" />} 
              label="Assigned Courses" 
              value="3 Courses" 
              subtext="Next: CS101 at 10:00 AM"
            />
            <StatCard 
              icon={<ClipboardCheck className="text-orange-500" />} 
              label="Pending Attendance" 
              value="2 Sessions" 
              subtext="Needs recording today"
            />
          </div>
        );
      case 'admin':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard 
              icon={<Calendar className="text-emerald-500" />} 
              label="Total Users" 
              value="1,240" 
              subtext="12 new today"
            />
            <StatCard 
              icon={<ClipboardCheck className="text-orange-500" />} 
              label="System Health" 
              value="99.9%" 
              subtext="All services operational"
            />
          </div>
        );
      default: // student
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard 
              icon={<Calendar className="text-emerald-500" />} 
              label="Today's Classes" 
              value="4 Sessions" 
              subtext="Next: CS101 at 10:00 AM"
            />
            <StatCard 
              icon={<ClipboardCheck className="text-orange-500" />} 
              label="Attendance Rate" 
              value="92%" 
              subtext="3/38 classes missed"
            />
          </div>
        );
    }
  };

  const renderSidebar = () => {
    if (profile?.role === 'faculty') {
      return (
        <section>
          <h3 className="text-lg font-semibold mb-4">Faculty Actions</h3>
          <div className="space-y-4">
            <button className="w-full p-4 bg-white border border-black/5 rounded-2xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <span className="font-medium">Post Announcement</span>
              <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full p-4 bg-white border border-black/5 rounded-2xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <span className="font-medium">Manage Timetable</span>
              <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      );
    }

    if (profile?.role === 'admin') {
      return (
        <section>
          <h3 className="text-lg font-semibold mb-4">Admin Console</h3>
          <div className="space-y-4">
            <button className="w-full p-4 bg-slate-900 text-white rounded-2xl text-left hover:bg-slate-800 transition-colors flex items-center justify-between group">
              <span className="font-medium">User Management</span>
              <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full p-4 bg-white border border-black/5 rounded-2xl text-left hover:bg-slate-50 transition-colors flex items-center justify-between group">
              <span className="font-medium">System Logs</span>
              <ArrowRight size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      );
    }

    return (
      <section>
        <h3 className="text-lg font-semibold mb-4">Course Progress</h3>
        <div className="space-y-4">
          <ProgressItem label="Computer Science" progress={75} />
          <ProgressItem label="Mathematics" progress={45} />
          <ProgressItem label="Physics" progress={90} />
        </div>
      </section>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-3xl font-bold tracking-tight text-slate-900"
          >
            Welcome back, {profile?.displayName?.split(' ')[0]}
          </motion.h1>
          <p className="text-slate-500 mt-1">
            {profile?.role === 'faculty' ? 'Manage your courses and students.' : 
             profile?.role === 'admin' ? 'System administration portal.' : 
             'Here\'s what\'s happening on campus today.'}
          </p>
        </div>
        <div className="hidden sm:block">
          <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
            {profile?.role || 'Student'}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content: Announcements & Schedule */}
        <div className="lg:col-span-2 space-y-8">
          {/* Announcements Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Bell size={20} className="text-indigo-500" />
                Latest Announcements
              </h2>
              <button className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                View All <ArrowRight size={14} />
              </button>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-black/5" />
                ))
              ) : announcements.length > 0 ? (
                announcements.map((announcement) => (
                  <motion.div 
                    key={announcement.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-5 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                        announcement.category === 'emergency' ? 'bg-red-100 text-red-600' :
                        announcement.category === 'academic' ? 'bg-blue-100 text-blue-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {announcement.category}
                      </span>
                      <span className="text-xs text-slate-400">
                        {announcement.createdAt?.toDate ? format(announcement.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-1">{announcement.title}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2">{announcement.content}</p>
                  </motion.div>
                ))
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400">
                  <Info className="mx-auto mb-2 opacity-20" size={32} />
                  <p>No announcements yet.</p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Stats/Actions */}
          {renderRoleSpecificContent()}
        </div>

        {/* Sidebar: Upcoming Events/Deadlines */}
        <div className="space-y-8">
          <section className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Exam Season</h3>
              <p className="text-slate-400 text-sm mb-6">Final exams start in 12 days. Make sure your registration is complete.</p>
              <button className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-sm hover:bg-slate-100 transition-colors">
                View Exam Schedule
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
          </section>

          {renderSidebar()}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; subtext: string }> = ({ icon, label, value, subtext }) => (
  <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <span className="text-sm font-medium text-slate-500">{label}</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
    <p className="text-xs text-slate-400">{subtext}</p>
  </div>
);

const ProgressItem: React.FC<{ label: string; progress: number }> = ({ label, progress }) => (
  <div className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
    <div className="flex justify-between text-sm mb-2">
      <span className="font-medium text-slate-700">{label}</span>
      <span className="text-slate-400">{progress}%</span>
    </div>
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-full bg-slate-900"
      />
    </div>
  </div>
);
