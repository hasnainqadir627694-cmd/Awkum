import React, { useState } from 'react';
import { Plus, Search, MoreVertical, Edit3, Trash2, X, Check } from 'lucide-react';
import { ClassSection, INITIAL_CLASSES } from '../../data/adminData';

export const ClassesSectionsView: React.FC = () => {
  const [classes, setClasses] = useState<ClassSection[]>(INITIAL_CLASSES);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClass, setNewClass] = useState({ class: 'BSCS', section: '', totalStudents: 35 });

  const filtered = classes.filter(
    (c) =>
      c.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.assignedCR && c.assignedCR.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClass.section.trim()) return;

    const newItem: ClassSection = {
      id: `c-${Date.now()}`,
      class: newClass.class,
      section: newClass.section.toUpperCase(),
      totalStudents: Number(newClass.totalStudents),
      assignedCR: null,
      status: 'Active',
    };

    setClasses((prev) => [...prev, newItem]);
    setShowAddModal(false);
    setNewClass({ class: 'BSCS', section: '', totalStudents: 35 });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Manage Classes & Sections</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Add, edit or manage academic classes and sections for Fall 2026
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-[#493222] hover:bg-[#38271C] text-xs font-bold text-[#FFF9F1] rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Class</span>
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
            placeholder="Search classes, sections, or assigned CR..."
            className="w-full pl-9 pr-3.5 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
          />
        </div>
      </div>

      {/* 3. Table matching Mockup 5 */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Section</th>
                <th className="py-3 px-4">Total Students</th>
                <th className="py-3 px-4">Assigned CR</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
              {filtered.map((item, idx) => (
                <tr key={item.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-[#38271C]">{item.class}</td>
                  <td className="py-3.5 px-4 font-bold text-[#493222]">{item.section}</td>
                  <td className="py-3.5 px-4 font-semibold">{item.totalStudents}</td>
                  <td className="py-3.5 px-4">
                    {item.assignedCR ? (
                      <span className="px-2.5 py-1 bg-[#EAF2E9] text-[#668064] text-[11px] font-bold rounded-lg inline-block">
                        {item.assignedCR}
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-[#F8F0E5] text-[#806A56] text-[11px] font-medium rounded-lg inline-block">
                        Not Assigned
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                      {item.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Managing Class ${item.class} ${item.section}`)}
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

      {/* Add Class Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6D8C7]">
              <h3 className="font-bold text-sm text-[#38271C]">Add Academic Class Section</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-[#806A56]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Degree Program / Class</label>
                <input
                  type="text"
                  required
                  value={newClass.class}
                  onChange={(e) => setNewClass({ ...newClass, class: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Section Identifier (e.g. 5A, 6B)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 4B"
                  value={newClass.section}
                  onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  className="w-full p-2.5 bg-white border border-[#D8C7B4] rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-[#38271C] mb-1">Expected Total Students</label>
                <input
                  type="number"
                  min="10"
                  max="80"
                  required
                  value={newClass.totalStudents}
                  onChange={(e) => setNewClass({ ...newClass, totalStudents: Number(e.target.value) })}
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
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
