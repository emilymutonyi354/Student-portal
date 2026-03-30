'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, deleteDoc, doc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, Clock, MapPin, Plus, Trash2, X } from 'lucide-react';
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
  const { user, profile } = useFirebase();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({
    courseCode: '',
    courseName: '',
    day: 'Monday',
    startTime: '08:00',
    endTime: '10:00',
    location: ''
  });

  useEffect(() => {
    const path = 'timetables';
    const q = query(collection(db, path));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TimetableEntry[];
      setEntries(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'timetables';
    try {
      await addDoc(collection(db, path), {
        ...newEntry,
        facultyId: profile?.role === 'faculty' ? user?.uid : 'admin'
      });
      setShowAddModal(false);
      setNewEntry({
        courseCode: '',
        courseName: '',
        day: 'Monday',
        startTime: '08:00',
        endTime: '10:00',
        location: ''
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) return;
    const path = `timetables/${entryToDelete}`;
    try {
      await deleteDoc(doc(db, 'timetables', entryToDelete));
      setEntryToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Academic Timetable</h1>
          <p className="text-slate-500 mt-1">Your weekly schedule for the current semester.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'faculty') && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus size={18} />
            <span className="font-bold">Add Class</span>
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

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Add Class Session</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleAddEntry} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Course Code</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    placeholder="CS101"
                    value={newEntry.courseCode}
                    onChange={(e) => setNewEntry({...newEntry, courseCode: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Day</label>
                  <select 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    value={newEntry.day}
                    onChange={(e) => setNewEntry({...newEntry, day: e.target.value})}
                  >
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Course Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                  placeholder="Introduction to Programming"
                  value={newEntry.courseName}
                  onChange={(e) => setNewEntry({...newEntry, courseName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Start Time</label>
                  <input 
                    required
                    type="time" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    value={newEntry.startTime}
                    onChange={(e) => setNewEntry({...newEntry, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">End Time</label>
                  <input 
                    required
                    type="time" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    value={newEntry.endTime}
                    onChange={(e) => setNewEntry({...newEntry, endTime: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Location</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                  placeholder="Lab 4, Block B"
                  value={newEntry.location}
                  onChange={(e) => setNewEntry({...newEntry, location: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Plus size={18} />
                Add to Timetable
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
