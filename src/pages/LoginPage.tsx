import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import {
  Code2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  Globe,
  Terminal,
  ShieldCheck,
  ChevronLeft,
  GraduationCap,
} from 'lucide-react';
import { EducationalPencilAnimation } from '../components/EducationalPencilAnimation';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const emailInputRef = useRef<HTMLInputElement>(null);

  // If already authenticated, redirect immediately based on role
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (user.role === 'MENTOR') {
        navigate('/mentor/dashboard', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/student/dashboard';
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, location]);

  // Focus email input after entrance animation completes (around 900ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (emailInputRef.current && !isAuthenticated) {
        emailInputRef.current.focus();
      }
    }, shouldReduceMotion ? 50 : 800);

    return () => clearTimeout(timer);
  }, [shouldReduceMotion, isAuthenticated]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const authUser = await login(trimmedEmail, password);
      // Route based on role returned directly by the backend database
      if (authUser.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (authUser.role === 'MENTOR') {
        navigate('/mentor/dashboard', { replace: true });
      } else {
        const from = (location.state as any)?.from?.pathname || '/student/dashboard';
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email or password is incorrect.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.6,
        when: 'beforeChildren',
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
      },
    },
  };

  const leftVisualVariants = {
    hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -32 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.7,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  const rightFormVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: shouldReduceMotion ? 0.1 : 0.65,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top minimal bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-sm">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none rounded-md px-2 py-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Codeyoung</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">256-Bit SSL Secure Enterprise Portal</span>
        </div>
      </header>

      {/* Main Split Screen Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-5xl bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]"
        >
          {/* ========================================================================= */}
          {/* LEFT SIDE: Educational Visual & Codeyoung Mission Branding                 */}
          {/* ========================================================================= */}
          <motion.div
            variants={leftVisualVariants}
            className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden"
          >
            {/* Ambient Background Grid and Glow */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2.5rem_2.5rem] opacity-30 pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -top-24 -left-24 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"
            />

            {/* Brand Logo & Label */}
            <div className="relative z-10 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-600/90 border border-blue-400/30 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                  <Code2 className="w-6 h-6 stroke-[2.4]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-white font-serif">
                    Codeyoung
                  </h1>
                  <span className="block text-[11px] uppercase tracking-widest text-blue-300 font-semibold">
                    Unified Learning Portal
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive/Illustrated Coding & Pencil Educational Stage */}
            <div className="relative z-10 my-6 py-2">
              <EducationalPencilAnimation />

              {/* Orbital Badge */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-300">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Empowering 20,000+ Students Worldwide across 15+ Countries</span>
              </div>
            </div>

            {/* Bottom Proof Quote */}
            <div className="relative z-10 text-xs text-slate-400 pt-4 border-t border-slate-800 flex items-center justify-between">
              <span>Codeyoung Global Portal</span>
              <span>Parent · Mentor · Admin</span>
            </div>
          </motion.div>

          {/* ========================================================================= */}
          {/* RIGHT SIDE: Dedicated Single Clean Sign In Form                           */}
          {/* ========================================================================= */}
          <motion.div
            variants={rightFormVariants}
            className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-between bg-white"
          >
            <div>
              {/* Heading & Subtitle */}
              <div className="space-y-2 mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-serif">
                  Welcome back
                </h2>
                <p className="text-sm text-slate-600">
                  Sign in with your registered account to continue to your dashboard.
                </p>
              </div>

              {/* Error Notice */}
              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3"
                >
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">Authentication Error</strong>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}

              {/* The Form */}
              <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                {/* Email Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      ref={emailInputRef}
                      id="login-email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="e.g. parent@example.com or mntr001@codeyoung.in"
                      autoComplete="email"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-bold uppercase tracking-wider text-slate-700"
                    >
                      Password
                    </label>
                    <span className="text-xs text-slate-500 font-medium">
                      Case sensitive
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="••••••••••••"
                      autoComplete="current-password"
                      required
                      className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:text-blue-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 disabled:bg-blue-400 text-white font-semibold py-3.5 px-6 rounded-xl shadow-md shadow-blue-700/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/30 text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Demo Account Credentials Quick Helper for Reviewers */}
              <div className="mt-8 pt-6 border-t border-slate-100 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Quick Access Reference
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block">Mentor Portal</span>
                    <code className="text-[11px] text-blue-700">mntr001@codeyoung.in</code>
                    <p className="text-[10px] text-slate-500 mt-0.5">Password: Mentor@1234</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80">
                    <span className="font-semibold text-slate-900 block">Admin Console</span>
                    <code className="text-[11px] text-blue-700">admin@codeyoung.in</code>
                    <p className="text-[10px] text-slate-500 mt-0.5">Password: Admin@1234</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Customer Trial Link */}
            <div className="mt-8 pt-4 text-center text-xs text-slate-500">
              <span>Looking to book a trial class for your child? </span>
              <Link to="/" className="text-blue-700 font-semibold hover:underline">
                Book Free Trial (No Login Required)
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-slate-200/80 bg-white/50">
        © 2026 Codeyoung STEM Academy. All rights reserved.
      </footer>
    </div>
  );
};
