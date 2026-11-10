import React, { useState, useEffect } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  User,
} from 'lucide-react';
import {
  adminAuthClient,
  AuthenticatedAdminProfile,
} from '../../services/admin-auth-client';
import { StoreSettings } from '../../types/ecommerce';

interface AdminLoginPageProps {
  settings: StoreSettings;
  unauthorizedReason?: string | null;
  onLoginSuccess: (admin: AuthenticatedAdminProfile) => void;
  onBackToStorefront: () => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  settings,
  unauthorizedReason,
  onLoginSuccess,
  onBackToStorefront,
}) => {
  // Login Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(unauthorizedReason || null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot Password State ('login' | 'forgot_request' | 'forgot_verify')
  const [viewMode, setViewMode] = useState<'login' | 'forgot_request' | 'forgot_verify'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [dispatchedOtpPreview, setDispatchedOtpPreview] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [confirmUsername, setConfirmUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const savedId = adminAuthClient.getRememberedIdentifier();
    if (savedId) {
      setIdentifier(savedId);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (unauthorizedReason) {
      setErrorMsg(unauthorizedReason);
    }
  }, [unauthorizedReason]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your administrator username/email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await adminAuthClient.login(identifier.trim(), password, rememberMe);
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setPassword('');
    onLoginSuccess(result.admin);
  };

  const handleRequestResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!recoveryEmail.trim()) {
      setErrorMsg('Please enter your registered administrator email address.');
      return;
    }

    setIsSubmitting(true);
    const result = await adminAuthClient.requestPasswordReset(recoveryEmail.trim());
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setResetToken(result.resetToken);
    setDispatchedOtpPreview(result.verificationOtp);
    setSuccessMsg(result.message);
    setViewMode('forgot_verify');
  };

  const handleCompleteResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!otpInput.trim() || !confirmUsername.trim() || !newPassword) {
      setErrorMsg('All recovery verification fields are required.');
      return;
    }

    setIsSubmitting(true);
    const result = await adminAuthClient.completePasswordReset({
      resetToken,
      otpCode: otpInput.trim(),
      username: confirmUsername.trim(),
      newPassword,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setSuccessMsg(result.message);
    setIdentifier(confirmUsername.trim());
    setPassword('');
    setNewPassword('');
    setOtpInput('');
    setViewMode('login');
  };

  return (
    <div className="min-h-screen bg-[#0c0d10] text-white flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Subtle Architectural Grid & Ambient Glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.08),transparent_50%)]" />

      {/* Top Navigation Bar */}
      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-lg">
            AQ
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight flex items-center gap-2">
              <span>{settings.storeName}</span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-emerald-300 text-[10px] font-mono uppercase">
                Sovereign Admin Gate
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Doha, State of Qatar · Enterprise Identity &amp; Access Management
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToStorefront}
          className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Storefront</span>
        </button>
      </header>

      {/* Main Centered Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#14161b] border border-white/10 rounded-2xl shadow-2xl p-8 space-y-6">
          {/* Card Header */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Backend Scrypt &amp; HMAC-SHA256 Protected</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              {viewMode === 'login' && 'Administrator Sign In'}
              {viewMode === 'forgot_request' && 'Admin Password Recovery'}
              {viewMode === 'forgot_verify' && 'Verify Recovery Code'}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              {viewMode === 'login' &&
                'Enter your authorized administrator username or email and password to access the AURA QATAR Shopify Admin Console.'}
              {viewMode === 'forgot_request' &&
                'Enter your registered administrator email address to generate a time-limited backend recovery token.'}
              {viewMode === 'forgot_verify' &&
                'Enter the 6-digit recovery code, confirm your administrator username, and choose a new password.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Banner */}
          {successMsg && (
            <div
              role="status"
              className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ================================================================
              VIEW 1: LOGIN FORM
             ================================================================ */}
          {viewMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-identifier"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Username or Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter username or email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c0d10] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="admin-password"
                    className="block text-xs font-semibold text-slate-300"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null);
                      setSuccessMsg(null);
                      setViewMode('forgot_request');
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="admin-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[#0c0d10] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-[#0c0d10] text-emerald-500 focus:ring-0"
                  />
                  <span>Remember me for 30 days</span>
                </label>
                <span className="text-[11px] text-slate-500">Public sign-up disabled</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-lg cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Authenticate &amp; Enter Admin</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================================================================
              VIEW 2: FORGOT PASSWORD — STEP 1 (REQUEST OTP)
             ================================================================ */}
          {viewMode === 'forgot_request' && (
            <form onSubmit={handleRequestResetSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="recovery-email"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Registered Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="recovery-email"
                    type="email"
                    required
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="Enter registered admin email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0c0d10] border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null);
                    setViewMode('login');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Back to Login
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Generating...' : 'Send Recovery Code'}
                </button>
              </div>
            </form>
          )}

          {/* ================================================================
              VIEW 3: FORGOT PASSWORD — STEP 2 (VERIFY OTP & SET NEW PASSWORD)
             ================================================================ */}
          {viewMode === 'forgot_verify' && (
            <form onSubmit={handleCompleteResetSubmit} className="space-y-4">
              {dispatchedOtpPreview && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-1">
                  <div className="font-bold text-amber-300">
                    Security Dispatch Code (15-Minute Expiry):
                  </div>
                  <div className="font-mono text-base font-bold tracking-widest text-white">
                    {dispatchedOtpPreview}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    6-Digit Security Code
                  </label>
                  <input
                    type="text"
                    required
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="6-digit OTP"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0d10] border border-white/15 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirm Username
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmUsername}
                    onChange={(e) => setConfirmUsername(e.target.value)}
                    placeholder="Admin username"
                    className="w-full px-3 py-2 rounded-xl bg-[#0c0d10] border border-white/15 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Administrator Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-3.5 pr-10 py-2 rounded-xl bg-[#0c0d10] border border-white/15 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setViewMode('login')}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  {isSubmitting ? 'Updating Hash...' : 'Reset Password'}
                </button>
              </div>
            </form>
          )}

          {/* Security Footer Note */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-500">
            <span>Zero Frontend Credential Storage</span>
            <span>Protected API `/api/admin/*`</span>
          </div>
        </div>
      </main>

      {/* Bottom Copyright */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-500 border-t border-white/5">
        © 2026 {settings.storeName} · Restricted Administration Gateway · Unauthorized access is logged.
      </footer>
    </div>
  );
};
