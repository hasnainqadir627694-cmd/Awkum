import React from 'react';
import { LogOut, Construction, ShieldCheck } from 'lucide-react';
import { AwkumEmblem } from '../common/AwkumLogo';
import { AdminUser } from '../../data/adminData';

interface UnavailablePortalScreenProps {
  user: AdminUser;
  onLogout: () => void;
}

export const UnavailablePortalScreen: React.FC<UnavailablePortalScreenProps> = ({
  user,
  onLogout,
}) => {
  const roleDisplay =
    user.role === 'teacher'
      ? 'Subject Teacher'
      : user.role === 'cr'
      ? 'Class Representative'
      : user.role;

  return (
    <div className="min-h-screen bg-[#F8F0E5] flex flex-col justify-between p-6 text-[#38271C] selection:bg-[#493222] selection:text-[#FFF9F1]">
      <div className="w-full max-w-md mx-auto my-auto flex flex-col items-center text-center">
        {/* Emblem */}
        <div className="w-16 h-16 rounded-2xl bg-[#FFF9F1] border border-[#E6D8C7] shadow-xs flex items-center justify-center p-2.5 mb-4">
          <AwkumEmblem size={44} />
        </div>

        <h1 className="font-serif text-xl font-bold tracking-wider text-[#38271C]">
          Abdul Wali Khan University Mardan
        </h1>
        <p className="text-xs font-semibold text-[#806A56] mt-0.5">
          ClassHub Management Network
        </p>

        {/* Advisory Card */}
        <div className="w-full mt-6 bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F8F0E5] text-[#493222] flex items-center justify-center mx-auto border border-[#E6D8C7]">
            <Construction className="w-6 h-6 stroke-[1.8]" />
          </div>

          <div>
            <span className="inline-block px-3 py-1 bg-[#EFE3D3] text-[#493222] text-xs font-bold rounded-full mb-2 uppercase tracking-wide">
              {roleDisplay} Access
            </span>
            <h2 className="text-lg font-bold text-[#38271C]">
              Your Assigned Portal Is Not Available Yet
            </h2>
            <p className="text-xs text-[#806A56] mt-2 leading-relaxed">
              Hello <strong className="text-[#38271C]">{user.name}</strong> ({user.email}). Your account is verified as an official{' '}
              <strong className="text-[#38271C]">{roleDisplay}</strong>, but the dedicated faculty/CR management portal is currently undergoing final academic deployment.
            </p>
          </div>

          <div className="p-3 bg-[#F8F0E5]/70 rounded-xl text-left border border-[#E6D8C7]/60 space-y-1 text-xs">
            <div className="flex items-center justify-between text-[#806A56]">
              <span>Department:</span>
              <span className="font-semibold text-[#38271C]">{user.department || 'Computer Science'}</span>
            </div>
            {user.assignedSubjects && user.assignedSubjects.length > 0 && (
              <div className="flex items-center justify-between text-[#806A56]">
                <span>Assigned Subjects:</span>
                <span className="font-semibold text-[#668064]">{user.assignedSubjects.join(', ')}</span>
              </div>
            )}
            {user.assignedClass && (
              <div className="flex items-center justify-between text-[#806A56]">
                <span>Assigned Class:</span>
                <span className="font-semibold text-[#668064]">{user.assignedClass}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={onLogout}
              className="w-full py-2.5 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] font-semibold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out to Login Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[11px] text-[#806A56] flex items-center justify-center gap-1.5 pt-4">
        <ShieldCheck className="w-3.5 h-3.5 text-[#668064]" />
        <span>Garden Campus Mardan · Central Administration</span>
      </div>
    </div>
  );
};
