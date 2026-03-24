'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { Bell, Plus, Send, X, Info, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ConfirmModal } from './ConfirmModal';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'academic' | 'event' | 'emergency' | 'general';
  createdAt: any;
  authorName: string;
}

export const Announcements: React.FC = () => {
  const { user, profile } = useFirebase();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<string | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'general' as const
  });

  useEffect(() => {
    const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      await addDoc(collection(db, 'announcements'), {
        ...newAnnouncement,
        authorId: user.uid,
        authorName: profile.displayName,
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setNewAnnouncement({ title: '', content: '', category: 'general' });
    } catch (error) {
      console.error("Error adding announcement:", error);
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    try {
      await deleteDoc(doc(db, 'announcements', announcementToDelete));
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error("Error deleting announcement:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Campus Announcements</h1>
          <p className="text-slate-500 mt-1">Official updates and news from the university administration.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'faculty') && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            <span>Post Update</span>
          </button>
        )}
      </header>

      <div className="space-y-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-black/5" />
          ))
        ) : announcements.length > 0 ? (
          announcements.map((announcement) => (
            <motion.div 
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              {(profile?.role === 'admin' || profile?.role === 'faculty') && (
                <button
                  onClick={() => setAnnouncementToDelete(announcement.id)}
                  className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Announcement"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    announcement.category === 'emergency' ? 'bg-red-100 text-red-600' :
                    announcement.category === 'academic' ? 'bg-blue-100 text-blue-600' :
                    announcement.category === 'event' ? 'bg-emerald-100 text-emerald-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 pr-12">{announcement.title}</h3>
                    <p className="text-xs text-slate-400">
                      Posted by {announcement.authorName} • {announcement.createdAt?.toDate ? format(announcement.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                    </p>
                  </div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full ${
                  announcement.category === 'emergency' ? 'bg-red-100 text-red-600' :
                  announcement.category === 'academic' ? 'bg-blue-100 text-blue-600' :
                  announcement.category === 'event' ? 'bg-emerald-100 text-emerald-600' :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {announcement.category}
                </span>
              </div>
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                {announcement.content}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
            <Info className="mx-auto mb-4 opacity-20" size={48} />
            <p className="text-lg font-medium">No announcements yet.</p>
            <p className="text-sm">Check back later for official updates.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!announcementToDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setAnnouncementToDelete(null)}
      />

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">Post New Announcement</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Title</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                  placeholder="e.g., End of Semester Exams Schedule"
                  value={newAnnouncement.title}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Category</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                  value={newAnnouncement.category}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, category: e.target.value as any})}
                >
                  <option value="general">General</option>
                  <option value="academic">Academic</option>
                  <option value="event">Event</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Content</label>
                <textarea 
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all resize-none"
                  placeholder="Write your announcement here..."
                  value={newAnnouncement.content}
                  onChange={(e) => setNewAnnouncement({...newAnnouncement, content: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                <Send size={18} />
                Post Announcement
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
