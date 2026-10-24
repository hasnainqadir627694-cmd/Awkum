import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MoreVertical,
  Edit3,
  Trash2,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  UserCheck,
  GraduationCap,
} from 'lucide-react';
import { ClassSection, AdminUser } from '../../data/adminData';
import { subscribeToClasses, saveClassSection, removeClassSection } from '../../lib/classService';

interface ClassesSectionsViewProps {
  users?: AdminUser[];
  onOpenRoleAssignment?: (user?: AdminUser | null, preselectedClass?: string) => void;
  onNavigateToCRAssignments?: (className?: string) => void;
  adminEmail?: string;
}

export const ClassesSectionsView: React.FC<ClassesSectionsViewProps> = ({
  users = [],
  onOpenRoleAssignment,
  onNavigateToCRAssignments,
  adminEmail = 'hasnainbuilds724656@gmail.com',
}) => {
  const [classes, setClasses] = useState<ClassSection[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewRosterClass, setViewRosterClass] = useState<ClassSection | null>(null);

  // New class form
  const [newClass, setNewClass] = useState({
    program: 'BSCS',
    customProgram: '',
    section: '',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const safeUsers = Array.isArray(users)
    ? users.filter((u): u is AdminUser => Boolean(u && typeof u === 'object' && u.id && u.role))
    : [];

  // Subscribe to real-time classes in Cloud Firestore
  useEffect(() => {
    const unsubscribe = subscribeToClasses((liveClasses) => {
      setClasses(liveClasses);
    });
    return () => unsubscribe();
  }, []);

  const dynamicClasses = classes.map((item) => {
    const classKey = `${item.class} ${item.section}`.toLowerCase();
    const assignedCRUser = safeUsers.find(
      (u) =>
        (u.isCR || u.role === 'cr' || (Array.isArray(u.roles) && u.roles.includes('cr'))) &&
        u.crStatus !== 'revoked' &&
        (u.assignedClass?.toLowerCase() === classKey ||
          u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
    );
    const enrolledStudents = safeUsers.filter(
      (u) =>
        (u.role === 'student' || (Array.isArray(u.roles) && u.roles.includes('student'))) &&
        (u.assignedClass?.toLowerCase() === classKey ||
          u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, ''))
    );

    return {
      ...item,
      assignedCR: assignedCRUser?.name || item.assignedCR,
      assignedCREmail: assignedCRUser?.email || item.assignedCREmail,
      totalStudents: enrolledStudents.length,
    };
  });

  const filtered = dynamicClasses.filter(
    (c) =>
      c.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.assignedCR && c.assignedCR.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProgram = newClass.program === 'OTHER' ? newClass.customProgram.trim().toUpperCase() : newClass.program;
    const cleanSection = newClass.section.trim().toUpperCase();

    if (!targetProgram || !cleanSection) {
      setToastMessage({ text: 'Please specify program name and section code.', type: 'error' });
      return;
    }

    // Check duplicate
    const exists = classes.some(
      (c) => c.class.toUpperCase() === targetProgram && c.section.toUpperCase() === cleanSection
    );
    if (exists) {
      setToastMessage({ text: `Class ${targetProgram} Section ${cleanSection} already exists.`, type: 'error' });
      return;
    }

    setIsSaving(true);
    const docId = `cls_${targetProgram.toLowerCase()}_${cleanSection.toLowerCase()}`;
    const newItem: ClassSection = {
      id: docId,
      class: targetProgram,
      section: cleanSection,
      totalStudents: 0,
      assignedCR: null,
      status: 'Active',
    };

    const res = await saveClassSection(newItem, adminEmail);
    setIsSaving(false);

    if (res.success) {
      setToastMessage({ text: `Class ${targetProgram} ${cleanSection} created successfully.`, type: 'success' });
      setShowAddModal(false);
      setNewClass({ program: 'BSCS', customProgram: '', section: '' });
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      setToastMessage({ text: res.error || 'Failed to save class.', type: 'error' });
    }
  };

  const handleDeleteClass = async (cls: ClassSection) => {
    const classKey = `${cls.class} ${cls.section}`.toLowerCase();
    const enrolledCount = safeUsers.filter(
      (u) =>
        u.assignedClass?.toLowerCase() === classKey ||
        u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, '')
    ).length;

    const confirmMsg =
      enrolledCount > 0
        ? `Class ${cls.class} ${cls.section} has ${enrolledCount} enrolled students. Deactivating will mark it Inactive and preserve enrolled student accounts safely. Proceed?`
        : `Are you sure you want to remove unused class ${cls.class} ${cls.section}?`;

    if (!window.confirm(confirmMsg)) return;

    setIsSaving(true);
    const res = await removeClassSection(cls.id, adminEmail, enrolledCount);
    setIsSaving(false);

    if (res.success) {
      setToastMessage({ text: `Class ${cls.class} ${cls.section} updated successfully.`, type: 'success' });
      setTimeout(() => setToastMessage(null), 3500);
    } else {
      setToastMessage({ text: res.error || 'Failed to remove class.', type: 'error' });
    }
  };

  // Get enrolled students for the active modal
  const enrolledStudentsInSelectedClass = viewRosterClass
    ? safeUsers.filter((u) => {
        const classKey = `${viewRosterClass.class} ${viewRosterClass.section}`.toLowerCase();
        return (
          u.assignedClass?.toLowerCase() === classKey ||
          u.assignedClass?.toLowerCase().replace(/\s+/g, '') === classKey.replace(/\s+/g, '')
        );
      })
    : [];

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Manage Classes & Sections</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Admin-controlled configuration of academic degree offerings, sections, and CR appointments
          </p>
        </div>
        <button
          onClick={() => {
            setToastMessage(null);
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Academic Class</span>
        </button>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div
          className={`p-3 border text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in ${
            toastMessage.type === 'success'
              ? 'bg-[#EAF2E9] border-[#C5DEC3] text-[#668064]'
              : 'bg-[#FDE8E4] border-[#F5C2B8] text-[#C84B31]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#668064] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#C84B31] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. Search & Stats */}
      <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7] flex items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search classes, sections, or assigned CR..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#806A56]">
          <span>Active Sections:</span>
          <span className="px-2.5 py-0.5 bg-[#493222] text-[#FFF9F1] rounded-md font-bold text-xs">
            {classes.length}
          </span>
        </div>
      </div>

      {/* 3. Classes Table or Informative Empty State */}
      {classes.length === 0 ? (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-8 sm:p-12 text-center shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#F8F0E5] border border-[#E6D8C7] text-[#493222] flex items-center justify-center mx-auto shadow-2xs">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-[#38271C]">No Academic Classes Configured Yet</h3>
            <p className="text-xs text-[#806A56] leading-relaxed">
              Default hardcoded sections have been removed. Configure intentional classes (e.g. BSSE, BSCS) and sections to open verified student enrollment and CR appointments.
            </p>
          </div>
          <button
            onClick={() => {
              setToastMessage(null);
              setShowAddModal(true);
            }}
            className="px-5 py-2.5 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Class & Section</span>
          </button>
        </div>
      ) : (
        <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
                <tr>
                  <th className="py-3 px-4 w-12">#</th>
                  <th className="py-3 px-4">Class / Program</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Enrolled Students</th>
                  <th className="py-3 px-4">Class Representative</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
                {filtered.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                    <td className="py-3.5 px-4 font-bold text-[#38271C]">
                      <span className="px-2.5 py-1 bg-[#EFE3D3] text-[#493222] rounded-md font-mono text-xs">
                        {item.class}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#38271C]">{item.section}</td>
                    <td className="py-3.5 px-4 font-semibold text-[#38271C]">
                      <button
                        onClick={() => setViewRosterClass(item)}
                        className="flex items-center gap-1.5 text-[#493222] hover:underline cursor-pointer"
                        title="View enrolled students roster"
                      >
                        <Users className="w-3.5 h-3.5 text-[#806A56]" />
                        <span>{item.totalStudents} {item.totalStudents === 1 ? 'Student' : 'Students'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.assignedCR ? (
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-[#3A7BD5] shrink-0" />
                          <div>
                            <span className="font-bold text-[#38271C]">{item.assignedCR}</span>
                            {item.assignedCREmail && (
                              <span className="block text-[10px] font-mono text-[#806A56]">
                                {item.assignedCREmail}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#806A56] italic text-[11px]">No CR Appointed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                          item.status === 'Active'
                            ? 'bg-[#EAF2E9] text-[#668064]'
                            : 'bg-[#FDE8E4] text-[#C84B31]'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewRosterClass(item)}
                          className="px-2.5 py-1 bg-[#F8F0E5] hover:bg-[#EFE3D3] text-[#493222] font-bold text-[11px] rounded-lg border border-[#E6D8C7] transition-colors cursor-pointer"
                        >
                          View Roster
                        </button>
                        {onNavigateToCRAssignments ? (
                          <button
                            onClick={() => onNavigateToCRAssignments(`${item.class} ${item.section}`)}
                            className="px-2.5 py-1 bg-[#3A7BD5]/10 hover:bg-[#3A7BD5]/20 text-[#3A7BD5] font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            title="Manage Class CR in CR Section"
                          >
                            {item.assignedCR ? 'Manage CR' : 'Appoint CR'}
                          </button>
                        ) : onOpenRoleAssignment ? (
                          <button
                            onClick={() => onOpenRoleAssignment(null, `${item.class} ${item.section}`)}
                            className="px-2.5 py-1 bg-[#3A7BD5]/10 hover:bg-[#3A7BD5]/20 text-[#3A7BD5] font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            title="Appoint or Replace CR"
                          >
                            {item.assignedCR ? 'Replace CR' : 'Appoint CR'}
                          </button>
                        ) : null}
                        <button
                          onClick={() => handleDeleteClass(item)}
                          className="p-1 text-[#806A56] hover:text-[#C84B31] rounded-lg hover:bg-[#FDE8E4] transition-colors cursor-pointer"
                          title="Deactivate / Remove Class"
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

      {/* 4. Modal: Add Academic Class & Section */}
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
              <h2 className="text-base font-bold text-[#38271C]">Add Academic Class & Section</h2>
              <p className="text-xs text-[#806A56] mt-0.5">
                Configure official academic offering for university student enrollment
              </p>
            </div>

            <form onSubmit={handleAddClass} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">
                  Degree Program / Class *
                </label>
                <select
                  value={newClass.program}
                  onChange={(e) => setNewClass({ ...newClass, program: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222]"
                >
                  <option value="BSCS">BSCS (BS Computer Science)</option>
                  <option value="BSSE">BSSE (BS Software Engineering)</option>
                  <option value="BSIT">BSIT (BS Information Technology)</option>
                  <option value="MCS">MCS (Master of Computer Science)</option>
                  <option value="MSCS">MSCS (MS Computer Science)</option>
                  <option value="OTHER">Custom Program Name...</option>
                </select>
              </div>

              {newClass.program === 'OTHER' && (
                <div>
                  <label className="text-xs font-bold text-[#38271C] block mb-1">
                    Custom Program Abbreviation *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSAI or BSDS"
                    value={newClass.customProgram}
                    onChange={(e) => setNewClass({ ...newClass, customProgram: e.target.value })}
                    className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-[#38271C] block mb-1">
                  Section Code * (e.g. 1A, 2B, 3A)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1A"
                  value={newClass.section}
                  onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#493222]"
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
                  {isSaving ? <span>Saving...</span> : <span>Create Class</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal: View Registered Students Roster & Appoint CR */}
      {viewRosterClass && (
        <div className="fixed inset-0 z-50 bg-[#2E1F14]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setViewRosterClass(null)}
              className="absolute right-4 top-4 text-[#806A56] hover:text-[#38271C] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#38271C]">
                  Roster: {viewRosterClass.class} Section {viewRosterClass.section}
                </h2>
                <span className="px-2 py-0.5 bg-[#493222] text-[#FFF9F1] text-[10px] font-bold rounded-md">
                  {enrolledStudentsInSelectedClass.length} Enrolled
                </span>
              </div>
              <p className="text-xs text-[#806A56] mt-0.5">
                Genuine registered student accounts enrolled in this specific academic section
              </p>
            </div>

            {/* Enrolled Students List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {enrolledStudentsInSelectedClass.length === 0 ? (
                <div className="p-6 text-center text-xs text-[#806A56] bg-white rounded-2xl border border-[#E6D8C7] space-y-2">
                  <p className="font-bold text-[#38271C]">No students are enrolled in this class yet.</p>
                  <p className="text-[11px] leading-relaxed">
                    Students must register an account and select this class during registration before a Class Representative can be appointed.
                  </p>
                </div>
              ) : (
                enrolledStudentsInSelectedClass.map((student) => {
                  const isClassCR =
                    (student.isCR || student.role === 'cr' || student.roles?.includes('cr')) &&
                    student.crStatus !== 'revoked';

                  return (
                    <div
                      key={student.id}
                      className="p-3 bg-white border border-[#E6D8C7] rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#493222] text-[#FFF9F1] font-bold text-xs flex items-center justify-center shrink-0">
                          {student.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#38271C] truncate">{student.name}</span>
                            {isClassCR && (
                              <span className="px-2 py-0.2 bg-[#3A7BD5]/10 text-[#3A7BD5] text-[10px] font-bold rounded-full">
                                Appointed CR
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-[#806A56] truncate">{student.email}</div>
                          {student.studentId && (
                            <div className="text-[10px] font-bold text-[#668064]">{student.studentId}</div>
                          )}
                        </div>
                      </div>

                      {onNavigateToCRAssignments ? (
                        <button
                          onClick={() => {
                            setViewRosterClass(null);
                            onNavigateToCRAssignments(`${viewRosterClass.class} ${viewRosterClass.section}`);
                          }}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            isClassCR
                              ? 'bg-[#F8F0E5] text-[#806A56] hover:bg-[#EFE3D3]'
                              : 'bg-[#3A7BD5] hover:bg-[#2b64b3] text-white shadow-2xs'
                          }`}
                        >
                          {isClassCR ? 'Manage CR Scope' : 'Appoint as CR'}
                        </button>
                      ) : onOpenRoleAssignment ? (
                        <button
                          onClick={() => {
                            setViewRosterClass(null);
                            onOpenRoleAssignment(
                              student,
                              `${viewRosterClass.class} ${viewRosterClass.section}`
                            );
                          }}
                          className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer ${
                            isClassCR
                              ? 'bg-[#F8F0E5] text-[#806A56] hover:bg-[#EFE3D3]'
                              : 'bg-[#3A7BD5] hover:bg-[#2b64b3] text-white shadow-2xs'
                          }`}
                        >
                          {isClassCR ? 'Reassign Scope' : 'Appoint as CR'}
                        </button>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-[#E6D8C7]">
              <button
                type="button"
                onClick={() => setViewRosterClass(null)}
                className="px-4 py-2 bg-[#493222] text-white rounded-xl text-xs font-bold hover:bg-[#38271C] cursor-pointer"
              >
                Close Roster
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
