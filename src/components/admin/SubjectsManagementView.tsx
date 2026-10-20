import React, { useState } from 'react';
import { Plus, Search, MoreVertical, BookOpen, User, X } from 'lucide-react';
import { SubjectConfig, INITIAL_SUBJECTS } from '../../data/adminData';

export const SubjectsManagementView: React.FC = () => {
  const [subjects, setSubjects] = useState<SubjectConfig[]>(INITIAL_SUBJECTS);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubj, setNewSubj] = useState({ name: '', code: '', creditHours: 3, teacher: '' });

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.assignedTeacher && s.assignedTeacher.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubj.name.trim() || !newSubj.code.trim()) return;

    const created: SubjectConfig = {
      id: `s-${Date.now()}`,
      name: newSubj.name,
      code: newSubj.code.toUpperCase(),
      creditHours: Number(newSubj.creditHours),
      assignedTeacher: newSubj.teacher.trim() || null,
      status: newSubj.teacher.trim() ? 'Assigned' : 'Unassigned',
    };

    setSubjects((prev) => [...prev, created]);
    setShowAddModal(false);
    setNewSubj({ name: '', code: '', creditHours: 3, teacher: '' });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Manage Subjects</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Add, edit or configure official subjects for the university curriculum
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* 2. Search */}
      <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7] flex items-center">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search subjects, codes, or faculty..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>
      </div>

      {/* 3. Table matching Mockup 6 */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Code</th>
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
                      <BookOpen className="w-4 h-4 text-[#493222]" />
                      <span>{subj.name}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#806A56]">{subj.code}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#38271C]">
                    {subj.assignedTeacher ? (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[#668064]" />
                        <span>{subj.assignedTeacher}</span>
                      </div>
                    ) : (
                      <span className="text-[#806A56] italic">Not assigned</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                        subj.status === 'Assigned'
                          ? 'bg-[#EAF2E9] text-[#668064]'
                          : 'bg-[#FFF3CD] text-[#B78103]'
                      }`}
                    >
                      {subj.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Configuring ${subj.name} (${subj.code})`)}
                      className="p-1.5 hover:bg-[#EFE3D3] rounded-lg text-[#806A56] hover:text-[#38271C] cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D8C7]">
              <h3 className="font-bold text-sm text-[#38271C]">Add Curriculum Subject</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#806A56]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Subject Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Structures"
                  value={newSubj.name}
                  onChange={(e) => setNewSubj({ ...newSubj, name: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Course Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS201"
                  value={newSubj.code}
                  onChange={(e) => setNewSubj({ ...newSubj, code: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl font-semibold uppercase"
                />
              </div>
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Credit Hours</label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={newSubj.creditHours}
                  onChange={(e) => setNewSubj({ ...newSubj, creditHours: Number(e.target.value) })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Assign Teacher (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Ali Khan"
                  value={newSubj.teacher}
                  onChange={(e) => setNewSubj({ ...newSubj, teacher: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl font-semibold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-[#806A56] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#493222] text-[#FFF9F1] font-bold rounded-xl"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
