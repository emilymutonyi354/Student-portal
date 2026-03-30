'use client';

import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { Settings, ShieldCheck, Database, Users, BookOpen, Bell, Activity, Server, Globe } from 'lucide-react';

interface SystemStats {
  totalUsers: number;
  totalCourses: number;
  totalAnnouncements: number;
  lastBackup: string;
  uptime: string;
}

export const System: React.FC = () => {
  const { profile } = useFirebase();
  const [stats, setStats] = useState<SystemStats>({
    totalUsers: 0,
    totalCourses: 0,
    totalAnnouncements: 0,
    lastBackup: new Date().toLocaleDateString(),
    uptime: '99.99%'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') return;

    const fetchStats = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const coursesSnap = await getDocs(collection(db, 'courses'));
        const announcementsSnap = await getDocs(collection(db, 'announcements'));

        setStats(prev => ({
          ...prev,
          totalUsers: usersSnap.size,
          totalCourses: coursesSnap.size,
          totalAnnouncements: announcementsSnap.size
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'system/stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [profile]);

  if (profile?.role !== 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Access Restricted</h1>
        <p className="text-slate-500">Only administrators can access system settings.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Settings</h1>
        <p className="text-slate-500 mt-1">Monitor system health and manage global configurations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatBox icon={<Users className="text-blue-500" />} label="Total Users" value={stats.totalUsers.toString()} />
        <StatBox icon={<BookOpen className="text-emerald-500" />} label="Active Courses" value={stats.totalCourses.toString()} />
        <StatBox icon={<Bell className="text-orange-500" />} label="Announcements" value={stats.totalAnnouncements.toString()} />
        <StatBox icon={<Activity className="text-indigo-500" />} label="System Uptime" value={stats.uptime} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Server size={20} className="text-slate-400" />
              Infrastructure Status
            </h3>
            <div className="space-y-4">
              <StatusItem label="Firestore Database" status="Operational" />
              <StatusItem label="Firebase Authentication" status="Operational" />
              <StatusItem label="Cloud Storage" status="Operational" />
              <StatusItem label="API Gateway" status="Operational" />
            </div>
          </section>

          <section className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Database size={20} className="text-slate-400" />
              Data Management
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button className="p-4 bg-slate-50 rounded-2xl text-left hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                <p className="font-bold text-slate-900 text-sm">Export All Data</p>
                <p className="text-xs text-slate-500">Download a full backup in JSON format</p>
              </button>
              <button className="p-4 bg-slate-50 rounded-2xl text-left hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200">
                <p className="font-bold text-slate-900 text-sm">Clear System Logs</p>
                <p className="text-xs text-slate-500">Remove logs older than 30 days</p>
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-slate-900 text-white p-8 rounded-[32px] shadow-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Globe size={20} className="text-slate-400" />
              Global Config
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Maintenance Mode</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Disabled</span>
                  <div className="w-10 h-5 bg-slate-800 rounded-full relative">
                    <div className="absolute left-1 top-1 w-3 h-3 bg-slate-600 rounded-full" />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">New Registrations</label>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Enabled</span>
                  <div className="w-10 h-5 bg-indigo-500 rounded-full relative">
                    <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-indigo-50 p-6 rounded-[32px] border border-indigo-100">
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Last Backup</p>
            <p className="text-lg font-bold text-indigo-900">{stats.lastBackup}</p>
            <p className="text-xs text-indigo-400 mt-1">Automated daily backup completed successfully.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-4">
      {icon}
    </div>
    <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
    <p className="text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const StatusItem: React.FC<{ label: string; status: string }> = ({ label, status }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-600">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
      <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">{status}</span>
    </div>
  </div>
);
