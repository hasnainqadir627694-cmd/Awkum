import React, { useState, useEffect } from 'react';
import {
  User,
  Users,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Check,
  X,
  Mail,
  GraduationCap,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { AwkumEmblem } from '../common/AwkumLogo';
import { EmailVerificationPendingScreen } from './EmailVerificationPendingScreen';
import { auth } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { subscribeToBranding, DEFAULT_BRANDING, getCachedBranding, saveCachedBranding, getPublishedBranding } from '../../lib/brandingService';
import { resolveUserRole, registerStudentAccount } from '../../lib/authService';
import { subscribeToClasses } from '../../lib/classService';
import { AdminUser, BrandingConfig, UserRole, ClassSection } from '../../data/adminData';

interface LoginScreenProps {
  onLoginSuccess: (user: AdminUser, role: UserRole) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  // Login form state
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [department, setDepartment] = useState('Software Engineering');
  const [availableClasses, setAvailableClasses] = useState<ClassSection[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Shared status state
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Synchronous initialization from local storage cache prevents default branding flash on initial mount
  const [branding, setBranding] = useState<BrandingConfig>(() => getCachedBranding());

  // Subscribe to live branding updates and available classes in real time
  useEffect(() => {
    getPublishedBranding().then((cfg) => {
      if (cfg) {
        setBranding(cfg);
        saveCachedBranding(cfg);
      }
    });

    const unsubscribeBranding = subscribeToBranding((cfg) => {
      setBranding(cfg);
      saveCachedBranding(cfg);
    });

    const unsubscribeClasses = subscribeToClasses((liveClasses) => {
      const active = liveClasses.filter((c) => c.status !== 'Inactive');
      setAvailableClasses(active);
      if (active.length > 0 && !selectedClass) {
        setSelectedClass(`${active[0].class} ${active[0].section}`);
      }
    });

    return () => {
      unsubscribeBranding();
      unsubscribeClasses();
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!studentId.trim()) {
      setErrorMessage('Please enter your Student ID or university email.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    const cleanIdentifier = studentId.trim();
    const isMasterAdmin = cleanIdentifier.toLowerCase() === 'hasnainbuilds724656@gmail.com';
    let authVerifiedUid: string | undefined = undefined;

    // 1. If Master Admin email entered, enforce correct credentials
    if (isMasterAdmin) {
      if (password !== 'Hasnainqadir8696') {
        setIsLoading(false);
        setErrorMessage('Invalid credentials for Master Admin. Please check your password.');
        return;
      }

      // Authenticate with Firebase Auth
      if (auth) {
        try {
          await signInWithEmailAndPassword(auth, 'hasnainbuilds724656@gmail.com', 'Hasnainqadir8696');
        } catch (authErr: any) {
          console.info('[Firebase Auth] Master Admin sign-in notice:', authErr?.code || authErr?.message);
          try {
            await createUserWithEmailAndPassword(auth, 'hasnainbuilds724656@gmail.com', 'Hasnainqadir8696');
          } catch (createErr) {
            console.info('[Firebase Auth] Master Admin creation notice:', createErr);
          }
        }
      }
    } else if (cleanIdentifier.includes('@') && auth) {
      // General registered student Firebase sign-in with clear error handling
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanIdentifier, password);
        if (cred?.user?.uid) {
          authVerifiedUid = cred.user.uid;
        }
      } catch (authErr: any) {
        const code = authErr?.code || '';
        console.info('[Firebase Auth] Student sign-in notice:', code, authErr?.message);

        if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
          setIsLoading(false);
          setErrorMessage('Incorrect password. Please verify your credentials and try again.');
          return;
        } else if (code === 'auth/user-not-found') {
          setIsLoading(false);
          setErrorMessage('No account found with this email in Firebase Authentication. Please click "Register New Account" below.');
          return;
        } else if (code === 'auth/too-many-requests') {
          setIsLoading(false);
          setErrorMessage('Access temporarily disabled due to multiple failed login attempts. Please try again later or reset your password.');
          return;
        } else if (code === 'auth/user-disabled') {
          setIsLoading(false);
          setErrorMessage('This user account has been disabled in Firebase Authentication. Please contact IT Center.');
          return;
        }
      }
    }

    try {
      // Resolve role securely via authorization service with verified Firebase Auth UID
      const verifiedUid = authVerifiedUid || auth?.currentUser?.uid || (isMasterAdmin ? '97DtWk8axhfWOyi3hZfOcWgS0n92' : undefined);
      const resolution = await resolveUserRole(cleanIdentifier, password, verifiedUid);

      if (resolution.requiresVerification) {
        setIsLoading(false);
        setPendingVerificationEmail(resolution.unverifiedEmail || cleanIdentifier);
        return;
      }

      if (!resolution.success) {
        setIsLoading(false);
        setErrorMessage(
          resolution.error ||
            'Account not registered. Please register below if you are a new student.'
        );
        return;
      }

      if (resolution.user && resolution.role) {
        // Save session if rememberMe is enabled
        if (rememberMe && typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              'awkum_active_session',
              JSON.stringify({
                email: resolution.user.email,
                uid: resolution.user.uid,
                role: resolution.role,
                savedAt: Date.now(),
              })
            );
          } catch (e) {}
        }

        setIsLoading(false);
        onLoginSuccess(resolution.user, resolution.role);
      } else {
        setIsLoading(false);
        setErrorMessage('Unable to determine authorized portal role.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'Authentication error. Please try again.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!fatherName.trim()) {
      setErrorMessage("Please enter your father's name.");
      return;
    }

    if (!regEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Please enter a secure password (at least 6 characters).');
      return;
    }

    if (availableClasses.length > 0 && !selectedClass) {
      setErrorMessage('Please select your enrolled academic class/section.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerStudentAccount({
        fullName,
        fatherName,
        email: regEmail,
        password: regPassword,
        department,
        assignedClass: selectedClass || undefined,
      });

      if (!result.success) {
        setIsLoading(false);
        setErrorMessage(result.error || 'Registration failed. Please check details.');
        return;
      }

      if (result.requiresVerification) {
        setIsLoading(false);
        setPendingVerificationEmail(result.unverifiedEmail || regEmail);
        return;
      }

      setIsLoading(false);
      setSuccessMessage(
        `Registration successful! Enrolled in ${selectedClass || department}. Student ID: ${result.user?.studentId}`
      );

      // Smooth direct sign-in into 1st semester student portal
      setTimeout(() => {
        if (result.user && result.role) {
          onLoginSuccess(result.user, result.role);
        }
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || 'An error occurred during registration.');
    }
  };

  if (pendingVerificationEmail) {
    return (
      <EmailVerificationPendingScreen
        email={pendingVerificationEmail}
        onVerified={() => {
          setPendingVerificationEmail(null);
          setSuccessMessage('Email verified successfully! You may now sign in to your student portal.');
          setAuthMode('login');
        }}
        onBackToLogin={() => {
          setPendingVerificationEmail(null);
          setErrorMessage('');
        }}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-[#F8F0E5] text-[#38271C] flex flex-col justify-between selection:bg-[#493222] selection:text-[#FFF9F1] relative overflow-x-hidden"
      style={
        branding.bgImageEnabled && branding.bgImageUrl
          ? {
              backgroundImage: `url(${branding.bgImageUrl})`,
              backgroundSize: `${branding.bgImageScale || 100}%`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }
          : undefined
      }
    >
      {branding.bgImageEnabled && branding.bgImageUrl && (
        <div className="absolute inset-0 bg-[#F8F0E5]/50 pointer-events-none z-0" />
      )}
      {/* Upper Content: Branding + Form (Centered, sitting directly on cream canvas) */}
      <div className="w-full max-w-sm sm:max-w-md mx-auto px-5 pt-8 sm:pt-10 pb-2 flex-1 flex flex-col items-center z-10">
        {/* 1. University Branding (Real-time synchronized) */}
        <div className="flex flex-col items-center text-center mb-4">
          {/* University Logo (No cage, no borders, slightly bigger) */}
          <div className="mb-3.5 flex items-center justify-center">
            <AwkumEmblem size={56} />
          </div>

          <h1 className="font-serif text-2xl font-bold tracking-wider text-[#38271C]">
            AWKUM
          </h1>
          <p className="text-xs font-medium text-[#6B5441] mt-0.5">
            Abdul Wali Khan University Mardan
          </p>

          <h2 className="text-2xl font-bold text-[#2E1F14] mt-1.5 tracking-tight">
            ClassHub
          </h2>

          <div className="mt-1">
            <span className="inline-block px-3 py-0.5 bg-[#EADBCC] text-[#4A3525] text-xs font-semibold rounded-full">
              {authMode === 'login' ? 'Student Portal' : 'New Student Registration'}
            </span>
          </div>
        </div>



        <div className="w-full flex items-center justify-center gap-2 p-1 bg-[#EFE3D3]/60 border border-[#E6D8C7] rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'login'
                ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                : 'text-[#806A56] hover:text-[#38271C]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage('');
              setSuccessMessage('');
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              authMode === 'register'
                ? 'bg-[#493222] text-[#FFF9F1] shadow-xs'
                : 'text-[#806A56] hover:text-[#38271C]'
            }`}
          >
            Register New Student
          </button>
        </div>

        {/* Error and Success Alerts */}
        {errorMessage && (
          <div className="w-full mb-3 p-3 bg-[#FDE8E4] border border-[#F5C2B8] rounded-xl flex items-start gap-2 text-xs text-[#C84B31]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{errorMessage}</span>
              {authMode === 'login' && errorMessage.includes('not registered') && (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage('');
                  }}
                  className="block mt-1 font-bold underline hover:opacity-90"
                >
                  Click here to register your account →
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="w-full mb-3 p-3 bg-[#EAF2E9] border border-[#C5DEC3] rounded-xl flex items-start gap-2 text-xs text-[#668064] font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* 2A. LOGIN FORM */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5">
            {/* Student ID / Email */}
            <div>
              <label
                htmlFor="student-id"
                className="block text-xs font-semibold text-[#38271C] mb-1.5"
              >
                Student ID or University Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="student-id"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 23SW1234 or student@awkum.edu.pk"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222] focus:border-transparent transition-all shadow-2xs"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold text-[#38271C]"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-[#6B5441] hover:text-[#38271C] hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222] focus:border-transparent transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#806A56] hover:text-[#38271C] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center pt-0.5">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-[#493222] bg-white border-[#D8C7B4] rounded focus:ring-[#493222] accent-[#493222] cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 text-xs font-medium text-[#38271C] cursor-pointer select-none"
              >
                Remember me
              </label>
            </div>

            {/* Primary Login Button (Dark Espresso-Brown) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-[#493222] hover:bg-[#38271C] active:bg-[#2B1B11] text-[#FFF9F1] font-semibold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Switch to Register link */}
            <div className="pt-2 text-center text-xs text-[#806A56]">
              <span>New student and don't have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                }}
                className="font-bold text-[#493222] hover:underline cursor-pointer"
              >
                Register here
              </button>
            </div>
          </form>
        ) : (
          /* 2B. REGISTRATION FORM (Full Name, Father Name, Department: Software Engineering, Automated 1st Semester) */
          <form onSubmit={handleRegisterSubmit} className="w-full space-y-3">
            {/* Automated 1st Semester Banner */}
            <div className="p-3 bg-[#EAF2E9] border border-[#C5DEC3] rounded-xl flex items-center gap-2.5 text-xs text-[#446342]">
              <GraduationCap className="w-4 h-4 text-[#668064] shrink-0" />
              <div>
                <span className="font-bold block">Automated Enrollment: 1st Semester</span>
                <span className="text-[11px] text-[#668064]">
                  New registrations are enrolled in BS Software Engineering (Fall 2026).
                </span>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-[#38271C] mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Muhammad Hasnain"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>
            </div>

            {/* Father's Name */}
            <div>
              <label className="block text-xs font-semibold text-[#38271C] mb-1">
                Father's Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <Users className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Abdul Qadir"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>
            </div>

            {/* Department (Software Engineering) */}
            <div>
              <label className="block text-xs font-semibold text-[#38271C] mb-1">
                Department
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <Building className="w-4 h-4" />
                </div>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222] cursor-pointer"
                >
                  <option value="Software Engineering">Software Engineering (Garden Campus)</option>
                  <option value="Computer Science">Computer Science</option>
                </select>
              </div>
            </div>

            {/* Enrolled Class & Section */}
            <div>
              <label className="block text-xs font-semibold text-[#38271C] mb-1">
                Enrolled Class & Section *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                {availableClasses.length === 0 ? (
                  <div className="w-full pl-10 pr-3.5 py-2.5 bg-[#FFF3CD]/70 border border-[#F0D597] rounded-xl text-xs font-semibold text-[#856404]">
                    No classes configured yet by administration
                  </div>
                ) : (
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm font-semibold text-[#38271C] focus:outline-none focus:ring-2 focus:ring-[#493222] cursor-pointer"
                  >
                    <option value="">-- Select Your Class & Section --</option>
                    {availableClasses.map((cls) => (
                      <option key={cls.id} value={`${cls.class} ${cls.section}`}>
                        {cls.class} Section {cls.section}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* University or Personal Email */}
            <div>
              <label className="block text-xs font-semibold text-[#38271C] mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="e.g. hasnain@awkum.edu.pk or personal email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#38271C] mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#806A56]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Create a password (min 6 chars)"
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs sm:text-sm text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#806A56] hover:text-[#38271C] cursor-pointer"
                >
                  {showRegPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-[#493222] hover:bg-[#38271C] active:bg-[#2B1B11] text-[#FFF9F1] font-semibold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Complete Registration & Open Portal</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Switch back to Login */}
            <div className="pt-2 text-center text-xs text-[#806A56]">
              <span>Already registered? </span>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage('');
                }}
                className="font-bold text-[#493222] hover:underline cursor-pointer"
              >
                Sign in here
              </button>
            </div>
          </form>
        )}
      </div>



      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#38271C]">
                Reset Your Password
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSent(false);
                  setForgotEmail('');
                }}
                className="p-1 text-[#806A56] hover:text-[#38271C] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotSent ? (
              <div className="py-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#EAF2E9] text-[#668064] flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="text-xs font-bold text-[#38271C]">
                  Instructions Sent
                </h4>
                <p className="text-[11px] text-[#806A56] leading-relaxed">
                  If an account exists for <span className="font-semibold">{forgotEmail}</span>,
                  password recovery steps have been dispatched.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(false);
                    setForgotSent(false);
                    setForgotEmail('');
                  }}
                  className="mt-3 px-4 py-1.5 bg-[#493222] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (forgotEmail.trim()) {
                    setForgotSent(true);
                  }
                }}
                className="space-y-3"
              >
                <p className="text-[11px] text-[#806A56] leading-relaxed">
                  Enter your official university email to receive a password reset link.
                </p>
                <div>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="student@awkum.edu.pk"
                    className="w-full px-3 py-2 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#493222]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3 py-1.5 text-xs font-semibold text-[#806A56] hover:text-[#38271C] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#493222] hover:bg-[#38271C] text-[#FFF9F1] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Send Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
