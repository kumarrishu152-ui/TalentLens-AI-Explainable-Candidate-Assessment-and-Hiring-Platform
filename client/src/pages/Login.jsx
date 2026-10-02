import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Lock, User, Briefcase, UserCircle2, ShieldCheck, Sparkles, ArrowRight, Eye, EyeOff, Check, Fingerprint, Mail, BarChart3, LineChart, AlertCircle, Loader2 } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const roles = [
  { id: 'recruiter', label: 'Recruiter', icon: Briefcase, description: 'Manage hiring pipeline and shortlists' },
  { id: 'candidate', label: 'Candidate', icon: UserCircle2, description: 'Track applications and interview prep' },
  { id: 'admin', label: 'Admin', icon: ShieldCheck, description: 'Platform administration (provisioned account)' }
];

const highlights = [
  { icon: Sparkles, title: 'AI resume intelligence', detail: 'Parse, score and rank candidates in seconds.' },
  { icon: BarChart3, title: 'Explainable scoring', detail: 'Every match comes with transparent evidence.' },
  { icon: LineChart, title: 'Hiring analytics', detail: 'Live pipeline insights, from applied to offer.' }
];

const highlightDelays = ['delay-100', 'delay-200', 'delay-300'];

const fieldClass = 'w-full rounded-xl border border-slate-200 bg-white/80 py-3 pl-11 pr-4 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-500/10';

const AuthField = ({ icon: Icon, className = '', ...props }) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input {...props} className={`${fieldClass} ${className}`} />
  </div>
);

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('recruiter');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError('Username and password are required.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload = isLogin
        ? await userAPI.login(trimmedUsername, trimmedPassword, role)
        : await userAPI.register(trimmedUsername, trimmedPassword, role, { displayName, companyName, email });

      login(payload.token, payload.user || { username: trimmedUsername, role });
      navigate(role === 'candidate' ? '/candidate' : '/recruiter');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const roleBadge = roles.find((r) => r.id === role);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,_#eef4ff,_#f8fafc_45%,_#f5f3ff_100%)] px-4 py-10">
      {/* Ambient background */}
      <div className="bg-grid-faint mask-fade-b pointer-events-none absolute inset-0" />
      <div className="animate-aurora pointer-events-none absolute -left-40 top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-primary-300/30 blur-3xl" />
      <div className="animate-aurora pointer-events-none absolute -right-40 bottom-[-12rem] h-[32rem] w-[32rem] rounded-full bg-violet-300/25 blur-3xl [animation-delay:4s]" />
      <div className="animate-aurora pointer-events-none absolute left-1/3 top-1/2 h-[26rem] w-[26rem] rounded-full bg-sky-200/30 blur-3xl [animation-delay:8s]" />

      <div className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/70 shadow-[0_30px_90px_-20px_rgba(30,58,138,0.25)] backdrop-blur-2xl lg:grid-cols-[1.05fr_1fr]">
        {/* Left brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-700 via-indigo-700 to-violet-700 p-10 text-white lg:flex">
          <div className="bg-grid-faint pointer-events-none absolute inset-0 opacity-40" />
          <div className="animate-aurora pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-400/30 blur-3xl" />
          <div className="animate-aurora pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-violet-400/30 blur-3xl [animation-delay:5s]" />

          <div className="relative flex items-center gap-3">
            <div className="relative">
              <span className="animate-pulse-ring absolute inset-0 rounded-2xl bg-white/40" />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/30 backdrop-blur">
                <Brain className="h-6 w-6 text-white" />
              </div>
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">TalentLens AI</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/60">Hiring intelligence</p>
            </div>
          </div>

          <div className="relative space-y-6 py-10">
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Hire with <span className="text-sky-200">evidence,</span>
              <br />
              not guesswork.
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-white/70">
              Parse resumes, rank candidates and run skill assessments — all backed by explainable AI your team can trust.
            </p>
            <ul className="space-y-4">
              {highlights.map(({ icon: Icon, title, detail }, index) => (
                <li key={title} className={`animate-fade-up ${highlightDelays[index]} flex items-start gap-3`}>
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                    <Icon className="h-4 w-4 text-sky-200" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{title}</span>
                    <span className="block text-xs text-white/60">{detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex items-center gap-3 text-[11px] text-white/60">
            <Fingerprint className="h-4 w-4" />
            <span>SOC2-ready · Your data stays yours · Gemini-powered</span>
          </div>
        </div>

        {/* Right form panel */}
        <div className="relative bg-white/85 p-8 sm:p-10">
          <div className="mx-auto max-w-sm">
            <div className="mb-2 flex items-center gap-2 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-600 to-indigo-600 shadow-lg shadow-primary-200">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <span className="text-base font-black text-slate-900">TalentLens AI</span>
            </div>

            <h2 className="animate-fade-up mt-4 text-3xl font-black tracking-tight text-slate-900 lg:mt-0">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="animate-fade-up delay-100 mt-1.5 text-sm text-slate-500">
              {isLogin ? 'Sign in to your hiring command center.' : 'Set up an account and start hiring smarter.'}
            </p>

            {/* Role selector */}
            <div className={`mt-7 grid gap-3 ${isLogin ? 'grid-cols-3' : 'grid-cols-1'}`}>
              {roles.filter(item => isLogin || item.id !== 'admin').map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRole(id)}
                  aria-pressed={role === id}
                  className={`relative rounded-2xl border transition-all duration-200 ${
                    isLogin ? 'flex flex-col items-center gap-2 px-1.5 py-3.5 text-center' : 'p-3 text-left'
                  } ${
                    role === id
                      ? 'border-primary-400 bg-primary-50/80 shadow-sm ring-1 ring-primary-200'
                      : 'border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  {role === id && (
                    <span
                      className={`absolute flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white shadow-md ring-2 ring-white ${
                        isLogin ? '-top-2 left-1/2 -translate-x-1/2' : '-right-1.5 -top-1.5'
                      }`}
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                  {isLogin ? (
                    <>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        role === id ? 'bg-primary-600/10 text-primary-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="whitespace-nowrap text-[13px] font-bold tracking-tight text-slate-800 sm:text-sm">{label}</span>
                    </>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        role === id ? 'bg-primary-600/10 text-primary-600' : 'bg-slate-100 text-slate-400'
                      }`}>
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block whitespace-nowrap text-sm font-bold text-slate-800">{label}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{description}</span>
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="animate-fade-up delay-200 mt-6 space-y-4">
              {!isLogin && (
                <>
                  <AuthField icon={User} type="text" placeholder="Your full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
                  <AuthField icon={Mail} type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  {role === 'recruiter' && <AuthField icon={Briefcase} type="text" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />}
                </>
              )}

              <AuthField icon={User} type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username" />
              <div className="relative">
                <AuthField
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition-colors hover:text-primary-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {error && (
                <div className="animate-fade-up flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary-600 via-indigo-600 to-primary-600 bg-[length:200%_100%] py-3.5 text-base font-bold text-white shadow-lg shadow-primary-500/25 transition-all duration-300 hover:bg-[position:100%_0] hover:shadow-xl hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 inline-flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Signing in…
                    </>
                  ) : (
                    <>
                      {isLogin ? `Sign in${roleBadge ? ` as ${roleBadge.label}` : ''}` : `Create ${roleBadge?.label || ''} account`}
                      <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </span>
                <span className="animate-shimmer pointer-events-none absolute inset-y-0 w-1/3 bg-white/20 blur-md" />
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="font-bold text-primary-600 underline-offset-4 transition-colors hover:text-primary-700 hover:underline"
              >
                {isLogin ? 'Create one' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
