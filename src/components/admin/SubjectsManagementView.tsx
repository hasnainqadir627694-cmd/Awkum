import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  User,
  X,
  Check,
  CheckCircle2,
  ShieldCheck,
  Trash2,
  UserPlus,
  AlertCircle,
  GraduationCap,
  Layers,
} from 'lucide-react';
import { SubjectConfig, AdminUser, ClassSection } from '../../data/adminData';
import {
  subscribeToCurriculumSubjects,
  saveCurriculumSubject,
  assignTeacherToSubject,
  removeCurriculumSubject,
} from '../../lib/subjectService';
import { subscribeToClasses } from '../../lib/classService';

interface SubjectsManagementViewProps {
  users?: AdminUser[];
  adminEmail?: string;
  onNavigateToTeacherAssignments?: (subjectId?: string) => void;
}

export const SubjectsManagementView: React.FC<SubjectsManagementViewProps> = ({
  users = [],
  adminEmail = 'hasnainbuilds724656@gmail.com',
  onNavigateToTeacherAssignments,
}) => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>([]);
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Explicit new subject form state with default empty strings to prevent undefined values
  interface NewSubjectFormState {
    name: string;
    code: string;
    creditHours: number;
    assignedClass: string;
    description: string;
    selectedTeacherEmail: string;
    teacherEmail: string;
    teacherUid: string;
    assignedTeacher: string;
  }

  const INITIAL_NEW_SUBJECT_STATE: NewSubjectFormState = {
    name: '',
    code: '',
    creditHours: 3,
    assignedClass: '',
    description: '',
    selectedTeacherEmail: '',
    teacherEmail: '',
    teacherUid: '',
    assignedTeacher: '',
  };

  const [newSubj, setNewSubj] = useState<NewSubjectFormState>(INITIAL_NEW_SUBJECT_STATE);

  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.email))
    : [];

  // Subscribe to real-time curriculum subjects in Cloud Firestore
  useEffect(() => {
    const unsubSubjects = subscribeToCurriculumSubjects((liveList) => {
      setSubjects(liveList);
    });
    const unsubClasses = subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
    });

    return () => {
      unsubSubjects();
      unsubClasses();
    };
  }, []);

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.assignedTeacher && s.assignedTeacher.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.assignedClass && s.assignedClass.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newSubj.name.trim()) {
      setErrorMessage('Please enter a custom subject name.');
      return;
    }
    if (!newSubj.code.trim()) {
      setErrorMessage('Please enter a course code (e.g. CS-301).');
      return;
    }

    // Verify name uniqueness
    const exists = subjects.some(
      (s) =>
        s.name.toLowerCase() === newSubj.name.trim().toLowerCase() ||
        s.code.toLowerCase() === newSubj.code.trim().toLowerCase()
    );
    if (exists) {
      setErrorMessage(`A subject with name "${newSubj.name.trim()}" or code "${newSubj.code.trim()}" already exists.`);
      return;
    }

    let assignedTeacherName = newSubj.assignedTeacher || '';
    let assignedTeacherEmail = newSubj.teacherEmail || '';
    let assignedTeacherUid = newSubj.teacherUid || '';

    if (newSubj.selectedTeacherEmail) {
      const match = safeUsers.find((u) => u.email.toLowerCase() === newSubj.selectedTeacherEmail.toLowerCase());
      if (match) {
        assignedTeacherName = match.name || '';
        assignedTeacherEmail = match.email || '';
        assignedTeacherUid = match.uid || '';
      }
    }

    setIsSaving(true);
    const created: SubjectConfig = {
      id: `subj_${newSubj.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`,
      name: newSubj.name.trim(),
      code: newSubj.code.toUpperCase().trim(),
      creditHours: Number(newSubj.creditHours) || 3,
      assignedTeacher: assignedTeacherName || null,
      teacherEmail: assignedTeacherEmail || '',
      teacherUid: assignedTeacherUid || '',
      status: assignedTeacherName ? 'Assigned' : 'Unassigned',
      assignedClass: newSubj.assignedClass || '',
      description: newSubj.description.trim() || '',
      isActive: true,
    };

    try {
      const res = await saveCurriculumSubject(created, adminEmail);
      setIsSaving(false);
      if (res.success) {
        setSuccessToast(`Subject ${created.name} (${created.code}) created successfully.`);
        setShowAddModal(false);
        setNewSubj(INITIAL_NEW_SUBJECT_STATE);
        setTimeout(() => setSuccessToast(''), 4000);
      } else {
        setErrorMessage(res.error || 'Failed to save subject.');
      }
    } catch {
      setIsSaving(false);
      setErrorMessage('An unexpected error occurred while saving the subject.');
    }
  };

  const handleDeleteSubject = async (subj: SubjectConfig) => {
    const confirmMsg = `Are you sure you want to remove or deactivate "${subj.name}" (${subj.code})? Historical academic records will be preserved safely.`;
    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    const res = await removeCurriculumSubject(subj.id, adminEmail);
    setIsSaving(false);

    if (res.success) {
      setSuccessToast(`Subject "${subj.name}" updated successfully.`);
      setTimeout(() => setSuccessToast(''), 3500);
    } else {
      setErrorMessage(res.error || 'Failed to remove subject.');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Manage Curriculum Subjects</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Admin-controlled custom subject creation and intentional faculty assignment
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMessage('');
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Subject</span>
        </button>
      </div>

      {/* Success / Error Banners */}
      {successToast && (
        <div className="p-3 bg-[#EAF2E9] border border-[#C5DEC3] text-[#668064] text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-[#C84B31] shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Search & Filter Bar */}
      <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7] flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search custom subjects, course codes, or faculty..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#806A56]">
          <span>Configured Subjects:</span>
          <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] rounded-md font-bold text-xs">
            {subjects.length}
          </span>
        </div>
      </div>

      {/* 3. Subjects Table or Informative Empty State */}
      {subjects.length === 0 ? (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-8 sm:p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F8F0E5] border border-[#E6D8C7] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[#38271C]">No Curriculum Subjects Configured Yet</h3>
            <p className="text-xs text-[#806A56] leading-relaxed">
              Default demo courses have been removed. Master Admin has full authority to establish custom subjects, define credit hours, and map verified faculty instructors.
            </p>
          </div>
          <button
            onClick={() => {
              setErrorMessage('');
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Subject</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Subject Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Credit Hours</th>
                  <th className="py-3 px-4">Class Scope</th>
                  <th className="py-3 px-4">Assigned Teacher</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
                {filtered.map((subj, idx) => (
                  <tr key={subj.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-[#38271C]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#493222] shrink-0" />
                        <div>
                          <span>{subj.name}</span>
                          {subj.description && (
                            <p className="text-[10px] font-normal text-[#806A56] line-clamp-1">{subj.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-[#493222]">
                      <span className="px-2 py-0.5 bg-[#EFE3D3] rounded-md text-[11px]">{subj.code}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#38271C]">{subj.creditHours} CH</td>
                    <td className="py-3.5 px-4 text-[#806A56] font-medium">
                      {subj.assignedClass ? (
                        <span className="px-2 py-0.5 bg-[#F8F0E5] border border-[#E6D8C7] rounded-md text-[10px] font-bold text-[#493222]">
                          {subj.assignedClass}
                        </span>
                      ) : (
                        <span className="text-[10px] italic">All Enrolled</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#38271C]">
                      {subj.assignedTeacher ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#668064] shrink-0" />
                          <div>
                            <span className="font-bold">{subj.assignedTeacher}</span>
                            {subj.teacherEmail && (
                              <span className="block text-[10px] font-mono text-[#806A56]">
                                {subj.teacherEmail}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#806A56] italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {subj.status === 'Assigned' ? (
                        <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                          Assigned
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#856404] text-[10px] font-bold rounded-full">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onNavigateToTeacherAssignments ? (
                          <button
                            onClick={() => onNavigateToTeacherAssignments(subj.id)}
                            className="px-2.5 py-1 bg-[#668064] hover:bg-[#526850] text-white font-bold text-[11px] rounded-lg border border-[#668064] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Manage Subject Teacher Assignment"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>{subj.assignedTeacher ? 'Manage Teacher' : 'Assign Teacher'}</span>
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeleteSubject(subj)}
                          className="p-1 text-[#806A56] hover:text-[#C84B31] rounded-lg hover:bg-[#FDE8E4] transition-colors cursor-pointer"
                          title="Remove / Deactivate Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Modal: Create Custom Subject */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[#806A56] hover:text-[#38271C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-[#38271C]">Create New Academic Subject</h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Establish custom course title, identifier, and academic parameters
              </p>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-[#FDE8E4] border border-[#F5C2B8] text-[#C84B31] text-xs font-bold rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleAddSubject} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">
                  Custom Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Software Architecture & Design"
                  value={newSubj.name}
                  onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#38271C] block mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SE-302"
                    value={newSubj.code}
                    onChange={(e) => setNewSubj({ ...newSubj, code: e.target.value })}
                    className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#38271C] block mb-1">
                    Credit Hours *
                  </label>
                  <select
                    value={newSubj.creditHours}
                    onChange={(e) => setNewSubj({ ...newSubj, creditHours: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  >
                    <option value={1}>1 Credit Hour (Lab)</option>
                    <option value={2}>2 Credit Hours</option>
                    <option value={3}>3 Credit Hours (Theory)</option>
                    <option value={4}>4 Credit Hours (Integrated)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">
                  Class / Section Scope (Optional)
                </label>
                <select
                  value={newSubj.assignedClass}
                  onChange={(e) => setNewSubj({ ...newSubj, assignedClass: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                >
                  <option value="">All Enrolled Classes (Universal)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                      {cls.class} Section {cls.section}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">
                  Course Description / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Course objectives, curriculum guidelines..."
                  value={newSubj.description}
                  onChange={(e) => setNewSubj({ ...newSubj, description: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-[#D8C7B4] rounded-xl text-xs font-bold text-[#806A56] hover:bg-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <span>Saving...</span> : <span>Save Subject</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

