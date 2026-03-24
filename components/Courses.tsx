'use client';

import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { db } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion } from 'motion/react';
import { BookOpen, Plus, Edit2, Trash2, X, Info } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Course {
  id: string;
  code: string;
  name: string;
  facultyId: string;
  description: string;
}

interface Registration {
  id: string;
  courseId: string;
  studentId: string;
}

interface FacultyMember {
  uid: string;
  displayName: string;
}

export const Courses: React.FC = () => {
  const { user, profile } = useFirebase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [facultyMembers, setFacultyMembers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    facultyId: ''
  });

  useEffect(() => {
    // Fetch faculty members for mapping IDs to names
    const fetchFaculty = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'faculty'));
        const snapshot = await getDocs(q);
        const facultyMap: Record<string, string> = {};
        snapshot.docs.forEach(doc => {
          facultyMap[doc.data().uid] = doc.data().displayName || 'Unknown Faculty';
        });
        setFacultyMembers(facultyMap);
      } catch (error) {
        console.error("Error fetching faculty members:", error);
      }
    };
    fetchFaculty();

    // Listen to courses
    const q = query(collection(db, 'courses'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Course[];
      setCourses(data);
      setLoading(false);
    });

    let unsubscribeRegistrations = () => {};
    if (profile?.role === 'student' && user?.uid) {
      const regQuery = query(collection(db, 'registrations'), where('studentId', '==', user.uid));
      unsubscribeRegistrations = onSnapshot(regQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Registration[];
        setRegistrations(data);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeRegistrations();
    };
  }, [profile?.role, user?.uid]);

  const handleOpenModal = (course?: Course) => {
    if (course) {
      setEditingCourse(course);
      setFormData({
        code: course.code,
        name: course.name,
        description: course.description || '',
        facultyId: course.facultyId
      });
    } else {
      setEditingCourse(null);
      setFormData({
        code: '',
        name: '',
        description: '',
        facultyId: profile?.role === 'faculty' ? user?.uid || '' : ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), formData);
      } else {
        await addDoc(collection(db, 'courses'), formData);
      }
      setShowModal(false);
    } catch (error) {
      console.error("Error saving course:", error);
      alert("Failed to save course. Please check permissions.");
    }
  };

  const handleDelete = async () => {
    if (!courseToDelete) return;
    try {
      await deleteDoc(doc(db, 'courses', courseToDelete));
      setCourseToDelete(null);
    } catch (error) {
      console.error("Error deleting course:", error);
      alert("Failed to delete course. Please check permissions.");
    }
  };

  const canManageCourse = (courseFacultyId: string) => {
    if (!profile) return false;
    if (profile.role === 'admin') return true;
    if (profile.role === 'faculty' && courseFacultyId === user?.uid) return true;
    return false;
  };

  const canCreateCourse = profile?.role === 'admin' || profile?.role === 'faculty';

  const handleRegister = async (courseId: string) => {
    if (!user || profile?.role !== 'student') return;
    setRegisteringId(courseId);
    try {
      await addDoc(collection(db, 'registrations'), {
        studentId: user.uid,
        courseId,
        registeredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error registering for course:", error);
      alert("Failed to register for course.");
    } finally {
      setRegisteringId(null);
    }
  };

  const handleDrop = async (courseId: string) => {
    if (!user || profile?.role !== 'student') return;
    const registration = registrations.find(r => r.courseId === courseId);
    if (!registration) return;
    
    setRegisteringId(courseId);
    try {
      await deleteDoc(doc(db, 'registrations', registration.id));
    } catch (error) {
      console.error("Error dropping course:", error);
      alert("Failed to drop course.");
    } finally {
      setRegisteringId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Courses</h1>
          <p className="text-slate-500 mt-1">Manage and view academic courses.</p>
        </div>
        {canCreateCourse && (
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <Plus size={18} />
            <span>Create Course</span>
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-black/5" />
          ))
        ) : courses.length > 0 ? (
          courses.map((course) => (
            <motion.div 
              key={course.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <BookOpen size={24} />
                </div>
                {canManageCourse(course.facultyId) && (
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenModal(course)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit Course"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setCourseToDelete(course.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Course"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-2">
                <span className="text-xs font-bold text-indigo-600 tracking-wider uppercase">{course.code}</span>
                <h3 className="text-lg font-bold text-slate-900 leading-tight mt-1">{course.name}</h3>
              </div>
              
              <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-grow">
                {course.description || 'No description provided.'}
              </p>
              
              <div className="pt-4 border-t border-slate-100 mt-auto">
                <p className="text-xs text-slate-400 font-medium mb-3">
                  Instructor: <span className="text-slate-700">{facultyMembers[course.facultyId] || 'Loading...'}</span>
                </p>
                {profile?.role === 'student' && (
                  <div className="mt-2">
                    {registrations.some(r => r.courseId === course.id) ? (
                      <button
                        onClick={() => handleDrop(course.id)}
                        disabled={registeringId === course.id}
                        className="w-full py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl font-bold text-sm hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        {registeringId === course.id ? 'Updating...' : 'Registered (Click to Drop)'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(course.id)}
                        disabled={registeringId === course.id}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
                      >
                        {registeringId === course.id ? 'Registering...' : 'Register for Course'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center text-slate-400">
            <Info className="mx-auto mb-4 opacity-20" size={48} />
            <p className="text-lg font-medium">No courses available.</p>
            <p className="text-sm">Courses will appear here once they are created.</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!courseToDelete}
        title="Delete Course"
        message="Are you sure you want to delete this course? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setCourseToDelete(null)}
      />

      {/* Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCourse ? 'Edit Course' : 'Create New Course'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <form id="course-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Course Code</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    placeholder="e.g., CS101"
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Course Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                    placeholder="e.g., Introduction to Computer Science"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                {profile?.role === 'admin' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Faculty</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
                      value={formData.facultyId}
                      onChange={(e) => setFormData({...formData, facultyId: e.target.value})}
                    >
                      <option value="" disabled>Select a faculty member</option>
                      {Object.entries(facultyMembers).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all resize-none"
                    placeholder="Brief description of the course..."
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-100 shrink-0">
              <button 
                type="submit"
                form="course-form"
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
              >
                {editingCourse ? 'Save Changes' : 'Create Course'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
