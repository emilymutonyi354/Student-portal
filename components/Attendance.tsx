'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { ClipboardCheck, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecord {
  id: string;
  courseCode: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  studentId: string;
}

export const Attendance: React.FC = () => {
  const { user, profile } = useFirebase();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    if (!user) return;

    const path = 'attendance';
    let q;
    if (profile?.role === 'student') {
      q = query(
        collection(db, path),
        where('studentId', '==', user.uid),
        orderBy('date', 'desc')
      );
    } else {
      q = query(
        collection(db, path),
        orderBy('date', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AttendanceRecord[];
      setRecords(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, profile]);

  const filteredRecords = records.filter(r => 
    r.courseCode.toLowerCase().includes(filter.toLowerCase())
  );

  const stats = {
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    late: records.filter(r => r.status === 'late').length,
    total: records.length
  };

  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Attendance Tracking</h1>
        <p className="text-slate-500 mt-1">Monitor your class participation and academic engagement.</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center">
          <div className="text-3xl font-bold text-slate-900 mb-1">{attendanceRate}%</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Overall Rate</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center">
          <div className="text-3xl font-bold text-emerald-500 mb-1">{stats.present}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Present</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center">
          <div className="text-3xl font-bold text-red-500 mb-1">{stats.absent}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Absent</div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm text-center">
          <div className="text-3xl font-bold text-orange-500 mb-1">{stats.late}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Late</div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Records</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by course code..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                <th className="px-6 py-4">Course</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-4 h-12 bg-slate-50/50" />
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <motion.tr 
                    key={record.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{record.courseCode}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{record.date}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        record.status === 'present' ? 'bg-emerald-100 text-emerald-700' :
                        record.status === 'absent' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {record.status === 'present' ? <CheckCircle2 size={12} /> : 
                         record.status === 'absent' ? <XCircle size={12} /> : 
                         <Clock size={12} />}
                        {record.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">Regular Session</td>
                  </motion.tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
