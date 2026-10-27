import React, { useState } from 'react';
import {
  Search,
  ChevronRight,
  Code2,
  Monitor,
  Briefcase,
  BookOpen,
  Calculator,
  Atom,
  FileText,
  CheckSquare,
} from 'lucide-react';
import { SubjectInfo, DocumentItem, AssignmentItem, NoticeItem } from '../../data/portalData';
import { SubjectDetailView } from './SubjectDetailView';

interface ClassesScreenProps {
  subjects: SubjectInfo[];
  documents: DocumentItem[];
  assignments: AssignmentItem[];
  notices: NoticeItem[];
  selectedSubjectId: string | null;
  onSelectSubject: (subjectId: string | null) => void;
  onOpenDocument: (doc: DocumentItem) => void;
  onOpenAssignment: (asg: AssignmentItem) => void;
}

export const ClassesScreen: React.FC<ClassesScreenProps> = ({
  subjects,
  documents,
  assignments,
  notices,
  selectedSubjectId,
  onSelectSubject,
  onOpenDocument,
  onOpenAssignment,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // If a subject is selected, render the dedicated Subject Details view
  const activeSubject = subjects.find((s) => s.id === selectedSubjectId);
  if (activeSubject) {
    return (
      <SubjectDetailView
        subject={activeSubject}
        documents={documents}
        assignments={assignments}
        notices={notices}
        onBack={() => onSelectSubject(null)}
        onOpenDocument={onOpenDocument}
        onOpenAssignment={onOpenAssignment}
      />
    );
  }

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.teacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSubjectIcon = (iconName: string) => {
    switch (iconName) {
      case 'code':
        return <Code2 className="w-5 h-5 text-[#493222]" />;
      case 'monitor':
        return <Monitor className="w-5 h-5 text-[#493222]" />;
      case 'briefcase':
        return <Briefcase className="w-5 h-5 text-[#493222]" />;
      case 'book':
        return <BookOpen className="w-5 h-5 text-[#493222]" />;
      case 'calculator':
        return <Calculator className="w-5 h-5 text-[#493222]" />;
      case 'atom':
        return <Atom className="w-5 h-5 text-[#493222]" />;
      default:
        return <BookOpen className="w-5 h-5 text-[#493222]" />;
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            My Classes
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Semester 3 · Department of Computer Science
          </p>
        </div>
        <span className="text-xs font-bold text-[#493222] bg-[#EFE3D3] px-2.5 py-1 rounded-full">
          {subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'}
        </span>
      </div>

      {/* Search Input */}
      {subjects.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#806A56]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search classes or professors..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFF9F1] border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] placeholder:text-[#B39E8A] outline-none focus:border-[#493222] focus:ring-1 focus:ring-[#493222] transition-all"
          />
        </div>
      )}

      {/* Subject Cards List or Empty States */}
      {subjects.length === 0 ? (
        <div className="p-8 text-center bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl space-y-2">
          <BookOpen className="w-10 h-10 text-[#B39E8A] mx-auto" />
          <h3 className="text-sm font-bold text-[#38271C]">No Classes Configured Yet</h3>
          <p className="text-xs text-[#806A56] max-w-sm mx-auto leading-relaxed">
            Your enrolled subjects will appear here once configured by the university administration.
          </p>
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="p-6 text-center bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl">
          <p className="text-xs text-[#806A56]">
            No classes or professors match &ldquo;{searchQuery}&rdquo;.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSubjects.map((subject) => {
            const subjId = subject.id?.toLowerCase() || '';
            const subjName = subject.name?.toLowerCase() || '';
            const subjCode = subject.code?.toLowerCase() || '';
            const subjFullName = subject.fullName?.toLowerCase() || '';

            const docCount = documents.filter((d) => {
              const dSubId = (d.subjectId || '').toLowerCase();
              const dSubName = (d.subjectName || '').toLowerCase();
              const dSubj = ((d as any).subject || '').toLowerCase();

              return (
                dSubId === subjId ||
                dSubId === subjCode ||
                dSubName === subjName ||
                subjName.includes(dSubName) ||
                dSubName.includes(subjName) ||
                (subjCode && (dSubId.includes(subjCode) || dSubName.includes(subjCode))) ||
                (dSubj && (dSubj === subjName || dSubj.includes(subjName) || subjName.includes(dSubj)))
              );
            }).length;

            const asgCount = assignments.filter((a) => {
              const aSubId = (a.subjectId || '').toLowerCase();
              const aSubName = (a.subjectName || '').toLowerCase();
              const aSubj = ((a as any).subject || '').toLowerCase();

              return (
                aSubId === subjId ||
                aSubId === subjCode ||
                aSubName === subjName ||
                subjName.includes(aSubName) ||
                aSubName.includes(subjName) ||
                (subjCode && (aSubId.includes(subjCode) || aSubName.includes(subjCode))) ||
                (aSubj && (aSubj === subjName || aSubj.includes(subjName) || subjName.includes(aSubj)))
              );
            }).length;

            return (
              <div
                key={subject.id}
                onClick={() => onSelectSubject(subject.id)}
                className="p-3.5 bg-[#FFF9F1] hover:bg-[#FFFDF9] border border-[#E6D8C7] hover:border-[#493222] rounded-2xl transition-all shadow-xs cursor-pointer group flex items-center justify-between active:scale-[0.99]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-[#F8F0E5] border border-[#E6D8C7] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getSubjectIcon(subject.iconName)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#38271C] group-hover:text-[#493222] transition-colors">
                      {subject.name}
                    </h3>
                    <p className="text-xs text-[#806A56] mt-0.5">
                      {subject.teacher}
                    </p>
                    <div className="flex items-center gap-3 text-[10px] text-[#806A56] mt-1.5 font-medium">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-[#493222]" />
                        <span>{docCount} Files</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3 h-3 text-[#C84B31]" />
                        <span>{asgCount} {asgCount === 1 ? 'Assignment' : 'Assignments'}</span>
                      </span>
                      <span>·</span>
                      <span>{subject.room}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[#806A56] group-hover:text-[#493222] transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
