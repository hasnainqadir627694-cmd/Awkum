import React, { useState } from 'react';
import { Search, Filter, MoreVertical, CheckSquare, Calendar, ChevronDown } from 'lucide-react';

interface AssignmentRow {
  id: string;
  title: string;
  subject: string;
  class: string;
  dueDate: string;
  submissions: string;
  status: 'Active' | 'Closed';
}

const INITIAL_ASSIGNMENTS_OVERVIEW: AssignmentRow[] = [
  { id: 'asg-1', title: 'Chapter 4 Notes', subject: 'PF Theory', class: 'BSCS 3A', dueDate: 'Oct 25, 2026', submissions: '28/36', status: 'Active' },
  { id: 'asg-2', title: 'Lab Report 02', subject: 'PF Lab', class: 'BSCS 2A', dueDate: 'Oct 22, 2026', submissions: '40/45', status: 'Active' },
  { id: 'asg-3', title: 'Case Study', subject: 'Management', class: 'BSCS 2B', dueDate: 'Oct 28, 2026', submissions: '12/40', status: 'Active' },
  { id: 'asg-4', title: 'Essay Writing', subject: 'English', class: 'BSCS 1A', dueDate: 'Oct 20, 2026', submissions: '38/42', status: 'Closed' },
  { id: 'asg-5', title: 'Calculus Problem Set 03', subject: 'Maths', class: 'BSCS 3A', dueDate: 'Nov 02, 2026', submissions: '18/36', status: 'Active' },
];

export const AssignmentsOverviewView: React.FC = () => {
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = INITIAL_ASSIGNMENTS_OVERVIEW.filter((asg) => {
    if (subjectFilter !== 'All' && asg.subject !== subjectFilter) return false;
    if (classFilter !== 'All' && asg.class !== classFilter) return false;
    if (searchTerm.trim() && !asg.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">Assignments Overview</h1>
        <p className="text-xs text-[#806A56] mt-0.5">
          Monitor assignments and submission rates across all academic subjects and sections
        </p>
      </div>

      {/* 2. Filters & Search matching Mockup 10 */}
      <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C]"
          >
            <option value="All">All Subjects</option>
            <option value="PF Theory">PF Theory</option>
            <option value="PF Lab">PF Lab</option>
            <option value="Management">Management</option>
            <option value="English">English</option>
            <option value="Maths">Maths</option>
            <option value="Physics">Physics</option>
          </select>

          {/* Class Filter */}
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C]"
          >
            <option value="All">All Classes</option>
            <option value="BSCS 1A">BSCS 1A</option>
            <option value="BSCS 2A">BSCS 2A</option>
            <option value="BSCS 2B">BSCS 2B</option>
            <option value="BSCS 3A">BSCS 3A</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search assignments..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60"
          />
        </div>
      </div>

      {/* 3. Table matching Mockup 10 */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Submissions</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
              {filtered.map((asg, idx) => (
                <tr key={asg.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-[#38271C]">{asg.title}</td>
                  <td className="py-3.5 px-4 font-semibold text-[#493222]">{asg.subject}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-[#806A56]">{asg.class}</td>
                  <td className="py-3.5 px-4 text-[#806A56]">{asg.dueDate}</td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-[#38271C]">{asg.submissions}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${
                        asg.status === 'Active'
                          ? 'bg-[#EAF2E9] text-[#668064]'
                          : 'bg-[#FDE8E4] text-[#C84B31]'
                      }`}
                    >
                      {asg.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => alert(`Reviewing submissions for ${asg.title}`)}
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
    </div>
  );
};
