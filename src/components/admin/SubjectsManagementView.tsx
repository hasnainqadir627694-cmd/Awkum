import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  BookOpen,
  User,
  X,
  Check,
  CheckCircle2,
  Trash2,
  UserPlus,
  AlertCircle,
  Copy,
  KeyRound,
  ShieldAlert,
} from 'lucide-react';
import { SubjectConfig, AdminUser, ClassSection } from '../../data/adminData';
import {
  subscribeToCurriculumSubjects,
  saveCurriculumSubject,
  removeCurriculumSubject,
} from '../../lib/subjectService';
import { subscribeToClasses } from '../../lib/classService';
import {
  generateOrGetSubjectInvitation,
  subscribeToSubjectInvitations,
  revokeSubjectTeacherInvitation,
  SubjectInvitation,
} from '../../lib/teacherInvitationService';

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
  const [invitations, setInvitations] = useState<SubjectInvitation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubjectForInv, setSelectedSubjectForInv] = useState<SubjectConfig | null>(null);
  const [currentInvitation, setCurrentInvitation] = useState<SubjectInvitation | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  interface NewSubjectFormState {
    name: string;
    code: string;
    creditHours: number;
    assignedClass: string;
    description: string;
  }

  const INITIAL_NEW_SUBJECT_STATE: NewSubjectFormState = {
    name: '',
    code: '',
    creditHours: 3,
    assignedClass: '',
    description: '',
  };

  const [newSubj, setNewSubj] = useState<NewSubjectFormState>(INITIAL_NEW_SUBJECT_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsubSubjects = subscribeToCurriculumSubjects((liveList) => {
      setSubjects(liveList);
    });
    const unsubClasses = subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
    });
    const unsubInvitations = subscribeToSubjectInvitations((liveInvs) => {
      setInvitations(liveInvs);
    });

    return () => {
      unsubSubjects();
      unsubClasses();
      unsubInvitations();
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

    if (!newSubj.name.trim() || !newSubj.code.trim()) {
      setErrorMessage('Subject name and course code are required.');
      return;
    }

    setIsSaving(true);
    const createdId = `subj_${newSubj.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const created: SubjectConfig = {
      id: createdId,
      name: newSubj.name.trim(),
      code: newSubj.code.toUpperCase().trim(),
      creditHours: Number(newSubj.creditHours) || 3,
      assignedTeacher: null,
      status: 'Unassigned',
      assignedClass: newSubj.assignedClass || '',
      description: newSubj.description.trim() || '',
      isActive: true,
    };

    try {
      const res = await saveCurriculumSubject(created, adminEmail);
      if (res.success) {
        // Automatically generate subject invitation credential upon subject creation
        const invRes = await generateOrGetSubjectInvitation(createdId, created.name, adminEmail);

        setIsSaving(false);
        setSuccessToast(`Subject ${created.name} (${created.code}) created with teacher invitation credentials.`);
        setShowAddModal(false);
        setNewSubj(INITIAL_NEW_SUBJECT_STATE);
        setTimeout(() => setSuccessToast(''), 5000);

        if (invRes.invitationCode) {
          setSelectedSubjectForInv(created);
          setCurrentInvitation({
            id: invRes.invitationId || `inv_${createdId}`,
            subjectId: createdId,
            subjectName: created.name,
            subjectCode: created.code,
            invitationCode: invRes.invitationCode,
            invitationPassword: invRes.invitationPassword,
            status: 'available',
            createdAt: new Date().toISOString(),
            createdBy: adminEmail,
          });
        }
      } else {
        setIsSaving(false);
        setErrorMessage(res.error || 'Failed to save subject.');
      }
    } catch {
      setIsSaving(false);
      setErrorMessage('An unexpected error occurred while saving the subject.');
    }
  };

  const handleOpenInvitationModal = async (subj: SubjectConfig) => {
    setIsSaving(true);
    const invRes = await generateOrGetSubjectInvitation(subj.id, subj.name, adminEmail);
    setSelectedSubjectForInv(subj);
    if (invRes.invitationCode) {
      setCurrentInvitation({
        id: invRes.invitationId || `inv_${subj.id}`,
        subjectId: subj.id,
        subjectName: subj.name,
        subjectCode: subj.code,
        invitationCode: invRes.invitationCode,
        invitationPassword: invRes.invitationPassword,
        status: 'available',
        createdAt: new Date().toISOString(),
        createdBy: adminEmail,
      });
    }
    setIsSaving(false);
  };

  const handleCopyText = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleRevokeTeacher = async (subj: SubjectConfig) => {
    if (!window.confirm(`Are you sure you want to revoke teacher access for ${subj.name}?`)) return;
    setIsSaving(true);
    const res = await revokeSubjectTeacherInvitation(subj.id, adminEmail, 'Revoked by Master Administrator');
    setIsSaving(false);
    if (res.success) {
      setSuccessToast(`Teacher access revoked for ${subj.name}.`);
      setTimeout(() => setSuccessToast(''), 3000);
    } else {
      setErrorMessage(res.error || 'Failed to revoke teacher access.');
    }
  };

  const handleDeleteSubject = async (subj: SubjectConfig) => {
    if (!window.confirm(`Are you sure you want to remove subject ${subj.name} (${subj.code})?`)) return;
    setIsSaving(true);
    const res = await removeCurriculumSubject(subj.id, adminEmail);
    setIsSaving(false);
    if (res.success) {
      setSuccessToast(`Subject ${subj.name} removed.`);
      setTimeout(() => setSuccessToast(''), 3000);
    } else {
      setErrorMessage(res.error || 'Failed to remove subject.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Manage Curriculum Subjects & Teacher Invitations</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Configure subjects, generate one-time teacher invitation credentials, and govern faculty access
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
          <span>Add Custom Subject & Issue Invitation</span>
        </button>
      </div>

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

      {subjects.length === 0 ? (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-8 sm:p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F8F0E5] border border-[#E6D8C7] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[#38271C]">No Curriculum Subjects Configured Yet</h3>
            <p className="text-xs text-[#806A56] leading-relaxed">
              Master Admin can create curriculum subjects and automatically issue secure subject-based teacher invitation credentials.
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
            <span>Create First Subject & Invitation</span>
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
                  <th className="py-3 px-4">Class Scope</th>
                  <th className="py-3 px-4">Assigned Teacher</th>
                  <th className="py-3 px-4">Invitation Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
                {filtered.map((subj, idx) => {
                  const matchingInv = invitations.find((i) => i.subjectId === subj.id);
                  return (
                    <tr key={subj.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-[#38271C]">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-[#493222] shrink-0" />
                          <span>{subj.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#493222]">
                        <span className="px-2 py-0.5 bg-[#EFE3D3] rounded-md text-[11px]">{subj.code}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#806A56] font-medium">
                        {subj.assignedClass || 'Universal'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-[#38271C]">
                        {subj.assignedTeacher || matchingInv?.teacherName ? (
                          <div>
                            <span className="font-bold text-[#462D1D]">
                              {subj.assignedTeacher || matchingInv?.teacherName}
                            </span>
                            <span className="block text-[10px] font-mono text-[#806A56]">
                              {subj.teacherEmail || matchingInv?.teacherEmail}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#806A56] italic text-[11px]">No Teacher Claimed Yet</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {matchingInv?.status === 'claimed' ? (
                          <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                            Claimed
                          </span>
                        ) : matchingInv?.status === 'registration_pending_verification' ? (
                          <span className="px-2.5 py-0.5 bg-[#FFF3CD] text-[#856404] text-[10px] font-bold rounded-full">
                            Pending Verification
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 bg-[#F8F0E5] text-[#806A56] text-[10px] font-bold rounded-full border border-[#E6D8C7]">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenInvitationModal(subj)}
                            className="px-2.5 py-1 bg-[#493222] hover:bg-[#38271C] text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="View Teacher Invitation Credentials"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Invitation Credentials</span>
                          </button>
                          {(subj.assignedTeacher || matchingInv?.status === 'claimed') && (
                            <button
                              onClick={() => handleRevokeTeacher(subj)}
                              className="px-2.5 py-1 bg-[#C84B31] hover:bg-[#A73B24] text-white font-bold text-[11px] rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Revoke Teacher Access"
                            >
                              <ShieldAlert className="w-3 h-3" />
                              <span>Revoke</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSubject(subj)}
                            className="p-1 text-[#806A56] hover:text-[#C84B31] rounded-lg hover:bg-[#FDE8E4] transition-colors cursor-pointer"
                            title="Remove Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Custom Subject */}
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
              <h2 className="text-base font-bold text-[#38271C]">Create Subject & Issue Invitation</h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Automatically generates a unique subject invitation code and one-time password.
              </p>
            </div>

            <form onSubmit={handleAddSubject} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Artificial Intelligence"
                  value={newSubj.name}
                  onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#38271C] block mb-1">Course Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS-401"
                    value={newSubj.code}
                    onChange={(e) => setNewSubj({ ...newSubj, code: e.target.value })}
                    className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#38271C] block mb-1">Credit Hours *</label>
                  <select
                    value={newSubj.creditHours}
                    onChange={(e) => setNewSubj({ ...newSubj, creditHours: Number(e.target.value) })}
                    className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C]"
                  >
                    <option value={3}>3 Credit Hours (Theory)</option>
                    <option value={4}>4 Credit Hours (Integrated)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">Class / Section Scope (Optional)</label>
                <select
                  value={newSubj.assignedClass}
                  onChange={(e) => setNewSubj({ ...newSubj, assignedClass: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C]"
                >
                  <option value="">All Enrolled Classes (Universal)</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                      {cls.class} Section {cls.section}
                    </option>
                  ))}
                </select>
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
                  className="px-5 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <span>Generating...</span> : <span>Save & Issue Invitation</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Subject Invitation Credentials */}
      {selectedSubjectForInv && currentInvitation && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95">
            <button
              onClick={() => {
                setSelectedSubjectForInv(null);
                setCurrentInvitation(null);
              }}
              className="absolute right-4 top-4 text-[#806A56] hover:text-[#38271C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-base font-bold text-[#38271C]">
                Teacher Invitation Credentials for {selectedSubjectForInv.name}
              </h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Share these credentials with the assigned teacher. The teacher will enter them into the Universal Login Page.
              </p>
            </div>

            <div className="space-y-3 bg-white p-4 rounded-2xl border border-[#E6D8C7]">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block">Invitation Code</span>
                  <span className="text-sm font-mono font-bold text-[#493222]">{currentInvitation.invitationCode}</span>
                </div>
                <button
                  onClick={() => handleCopyText(currentInvitation.invitationCode, 'code')}
                  className="px-3 py-1.5 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#493222] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'code' ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              <hr className="border-[#E6D8C7]" />

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block">One-Time Password</span>
                  <span className="text-sm font-mono font-bold text-[#C84B31]">
                    {currentInvitation.invitationPassword || '••••••••'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyText(currentInvitation.invitationPassword || '', 'pass')}
                  className="px-3 py-1.5 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#493222] font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'pass' ? 'Copied!' : 'Copy Password'}</span>
                </button>
              </div>

              <hr className="border-[#E6D8C7]" />

              <div className="pt-1">
                <span className="text-[11px] font-bold text-[#806A56] uppercase tracking-wider block mb-1">Combined Credentials Text</span>
                <div className="p-2.5 bg-[#F8F0E5] rounded-xl font-mono text-[11px] text-[#38271C] select-all">
                  Subject: {selectedSubjectForInv.name}{'\n'}
                  Invitation Code: {currentInvitation.invitationCode}{'\n'}
                  One-Time Password: {currentInvitation.invitationPassword || '••••••••'}{'\n'}
                  Login at: https://awkum-classhub.web.app
                </div>
                <button
                  onClick={() =>
                    handleCopyText(
                      `Subject: ${selectedSubjectForInv.name}\nInvitation Code: ${currentInvitation.invitationCode}\nOne-Time Password: ${currentInvitation.invitationPassword || ''}`,
                      'both'
                    )
                  }
                  className="mt-2 w-full py-2 bg-[#493222] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedField === 'both' ? 'Copied Both to Clipboard!' : 'Copy Both Code & Password'}</span>
                </button>
              </div>
            </div>

            <div className="bg-[#EAF2E9] p-3 rounded-2xl border border-[#C5DEC3] text-xs text-[#557353]">
              <span className="font-bold block mb-0.5">Invitation Status: {currentInvitation.status.toUpperCase()}</span>
              {currentInvitation.teacherName ? (
                <span>Claimed by: {currentInvitation.teacherName} ({currentInvitation.teacherEmail})</span>
              ) : (
                <span>Awaiting teacher registration and Gmail verification.</span>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setSelectedSubjectForInv(null);
                  setCurrentInvitation(null);
                }}
                className="px-5 py-2 bg-[#493222] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
