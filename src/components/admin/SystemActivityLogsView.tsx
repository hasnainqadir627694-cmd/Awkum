import React, { useState } from 'react';
import { Search, Filter, ShieldCheck, Clock, Download } from 'lucide-react';
import { AuditLogItem } from '../../data/adminData';

interface SystemActivityLogsViewProps {
  logs: AuditLogItem[];
}

export const SystemActivityLogsView: React.FC<SystemActivityLogsViewProps> = ({ logs }) => {
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = logs.filter((log) => {
    if (categoryFilter !== 'All' && log.category !== categoryFilter) return false;
    if (
      searchTerm.trim() &&
      !log.action.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.details.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-5">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#38271C]">System Activity Logs</h1>
          <p className="text-xs text-[#806A56] mt-0.5">
            Immutable administrative audit trail of all role changes, security events, and branding updates
          </p>
        </div>

        <button
          onClick={() => alert('Exporting encrypted compliance audit log CSV...')}
          className="px-3.5 py-2 bg-white border border-[#E6D8C7] hover:bg-[#F8F0E5] text-xs font-semibold text-[#493222] rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Audit Log</span>
        </button>
      </div>

      {/* 2. Filters & Search matching Mockup 13 */}
      <div className="bg-[#FFF9F1] p-3 rounded-2xl border border-[#E6D8C7] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#38271C]"
          >
            <option value="All">All Actions</option>
            <option value="role">Roles & Permissions</option>
            <option value="branding">Branding Updates</option>
            <option value="academic">Academic & Subjects</option>
            <option value="security">Security & Suspensions</option>
          </select>

          <span className="px-3 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs font-semibold text-[#806A56]">
            Last 30 Days ▾
          </span>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#806A56] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60"
          />
        </div>
      </div>

      {/* 3. Table matching Mockup 13 */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8F0E5]/80 text-[#806A56] uppercase text-[10px] tracking-wider font-bold border-b border-[#E6D8C7]">
              <tr>
                <th className="py-3 px-4 w-12">#</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Performed By</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6D8C7]/50 text-[#38271C]">
              {filtered.map((log, idx) => (
                <tr key={log.id} className="hover:bg-[#F3E9DD]/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-[#806A56]">{idx + 1}</td>
                  <td className="py-3.5 px-4 font-bold text-[#38271C]">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          log.status === 'success'
                            ? 'bg-[#668064]'
                            : log.status === 'warning'
                            ? 'bg-[#E2A03F]'
                            : 'bg-[#C84B31]'
                        }`}
                      />
                      <span>{log.action}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-[#493222]">
                    {log.performedBy}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[#38271C]">{log.details}</td>
                  <td className="py-3.5 px-4 text-right text-[#806A56] whitespace-nowrap">
                    {log.timestamp}
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
