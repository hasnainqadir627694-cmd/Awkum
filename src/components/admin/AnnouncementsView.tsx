import React, { useState } from 'react';
import { Megaphone, Send, Check, Bell, Users, Clock } from 'lucide-react';
import { AnnouncementItem, INITIAL_ANNOUNCEMENTS } from '../../data/adminData';

export const AnnouncementsView: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>(INITIAL_ANNOUNCEMENTS);
  const [activeSubTab, setActiveSubTab] = useState<'create' | 'history'>('create');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'teachers' | 'crs'>('all');
  const [sentToast, setSentToast] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    const newItem: AnnouncementItem = {
      id: `anc-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      targetAudience,
      postedBy: 'Master Admin (Hasnain Qadir)',
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };

    setAnnouncements((prev) => [newItem, ...prev]);
    setTitle('');
    setMessage('');
    setSentToast(true);
    setTimeout(() => setSentToast(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Manage Announcements</h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Broadcast official notices and advisories to students, teachers, and class representatives
        </p>
      </div>

      {sentToast && (
        <div className="p-3.5 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <Check className="w-4 h-4" />
          <span>Announcement broadcasted successfully across AWKUM ClassHub!</span>
        </div>
      )}

      {/* 2. Sub-Tabs matching Mockup 11 */}
      <div className="flex items-center gap-2 border-b border-[#E6D8C7] pb-3 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('create')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeSubTab === 'create'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Create Announcement
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-4 py-2 rounded-xl transition-colors cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-[#493222] text-[#FFF9F1]'
              : 'bg-[#FFF9F1] text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Previous Announcements ({announcements.length})
        </button>
      </div>

      {/* 3. Create Announcement Form */}
      {activeSubTab === 'create' ? (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-2xs max-w-2xl">
          <form onSubmit={handleSend} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-[#38271C] mb-1.5">Announcement Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter announcement title..."
                className="w-full p-3 bg-white border border-[#D8C7B4] rounded-xl font-semibold text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#38271C] mb-1.5">Message / Body</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your announcement details here..."
                className="w-full p-3 bg-white border border-[#D8C7B4] rounded-xl text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
              />
            </div>

            {/* Send To Radios matching Mockup 11 */}
            <div>
              <label className="block font-bold text-[#38271C] mb-2">Send To</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={targetAudience === 'all'}
                    onChange={() => setTargetAudience('all')}
                    className="accent-[#493222]"
                  />
                  <span className="font-semibold text-[#38271C]">All Users</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={targetAudience === 'students'}
                    onChange={() => setTargetAudience('students')}
                    className="accent-[#493222]"
                  />
                  <span className="font-semibold text-[#38271C]">Students Only</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={targetAudience === 'teachers'}
                    onChange={() => setTargetAudience('teachers')}
                    className="accent-[#493222]"
                  />
                  <span className="font-semibold text-[#38271C]">Teachers Only</span>
                </label>

                <label className="flex items-center gap-2 p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                  <input
                    type="radio"
                    name="target"
                    checked={targetAudience === 'crs'}
                    onChange={() => setTargetAudience('crs')}
                    className="accent-[#493222]"
                  />
                  <span className="font-semibold text-[#38271C]">CRs Only</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Send Announcement</span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-3 max-w-3xl">
          {announcements.map((anc) => (
            <div
              key={anc.id}
              className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-5 shadow-2xs space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-[#EFE3D3] text-[#493222] text-[10px] font-bold uppercase rounded-full">
                  Target: {anc.targetAudience}
                </span>
                <span className="text-[11px] text-[#806A56] font-semibold">{anc.date}</span>
              </div>
              <h3 className="font-bold text-sm text-[#38271C]">{anc.title}</h3>
              <p className="text-xs text-[#806A56] leading-relaxed">{anc.message}</p>
              <div className="text-[10px] text-[#806A56]/80 pt-1 border-t border-[#E6D8C7]/50">
                Posted by: <strong>{anc.postedBy}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
