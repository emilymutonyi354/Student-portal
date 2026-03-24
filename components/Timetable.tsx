'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface TimetableEntry {
  id: string;
  courseCode: string;
  courseName: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const Timetable: React.FC = () => {
  const { profile } = useFirebase();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'timetables'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimetableEntry[];
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDelete = async () => {
    if (!entryToDelete) return;
    try {
      await deleteDoc(doc(db, 'timetables', entryToDelete));
      setEntryToDelete(null);
    } catch (error) {
      console.error("Error deleting timetable entry:", error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academic Timetable</h1>
          <p className="text-slate-500 mt-1">Your weekly schedule for the current semester.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'faculty') && (
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors">
            <Plus size={18} />
            <span>Add Class</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {DAYS.map((day) => (
          <div key={day} className="space-y-4">
            <h3 className="font-semibold text-slate-400 uppercase text-[10px] tracking-widest border-b border-slate-200 pb-2 mb-4">
              {day}
            </h3>
            <div className="space-y-3">
              {entries.filter(e => e.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime)).map((entry) => (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white p-4 rounded-xl border border-black/5 shadow-sm hover:shadow-md transition-all group relative"
                >
                  {(profile?.role === 'admin' || profile?.role === 'faculty') && (
                    <button
                      onClick={() => setEntryToDelete(entry.id)}
                      className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Class"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <div className="text-xs font-bold text-indigo-600 mb-1 pr-6">{entry.courseCode}</div>
                  <div className="text-sm font-semibold text-slate-900 mb-3 group-hover:text-indigo-600 transition-colors">
                    {entry.courseName || 'Class Session'}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Clock size={12} />
                      <span>{entry.startTime} - {entry.endTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <MapPin size={12} />
                      <span>{entry.location}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {entries.filter(e => e.day === day).length === 0 && (
                <div className="text-center py-8 text-slate-300 text-xs italic">
                  No classes
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={!!entryToDelete}
        title="Delete Class Session"
        message="Are you sure you want to delete this class session from the timetable? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setEntryToDelete(null)}
      />
    </div>
  );
};
