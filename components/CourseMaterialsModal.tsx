'use client';

import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '@/firebase';
import { useFirebase } from './FirebaseProvider';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Trash2, Plus, ExternalLink, Upload, File, AlertCircle, Loader2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface Material {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  fileUrl: string;
  uploadedBy: string;
  createdAt: string;
}

interface SelectedFile {
  id: string;
  file: File;
  title: string;
  description: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface CourseMaterialsModalProps {
  courseId: string;
  courseName: string;
  facultyId: string;
  onClose: () => void;
}

export const CourseMaterialsModal: React.FC<CourseMaterialsModalProps> = ({ courseId, courseName, facultyId, onClose }) => {
  const { user, profile } = useFirebase();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManageMaterials = profile?.role === 'admin' || (profile?.role === 'faculty' && user?.uid === facultyId);

  useEffect(() => {
    const path = 'materials';
    const q = query(
      collection(db, path),
      where('courseId', '==', courseId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setMaterials(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: SelectedFile[] = Array.from(e.target.files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        title: file.name.split('.').slice(0, -1).join('.') || file.name,
        description: '',
        status: 'pending'
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeSelectedFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFileData = (id: string, updates: Partial<Pick<SelectedFile, 'title' | 'description'>>) => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const uploadFiles = async () => {
    if (!user || selectedFiles.length === 0) return;
    setIsUploading(true);

    const path = 'materials';
    const updatedFiles = [...selectedFiles];

    for (let i = 0; i < updatedFiles.length; i++) {
      const fileItem = updatedFiles[i];
      if (fileItem.status === 'success') continue;

      try {
        setSelectedFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'uploading' } : f));

        // In a real app, we would upload to Firebase Storage.
        // For this prototype, we'll convert to a data URL if small, or use a placeholder.
        // Firestore has a 1MB limit, so we'll check size.
        let fileUrl = '';
        if (fileItem.file.size < 800000) { // ~800KB limit for safety
          fileUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(fileItem.file);
          });
        } else {
          // Mock URL for large files in this prototype
          fileUrl = `https://placeholder-storage.example.com/${fileItem.file.name}`;
        }

        await addDoc(collection(db, path), {
          courseId,
          title: fileItem.title,
          description: fileItem.description,
          fileUrl,
          uploadedBy: user.uid,
          createdAt: new Date().toISOString()
        });

        setSelectedFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'success' } : f));
      } catch (error) {
        console.error(`Error uploading ${fileItem.file.name}:`, error);
        setSelectedFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: 'error', error: 'Upload failed' } : f));
      }
    }

    setIsUploading(false);
    // If all successful, close the form
    if (updatedFiles.every(f => f.status === 'success')) {
      setTimeout(() => {
        setShowAddForm(false);
        setSelectedFiles([]);
      }, 1000);
    }
  };

  const handleDelete = async () => {
    if (!materialToDelete) return;
    const path = `materials/${materialToDelete}`;
    try {
      await deleteDoc(doc(db, 'materials', materialToDelete));
      setMaterialToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Course Materials</h2>
            <p className="text-sm text-slate-500">{courseName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full shadow-sm">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50">
          {canManageMaterials && !showAddForm && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 py-8 border-2 border-dashed border-slate-300 text-slate-500 rounded-2xl font-medium flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-indigo-100 group-hover:scale-110 transition-all">
                <Upload size={24} className="group-hover:text-indigo-600" />
              </div>
              <div className="text-center">
                <p className="font-bold">Upload Materials</p>
                <p className="text-xs opacity-70">PDF, DOCX, PPTX, Images (Max 800KB for preview)</p>
              </div>
            </button>
          )}

          {showAddForm && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Plus size={18} className="text-indigo-600" />
                  Add New Materials
                </h3>
                <button type="button" onClick={() => { setShowAddForm(false); setSelectedFiles([]); }} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
                >
                  <input 
                    type="file" 
                    multiple 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileSelect}
                  />
                  <Upload size={32} className="text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">Click to select files or drag and drop</p>
                  <p className="text-xs text-slate-400">You can select multiple files at once</p>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Selected Files ({selectedFiles.length})</p>
                    <div className="max-h-60 overflow-y-auto pr-2 space-y-3">
                      <AnimatePresence>
                        {selectedFiles.map((fileItem) => (
                          <motion.div 
                            key={fileItem.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col gap-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0">
                                  <File size={16} className="text-slate-400" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-slate-900 truncate">{fileItem.file.name}</p>
                                  <p className="text-[10px] text-slate-500">{(fileItem.file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {fileItem.status === 'success' ? (
                                  <div className="text-green-600 bg-green-50 px-2 py-1 rounded text-[10px] font-bold">UPLOADED</div>
                                ) : fileItem.status === 'uploading' ? (
                                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                                ) : fileItem.status === 'error' ? (
                                  <div className="text-red-600 flex items-center gap-1" title={fileItem.error}>
                                    <AlertCircle size={16} />
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => removeSelectedFile(fileItem.id)}
                                    className="text-slate-400 hover:text-red-600 transition-colors"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            {fileItem.status === 'pending' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Display Title</label>
                                  <input 
                                    type="text" 
                                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={fileItem.title}
                                    onChange={(e) => updateFileData(fileItem.id, { title: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Description (Optional)</label>
                                  <input 
                                    type="text" 
                                    className="w-full px-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                    value={fileItem.description}
                                    onChange={(e) => updateFileData(fileItem.id, { description: e.target.value })}
                                  />
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button 
                    type="button"
                    onClick={() => { setShowAddForm(false); setSelectedFiles([]); }}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={uploadFiles}
                    disabled={selectedFiles.length === 0 || isUploading || selectedFiles.every(f => f.status === 'success')}
                    className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} ${selectedFiles.length === 1 ? 'File' : 'Files'}`}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Existing Materials</h3>
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl animate-pulse border border-slate-100" />
              ))
            ) : materials.length > 0 ? (
              materials.map((material) => (
                <div key={material.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-4 group">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-1">
                    <FileText size={20} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{material.title}</h4>
                    {material.description && (
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{material.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3">
                      <a 
                        href={material.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-md transition-colors"
                      >
                        <ExternalLink size={14} />
                        Open Resource
                      </a>
                      <span className="text-xs text-slate-400">
                        {new Date(material.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {canManageMaterials && (
                    <button
                      onClick={() => setMaterialToDelete(material.id)}
                      className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Material"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10 bg-white rounded-2xl border border-slate-100">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="text-slate-200" size={24} />
                </div>
                <p className="text-slate-400 font-medium">No materials uploaded yet.</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={!!materialToDelete}
        title="Delete Material"
        message="Are you sure you want to delete this material? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDelete}
        onCancel={() => setMaterialToDelete(null)}
      />
    </div>
  );
};
