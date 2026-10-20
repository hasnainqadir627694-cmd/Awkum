import React, { useState } from 'react';
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
  Check,
} from 'lucide-react';
import { AssignmentItem } from '../../data/portalData';
import { uploadToCloudinary } from '../../lib/cloudinary';

interface AssignmentDetailModalProps {
  assignment: AssignmentItem | null;
  onClose: () => void;
  onSubmitWork: (assignmentId: string, answerText: string, fileName: string, fileUrl?: string) => void;
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

  if (!assignment) return null;

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
      setValidationError('Please provide a written answer or attach a solution file before submitting.');
      return;
    }
    setShowConfirm(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      let uploadedUrl = '';
      if (selectedFile) {
        const uploadResult = await uploadToCloudinary(selectedFile, 'awkum_classhub/submissions');
        uploadedUrl = uploadResult.secureUrl;
      }

      setIsSubmitting(false);
      setShowConfirm(false);
      onSubmitWork(
        assignment.id,
        answerText || 'Uploaded solution file to Cloudinary.',
        selectedFileName || 'Solution_Submission.pdf',
        uploadedUrl
      );
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(err?.message || 'Error uploading file to storage. Please try again.');
      setShowConfirm(false);
    }
  };

  const isSubmittedOrGraded =
    assignment.status === 'submitted' || assignment.status === 'graded';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#E6D8C7] bg-[#F8F0E5]">
          <div>
            <span className="text-[10px] font-bold text-[#806A56] uppercase tracking-wider">
              {assignment.subjectName} · {assignment.teacher}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-[#38271C] line-clamp-1">
              {assignment.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#806A56] hover:text-[#38271C] hover:bg-[#EFE3D3] rounded-lg transition-colors ml-2"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Key Meta Badges */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-center">
              <span className="text-[10px] font-semibold text-[#806A56] block">
                Total Marks
              </span>
              <span className="text-xs font-bold text-[#38271C]">
                {assignment.totalMarks} Points
              </span>
            </div>
            <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-center">
              <span className="text-[10px] font-semibold text-[#806A56] block">
                Due Date
              </span>
              <span className="text-xs font-bold text-[#38271C]">
                {assignment.dueDate.split(',')[0]}
              </span>
            </div>
            <div className="p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-center">
              <span className="text-[10px] font-semibold text-[#806A56] block">
                Status
              </span>
              <span
                className={`text-xs font-bold uppercase ${
                  assignment.status === 'graded'
                    ? 'text-[#493222]'
                    : assignment.status === 'submitted'
                    ? 'text-[#668064]'
                    : assignment.status === 'overdue'
                    ? 'text-[#C84B31]'
                    : 'text-[#C84B31]'
                }`}
              >
                {assignment.status}
              </span>
            </div>
          </div>

          {/* Graded Feedback Banner if graded */}
          {assignment.status === 'graded' && (
            <div className="p-3.5 bg-[#EAF2E9] border border-[#C5DBC3] rounded-xl">
              <div className="flex items-center gap-2 text-[#446342] font-bold text-xs mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#668064]" />
                <span>Score: {assignment.grade}</span>
              </div>
              <p className="text-xs text-[#446342]">
                Feedback: {assignment.teacherFeedback}
              </p>
            </div>
          )}

          {/* Instructions Box */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-[#38271C] uppercase tracking-wide">
              Assignment Instructions
            </h4>
            <div className="p-3.5 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] leading-relaxed whitespace-pre-line">
              {assignment.fullInstructions}
            </div>
          </div>

          {/* Teacher Attached Reference File */}
          {assignment.attachmentName && (
            <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#F8F0E5] rounded-lg text-[#493222]">
                  <Paperclip className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-[#38271C]">
                    {assignment.attachmentName}
                  </h5>
                  <span className="text-[10px] text-[#806A56]">
                    Reference Guidelines · {assignment.attachmentSize}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="px-2.5 py-1 text-xs font-semibold text-[#493222] bg-[#F8F0E5] hover:bg-[#EFE3D3] rounded-lg transition-colors flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
            </div>
          )}

          {/* Already Submitted View */}
          {isSubmittedOrGraded ? (
            <div className="p-4 bg-white border border-[#668064]/30 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#668064] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Your Submission Received
                </span>
                <span className="text-[10px] text-[#806A56]">
                  {assignment.submissionDate}
                </span>
              </div>

              {assignment.submittedFileName && (
                <div className="flex items-center gap-2 p-2 bg-[#F8F0E5] rounded-lg text-xs font-mono text-[#38271C]">
                  <FileCheck className="w-4 h-4 text-[#668064]" />
                  <span>{assignment.submittedFileName}</span>
                </div>
              )}

              {assignment.submittedContent && (
                <p className="text-xs text-[#806A56] bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  {assignment.submittedContent}
                </p>
              )}
            </div>
          ) : (
            /* Student Submission Form */
            <div className="space-y-3 pt-2 border-t border-[#E6D8C7]">
              <h4 className="text-xs font-bold text-[#38271C] uppercase tracking-wide">
                Your Work Submission
              </h4>

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
                  placeholder="Type your notes, solution summary, or code links here..."
                  className="w-full p-2.5 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder:text-[#B39E8A] outline-none focus:border-[#493222]"
                />
              </div>

              {/* File Attachment / Drag Drop */}
              <div>
                <label className="block text-xs font-semibold text-[#806A56] mb-1">
                  Upload Solution File (PDF, ZIP, CPP)
                </label>
                <div className="border-2 border-dashed border-[#E6D8C7] hover:border-[#493222] rounded-xl p-4 text-center bg-white cursor-pointer transition-colors relative">
                  <input
                    type="file"
                    onChange={handleFileSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    accept=".pdf,.zip,.cpp,.docx,.txt"
                  />
                  <Upload className="w-5 h-5 text-[#806A56] mx-auto mb-1" />
                  {selectedFileName ? (
                    <span className="text-xs font-bold text-[#668064] block">
                      {selectedFileName}
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-semibold text-[#493222] block">
                        Tap to select file
                      </span>
                      <span className="text-[10px] text-[#806A56] block mt-0.5">
                        PDF, C++ source, or ZIP up to 25MB
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#FFF9F1] border-t border-[#E6D8C7] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-xl transition-colors"
          >
            Close
          </button>

          {!isSubmittedOrGraded && (
            <button
              type="button"
              onClick={handleInitiateSubmit}
              className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-98"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Turn In Assignment</span>
            </button>
          )}
        </div>

        {/* Submission Confirmation Overlay */}
        {showConfirm && (
          <div className="absolute inset-0 z-30 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-[#F8F0E5] text-[#493222] flex items-center justify-center mx-auto">
                <Send className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-[#38271C]">
                Confirm Assignment Submission
              </h4>
              <p className="text-xs text-[#806A56]">
                Are you sure you want to turn in your work for{' '}
                <span className="font-semibold text-[#38271C]">
                  {assignment.title}
                </span>
                ? You can resubmit anytime before the deadline.
              </p>
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:bg-[#F3E9DD] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleFinalSubmit}
                  className="px-5 py-2 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-colors"
                >
                  {isSubmitting ? 'Submitting...' : 'Yes, Turn In'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
