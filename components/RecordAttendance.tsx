'use client';

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Check, X, Loader2, Users, Calendar, BookOpen } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  name: string;
}

interface Student {
  uid: string;
  displayName: string;
  studentId?: string;
}

export const RecordAttendance: React.FC = () => {
  const { user, profile } = useFirebase();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== 'faculty') return;

    const fetchCourses = async () => {
      const path = 'courses';
      try {
        const q = query(collection(db, path), where('facultyId', '==', user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
        setCourses(data);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, path);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user, profile]);

  const fetchStudents = async (courseId: string) => {
    setLoading(true);
    try {
      // 1. Get registrations for this course
      const regPath = 'registrations';
      const regQuery = query(collection(db, regPath), where('courseId', '==', courseId));
      const regSnapshot = await getDocs(regQuery);
      const studentIds = regSnapshot.docs.map(doc => doc.data().studentId);

      if (studentIds.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // 2. Get student details
      const userPath = 'users';
      const userQuery = query(collection(db, userPath), where('uid', 'in', studentIds));
      const userSnapshot = await getDocs(userQuery);
      const studentData = userSnapshot.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().displayName,
        studentId: doc.data().studentId
      })) as Student[];

      setStudents(studentData);
      
      // Initialize attendance state
      const initialAttendance: Record<string, 'present' | 'absent' | 'late'> = {};
      studentData.forEach(s => initialAttendance[s.uid] = 'present');
      setAttendance(initialAttendance);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'registrations/users');
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    fetchStudents(course.id);
  };

  const toggleStatus = (studentUid: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentUid]: prev[studentUid] === 'present' ? 'absent' : 
                     prev[studentUid] === 'absent' ? 'late' : 'present'
    }));
  };

  const handleSubmit = async () => {
    if (!selectedCourse || !user) return;
    setSubmitting(true);
    const path = 'attendance';
    try {
      const today = new Date().toISOString().split('T')[0];
      const promises = Object.entries(attendance).map(([studentId, status]) => {
        return addDoc(collection(db, path), {
          courseCode: selectedCourse.code,
          courseId: selectedCourse.id,
          studentId,
          status,
          date: today,
          recordedBy: user.uid,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(promises);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSelectedCourse(null);
        setStudents([]);
      }, 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !selectedCourse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-slate-900" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <ClipboardCheck size={24} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Record Attendance</h1>
        </div>
        <p className="text-slate-500">Select a course and mark students as present, absent, or late.</p>
      </header>

      <AnimatePresence mode="wait">
        {!selectedCourse ? (
          <motion.div 
            key="course-select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {courses.length > 0 ? (
              courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => handleCourseSelect(course)}
                  className="p-6 bg-white border border-black/5 rounded-3xl text-left hover:shadow-md hover:border-indigo-500/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <BookOpen size={20} />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{course.code}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{course.name}</h3>
                  <p className="text-sm text-slate-500">Click to start recording attendance</p>
                </button>
              ))
            ) : (
              <div className="col-span-full bg-white p-12 rounded-[40px] border border-dashed border-slate-200 text-center text-slate-400">
                <Calendar className="mx-auto mb-4 opacity-20" size={48} />
                <p className="text-lg font-medium text-slate-900">No courses assigned</p>
                <p className="text-sm">You don&apos;t have any courses assigned to you yet.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="attendance-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-black/5 shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedCourse(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
                <div>
                  <h2 className="font-bold text-slate-900">{selectedCourse.name}</h2>
                  <p className="text-xs text-slate-400">{selectedCourse.code} • {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                <Users size={16} />
                <span>{students.length} Students</span>
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-400" size={32} />
                  </div>
                ) : students.length > 0 ? (
                  students.map(student => (
                    <div key={student.uid} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                          {student.displayName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.displayName}</p>
                          <p className="text-xs text-slate-400">{student.studentId || 'No ID'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleStatus(student.uid)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                            attendance[student.uid] === 'present' ? 'bg-emerald-100 text-emerald-700' :
                            attendance[student.uid] === 'absent' ? 'bg-red-100 text-red-700' :
                            'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {attendance[student.uid] === 'present' ? <Check size={14} /> : 
                           attendance[student.uid] === 'absent' ? <X size={14} /> : 
                           <ClipboardCheck size={14} />}
                          {attendance[student.uid]}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    No students registered for this course.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setSelectedCourse(null)}
                className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || students.length === 0 || success}
                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? <Loader2 className="animate-spin" size={20} /> : 
                 success ? <Check size={20} /> : <ClipboardCheck size={20} />}
                {submitting ? 'Saving...' : success ? 'Attendance Saved' : 'Submit Attendance'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
