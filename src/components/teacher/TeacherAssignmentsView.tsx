import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  Paperclip,
  X,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { SubjectConfig, AdminUser } from '../../data/adminData';
import { AssignmentItem } from '../../data/portalData';
import { createTeacherAssignment } from '../../lib/teacherService';

interface TeacherAssignmentsViewProps {
  selectedSubject: SubjectConfig;
  teacher: AdminUser;
  assignments: AssignmentItem[];
  isOpenCreateModal: boolean;
  onCloseCreateModal: () => void;
  onOpenCreateModal: () => void;
  onSelectAssignmentForSubmissions: (asg: AssignmentItem) => void;
}

export const TeacherAssignmentsView: React.FC<TeacherAssignmentsViewProps> = ({
  selectedSubject,
  teacher,
  assignments,
  isOpenCreateModal,
  onCloseCreateModal,
  onOpenCreateModal,
  onSelectAssignmentForSubmissions,
}) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Active' | 'Closed'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State for New Assignment Modal
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [totalMarks, setTotalMarks] = useState<number>(10);
  const [allowLate, setAllowLate] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const filteredAssignments = assignments.filter((asg) => {
    if (activeTab === 'Active' && asg.status === 'closed') return false;
    if (activeTab === 'Closed' && asg.status !== 'closed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        asg.title.toLowerCase().includes(q) ||
        (asg.description && asg.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!title.trim()) {
      setModalError('Please enter an assignment title.');
      return;
    }

    if (!dueDate) {
      setModalError('Please select a due date.');
      return;
    }

    setIsPublishing(true);

    try {
      const res = await createTeacherAssignment({
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        totalMarks: Number(totalMarks) || 10,
        allowLate,
        attachedFile,
        teacherEmail: teacher.email,
        teacherName: teacher.name,
      });

      setIsPublishing(false);

      if (!res.success) {
        setModalError(res.error || 'Failed to publish assignment.');
        return;
      }

      setModalSuccess(`"${title}" published successfully to enrolled students!`);
      setTimeout(() => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setAttachedFile(null);
        setModalSuccess('');
        onCloseCreateModal();
      }, 1500);
    } catch (err: any) {
      setIsPublishing(false);
      setModalError(err?.message || 'Error occurred while saving assignment.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#38271C]">
              Course Tasks & Assignments — <span className="text-[#493222] underline decoration-amber-600/40">{selectedSubject.name}</span>
            </h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              Create mandatory course tasks, set deadlines, and review student work for {selectedSubject.code}
            </p>
          </div>

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Create Assignment</span>
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {(['All', 'Active', 'Closed'] as const).map((tab) => {
              const isSelected = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                      : 'bg-white text-[#806A56] border border-[#E6D8C7] hover:text-[#38271C]'
                  }`}
                >
                  {tab}
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
              placeholder="Search assignments by title or task instructions..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>
        </div>
      </div>

      {/* 2. Assignments Cards List */}
      {filteredAssignments.length === 0 ? (
        <div className="p-8 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-2">
          <FileText className="w-10 h-10 text-[#806A56] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#38271C]">No Assignments Found</h3>
          <p className="text-xs text-[#806A56]">
            {searchQuery
              ? `No assignment matching "${searchQuery}" was found.`
              : 'No course assignments published yet for this subject.'}
          </p>
          <button
            onClick={onOpenCreateModal}
            className="mt-2 px-4 py-2 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create First Assignment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((asg) => (
            <div
              key={asg.id}
              className="p-5 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-3xl shadow-2xs space-y-3 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                      asg.status === 'closed'
                        ? 'bg-[#FDE8E4] text-[#C84B31]'
                        : 'bg-[#EAF2E9] text-[#668064]'
                    }`}
                  >
                    {asg.status === 'closed' ? 'Closed' : 'Active'}
                  </span>
                  <span className="text-xs font-semibold text-[#806A56] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#493222]" />
                    Due: {asg.dueDate}
                  </span>
                </div>

                <span className="text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2.5 py-1 rounded-xl self-start sm:self-auto">
                  {asg.totalMarks || 10} Total Marks
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-[#38271C]">
                  {asg.title}
                </h3>
                <p className="text-xs text-[#806A56] mt-1 leading-relaxed">
                  {asg.description || 'Complete the assignment questions according to guidelines.'}
                </p>
              </div>

              {asg.attachedFileName && (
                <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between text-xs text-[#493222]">
                  <div className="flex items-center gap-2 font-semibold truncate">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{asg.attachedFileName}</span>
                  </div>
                  {asg.attachedFileUrl && (
                    <a
                      href={asg.attachedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold underline hover:opacity-80 shrink-0"
                    >
                      View File
                    </a>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#E6D8C7]">
                <div className="flex items-center gap-1.5 text-xs text-[#806A56]">
                  <Users className="w-4 h-4 text-[#493222]" />
                  <span>Submissions Queue</span>
                </div>

                <button
                  onClick={() => onSelectAssignmentForSubmissions(asg)}
                  className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Submissions</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Assignment Modal */}
      {isOpenCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <h3 className="font-bold text-base text-[#38271C]">
                Create & Publish New Assignment
              </h3>
              <button
                onClick={onCloseCreateModal}
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5">
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
                  Assignment Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Assignment 01 - Functions & Loops in C++"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Description / Question Text *
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write full assignment instructions or questions for students..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#38271C] mb-1">
                    Due Date & Time *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#38271C] mb-1">
                    Total Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allow-late"
                  checked={allowLate}
                  onChange={(e) => setAllowLate(e.target.checked)}
                  className="w-4 h-4 accent-[#493222] rounded cursor-pointer"
                />
                <label
                  htmlFor="allow-late"
                  className="text-xs font-semibold text-[#38271C] cursor-pointer select-none"
                >
                  Allow Late Submissions
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Attach File (Optional)
                </label>
                <input
                  type="file"
                  onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                  className="text-xs text-[#806A56] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-[#EFE3D3] file:text-[#493222] file:font-bold hover:file:bg-[#E6D8C7] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={onCloseCreateModal}
                  className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isPublishing ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
