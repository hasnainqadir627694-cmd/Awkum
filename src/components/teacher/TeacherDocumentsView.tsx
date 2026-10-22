import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Download,
  Search,
  CheckCircle2,
  X,
  File,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { SubjectConfig, AdminUser } from '../../data/adminData';
import { DocumentItem } from '../../data/portalData';
import { uploadTeacherDocument } from '../../lib/teacherService';

interface TeacherDocumentsViewProps {
  selectedSubject: SubjectConfig;
  teacher: AdminUser;
  documents: DocumentItem[];
  isOpenUploadModal: boolean;
  onCloseUploadModal: () => void;
  onOpenUploadModal: () => void;
}

export const TeacherDocumentsView: React.FC<TeacherDocumentsViewProps> = ({
  selectedSubject,
  teacher,
  documents,
  isOpenUploadModal,
  onCloseUploadModal,
  onOpenUploadModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Upload Modal Form state
  const [docTitle, setDocTitle] = useState('');
  const [docCategory, setDocCategory] = useState<'Lectures' | 'Lab Work' | 'Others'>('Lectures');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const categories = ['All', 'Lectures', 'Lab Work', 'Others'];

  const filteredDocs = documents.filter((doc) => {
    if (activeCategory !== 'All' && doc.category !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        doc.title.toLowerCase().includes(q) ||
        (doc.fileName && doc.fileName.toLowerCase().includes(q)) ||
        (doc.category && doc.category.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setModalError('');
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Max file size 10MB
      if (file.size > 10 * 1024 * 1024) {
        setModalError('File size exceeds 10MB limit. Please select a smaller document.');
        return;
      }
      setSelectedFile(file);
      if (!docTitle.trim()) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!docTitle.trim()) {
      setModalError('Please enter a document title.');
      return;
    }

    if (!selectedFile) {
      setModalError('Please select a file to upload.');
      return;
    }

    setIsUploading(true);

    try {
      const res = await uploadTeacherDocument({
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        title: docTitle.trim(),
        category: docCategory,
        file: selectedFile,
        teacherEmail: teacher.email,
        teacherName: teacher.name,
      });

      setIsUploading(false);

      if (!res.success) {
        setModalError(res.error || 'Failed to upload document.');
        return;
      }

      setModalSuccess(`"${docTitle}" published successfully! Students can now download it.`);
      setTimeout(() => {
        setDocTitle('');
        setSelectedFile(null);
        setModalSuccess('');
        onCloseUploadModal();
      }, 1500);
    } catch (err: any) {
      setIsUploading(false);
      setModalError(err?.message || 'Error occurred during file upload.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-[#38271C]">
              Course Documents ({selectedSubject.name})
            </h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              Upload lectures, lab manuals, and syllabus files for {selectedSubject.code}
            </p>
          </div>

          <button
            onClick={onOpenUploadModal}
            className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Upload className="w-4 h-4 text-amber-300" />
            <span>+ Upload New Document</span>
          </button>
        </div>

        {/* Category Pills & Search */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                      : 'bg-white text-[#806A56] border border-[#E6D8C7] hover:text-[#38271C]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title or file name..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>
        </div>
      </div>

      {/* 2. Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="p-8 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-2">
          <FileText className="w-10 h-10 text-[#806A56] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#38271C]">No Documents Uploaded</h3>
          <p className="text-xs text-[#806A56]">
            {searchQuery
              ? `No document matching "${searchQuery}" was found.`
              : `No ${activeCategory !== 'All' ? activeCategory : ''} files published yet for ${selectedSubject.name}.`}
          </p>
          <button
            onClick={onOpenUploadModal}
            className="mt-2 px-4 py-2 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Upload First Document</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-[#EFE3D3] text-[#493222] flex items-center justify-center font-bold text-xs shrink-0 border border-[#D8C7B4]">
                  {doc.fileType?.toUpperCase() || 'PDF'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-xs sm:text-sm text-[#38271C] truncate">
                      {doc.title}
                    </h3>
                    {doc.category && (
                      <span className="px-2 py-0.2 bg-[#EFE3D3] text-[#493222] text-[10px] font-bold rounded">
                        {doc.category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-[#806A56] mt-0.5 flex-wrap">
                    <span>Uploaded: {doc.uploadDate || doc.date || 'Recent'}</span>
                    {doc.fileSize && <span>· {doc.fileSize}</span>}
                    {doc.uploadedBy && <span>· By {doc.uploadedBy}</span>}
                  </div>
                </div>
              </div>

              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  download={doc.fileName || doc.title}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 bg-white border border-[#E6D8C7] hover:bg-[#F8F0E5] text-[#493222] rounded-xl transition-colors cursor-pointer shrink-0"
                  title="Download Document"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload Document Modal */}
      {isOpenUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <h3 className="font-bold text-base text-[#38271C]">
                Upload Course Document
              </h3>
              <button
                onClick={onCloseUploadModal}
                className="p-1 text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {modalSuccess && (
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] text-xs font-bold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{modalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Subject Scope:
                </label>
                <input
                  type="text"
                  disabled
                  value={`${selectedSubject.name} (${selectedSubject.code})`}
                  className="w-full px-3 py-2 bg-[#EFE3D3]/50 border border-[#D8C7B4] rounded-xl text-xs font-bold text-[#493222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Lecture 01 - Introduction to C++"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Document Category
                </label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222] cursor-pointer"
                >
                  <option value="Lectures">Lectures & Course Notes</option>
                  <option value="Lab Work">Lab Work & Manuals</option>
                  <option value="Others">Others / Reference Files</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Select File (PDF, PPT, Word, Images - Max 10MB)
                </label>
                <div className="border-2 border-dashed border-[#D8C7B4] hover:border-[#493222] rounded-2xl p-4 text-center transition-colors bg-white">
                  <input
                    type="file"
                    id="teacher-doc-upload"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="teacher-doc-upload"
                    className="cursor-pointer flex flex-col items-center gap-1.5"
                  >
                    <File className="w-8 h-8 text-[#493222]" />
                    <span className="text-xs font-bold text-[#493222]">
                      {selectedFile ? selectedFile.name : 'Click to choose file'}
                    </span>
                    <span className="text-[10px] text-[#806A56]">
                      {selectedFile
                        ? `${(selectedFile.size / 1024).toFixed(0)} KB`
                        : 'PDF, PPT, DOC, Images up to 10MB'}
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseUploadModal}
                  className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !selectedFile}
                  className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Publish Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
