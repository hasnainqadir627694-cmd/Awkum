import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
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
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { subscribeToBranding, getCachedBranding, saveCachedBranding, getPublishedBranding } from '../../lib/brandingService';
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
          setErrorMessage('No account found with this email in Firebase Authentication. Please click "Register here" below.');
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

      // Smooth direct sign-in into student portal
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
      className="min-h-screen bg-[#FBF6EE] text-[#332014] flex flex-col justify-between selection:bg-[#462D1D] selection:text-[#FFF9F2] relative overflow-x-hidden"
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
      {/* Optional Background Tint when custom bg image is enabled */}
      {branding.bgImageEnabled && branding.bgImageUrl && (
        <div className="absolute inset-0 bg-[#FBF6EE]/75 pointer-events-none z-0" />
      )}

      {/* UPPER CONTENT: BRANDING HEADER + FORM */}
      <div className="w-full max-w-[430px] mx-auto px-4 pt-10 sm:pt-12 pb-4 flex-1 flex flex-col items-center z-20">
        
        {/* BRANDING HEADER (Exact match to reference mockup) */}
        <div className="flex flex-col items-center text-center">
          {/* AWKUM Official Crest */}
          <div className="mb-2.5 flex items-center justify-center">
            <AwkumEmblem size={86} overrideLogoUrl={branding.logoUrl} className="drop-shadow-xs" />
          </div>

          {/* "AWKUM" Serif Heading */}
          <h1
            className="text-[32px] sm:text-[36px] font-extrabold tracking-[0.16em] text-[#332014] uppercase leading-none"
            style={{ fontFamily: "var(--font-serif, 'Cinzel', serif)" }}
          >
            AWKUM
          </h1>

          {/* "Abdul Wali Khan University Mardan" Subtitle */}
          <p
            className="text-[13px] sm:text-[14px] font-medium text-[#58412F] tracking-wide mt-1 leading-tight"
            style={{ fontFamily: "var(--font-serif, 'Cinzel', serif)" }}
          >
            Abdul Wali Khan University Mardan
          </p>

          {/* Graduation Cap Center Glyph with Dual Flanking Hairlines */}
          <div className="flex items-center justify-center gap-3 my-2 w-full max-w-[210px]">
            <div className="flex-1 h-[1px] bg-[#D4C0AD]" />
            <GraduationCap className="w-4 h-4 text-[#614532]" strokeWidth={2.2} />
            <div className="flex-1 h-[1px] bg-[#D4C0AD]" />
          </div>

          {/* "ClassHub" Bold Title */}
          <h2 className="text-[36px] sm:text-[40px] font-bold text-[#24150E] tracking-tight leading-none">
            ClassHub
          </h2>

          {/* "UNIVERSAL PORTAL" Tag Badge */}
          <div className="mt-2.5">
            <span className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-[#E3D1BE] text-[#4A301D] text-[10px] sm:text-[11px] font-bold tracking-[0.24em] uppercase shadow-2xs">
              UNIVERSAL PORTAL
            </span>
          </div>

          {/* Tagline */}
          <p className="text-[13px] sm:text-[14px] font-medium text-[#6B5544] mt-2">
            One Platform for a Better Academic Experience
          </p>
        </div>

        {/* Error and Success Alerts */}
        {errorMessage && (
          <div className="w-full mt-4 p-3.5 bg-[#FDE8E4] border border-[#F5C2B8] rounded-2xl flex items-start gap-2.5 text-xs text-[#C84B31] shadow-2xs">
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
                  className="block mt-1 font-bold underline hover:opacity-90 cursor-pointer"
                >
                  Click here to register your account →
                </button>
              )}
            </div>
          </div>
        )}

        {successMessage && (
          <div className="w-full mt-4 p-3.5 bg-[#EAF2E9] border border-[#C5DEC3] rounded-2xl flex items-start gap-2.5 text-xs text-[#557353] font-semibold animate-in fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* FORM (No outer square frame) */}
        {authMode === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="w-full space-y-3.5 mt-5">
            {/* Field 1: University Email */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              {/* Left Warm Square Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <Mail className="w-5 h-5 stroke-[1.8]" />
              </div>
              {/* Text Label + Input */}
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <label htmlFor="login-email" className="block text-[12px] sm:text-[13px] font-semibold text-[#3D291D] leading-none mb-1 cursor-pointer">
                  University Email
                </label>
                <input
                  id="login-email"
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="e.g. 23SW1234@awkum.edu.pk"
                  className="w-full text-[13px] text-[#24150E] placeholder-[#9E8B7B] bg-transparent outline-none font-normal leading-normal"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Field 2: Password */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              {/* Left Warm Square Icon Container */}
              <div className="w-12 h-12 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <Lock className="w-5 h-5 stroke-[1.8]" />
              </div>
              {/* Text Label + Input */}
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <label htmlFor="login-password" className="block text-[12px] sm:text-[13px] font-semibold text-[#3D291D] leading-none mb-1 cursor-pointer">
                  Password
                </label>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-[13px] text-[#24150E] placeholder-[#9E8B7B] bg-transparent outline-none font-normal leading-normal"
                  autoComplete="current-password"
                />
              </div>
              {/* Right Eye Toggle Button */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-[#8C7665] hover:text-[#3D291D] transition-colors cursor-pointer shrink-0"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-5 h-5 stroke-[1.8]" /> : <Eye className="w-5 h-5 stroke-[1.8]" />}
              </button>
            </div>

            {/* Row: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between pt-1 px-1">
              {/* Custom Rounded Dark Checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                    rememberMe ? 'bg-[#462D1D] text-white' : 'bg-white border border-[#D5C2AF]'
                  }`}
                >
                  {rememberMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-[13px] font-medium text-[#2E1D13]">Remember me</span>
              </label>

              {/* Forgot Password Link */}
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-[13px] font-semibold text-[#2E1D13] hover:underline cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>

            {/* Primary Login Button (Dark Chocolate Capsule with Arrow) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 mt-2 rounded-full bg-[#462D1D] hover:bg-[#341F12] active:bg-[#28160B] text-white font-bold text-[16px] shadow-[0_8px_22px_rgba(70,45,29,0.32)] hover:shadow-[0_10px_26px_rgba(70,45,29,0.4)] flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Login</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>

            {/* Bottom Register Prompt */}
            <div className="pt-3 text-center">
              <p className="text-[13px] text-[#695444]">
                New student and don&apos;t have an account?
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="mt-1 font-bold text-[14px] text-[#2E1D13] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Register here</span>
                <ArrowRight className="w-4 h-4 inline stroke-[2.2]" />
              </button>
            </div>
          </form>
        ) : (
          /* REGISTRATION FORM (No outer square frame) */
          <form onSubmit={handleRegisterSubmit} className="w-full space-y-3 mt-5">
            {/* Automated 1st Semester Banner */}
            <div className="p-3 bg-[#EAF2E9] border border-[#C5DEC3] rounded-2xl flex items-center gap-2.5 text-xs text-[#3D5C3B]">
              <GraduationCap className="w-4 h-4 text-[#557353] shrink-0" />
              <div>
                <span className="font-bold block">Automated Enrollment: 1st Semester</span>
                <span className="text-[11px] text-[#557353]">
                  New registrations are enrolled in BS Software Engineering (Fall 2026).
                </span>
              </div>
            </div>

            {/* Full Name */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <User className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <label className="block text-[11px] font-semibold text-[#3D291D] leading-none mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Muhammad Ahmad"
                  className="w-full text-[13px] text-[#24150E] placeholder-[#9E8B7B] bg-transparent outline-none font-normal"
                />
              </div>
            </div>

            {/* Father Name */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <User className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <label className="block text-[11px] font-semibold text-[#3D291D] leading-none mb-1">
                  Father&apos;s Name
                </label>
                <input
                  type="text"
                  required
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Tariq Khan"
                  className="w-full text-[13px] text-[#24150E] placeholder-[#9E8B7B] bg-transparent outline-none font-normal"
                />
              </div>
            </div>

            {/* University Email */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <Mail className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <label className="block text-[11px] font-semibold text-[#3D291D] leading-none mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="student@awkum.edu.pk"
                  className="w-full text-[13px] text-[#24150E] placeholder-[#9E8B7B] bg-transparent outline-none font-normal"
                />
              </div>
            </div>

            {/* Department & Section */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <Building className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-2">
                <label className="block text-[11px] font-semibold text-[#3D291D] leading-none mb-1">
                  Enrolled Section
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full text-[13px] text-[#24150E] bg-transparent outline-none font-medium cursor-pointer"
                >
                  {availableClasses.map((c) => (
                    <option key={c.id} value={`${c.class} ${c.section}`}>
                      {c.class} — Section {c.section}
                    </option>
                  ))}
                  {availableClasses.length === 0 && (
                    <option value="BS Software Engineering 1st A">
                      BS Software Engineering 1st — Section A
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Password */}
            <div className="w-full rounded-2xl bg-white border border-[#E7D9CB] p-2.5 flex items-center gap-3.5 shadow-2xs focus-within:border-[#462D1D] focus-within:ring-2 focus-within:ring-[#462D1D]/15 transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#F6EDE4] flex items-center justify-center shrink-0 text-[#543925]">
                <Lock className="w-4 h-4 stroke-[1.8]" />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <label className="block text-[11px] font-semibold text-[#3D291D] leading-none mb-1">
                  Password
                </label>
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full text-[13px] text-[#24150E] placeholder-[#9E8B7B] bg-transparent outline-none font-normal"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowRegPassword(!showRegPassword)}
                className="p-1.5 text-[#8C7665] hover:text-[#3D291D] transition-colors cursor-pointer shrink-0"
              >
                {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Submit Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 sm:py-4 mt-2 rounded-full bg-[#462D1D] hover:bg-[#341F12] text-white font-bold text-[15px] shadow-[0_8px_22px_rgba(70,45,29,0.32)] flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {isLoading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Complete Registration & Open Portal</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.2]" />
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
                  setSuccessMessage('');
                }}
                className="font-bold text-[#462D1D] hover:underline cursor-pointer"
              >
                Sign in here →
              </button>
            </div>
          </form>
        )}

      </div>

      {/* 6. BOTTOM CAMPUS BUILDING & FLUID OVERLAPPING WAVES (Exact match to reference mockup) */}
      {branding.bottomImageEnabled && (branding.bottomImageUrl || '/images/awkum-campus-building.jpg') && (
        <div className="w-full relative mt-auto overflow-hidden pointer-events-none select-none z-10 flex flex-col justify-end">
          
          {/* Building image container */}
          <div className="relative w-full">
            {/* Soft top-edge feather blend into canvas */}
            <div className="absolute inset-x-0 top-0 h-10 sm:h-14 bg-linear-to-b from-[#FBF6EE] to-transparent z-10 pointer-events-none" />

            <img
              src={branding.bottomImageUrl || '/images/awkum-campus-building.jpg'}
              alt="AWKUM Campus Building"
              className="w-full h-auto min-h-[260px] sm:min-h-[340px] md:min-h-[420px] max-h-[64vh] object-cover object-bottom block"
              style={{
                transform:
                  branding.bottomImageScale && branding.bottomImageScale !== 100
                    ? `scale(${branding.bottomImageScale / 100})`
                    : undefined,
                transformOrigin: 'bottom center',
              }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />

            {/* FLOWING MULTI-LAYERED WAVE RIBBONS AT THE BOTTOM OF THE BUILDING */}
            <div className="absolute bottom-0 inset-x-0 w-full h-[95px] sm:h-[130px] md:h-[155px] lg:h-[175px] pointer-events-none z-20 overflow-hidden">
              <svg
                viewBox="0 0 1440 260"
                className="w-full h-full"
                preserveAspectRatio="none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  {/* Primary deep chocolate gradient */}
                  <linearGradient id="waveGradDeep" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#25140B" />
                    <stop offset="45%" stopColor="#43291B" />
                    <stop offset="100%" stopColor="#301A0E" />
                  </linearGradient>

                  {/* Warm amber caramel gradient */}
                  <linearGradient id="waveGradCaramel" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#A88B73" />
                    <stop offset="45%" stopColor="#C9B098" />
                    <stop offset="100%" stopColor="#96775F" />
                  </linearGradient>

                  {/* Golden-tan glowing ribbon gradient */}
                  <linearGradient id="waveGradGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#DFC8B2" />
                    <stop offset="50%" stopColor="#B39379" />
                    <stop offset="100%" stopColor="#8C6E56" />
                  </linearGradient>

                  {/* Silk champagne cream accent gradient */}
                  <linearGradient id="waveGradCream" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FFF9F2" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#F5ECE0" stopOpacity="0.98" />
                    <stop offset="100%" stopColor="#FFF9F2" stopOpacity="0.85" />
                  </linearGradient>

                  {/* Front dark chocolate wave */}
                  <linearGradient id="waveGradFront" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#362014" />
                    <stop offset="35%" stopColor="#4D3120" />
                    <stop offset="75%" stopColor="#2B160C" />
                    <stop offset="100%" stopColor="#1E0E06" />
                  </linearGradient>

                  {/* Soft atmospheric depth shadow */}
                  <filter id="waveShadow" x="-5%" y="-20%" width="110%" height="145%" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="-4" stdDeviation="5" floodColor="#180C06" floodOpacity="0.25" />
                  </filter>
                </defs>

                {/* Layer 1: Ambient soft background wave surging from left */}
                <path
                  d="M0,170 C240,215 480,125 720,165 C960,205 1200,105 1440,145 V260 H0 Z"
                  fill="url(#waveGradCaramel)"
                  opacity="0.55"
                />

                {/* Layer 2: Rolling caramel-gold swell with sweeping crests */}
                <path
                  d="M0,135 C180,185 340,90 560,135 C780,180 1020,65 1260,110 C1340,125 1400,110 1440,100 V260 H0 Z"
                  fill="url(#waveGradGold)"
                  opacity="0.88"
                />

                {/* Layer 3: Silk cream accent ribbon along middle crest */}
                <path
                  d="M0,140 C180,190 340,95 560,140 C780,185 1020,70 1260,115 C1340,130 1400,115 1440,105 V260 H0 Z"
                  fill="url(#waveGradCream)"
                  opacity="0.92"
                />

                {/* Layer 4: Deep rich chocolate main surging wave with natural depth shadow */}
                <path
                  d="M0,150 C220,85 440,215 700,140 C960,65 1180,175 1440,115 V260 H0 Z"
                  fill="url(#waveGradDeep)"
                  filter="url(#waveShadow)"
                />

                {/* Layer 5: Fine champagne highlight contour tracing the chocolate crest */}
                <path
                  d="M0,152 C220,87 440,217 700,142 C960,67 1180,177 1440,117"
                  stroke="url(#waveGradCream)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.8"
                />

                {/* Layer 6: Foreground undulating dark chocolate swell framing the bottom */}
                <path
                  d="M0,180 C260,230 520,150 780,190 C1040,230 1280,140 1440,170 V260 H0 Z"
                  fill="url(#waveGradFront)"
                />

                {/* Layer 7: Golden rim highlight along the foreground curl */}
                <path
                  d="M0,182 C260,232 520,152 780,192 C1040,232 1280,142 1440,172"
                  stroke="#DFC5AF"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                  opacity="0.5"
                />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[#FFF9F1] border border-[#E6D8C7] rounded-3xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
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
                  className="mt-3 px-4 py-1.5 bg-[#462D1D] text-[#FFF9F1] text-xs font-bold rounded-xl cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D8C7B4] rounded-xl text-xs text-[#38271C] placeholder-[#806A56]/60 focus:outline-none focus:ring-2 focus:ring-[#462D1D]"
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
                    className="px-4 py-1.5 bg-[#462D1D] hover:bg-[#341F12] text-[#FFF9F1] text-xs font-bold rounded-xl transition-colors cursor-pointer"
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
