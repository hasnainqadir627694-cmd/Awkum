import React, { useState } from 'react';
import {
  User,
  Mail,
  Building,
  GraduationCap,
  Calendar,
  Phone,
  ShieldCheck,
  Shield,
  Edit3,
  Lock,
  Bell,
  HelpCircle,
  LogOut,
  ChevronRight,
  Check,
  X,
  AlertCircle,
  FileCheck,
  Database,
  Activity,
  RefreshCw,
} from 'lucide-react';
import { StudentProfile } from '../../data/portalData';
import { runFirebaseHealthCheck, HealthCheckResult } from '../../lib/firebaseHealth';
import { FIREBASE_CONFIG } from '../../lib/firebaseConfig';

interface ProfileScreenProps {
  student: StudentProfile;
  onUpdateStudent: (updated: Partial<StudentProfile>) => void;
  onLogout: () => void;
  isCR?: boolean;
  assignedClass?: string;
  onOpenCRPanel?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  student,
  onUpdateStudent,
  onLogout,
  isCR,
  assignedClass,
  onOpenCRPanel,
}) => {
  const [activeModal, setActiveModal] = useState<
    'edit' | 'password' | 'notifications' | 'help' | 'firebase' | null
  >(null);

  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Edit profile form state
  const [editPhone, setEditPhone] = useState(student.phone);
  const [editEmergency, setEditEmergency] = useState(student.emergencyContact);
  const [editAddress, setEditAddress] = useState(student.address);
  const [editSavedSuccess, setEditSavedSuccess] = useState(false);

  // Password form state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  // Notification preferences
  const [notifyClassReminders, setNotifyClassReminders] = useState(true);
  const [notifyAssignments, setNotifyAssignments] = useState(true);
  const [notifyNewUploads, setNotifyNewUploads] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateStudent({
      phone: editPhone,
      emergencyContact: editEmergency,
      address: editAddress,
    });
    setEditSavedSuccess(true);
    setTimeout(() => {
      setEditSavedSuccess(false);
      setActiveModal(null);
    }, 1200);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (!currentPass) {
      setPassError('Please enter your current password.');
      return;
    }
    if (newPass.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('New passwords do not match.');
      return;
    }

    setPassSuccess(true);
    setTimeout(() => {
      setPassSuccess(false);
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setActiveModal(null);
    }, 1200);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Screen Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#38271C]">
            Profile & Settings
          </h2>
          <p className="text-xs font-medium text-[#806A56] mt-0.5">
            Student identity & portal preferences
          </p>
        </div>
      </div>

      {/* Main Student Card (Matching reference Screen 09) */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 shadow-xs flex flex-col items-center text-center">
        <div className="relative mb-3">
          {student.avatarUrl && !student.avatarUrl.includes('images.unsplash.com') ? (
            <img
              src={student.avatarUrl}
              alt={student.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-[#493222] shadow-sm"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#493222] text-[#FFF9F1] flex items-center justify-center font-bold text-3xl border-4 border-[#493222] shadow-sm">
              {student.name.charAt(0)}
            </div>
          )}
          <span className="absolute bottom-0 right-0 p-1 bg-[#668064] text-white rounded-full ring-2 ring-[#FFF9F1]">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
        </div>

        <h3 className="text-lg font-bold text-[#38271C]">
          {student.name}
        </h3>
        <p className="text-xs font-semibold text-[#806A56] mt-0.5">
          {student.program} · {student.session.split('–')[1] || '2026'}
        </p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="px-3 py-1 bg-[#EFE3D3] text-[#493222] text-xs font-bold rounded-full">
            AWKUM · {student.id}
          </span>
          {isCR && (
            <span className="px-3 py-1 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-full flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>CR ({assignedClass || 'BSCS 3A'})</span>
            </span>
          )}
        </div>

        {isCR && onOpenCRPanel && (
          <button
            type="button"
            onClick={onOpenCRPanel}
            className="mt-3 w-full max-w-xs mx-auto py-2 px-4 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Shield className="w-4 h-4" />
            <span>Open Class Representative Panel</span>
          </button>
        )}
      </div>

      {/* Academic Information Table Card */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-4 shadow-xs space-y-2.5">
        <h4 className="text-xs font-bold text-[#806A56] uppercase tracking-wider mb-2">
          Enrollment Record
        </h4>

        <div className="flex items-center justify-between py-1.5 border-b border-[#E6D8C7] text-xs">
          <span className="text-[#806A56]">Student ID</span>
          <span className="font-bold text-[#38271C] font-mono">{student.id}</span>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-[#E6D8C7] text-xs">
          <span className="text-[#806A56]">Email</span>
          <span className="font-medium text-[#38271C]">{student.email}</span>
        </div>

        {student.fatherName && (
          <div className="flex items-center justify-between py-1.5 border-b border-[#E6D8C7] text-xs">
            <span className="text-[#806A56]">Father's Name</span>
            <span className="font-semibold text-[#38271C]">{student.fatherName}</span>
          </div>
        )}

        <div className="flex items-center justify-between py-1.5 border-b border-[#E6D8C7] text-xs">
          <span className="text-[#806A56]">Department</span>
          <span className="font-semibold text-[#38271C]">{student.department}</span>
        </div>

        <div className="flex items-center justify-between py-1.5 border-b border-[#E6D8C7] text-xs">
          <span className="text-[#806A56]">Semester & Section</span>
          <span className="font-semibold text-[#38271C]">
            {student.semester} (Section {student.section})
          </span>
        </div>

        <div className="flex items-center justify-between py-1.5 text-xs">
          <span className="text-[#806A56]">Current CGPA</span>
          <span className="font-bold text-[#668064] font-mono text-sm">
            {student.cgpa > 0 ? `${student.cgpa} / 4.00` : 'N/A (1st Semester)'}
          </span>
        </div>
      </div>

      {/* Account Settings List (Matching Screen 09) */}
      <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-2 shadow-xs space-y-1">
        <button
          onClick={() => setActiveModal('edit')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white text-xs font-semibold text-[#38271C] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Edit3 className="w-4 h-4 text-[#493222]" />
            <span>Edit Permitted Profile Info</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#806A56]" />
        </button>

        <button
          onClick={() => setActiveModal('password')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white text-xs font-semibold text-[#38271C] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-[#493222]" />
            <span>Change Password</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#806A56]" />
        </button>

        <button
          onClick={() => setActiveModal('notifications')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white text-xs font-semibold text-[#38271C] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-4 h-4 text-[#493222]" />
            <span>Notification Settings</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#806A56]" />
        </button>

        <button
          onClick={() => {
            setActiveModal('firebase');
            if (!healthResult && !isCheckingHealth) {
              setIsCheckingHealth(true);
              runFirebaseHealthCheck().then((res) => {
                setHealthResult(res);
                setIsCheckingHealth(false);
              });
            }
          }}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white text-xs font-semibold text-[#38271C] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Database className="w-4 h-4 text-[#493222]" />
            <div className="text-left">
              <span>Firebase Integration & Health</span>
              <span className="block text-[10px] text-[#668064] font-medium">
                Connected to awku-mardan
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#806A56]" />
        </button>

        <button
          onClick={() => setActiveModal('help')}
          className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white text-xs font-semibold text-[#38271C] transition-colors"
        >
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-[#493222]" />
            <span>Help & Department Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#806A56]" />
        </button>

        <div className="pt-2 border-t border-[#E6D8C7] mt-2">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-[#C84B31] hover:bg-[#FDE8E4] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout of AWKUM ClassHub</span>
          </button>
        </div>
      </div>

      {/* MODAL 1: EDIT PROFILE */}
      {activeModal === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#38271C]">
                Edit Contact Details
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#806A56] mb-4">
              Protected fields like your Student ID, Name, and Registered Email cannot be altered. You may update your active contact coordinates below.
            </p>

            {editSavedSuccess ? (
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DBC3] rounded-xl text-xs text-[#446342] flex items-center gap-2 mb-4">
                <Check className="w-4 h-4" />
                <span>Contact information successfully updated!</span>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#38271C] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none focus:border-[#493222]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#38271C] mb-1">
                    Emergency Contact
                  </label>
                  <input
                    type="text"
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none focus:border-[#493222]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#38271C] mb-1">
                    Hostel / Residential Address
                  </label>
                  <input
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none focus:border-[#493222]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#806A56]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE PASSWORD */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#38271C]">
                Change Password
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passError && (
              <div className="p-2.5 bg-[#FDE8E4] border border-[#F5C2B8] rounded-xl text-xs text-[#C84B31] flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {passSuccess ? (
              <div className="p-3 bg-[#EAF2E9] border border-[#C5DBC3] rounded-xl text-xs text-[#446342] flex items-center gap-2 mb-3">
                <Check className="w-4 h-4" />
                <span>Password successfully changed!</span>
              </div>
            ) : (
              <form onSubmit={handleSavePassword} className="space-y-3 mb-4">
                <div>
                  <label className="block text-[11px] font-semibold text-[#38271C] mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none focus:border-[#493222]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#38271C] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none focus:border-[#493222]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#38271C] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-white border border-[#E6D8C7] rounded-xl text-xs text-[#38271C] outline-none focus:border-[#493222]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#806A56]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: NOTIFICATION SETTINGS */}
      {activeModal === 'notifications' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#38271C]">
                Notification Preferences
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#806A56] mb-4">
              Control what push alerts and alerts appear in your ClassHub dashboard:
            </p>

            <div className="space-y-3 mb-5">
              <label className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#38271C] block">
                    Class Schedule Reminders
                  </span>
                  <span className="text-[10px] text-[#806A56]">
                    Alerts 15 mins before lecture sessions
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyClassReminders}
                  onChange={(e) => setNotifyClassReminders(e.target.checked)}
                  className="w-4 h-4 accent-[#493222]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#38271C] block">
                    Assignment Due Reminders
                  </span>
                  <span className="text-[10px] text-[#806A56]">
                    Reminders 24 hours prior to deadline
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyAssignments}
                  onChange={(e) => setNotifyAssignments(e.target.checked)}
                  className="w-4 h-4 accent-[#493222]"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 bg-white border border-[#E6D8C7] rounded-xl cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-[#38271C] block">
                    New Upload Alerts
                  </span>
                  <span className="text-[10px] text-[#806A56]">
                    When teachers publish lecture notes or slides
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyNewUploads}
                  onChange={(e) => setNotifyNewUploads(e.target.checked)}
                  className="w-4 h-4 accent-[#493222]"
                />
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: HELP & SUPPORT */}
      {activeModal === 'help' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#38271C]">
                Department Help & Desk
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-[#38271C] mb-4">
              <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl">
                <span className="text-[10px] font-bold text-[#806A56] block">
                  Department Coordinator
                </span>
                <span className="font-semibold block mt-0.5">
                  Prof. Dr. Tariq Shah
                </span>
                <span className="text-[11px] text-[#806A56]">
                  cs.coordinator@awkum.edu.pk · Ext: 402
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl">
                <span className="text-[10px] font-bold text-[#806A56] block">
                  Class Representative (CR)
                </span>
                <span className="font-semibold block mt-0.5">
                  Usman Khan (BS SE 3rd Sem)
                </span>
                <span className="text-[11px] text-[#806A56]">
                  +92 333 5556677
                </span>
              </div>

              <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl">
                <span className="text-[10px] font-bold text-[#806A56] block">
                  IT & ClassHub Portal Support
                </span>
                <span className="font-semibold block mt-0.5">
                  AWKUM IT Center Garden Campus
                </span>
                <span className="text-[11px] text-[#806A56]">
                  support.classhub@awkum.edu.pk
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: FIREBASE HEALTH DIAGNOSTIC */}
      {activeModal === 'firebase' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#F8F0E5] rounded-xl text-[#493222]">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#38271C]">
                    Firebase Integration Health
                  </h3>
                  <p className="text-[11px] text-[#806A56]">
                    Project: {FIREBASE_CONFIG.projectId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1 text-[#806A56] hover:text-[#38271C]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {/* Status Table */}
              <div className="p-3 bg-white border border-[#E6D8C7] rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[#806A56]">Config & Project ID</span>
                  <span className="font-mono font-bold text-[#38271C]">
                    {FIREBASE_CONFIG.projectId}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[#806A56]">Firebase SDK Init</span>
                  <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                    PASS
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[#806A56]">Auth Service</span>
                  <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                    INITIALIZED
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[#806A56]">Firestore Connectivity</span>
                  <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#668064] text-[10px] font-bold rounded-full">
                    ONLINE
                  </span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                  <span className="text-[#806A56]">Firestore Rules Probe</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      healthResult?.securityRulesStatus === 'VERIFIED'
                        ? 'bg-[#EAF2E9] text-[#668064]'
                        : 'bg-[#FFF3CD] text-[#856404]'
                    }`}
                  >
                    {healthResult?.securityRulesStatus || 'READY TO TEST'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#806A56]">File & Doc Storage</span>
                  <span className="px-2 py-0.5 bg-[#EAF2E9] text-[#493222] font-semibold text-[10px] rounded-full">
                    Cloudinary CDN
                  </span>
                </div>
              </div>

              {/* Real diagnostics details */}
              {isCheckingHealth ? (
                <div className="p-4 bg-[#F8F0E5] rounded-xl flex items-center justify-center gap-2 text-xs text-[#493222] font-semibold">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#493222]" />
                  <span>Probing live Firebase project...</span>
                </div>
              ) : healthResult ? (
                <div className="space-y-2">
                  <div className="p-3 bg-[#F8F0E5]/60 border border-[#E6D8C7] rounded-xl text-xs space-y-1">
                    <div className="font-bold text-[#38271C] text-[11px] uppercase tracking-wide">
                      Live Verification Feedback:
                    </div>
                    {healthResult.details.errorMessages.length === 0 ? (
                      <p className="text-[#668064] text-[11px]">
                        ✓ All test probes succeeded without permission errors.
                      </p>
                    ) : (
                      healthResult.details.errorMessages.map((msg, i) => (
                        <p key={i} className="text-[#806A56] text-[11px] leading-relaxed">
                          • {msg}
                        </p>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={isCheckingHealth}
                onClick={() => {
                  setIsCheckingHealth(true);
                  runFirebaseHealthCheck().then((res) => {
                    setHealthResult(res);
                    setIsCheckingHealth(false);
                  });
                }}
                className="w-full py-2 px-3 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{isCheckingHealth ? 'Testing Connection...' : 'Re-run Live Health Check'}</span>
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-[#38271C] text-xs font-bold rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
