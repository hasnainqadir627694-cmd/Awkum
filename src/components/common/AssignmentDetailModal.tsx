import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  Award,
  Paperclip,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Send,
  Download,
  Lock,
  ExternalLink,
} from 'lucide-react';
import { AssignmentItem } from '../../data/portalData';
import { uploadToCloudinary } from '../../lib/cloudinary';
import { VoiceInstructionPlayer } from './VoiceInstructionPlayer';

interface AssignmentDetailModalProps {
  assignment: AssignmentItem | null;
  onClose: () => void;
  onSubmitWork: (
    assignmentId: string,
    answerText: string,
    fileName: string,
    fileUrl?: string,
    isLate?: boolean
  ) => void;
}

export const AssignmentDetailModal: React.FC<AssignmentDetailModalProps> = ({
  assignment,
  onClose,
  onSubmitWork,
}) => {
  const [answerText, setAnswerText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [isEditingSubmission, setIsEditingSubmission] = useState(false);

  // Reset local state whenever assignment prop changes
  useEffect(() => {
    setAnswerText('');
    setSelectedFile(null);
    setSelectedFileName('');
    setIsSubmitting(false);
    setShowConfirm(false);
    setValidationError('');
    setIsEditingSubmission(false);
  }, [assignment?.id]);

  if (!assignment) return null;

  const now = Date.now();
  let deadlineEpoch = 0;
  if (assignment.deadlineAt) {
    deadlineEpoch = new Date(assignment.deadlineAt).getTime();
  } else if (assignment.dueDate) {
    deadlineEpoch = new Date(`${assignment.dueDate}T23:59:59`).getTime();
  }

  const isPastDeadline = deadlineEpoch > 0 && now > deadlineEpoch;
  const isClosed =
    assignment.status === 'closed' || (isPastDeadline && !assignment.allowLate);
  const isLateAllowed = isPastDeadline && !!assignment.allowLate;

  const isSubmittedOrGraded =
    assignment.status === 'submitted' || assignment.status === 'graded';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setSelectedFileName(file.name);
      setValidationError('');
    }
  };

  const handleInitiateSubmit = () => {
    setValidationError('');
    if (!answerText.trim() && !selectedFileName) {
      setValidationError(
        'Please provide a written response or upload a solution file before submitting.'
      );
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      let uploadedUrl = '';
      if (selectedFile) {
        const uploadResult = await uploadToCloudinary(
          selectedFile,
          'awkum_classhub/submissions'
        );
        uploadedUrl = uploadResult.secureUrl;
      }

      setIsSubmitting(false);
      setShowConfirm(false);
      onSubmitWork(
        assignment.id,
        answerText || 'Uploaded solution file.',
        selectedFileName || 'Solution_Submission.pdf',
        uploadedUrl,
        isPastDeadline
      );
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(
        err?.message || 'Error uploading file to storage. Please try again.'
      );
      setShowConfirm(false);
    }
  };

  const attachedName =
    assignment.attachedFileName || assignment.attachmentName || '';
  const attachedUrl =
    assignment.attachedFileUrl || (assignment as any).attachmentUrl || '';
  const attachedSize =
    assignment.attachedFileSize || assignment.attachmentSize || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#E6D8C7] bg-[#F8F0E5]">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider block">
              {assignment.subjectName} · {assignment.teacher}
            </span>
            <h3 className="text-base sm:text-lg font-extrabold text-[#38271C] truncate">
              {assignment.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#EFE3D3] rounded-xl transition-colors shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Key Meta Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#806A56] uppercase block">
                Total Marks
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#38271C]">
                {assignment.totalMarks} Points
              </span>
            </div>
            <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#806A56] uppercase block">
                Due Date
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-[#38271C]">
                {assignment.dueDate.split(',')[0]}
              </span>
            </div>
            <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl text-center shadow-2xs">
              <span className="text-[10px] font-bold text-[#806A56] uppercase block">
                Status
              </span>
              <span
                className={`text-xs font-bold uppercase ${
                  assignment.status === 'graded'
                    ? 'text-[#493222]'
                    : assignment.status === 'submitted'
                    ? 'text-[#668064]'
                    : isClosed
                    ? 'text-[#C84B31]'
                    : 'text-amber-800'
                }`}
              >
                {assignment.status === 'graded'
                  ? 'Graded'
                  : assignment.status === 'submitted'
                  ? 'Submitted'
                  : isClosed
                  ? 'Closed'
                  : 'To Do'}
              </span>
            </div>
          </div>

          {/* Graded Feedback Banner if graded */}
          {assignment.status === 'graded' && (
            <div className="p-4 bg-[#EAF2E9] border border-[#C5DBC3] rounded-2xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#446342] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#668064]" />
                  <span>Evaluation & Marks</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#446342] bg-white/80 px-2 py-0.5 rounded-md">
                  {assignment.grade} / {assignment.totalMarks} Marks
                </span>
              </div>
              {assignment.teacherFeedback && (
                <p className="text-xs text-[#446342] pt-1">
                  <strong>Feedback:</strong> {assignment.teacherFeedback}
                </p>
              )}
            </div>
          )}

          {/* Voice Instructions Player if present */}
          {assignment.voiceInstructionUrl && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-[#38271C] uppercase tracking-wide block">
                Spoken Voice Instructions
              </span>
              <VoiceInstructionPlayer
                audioUrl={assignment.voiceInstructionUrl}
                durationFormatted={assignment.voiceInstructionDurationFormatted}
                title="Instructor Voice Guidance"
              />
            </div>
          )}

          {/* Instructions Box */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold text-[#38271C] uppercase tracking-wide">
              Assignment Instructions
            </h4>
            <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-2xl text-xs text-[#38271C] leading-relaxed whitespace-pre-line shadow-2xs">
              {assignment.fullInstructions ||
                assignment.description ||
                'Complete the questions according to course guidelines.'}
            </div>
          </div>

          {/* Teacher Attached Reference File */}
          {attachedName && (
            <div className="p-3 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5 truncate pr-2">
                <div className="p-2 bg-[#F8F0E5] rounded-xl text-[#493222] shrink-0">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <h5 className="text-xs font-bold text-[#38271C] truncate">
                    {attachedName}
                  </h5>
                  <span className="text-[10px] text-[#806A56]">
                    Course Reference Guidelines {attachedSize ? `· ${attachedSize}` : ''}
                  </span>
                </div>
              </div>
              {attachedUrl && (
                <a
                  href={attachedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-bold text-[#493222] bg-[#F8F0E5] hover:bg-[#EFE3D3] rounded-xl transition-colors flex items-center gap-1 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>
              )}
            </div>
          )}

          {/* Already Submitted View */}
          {isSubmittedOrGraded && !isEditingSubmission ? (
            <div className="p-4 bg-white border border-[#668064]/30 rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#668064] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Your Submission Received
                </span>
                <span className="text-[10px] text-[#806A56]">
                  {assignment.submissionDate || 'Recently'}
                </span>
              </div>

              {assignment.submittedFileName && (
                <div className="flex items-center justify-between p-2.5 bg-[#F8F0E5] rounded-xl text-xs font-mono text-[#38271C]">
                  <div className="flex items-center gap-2 truncate pr-2">
                    <FileCheck className="w-4 h-4 text-[#668064] shrink-0" />
                    <span className="truncate">{assignment.submittedFileName}</span>
                  </div>
                  {assignment.submittedFileUrl && (
                    <a
                      href={assignment.submittedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-[#493222] underline shrink-0"
                    >
                      View
                    </a>
                  )}
                </div>
              )}

              {assignment.submittedContent && (
                <p className="text-xs text-[#806A56] bg-gray-50 p-2.5 rounded-xl border border-gray-100 leading-relaxed whitespace-pre-line">
                  {assignment.submittedContent}
                </p>
              )}

              {/* Allow resubmission/updating before deadline if not yet graded */}
              {!isClosed && assignment.status !== 'graded' && (
                <div className="pt-2 border-t border-[#E6D8C7] flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAnswerText(assignment.submittedContent || '');
                      setSelectedFileName(assignment.submittedFileName || '');
                      setIsEditingSubmission(true);
                    }}
                    className="px-3.5 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5 text-amber-300" />
                    <span>Update / Resubmit Work</span>
                  </button>
                </div>
              )}
            </div>
          ) : isClosed && !isEditingSubmission ? (
            /* Submissions Closed Notice */
            <div className="p-4 bg-[#FDE8E4] border border-[#F5C2B8] rounded-2xl space-y-1 text-center">
              <Lock className="w-6 h-6 text-[#C84B31] mx-auto mb-1" />
              <h5 className="text-xs font-bold text-[#C84B31]">Submissions Closed</h5>
              <p className="text-[11px] text-[#C84B31]">
                The submission deadline for this assignment has passed ({assignment.dueDate}), and late submissions are not accepted.
              </p>
            </div>
          ) : (
            /* Student Submission Form (or Edit/Resubmit Form) */
            <div className="space-y-3 pt-2 border-t border-[#E6D8C7]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#38271C] uppercase tracking-wide">
                  {isEditingSubmission ? 'Update Your Work Submission' : 'Your Work Submission'}
                </h4>
                {isLateAllowed && (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                    Late Submission Permitted
                  </span>
                )}
              </div>

              {validationError && (
                <div className="p-2.5 bg-[#FDE8E4] border border-[#F5C2B8] rounded-xl flex items-center gap-2 text-xs text-[#C84B31]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              {/* Text answer input */}
              <div>
                <label className="block text-xs font-semibold text-[#806A56] mb-1">
                  Written Response / Explanation
                </label>
                <textarea
                  rows={3}
                  value={answerText}
                  onChange={(e) => {
                    setAnswerText(e.target.value);
                    setValidationError('');
                  }}
                  placeholder="Type your solution summary, answers, or notes..."
                  className="w-full p-3 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder:text-[#B39E8A] outline-none focus:border-[#493222] leading-relaxed"
                />
              </div>

              {/* File Attachment / Drag Drop */}
              <div>
                <label className="block text-xs font-semibold text-[#806A56] mb-1">
                  Upload Solution File (PDF, ZIP, CPP, DOCX)
                </label>
                <div className="border-2 border-dashed border-[#E6D8C7] hover:border-[#493222] rounded-2xl p-4 text-center bg-white cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.zip,.cpp,.docx,.txt,.py,.java"
                  />
                  <Upload className="w-5 h-5 text-[#806A56] mx-auto mb-1" />
                  {selectedFileName ? (
                    <span className="text-xs font-bold text-[#668064] block">
                      {selectedFileName}
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-[#493222] block">
                        Tap or drag to select solution file
                      </span>
                      <span className="text-[10px] text-[#806A56] block mt-0.5">
                        PDF, C++ source, Word, or ZIP up to 25MB
                      </span>
                    </>
                  )}
                </div>
              </div>

              {isEditingSubmission && (
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingSubmission(false)}
                    className="text-xs text-[#806A56] hover:text-[#38271C] underline cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#FFF9F1] border-t border-[#E6D8C7] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>

          {(!isSubmittedOrGraded || isEditingSubmission) && !isClosed && (
            <button
              type="button"
              onClick={handleInitiateSubmit}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-98 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isEditingSubmission
                  ? 'Update & Resubmit Work'
                  : isLateAllowed
                  ? 'Submit (Late)'
                  : 'Submit Work'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog before submitting */}
      {showConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 max-w-sm w-full shadow-2xl space-y-3 animate-in zoom-in-95">
            <h4 className="font-extrabold text-sm text-[#38271C]">
              Confirm Assignment Submission
            </h4>
            <p className="text-xs text-[#806A56] leading-relaxed">
              Are you ready to submit your work for <strong>{assignment.title}</strong>? Your instructor will receive this submission directly.
            </p>
            {isPastDeadline && (
              <p className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2 rounded-xl border border-amber-200">
                Notice: The official deadline has passed. This work will be submitted as late.
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-2 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-xl cursor-pointer"
              >
                Review
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? 'Uploading...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
