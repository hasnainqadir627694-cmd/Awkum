import React, { useState } from 'react';
import {
  ArrowLeft,
  Search,
  FileText,
  Download,
  Eye,
  CheckSquare,
  Bell,
  Clock,
  MapPin,
  Mail,
  User,
  Share2,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import {
  SubjectInfo,
  DocumentItem,
  AssignmentItem,
  NoticeItem,
} from '../../data/portalData';

interface SubjectDetailViewProps {
  subject: SubjectInfo;
  documents: DocumentItem[];
  assignments: AssignmentItem[];
  notices: NoticeItem[];
  onBack: () => void;
  onOpenDocument: (doc: DocumentItem) => void;
  onOpenAssignment: (asg: AssignmentItem) => void;
}

export const SubjectDetailView: React.FC<SubjectDetailViewProps> = ({
  subject,
  documents,
  assignments,
  notices,
  onBack,
  onOpenDocument,
  onOpenAssignment,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'assignments' | 'notices'>('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isDocumentForSubject = (d: DocumentItem) => {
    if (d.subjectId && d.subjectId === subject.id) return true;
    if (subject.code && d.subjectId?.toLowerCase() === subject.code.toLowerCase()) return true;
    if (d.subjectName && subject.name && d.subjectName.toLowerCase().trim() === subject.name.toLowerCase().trim()) return true;
    if ((d as any).subject && subject.name && (d as any).subject.toLowerCase().trim() === subject.name.toLowerCase().trim()) return true;
    if (subject.fullName && d.subjectName && d.subjectName.toLowerCase().trim() === subject.fullName.toLowerCase().trim()) return true;
    return false;
  };

  const isAssignmentForSubject = (a: AssignmentItem) => {
    if (a.subjectId && a.subjectId === subject.id) return true;
    if (subject.code && a.subjectId?.toLowerCase() === subject.code.toLowerCase()) return true;
    if (a.subjectName && subject.name && a.subjectName.toLowerCase().trim() === subject.name.toLowerCase().trim()) return true;
    if ((a as any).subject && subject.name && (a as any).subject.toLowerCase().trim() === subject.name.toLowerCase().trim()) return true;
    if (subject.fullName && a.subjectName && a.subjectName.toLowerCase().trim() === subject.fullName.toLowerCase().trim()) return true;
    return false;
  };

  const subjectDocs = documents.filter(isDocumentForSubject);
  const subjectAsgs = assignments.filter(isAssignmentForSubject);
  const subjectNotices = notices.filter(
    (n) => n.subjectId === subject.id || !n.subjectId || (n.subjectId && subject.code && n.subjectId.toLowerCase() === subject.code.toLowerCase())
  );

  const filteredDocs = subjectDocs.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'Lecture Notes', 'Lab Manual', 'Slides', 'Past Papers'];

  return (
    <div className="space-y-4 pb-20">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] py-1 px-2 -ml-2 rounded-lg hover:bg-[#F3E9DD] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classes</span>
        </button>
        <span className="text-xs font-semibold text-[#806A56] bg-[#FFF9F1] px-2.5 py-1 rounded-full border border-[#E6D8C7]">
          {subject.code} · {subject.creditHours}
        </span>
      </div>

      {/* Subject Header Card */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 sm:p-5 shadow-xs">
        <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
          {subject.name}
        </h2>
        <p className="text-xs text-[#806A56] mt-0.5">
          {subject.fullName}
        </p>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-[#E6D8C7] text-xs text-[#806A56]">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#493222]" />
            <span className="font-semibold text-[#38271C]">{subject.teacher}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#493222]" />
            <span>{subject.room}</span>
          </div>
          <div className="flex items-center gap-1.5 col-span-2">
            <Mail className="w-3.5 h-3.5 text-[#493222]" />
            <span className="text-[11px]">{subject.teacherEmail}</span>
          </div>
        </div>
      </div>

      {/* Subject Sub-tabs (Documents, Assignments, Notices) */}
      <div className="flex items-center p-1 bg-[#EFE3D3] rounded-xl border border-[#E6D8C7]">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'documents'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Documents ({subjectDocs.length})
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'assignments'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Assignments ({subjectAsgs.length})
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'notices'
              ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
              : 'text-[#806A56] hover:text-[#38271C]'
          }`}
        >
          Notices ({subjectNotices.length})
        </button>
      </div>

      {/* TAB 1: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="space-y-3">
          {/* Search files */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#806A56]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files in this subject..."
              className="w-full pl-9 pr-3 py-2 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder:text-[#B39E8A] outline-none focus:border-[#493222]"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                  categoryFilter === cat
                    ? 'bg-[#493222] text-[#FFF9F1]'
                    : 'bg-[#FFF9F1] border border-[#E6D8C7] text-[#806A56] hover:text-[#38271C]'
                }`}
              >
                {cat === 'all' ? 'All Files' : cat}
              </button>
            ))}
          </div>

          {/* Documents List */}
          {filteredDocs.length === 0 ? (
            <div className="p-8 text-center bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl">
              <FileText className="w-8 h-8 text-[#806A56] mx-auto mb-2" />
              <h4 className="text-xs font-bold text-[#38271C]">No documents found</h4>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                Try searching for a different keyword or category.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onOpenDocument(doc)}
                  className="p-3 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl hover:border-[#493222] transition-colors cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#FDE8E4] text-[#C84B31] font-bold text-xs uppercase flex items-center justify-center shrink-0 mt-0.5">
                        {doc.fileType}
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-[#806A56]">
                          {doc.category}
                        </span>
                        <h4 className="text-xs font-bold text-[#38271C] group-hover:text-[#493222] line-clamp-1">
                          {doc.title}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-[#806A56] mt-1">
                          <span>{doc.fileSize}</span>
                          <span>·</span>
                          <span>{doc.uploadDate}</span>
                          <span>·</span>
                          <span>{doc.uploader}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDocument(doc);
                      }}
                      className="p-2 text-[#806A56] hover:text-[#493222] hover:bg-[#F3E9DD] rounded-lg transition-colors"
                      title="Open Document"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-2.5">
          {subjectAsgs.length === 0 ? (
            <div className="p-8 text-center bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl">
              <CheckSquare className="w-8 h-8 text-[#806A56] mx-auto mb-2" />
              <h4 className="text-xs font-bold text-[#38271C]">No assignments for this subject</h4>
              <p className="text-[11px] text-[#806A56] mt-0.5">
                All upcoming tasks will appear here.
              </p>
            </div>
          ) : (
            subjectAsgs.map((asg) => (
              <div
                key={asg.id}
                onClick={() => onOpenAssignment(asg)}
                className="p-3.5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl hover:border-[#493222] transition-colors cursor-pointer group shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-[#806A56]">
                        {asg.totalMarks} Marks
                      </span>
                      {asg.status === 'todo' && (
                        <span className="text-[10px] font-bold text-[#C84B31] bg-[#FDE8E4] px-1.5 py-0.2 rounded">
                          To Do
                        </span>
                      )}
                      {asg.status === 'submitted' && (
                        <span className="text-[10px] font-bold text-[#668064] bg-[#EAF2E9] px-1.5 py-0.2 rounded">
                          Submitted
                        </span>
                      )}
                      {asg.status === 'graded' && (
                        <span className="text-[10px] font-bold text-[#493222] bg-[#EFE3D3] px-1.5 py-0.2 rounded">
                          Graded: {asg.grade}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-[#38271C] group-hover:text-[#493222]">
                      {asg.title}
                    </h4>
                    <p className="text-[11px] text-[#806A56] line-clamp-2 mt-1">
                      {asg.questionPreview}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#806A56] shrink-0 mt-1" />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#806A56] mt-2 pt-2 border-t border-[#E6D8C7]">
                  <span>Due: {asg.dueDate} at {asg.dueTime}</span>
                  <span className="text-[#493222] font-semibold">View & Submit →</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: NOTICES */}
      {activeTab === 'notices' && (
        <div className="space-y-2.5">
          {subjectNotices.map((notice) => (
            <div
              key={notice.id}
              className="p-3.5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-[#806A56]">
                  {notice.date} · {notice.department}
                </span>
                {notice.urgent && (
                  <span className="text-[9px] font-bold text-[#C84B31] bg-[#FDE8E4] px-1.5 py-0.2 rounded">
                    Important
                  </span>
                )}
              </div>
              <h4 className="text-xs font-bold text-[#38271C] mt-1">
                {notice.title}
              </h4>
              <p className="text-xs text-[#806A56] mt-1 leading-relaxed">
                {notice.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
