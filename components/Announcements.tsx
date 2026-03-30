'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
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
  const [activeCategory, setActiveCategory] = useState<'all' | 'academic' | 'event' | 'emergency' | 'general'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    category: 'general' as const
  });

  useEffect(() => {
    const path = 'announcements';
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Announcement[];
      setAnnouncements(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    const path = 'announcements';
    try {
      await addDoc(collection(db, path), {
        ...newAnnouncement,
        authorId: user.uid,
        authorName: profile.displayName,
        createdAt: serverTimestamp()
      });
      setShowModal(false);
      setNewAnnouncement({ title: '', content: '', category: 'general' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleDelete = async () => {
    if (!announcementToDelete) return;
    const path = `announcements/${announcementToDelete}`;
    try {
      await deleteDoc(doc(db, 'announcements', announcementToDelete));
      setAnnouncementToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesCategory = activeCategory === 'all' || a.category === activeCategory;
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         a.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'academic', label: 'Academic' },
    { id: 'event', label: 'Events' },
    { id: 'emergency', label: 'Emergency' },
    { id: 'general', label: 'General' }
  ];

  const canDelete = (announcement: Announcement) => {
    if (!profile || !user) return false;
    if (profile.role === 'admin') return true;
    if (profile.role === 'faculty' && (announcement as any).authorId === user.uid) return true;
    return false;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Campus Announcements</h1>
          <p className="text-slate-500 mt-1">Official updates and news from the university administration.</p>
        </div>
        {(profile?.role === 'admin' || profile?.role === 'faculty') && (
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus size={18} />
            <span className="font-bold">Post Update</span>
          </button>
        )}
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="flex-1 flex items-center bg-white rounded-2xl border border-black/5 p-1 shadow-sm overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                activeCategory === cat.id 
                ? 'bg-slate-900 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-64">
          <input 
            type="text"
            placeholder="Search updates..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-black/5 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Bell className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-3xl animate-pulse border border-black/5" />
          ))
        ) : filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((announcement) => (
            <motion.div 
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm hover:shadow-md transition-all relative group"
            >
              {canDelete(announcement) && (
                <button
                  onClick={() => setAnnouncementToDelete(announcement.id)}
                  className="absolute top-6 right-6 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Announcement"
                >
                  <Trash2 size={18} />
                </button>
              )}
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    announcement.category === 'emergency' ? 'bg-red-50 text-red-600' :
                    announcement.category === 'academic' ? 'bg-blue-50 text-blue-600' :
                    announcement.category === 'event' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-50 text-slate-600'
                  }`}>
                    <Bell size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 pr-12 leading-tight">{announcement.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Posted by <span className="font-bold text-slate-600">{announcement.authorName}</span> • {announcement.createdAt?.toDate ? format(announcement.createdAt.toDate(), 'MMM d, yyyy h:mm a') : 'Just now'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap pl-16">
                {announcement.content}
              </div>
              <div className="mt-6 flex gap-2 pl-16">
                <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full ${
                  announcement.category === 'emergency' ? 'bg-red-100 text-red-700' :
                  announcement.category === 'academic' ? 'bg-blue-100 text-blue-700' :
                  announcement.category === 'event' ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-100 text-slate-700'
                }`}>
                  {announcement.category}
                </span>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="bg-white p-16 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Info className="opacity-20" size={40} />
            </div>
            <p className="text-xl font-bold text-slate-900 mb-2">No updates found</p>
            <p className="text-sm max-w-xs mx-auto">Try adjusting your filters or search query to find what you&apos;re looking for.</p>
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
