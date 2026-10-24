import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  Send,
  Eye,
  FileImage,
  X,
  Edit3,
  BookOpen,
  ArrowLeft,
  Check,
  Info,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  WeeklySchedule,
  SchedulePeriodItem,
  saveScheduleDraft,
  publishSchedule,
  getPublishedSchedule,
  getScheduleDraft,
} from '../../lib/scheduleService';
import { getCachedSubjects, subscribeToCurriculumSubjects } from '../../lib/subjectService';
import { SubjectConfig } from '../../data/adminData';

interface CRSchedulePlannerViewProps {
  assignedClass: string;
  crUser: { id: string; name: string; email: string; uid?: string };
  onBackToDashboard: () => void;
}

export const CRSchedulePlannerView: React.FC<CRSchedulePlannerViewProps> = ({
  assignedClass,
  crUser,
  onBackToDashboard,
}) => {
  const [activeSchedule, setActiveSchedule] = useState<WeeklySchedule | null>(null);
  const [draftSchedule, setDraftSchedule] = useState<WeeklySchedule | null>(null);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectConfig[]>([]);

  // Image Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Processing & UI State
  const [isProcessingAI, setIsProcessingAI] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [showPublishModal, setShowPublishModal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit Cell Modal State
  const [editingItem, setEditingItem] = useState<SchedulePeriodItem | null>(null);

  // Load existing published schedule, draft, and curriculum subjects
  useEffect(() => {
    getPublishedSchedule(assignedClass).then((pub) => {
      if (pub) setActiveSchedule(pub);
    });

    getScheduleDraft(assignedClass).then((dr) => {
      if (dr && dr.status === 'draft') setDraftSchedule(dr);
    });

    setAvailableSubjects(getCachedSubjects());
    const unsubscribeSubjects = subscribeToCurriculumSubjects((subs) => {
      setAvailableSubjects(subs);
    });

    return () => unsubscribeSubjects();
  }, [assignedClass]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setUploadError(null);

    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
      setUploadError('Unsupported format. Please select a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setFilePreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Process Timetable with Gemini AI Vision API Endpoint
  const handleProcessTimetableWithAI = async () => {
    if (!filePreviewUrl) {
      setUploadError('Please select a timetable image first.');
      return;
    }

    setIsProcessingAI(true);
    setUploadError(null);
    setProcessingStep('Preparing image for secure AI analysis...');

    try {
      setProcessingStep('Analyzing timetable layout with Gemini Vision AI...');

      const response = await fetch('/api/schedule/analyze-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: filePreviewUrl,
          classId: assignedClass,
          crEmail: crUser.email,
          crUid: crUser.uid || crUser.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract schedule from image.');
      }

      setProcessingStep('Matching extracted subjects against database curriculum...');

      const extractedDraft: WeeklySchedule = data.draft;
      setDraftSchedule(extractedDraft);

      // Save draft persistently in Firestore
      await saveScheduleDraft(extractedDraft);

      showToast(`AI successfully extracted ${extractedDraft.items.length} classes across ${extractedDraft.days.length} days!`);
    } catch (err: any) {
      console.error('[CR Schedule AI Error]:', err);
      setUploadError(err?.message || 'An error occurred during AI image processing.');
    } finally {
      setIsProcessingAI(false);
      setProcessingStep('');
    }
  };

  // Handle Item Editing
  const handleSaveEditedItem = (updated: SchedulePeriodItem) => {
    if (!draftSchedule) return;

    const updatedItems = draftSchedule.items.map((item) => (item.id === updated.id ? updated : item));
    const newDraft: WeeklySchedule = { ...draftSchedule, items: updatedItems };

    setDraftSchedule(newDraft);
    saveScheduleDraft(newDraft);
    setEditingItem(null);
    showToast('Schedule cell updated in draft.');
  };

  // Delete an item from draft
  const handleDeleteItemFromDraft = (itemId: string) => {
    if (!draftSchedule) return;

    const updatedItems = draftSchedule.items.filter((item) => item.id !== itemId);
    const newDraft: WeeklySchedule = { ...draftSchedule, items: updatedItems };

    setDraftSchedule(newDraft);
    saveScheduleDraft(newDraft);
    showToast('Class item removed from schedule.');
  };

  // Confirm & Publish Schedule
  const handleConfirmAndPublish = async () => {
    if (!draftSchedule || draftSchedule.items.length === 0) {
      showToast('Cannot publish an empty schedule.', 'error');
      return;
    }

    setIsPublishing(true);
    try {
      const res = await publishSchedule(draftSchedule, {
        uid: crUser.uid || crUser.id,
        email: crUser.email,
        name: crUser.name,
      });

      if (!res.success) {
        throw new Error(res.error || 'Publication failed.');
      }

      const publishedVer = res.version || 1;
      const updatedPub: WeeklySchedule = {
        ...draftSchedule,
        status: 'published',
        publishedVersion: publishedVer,
        publishedAt: new Date().toISOString(),
        publishedBy: { uid: crUser.uid || crUser.id, email: crUser.email, name: crUser.name },
      };

      setActiveSchedule(updatedPub);
      setDraftSchedule(null);
      setShowPublishModal(false);
      setSelectedFile(null);
      setFilePreviewUrl(null);

      showToast(`Official Weekly Schedule v${publishedVer} published successfully! Live for all students.`);
    } catch (err: any) {
      showToast(err?.message || 'Failed to publish schedule.', 'error');
    } finally {
      setIsPublishing(false);
    }
  };

  const daysList: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun')[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const currentDisplaySchedule = draftSchedule || activeSchedule;

  return (
    <div className="space-y-5 pb-24 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-xl flex items-center gap-2 animate-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-[#493222] text-[#FFF9F1] border border-amber-500/30'
              : 'bg-red-800 text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-300" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={onBackToDashboard}
              className="p-1 rounded-lg hover:bg-[#F3E9DD] text-[#806A56] hover:text-[#38271C] transition-colors"
              title="Back to CR Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="bg-[#493222] text-[#FFF9F1] text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md">
              {assignedClass}
            </span>
            {activeSchedule ? (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Published v{activeSchedule.publishedVersion}
              </span>
            ) : draftSchedule ? (
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                Draft in Review
              </span>
            ) : (
              <span className="bg-[#EFE3D3] text-[#806A56] text-[10px] font-semibold px-2 py-0.5 rounded-md">
                No Active Timetable
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            AI Weekly Schedule Planner
          </h2>
          <p className="text-xs text-[#806A56] mt-0.5">
            Upload official timetable image → AI extraction → Confirm & publish to students
          </p>
        </div>

        {draftSchedule && (
          <button
            type="button"
            onClick={() => setShowPublishModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Send className="w-4 h-4 text-amber-300" />
            <span>Confirm & Publish</span>
          </button>
        )}
      </div>

      {/* Upload Timetable Image Area */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#F8F0E5] text-[#493222]">
              <Sparkles className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#38271C]">
                Upload Official Timetable Image
              </h3>
              <p className="text-xs text-[#806A56]">
                JPG, PNG, or WEBP up to 10MB. AI Vision extracts class slots automatically.
              </p>
            </div>
          </div>
        </div>

        {uploadError && (
          <div className="p-3 bg-[#FFF5F5] border border-red-200 rounded-xl text-xs font-medium text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{uploadError}</span>
            </div>
            {filePreviewUrl && (
              <button
                type="button"
                onClick={handleProcessTimetableWithAI}
                disabled={isProcessingAI}
                className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded-lg font-bold text-[11px] transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isProcessingAI ? 'animate-spin' : ''}`} />
                <span>Retry AI Analysis</span>
              </button>
            )}
          </div>
        )}

        {/* Dropzone / File Selector */}
        {!filePreviewUrl ? (
          <label className="border-2 border-dashed border-[#E6D8C7] hover:border-[#493222] bg-[#FFFDF9] rounded-2xl p-6 text-center cursor-pointer flex flex-col items-center justify-center gap-2 transition-all group">
            <div className="w-12 h-12 rounded-full bg-[#F8F0E5] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Upload className="w-6 h-6 text-[#493222]" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#38271C] group-hover:underline">
                Click or drag timetable image here
              </span>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Supports mobile camera capture & desktop files
              </p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="relative rounded-2xl border border-[#E6D8C7] overflow-hidden bg-black/5 max-h-72 flex items-center justify-center p-2">
              <img
                src={filePreviewUrl}
                alt="Uploaded Timetable"
                className="max-h-64 object-contain rounded-lg shadow-sm"
              />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setFilePreviewUrl(null);
                }}
                className="absolute top-3 right-3 p-1.5 bg-[#38271C]/80 hover:bg-[#38271C] text-white rounded-full shadow-md transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#806A56] truncate max-w-xs">
                {selectedFile?.name || 'Timetable_Image.png'}
              </span>

              <button
                type="button"
                onClick={handleProcessTimetableWithAI}
                disabled={isProcessingAI}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] disabled:opacity-60 text-[#FFF9F1] rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {isProcessingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Extract Timetable with Gemini AI</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* AI Processing Progress Card */}
        {isProcessingAI && (
          <div className="p-4 bg-[#F8F0E5] border border-amber-300/60 rounded-xl space-y-2 animate-pulse">
            <div className="flex items-center gap-2 text-xs font-bold text-[#493222]">
              <Sparkles className="w-4 h-4 text-amber-700 animate-spin" />
              <span>{processingStep}</span>
            </div>
            <div className="w-full bg-[#E6D8C7] h-2 rounded-full overflow-hidden">
              <div className="bg-[#493222] h-full w-2/3 animate-pulse rounded-full" />
            </div>
          </div>
        )}
      </div>

      {/* Timetable Review & Published Display Grid */}
      {currentDisplaySchedule && (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#493222]" />
              <h3 className="text-sm font-bold text-[#38271C]">
                {draftSchedule ? 'Draft Schedule Review (AI Extracted)' : 'Current Published Timetable'}
              </h3>
            </div>

            {draftSchedule && (
              <span className="text-xs font-bold text-[#806A56]">
                {draftSchedule.items.length} Class Slots Extracted
              </span>
            )}
          </div>

          {/* Warnings Panel */}
          {currentDisplaySchedule.items.some((i) => !i.isMatched) && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Subject Matching Notice:</span> Some extracted class labels need verification. Click on any highlighted slot to match with official database subjects before publishing.
              </div>
            </div>
          )}

          {/* Schedule Grid View */}
          <div className="space-y-4">
            {daysList.map((day) => {
              const dayItems = currentDisplaySchedule.items.filter((i) => i.day === day);
              if (dayItems.length === 0 && !draftSchedule) return null; // Skip empty days in published view

              return (
                <div key={day} className="border border-[#E6D8C7] rounded-xl p-3 bg-[#FFFDF9]">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#E6D8C7]">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#493222]">
                      {day}
                    </span>
                    <span className="text-[11px] font-semibold text-[#806A56]">
                      {dayItems.length === 0 ? 'No Classes (Free Day)' : `${dayItems.length} Sessions`}
                    </span>
                  </div>

                  {dayItems.length === 0 ? (
                    <p className="text-xs text-[#806A56] italic py-2 text-center">
                      No classes scheduled for {day}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {dayItems.map((item) => (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl border transition-all relative ${
                            !item.isMatched
                              ? 'bg-amber-50/60 border-amber-300'
                              : 'bg-[#FFF9F1] border-[#E6D8C7]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[10px] font-extrabold bg-[#EFE3D3] text-[#38271C] px-1.5 py-0.5 rounded">
                                  {item.startTime} – {item.endTime}
                                </span>
                                {item.isMatched ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Matched
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" /> Unmatched
                                  </span>
                                )}
                              </div>

                              <h4 className="text-xs font-bold text-[#38271C]">
                                {item.subjectName} ({item.subjectCode})
                              </h4>

                              {item.teacherName && (
                                <p className="text-[11px] text-[#806A56] mt-0.5">
                                  Faculty: {item.teacherName}
                                </p>
                              )}
                            </div>

                            {/* Edit / Remove controls for CR draft */}
                            {draftSchedule && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(item)}
                                  className="p-1 text-[#806A56] hover:text-[#38271C] rounded-md hover:bg-[#F3E9DD]"
                                  title="Edit Cell"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItemFromDraft(item.id)}
                                  className="p-1 text-red-600 hover:text-red-800 rounded-md hover:bg-red-50"
                                  title="Remove Cell"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Cell Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <h3 className="font-bold text-sm text-[#38271C] flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#493222]" />
                Edit Class Period
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Match with Registered Curriculum Subject
                </label>
                <select
                  value={editingItem.subjectId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const matched = availableSubjects.find((s) => s.id === selId);
                    if (matched) {
                      setEditingItem({
                        ...editingItem,
                        subjectId: matched.id,
                        subjectCode: matched.code,
                        subjectName: matched.name,
                        teacherName: matched.assignedTeacher || undefined,
                        isMatched: true,
                        matchWarning: undefined,
                      });
                    }
                  }}
                  className="w-full text-xs font-semibold p-2.5 rounded-xl border border-[#E6D8C7] bg-white text-[#38271C]"
                >
                  <option value={editingItem.subjectId}>
                    Current: {editingItem.subjectName} ({editingItem.subjectCode})
                  </option>
                  {availableSubjects.map((subj) => (
                    <option key={subj.id} value={subj.id}>
                      {subj.name} ({subj.code}) — {subj.assignedTeacher || 'No Teacher'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-[#38271C] mb-1">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={editingItem.startTime}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        startTime: e.target.value,
                        periodLabel: `${e.target.value} - ${editingItem.endTime}`,
                      })
                    }
                    className="w-full text-xs p-2 rounded-xl border border-[#E6D8C7] bg-white text-[#38271C]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#38271C] mb-1">
                    End Time
                  </label>
                  <input
                    type="text"
                    value={editingItem.endTime}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        endTime: e.target.value,
                        periodLabel: `${editingItem.startTime} - ${e.target.value}`,
                      })
                    }
                    className="w-full text-xs p-2 rounded-xl border border-[#E6D8C7] bg-white text-[#38271C]"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-3 py-1.5 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditedItem(editingItem)}
                className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm & Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#F8F0E5] text-[#493222]">
                <Send className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#38271C]">
                  Confirm & Publish Schedule
                </h3>
                <p className="text-xs text-[#806A56]">{assignedClass} Official Timetable</p>
              </div>
            </div>

            <p className="text-xs text-[#806A56]">
              Publishing will persistently save this schedule in Firebase and update the Student Portal in real time for all students enrolled in <strong className="text-[#38271C]">{assignedClass}</strong>.
            </p>

            <div className="flex items-center justify-between pt-2 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndPublish}
                disabled={isPublishing}
                className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] disabled:opacity-60 text-[#FFF9F1] text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirm & Publish</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
