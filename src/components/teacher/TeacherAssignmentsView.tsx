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
  Eye,
  Trash2,
  Power,
  RotateCcw,
  Check,
  UploadCloud,
  FileCheck2,
  HelpCircle,
} from 'lucide-react';
import { SubjectConfig, AdminUser } from '../../data/adminData';
import { AssignmentItem } from '../../data/portalData';
import {
  createTeacherAssignment,
  toggleTeacherAssignmentStatus,
  deleteTeacherAssignment,
} from '../../lib/teacherService';
import { VoiceRecorder } from './VoiceRecorder';
import { VoiceInstructionPlayer } from '../common/VoiceInstructionPlayer';
import { uploadToCloudinary, fileToDataUrl } from '../../lib/cloudinary';

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

  // Form State for Modern Title-First Assignment Creator
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [totalMarks, setTotalMarks] = useState<number>(10);
  const [allowLate, setAllowLate] = useState(false);

  // Attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Audio Voice Instruction state
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [voiceDurationFormatted, setVoiceDurationFormatted] = useState<string>('0:00');

  // Preview Mode inside creation modal
  const [showStudentPreview, setShowStudentPreview] = useState(false);

  // Publishing & status feedback
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingStep, setPublishingStep] = useState<string>('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // Action status on existing assignments
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<AssignmentItem | null>(null);

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

  const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachedFile(e.dataTransfer.files[0]);
    }
  };

  const handleVoiceReady = (blob: Blob | null, durationSec: number, formatted: string) => {
    setVoiceBlob(blob);
    setVoiceDuration(durationSec);
    setVoiceDurationFormatted(formatted);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!title.trim()) {
      setModalError('Please enter a clear assignment title.');
      return;
    }

    if (!dueDate) {
      setModalError('Please select a submission deadline date.');
      return;
    }

    setIsPublishing(true);

    try {
      let uploadedVoiceUrl = '';

      // Upload voice instructions if recorded
      if (voiceBlob) {
        setPublishingStep('Uploading spoken voice instructions...');
        try {
          const voiceFile =
            voiceBlob instanceof File
              ? voiceBlob
              : new File([voiceBlob], `voice_instructions_${Date.now()}.webm`, {
                  type: voiceBlob.type || 'audio/webm',
                });
          const uploadRes = await uploadToCloudinary(voiceFile, 'awkum_classhub/voice_instructions');
          uploadedVoiceUrl = uploadRes.secureUrl || uploadRes.url;
        } catch (voiceErr: any) {
          console.warn('[Teacher Publisher] Voice upload notice:', voiceErr);
          try {
            const fileForData =
              voiceBlob instanceof File
                ? voiceBlob
                : new File([voiceBlob], 'voice.webm', { type: voiceBlob.type || 'audio/webm' });
            const dataUrl = await fileToDataUrl(fileForData);
            uploadedVoiceUrl = dataUrl;
          } catch {}
        }
      }

      setPublishingStep('Publishing assignment to class stream...');

      // Format ISO deadline
      let computedDeadlineAt: string | undefined = undefined;
      try {
        const parsed = new Date(`${dueDate}T${dueTime.includes(':') ? dueTime : '23:59:00'}`);
        if (!isNaN(parsed.getTime())) {
          computedDeadlineAt = parsed.toISOString();
        }
      } catch {}

      // Format display time
      const [h, m] = dueTime.split(':');
      const hourNum = parseInt(h || '23', 10);
      const isPm = hourNum >= 12;
      const displayHours = hourNum % 12 || 12;
      const formattedDueTime = `${displayHours}:${m || '00'} ${isPm ? 'PM' : 'AM'}`;

      const res = await createTeacherAssignment({
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        title: title.trim(),
        description: description.trim(),
        dueDate,
        dueTime: formattedDueTime,
        deadlineAt: computedDeadlineAt,
        totalMarks: Number(totalMarks) || 10,
        allowLate,
        attachedFile,
        voiceInstructionUrl: uploadedVoiceUrl || undefined,
        voiceInstructionDuration: voiceDuration > 0 ? voiceDuration : undefined,
        voiceInstructionDurationFormatted: voiceDuration > 0 ? voiceDurationFormatted : undefined,
        teacherEmail: teacher.email,
        teacherName: teacher.name,
        teacherUid: teacher.uid,
        targetClass: selectedSubject.assignedClass || 'BSSE 1A',
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
        setDueTime('23:59');
        setAttachedFile(null);
        setVoiceBlob(null);
        setVoiceDuration(0);
        setVoiceDurationFormatted('0:00');
        setShowStudentPreview(false);
        setModalSuccess('');
        onCloseCreateModal();
      }, 1400);
    } catch (err: any) {
      setIsPublishing(false);
      setModalError(err?.message || 'Error occurred while publishing assignment.');
    }
  };

  const handleToggleStatus = async (asg: AssignmentItem) => {
    setActionLoadingId(asg.id);
    const newStatus = asg.status === 'closed' ? 'active' : 'closed';
    try {
      await toggleTeacherAssignmentStatus(asg.id, newStatus);
    } catch (err) {
      console.error('[Teacher Publisher] Error updating status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!assignmentToDelete) return;
    setActionLoadingId(assignmentToDelete.id);
    try {
      await deleteTeacherAssignment(assignmentToDelete.id);
      setAssignmentToDelete(null);
    } catch (err) {
      console.error('[Teacher Publisher] Error deleting assignment:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] font-mono text-[11px] font-bold rounded-lg">
                {selectedSubject.code || 'COURSE'}
              </span>
              {selectedSubject.assignedClass && (
                <span className="px-2.5 py-0.5 bg-[#EADBCC] text-[#493222] text-[11px] font-bold rounded-lg">
                  {selectedSubject.assignedClass}
                </span>
              )}
            </div>
            <h1 className="text-xl font-extrabold text-[#38271C]">
              Course Assignments — {selectedSubject.name}
            </h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              Publish course tasks, attach reference files, record voice instructions, and grade student submissions
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Create Assignment</span>
          </button>
        </div>

        {/* Filter Pills & Search */}
        <div className="space-y-3 pt-1 border-t border-[#E6D8C7]/60">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {(['All', 'Active', 'Closed'] as const).map((tab) => {
                const isSelected = activeTab === tab;
                const count =
                  tab === 'All'
                    ? assignments.length
                    : tab === 'Active'
                    ? assignments.filter((a) => a.status !== 'closed').length
                    : assignments.filter((a) => a.status === 'closed').length;

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                        : 'bg-white text-[#806A56] border border-[#E6D8C7] hover:text-[#38271C]'
                    }`}
                  >
                    <span>{tab}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected ? 'bg-amber-400 text-[#38271C]' : 'bg-[#EFE3D3] text-[#493222]'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <span className="text-xs text-[#806A56] font-semibold">
              Total Published: <strong>{assignments.length}</strong>
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#806A56] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assignments by title or instructions..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>
        </div>
      </div>

      {/* 2. Assignments Cards List */}
      {filteredAssignments.length === 0 ? (
        <div className="p-10 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EFE3D3] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#38271C]">No Assignments Found</h3>
            <p className="text-xs text-[#806A56] max-w-sm mx-auto mt-1">
              {searchQuery
                ? `No assignment matching "${searchQuery}" was found.`
                : 'No course assignments published yet for this subject. Tap below to create your first assignment.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="mt-2 px-4 py-2.5 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-amber-300" />
            <span>Create First Assignment</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAssignments.map((asg) => {
            const isClosed = asg.status === 'closed';

            return (
              <div
                key={asg.id}
                className="p-5 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-3xl shadow-2xs space-y-3 transition-colors"
              >
                {/* Meta row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        isClosed
                          ? 'bg-[#FDE8E4] text-[#C84B31] border border-[#F5C2B8]'
                          : 'bg-[#EAF2E9] text-[#668064] border border-[#C5DCC3]'
                      }`}
                    >
                      {isClosed ? 'Closed' : 'Active'}
                    </span>
                    <span className="text-xs font-semibold text-[#806A56] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#493222]" />
                      Due: {asg.dueDate} {asg.dueTime ? `(${asg.dueTime})` : ''}
                    </span>
                    {asg.allowLate && (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                        Late Accepted
                      </span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2.5 py-1 rounded-xl self-start sm:self-auto">
                    {asg.totalMarks || 10} Total Marks
                  </span>
                </div>

                {/* Assignment Title & Written Instructions */}
                <div>
                  <h3 className="font-bold text-base text-[#38271C]">
                    {asg.title}
                  </h3>
                  {asg.description && (
                    <p className="text-xs text-[#806A56] mt-1 leading-relaxed whitespace-pre-line">
                      {asg.description}
                    </p>
                  )}
                </div>

                {/* Voice Instructions Player (if present) */}
                {asg.voiceInstructionUrl && (
                  <div className="pt-1">
                    <VoiceInstructionPlayer
                      audioUrl={asg.voiceInstructionUrl}
                      durationFormatted={asg.voiceInstructionDurationFormatted}
                      title="Instructor Spoken Instructions"
                      compact={true}
                    />
                  </div>
                )}

                {/* Attached Teacher File (if present) */}
                {asg.attachedFileName && (
                  <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between text-xs text-[#493222]">
                    <div className="flex items-center gap-2 font-semibold truncate">
                      <Paperclip className="w-3.5 h-3.5 text-[#806A56] shrink-0" />
                      <span className="truncate">{asg.attachedFileName}</span>
                      {asg.attachedFileSize && (
                        <span className="text-[10px] text-[#806A56]">({asg.attachedFileSize})</span>
                      )}
                    </div>
                    {asg.attachedFileUrl && (
                      <a
                        href={asg.attachedFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-bold underline hover:opacity-80 shrink-0 ml-2"
                      >
                        View File
                      </a>
                    )}
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2.5 border-t border-[#E6D8C7] flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-[#806A56]">
                    <Users className="w-4 h-4 text-[#493222]" />
                    <span>Review Submissions Queue</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(asg)}
                      disabled={actionLoadingId === asg.id}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        isClosed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-white text-[#806A56] border-[#D8C7B4] hover:bg-[#F8F0E5]'
                      }`}
                      title={isClosed ? 'Reopen assignment for submissions' : 'Close assignment to stop submissions'}
                    >
                      <Power className="w-3 h-3" />
                      <span>{isClosed ? 'Reopen' : 'Close'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAssignmentToDelete(asg)}
                      className="p-1.5 text-[#806A56] hover:text-[#C84B31] hover:bg-[#FDE8E4] rounded-xl transition-colors cursor-pointer"
                      title="Delete assignment"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onSelectAssignmentForSubmissions(asg)}
                      className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Review Submissions</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Modern Title-First Creation Modal */}
      {isOpenCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 max-w-xl w-full shadow-2xl space-y-4 animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
                  Course Task Publisher
                </span>
                <h3 className="font-extrabold text-base text-[#38271C]">
                  Create New Assignment
                </h3>
              </div>
              <button
                type="button"
                onClick={onCloseCreateModal}
                className="p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#EFE3D3] rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error & Success Feedback */}
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

            {/* LIVE PREVIEW TOGGLE BANNER */}
            <div className="flex items-center justify-between p-2.5 bg-[#EFE3D3]/60 border border-[#E6D8C7] rounded-2xl">
              <span className="text-xs font-semibold text-[#493222] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Student Card</span>
              </span>
              <button
                type="button"
                onClick={() => setShowStudentPreview(!showStudentPreview)}
                className="px-3 py-1 bg-white hover:bg-[#F8F0E5] text-[#493222] border border-[#D8C7B4] rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                {showStudentPreview ? 'Edit Form' : 'Show Live Preview'}
              </button>
            </div>

            {showStudentPreview ? (
              /* Live Preview Card */
              <div className="p-4 bg-white border-2 border-dashed border-[#493222] rounded-2xl space-y-3">
                <div className="flex items-center justify-between text-xs pb-1 border-b border-gray-100">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live Student View Mockup
                  </span>
                  <span className="text-[11px] text-[#806A56] font-mono">
                    {totalMarks || 10} Marks · Due {dueDate || 'Upcoming'}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wide">
                    {selectedSubject.name} · {teacher.name}
                  </span>
                  <h4 className="text-base font-extrabold text-[#38271C]">
                    {title || 'Untitled Assignment'}
                  </h4>
                </div>

                {description && (
                  <p className="text-xs text-[#806A56] leading-relaxed whitespace-pre-line bg-[#FFF9F1] p-3 rounded-xl border border-[#E6D8C7]">
                    {description}
                  </p>
                )}

                {voiceBlob && (
                  <div className="pt-1">
                    <VoiceInstructionPlayer
                      audioUrl={URL.createObjectURL(voiceBlob)}
                      durationFormatted={voiceDurationFormatted}
                      title="Instructor Spoken Instructions"
                      compact={true}
                    />
                  </div>
                )}

                {attachedFile && (
                  <div className="p-2.5 bg-[#F8F0E5] rounded-xl flex items-center gap-2 text-xs font-semibold text-[#493222]">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{attachedFile.name}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Title-First Creation Form */
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                {/* 1. Subject Scope (Auto-Bound) */}
                <div className="p-3 bg-[#EFE3D3]/50 border border-[#D8C7B4] rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#806A56] block">
                      Target Course Scope
                    </span>
                    <span className="font-bold text-[#38271C]">
                      {selectedSubject.name} ({selectedSubject.code})
                    </span>
                  </div>
                  {selectedSubject.assignedClass && (
                    <span className="px-2.5 py-1 bg-white border border-[#D8C7B4] rounded-lg font-bold text-[#493222] text-[11px]">
                      {selectedSubject.assignedClass}
                    </span>
                  )}
                </div>

                {/* 2. Assignment Title (Mandatory, Bold Title-First) */}
                <div>
                  <label className="block text-xs font-bold text-[#38271C] mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Assignment 02 — Binary Search Trees & Recursion"
                    className="w-full px-4 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-sm font-bold text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>

                {/* 3. Reference File Attachment (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-[#38271C] mb-1">
                    Attach Reference File / Problem Sheet (Optional)
                  </label>

                  {attachedFile ? (
                    <div className="p-3 bg-white border border-[#668064]/50 rounded-2xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 truncate font-semibold text-[#493222]">
                        <FileCheck2 className="w-4 h-4 text-[#668064] shrink-0" />
                        <span className="truncate">{attachedFile.name}</span>
                        <span className="text-[10px] text-[#806A56]">
                          ({(attachedFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="p-1 text-[#C84B31] hover:bg-[#FDE8E4] rounded-lg transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      className="border-2 border-dashed border-[#D8C7B4] hover:border-[#493222] rounded-2xl p-3.5 text-center bg-white cursor-pointer transition-colors block"
                    >
                      <input
                        type="file"
                        onChange={(e) => setAttachedFile(e.target.files?.[0] || null)}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.zip,.ppt,.pptx,.txt,.cpp,.py"
                      />
                      <UploadCloud className="w-5 h-5 text-[#806A56] mx-auto mb-1" />
                      <span className="text-xs font-semibold text-[#493222] block">
                        Tap to attach PDF, problem sheet, or starter code
                      </span>
                      <span className="text-[10px] text-[#806A56] block mt-0.5">
                        Supports PDF, Word, ZIP, Code up to 30MB
                      </span>
                    </label>
                  )}
                </div>

                {/* 4. Written Instructions (Optional) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-[#38271C]">
                      Written Instructions & Question Text (Optional)
                    </label>
                    <span className="text-[10px] text-[#806A56]">Plain text / Markdown</span>
                  </div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide written instructions, problem statements, submission requirements, or coding guidelines..."
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222] leading-relaxed"
                  />
                </div>

                {/* 5. Voice Instructions (Optional in-browser recording) */}
                <div>
                  <label className="block text-xs font-bold text-[#38271C] mb-1">
                    Spoken Voice Instructions (Optional)
                  </label>
                  <VoiceRecorder
                    onAudioReady={handleVoiceReady}
                    disabled={isPublishing}
                  />
                </div>

                {/* 6. Total Marks & Submission Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#38271C] mb-1">
                      Total Marks *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={totalMarks}
                      onChange={(e) => setTotalMarks(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222] font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#38271C] mb-1">
                      Due Date *
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
                      Due Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={dueTime}
                      onChange={(e) => setDueTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                    />
                  </div>
                </div>

                {/* 7. Late Submission Policy Toggle */}
                <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#38271C] block">
                      Allow Late Submissions
                    </span>
                    <span className="text-[11px] text-[#806A56] block">
                      If disabled, submissions automatically close once the deadline passes.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    id="allow-late"
                    checked={allowLate}
                    onChange={(e) => setAllowLate(e.target.checked)}
                    className="w-4 h-4 accent-[#493222] rounded cursor-pointer shrink-0"
                  />
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6D8C7]">
                  <button
                    type="button"
                    onClick={onCloseCreateModal}
                    className="px-4 py-2.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishing}
                    className="px-6 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-95"
                  >
                    {isPublishing ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{publishingStep || 'Publishing...'}</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-amber-300" />
                        <span>Publish Assignment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#38271C]">Delete Assignment</h3>
                <p className="text-xs text-[#806A56] mt-0.5">
                  Are you sure you want to permanently delete this course assignment?
                </p>
              </div>
            </div>

            <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl text-xs font-bold text-[#38271C]">
              {assignmentToDelete.title}
            </div>

            <p className="text-[11px] text-[#806A56]">
              All student submissions associated with this assignment ID will be affected.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-[#C84B31] hover:bg-[#A73B24] text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                Yes, Delete Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
