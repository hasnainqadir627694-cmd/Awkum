import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Search,
  CheckCircle2,
  X,
  AlertCircle,
  Megaphone,
} from 'lucide-react';
import { SubjectConfig, AdminUser } from '../../data/adminData';
import { NoticeItem } from '../../data/portalData';
import { createTeacherNotice } from '../../lib/teacherService';

interface TeacherNoticesViewProps {
  selectedSubject: SubjectConfig;
  teacher: AdminUser;
  notices: NoticeItem[];
  isOpenNoticeModal: boolean;
  onCloseNoticeModal: () => void;
  onOpenNoticeModal: () => void;
}

export const TeacherNoticesView: React.FC<TeacherNoticesViewProps> = ({
  selectedSubject,
  teacher,
  notices,
  isOpenNoticeModal,
  onCloseNoticeModal,
  onOpenNoticeModal,
}) => {
  const [activeCategory, setActiveCategory] = useState<'All' | 'Important' | 'General'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const [isPublishing, setIsPublishing] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const filteredNotices = notices.filter((n) => {
    if (activeCategory === 'Important' && !n.urgent) return false;
    if (activeCategory === 'General' && n.urgent) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        n.title.toLowerCase().includes(q) ||
        (n.content && n.content.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!noticeTitle.trim()) {
      setModalError('Please enter a notice title.');
      return;
    }

    if (!noticeContent.trim()) {
      setModalError('Please enter notice content/message.');
      return;
    }

    setIsPublishing(true);

    try {
      const res = await createTeacherNotice({
        subjectId: selectedSubject.id,
        subjectName: selectedSubject.name,
        title: noticeTitle.trim(),
        content: noticeContent.trim(),
        urgent: isUrgent,
        teacherEmail: teacher.email,
        teacherName: teacher.name,
        targetClass: selectedSubject.assignedClass || teacher.assignedClass || 'BSSE 1A',
      });

      setIsPublishing(false);

      if (!res.success) {
        setModalError(res.error || 'Failed to publish notice.');
        return;
      }

      setModalSuccess(`Notice "${noticeTitle}" published live to enrolled students!`);
      setTimeout(() => {
        setNoticeTitle('');
        setNoticeContent('');
        setIsUrgent(false);
        setModalSuccess('');
        onCloseNoticeModal();
      }, 1500);
    } catch (err: any) {
      setIsPublishing(false);
      setModalError(err?.message || 'Error occurred while publishing notice.');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & Actions */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-[#38271C]">
              Course Notices & Announcements — <span className="text-[#493222] underline decoration-amber-600/40">{selectedSubject.name}</span>
            </h1>
            <p className="text-xs text-[#806A56] mt-0.5">
              Publish official subject updates, quiz alerts, and lab guidelines for {selectedSubject.code}
            </p>
          </div>

          <button
            onClick={onOpenNoticeModal}
            className="px-4 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>+ Post New Notice</span>
          </button>
        </div>

        {/* Filter Tabs & Search */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            {(['All', 'Important', 'General'] as const).map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
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
              placeholder="Search announcements..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
            />
          </div>
        </div>
      </div>

      {/* 2. Notices List */}
      {filteredNotices.length === 0 ? (
        <div className="p-8 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl text-center space-y-2">
          <Bell className="w-10 h-10 text-[#806A56] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-[#38271C]">No Announcements Found</h3>
          <p className="text-xs text-[#806A56]">
            {searchQuery
              ? `No notice matching "${searchQuery}" was found.`
              : 'No course announcements published yet for this subject.'}
          </p>
          <button
            onClick={onOpenNoticeModal}
            className="mt-2 px-4 py-2 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Post First Notice</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((not) => (
            <div
              key={not.id}
              className="p-4 bg-[#FFF9F1] border border-[#E6D8C7] hover:border-[#D8C7B4] rounded-2xl shadow-2xs space-y-2 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {not.urgent && (
                    <span className="px-2 py-0.5 bg-[#FDE8E4] text-[#C84B31] text-[10px] font-bold rounded-full border border-[#F5C2B8]">
                      Urgent Alert
                    </span>
                  )}
                  <span className="text-[11px] font-medium text-[#806A56]">
                    {not.date || 'Recent'}
                  </span>
                </div>
                {not.postedBy && (
                  <span className="text-[11px] font-bold text-[#493222]">
                    By {not.postedBy}
                  </span>
                )}
              </div>

              <h3 className="font-bold text-sm text-[#38271C]">
                {not.title}
              </h3>
              <p className="text-xs text-[#806A56] leading-relaxed whitespace-pre-wrap">
                {not.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Post Notice Modal */}
      {isOpenNoticeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#E6D8C7] pb-3">
              <h3 className="font-bold text-base text-[#38271C]">
                Post Course Announcement
              </h3>
              <button
                onClick={onCloseNoticeModal}
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

            <form onSubmit={handleNoticeSubmit} className="space-y-3.5">
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
                  Announcement Title *
                </label>
                <input
                  type="text"
                  required
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  placeholder="e.g. Midterm Quiz Scheduled for Next Week"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#38271C] mb-1">
                  Message / Details *
                </label>
                <textarea
                  required
                  rows={4}
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  placeholder="Enter notice details for students..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="urgent-notice"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="w-4 h-4 accent-[#493222] rounded cursor-pointer"
                />
                <label
                  htmlFor="urgent-notice"
                  className="text-xs font-bold text-[#38271C] cursor-pointer select-none"
                >
                  Mark as Urgent Alert
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onCloseNoticeModal}
                  className="px-4 py-2 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isPublishing ? 'Publishing...' : 'Post Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
