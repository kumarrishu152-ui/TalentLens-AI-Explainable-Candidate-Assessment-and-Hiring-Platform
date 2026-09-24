import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Lock, User, Briefcase, UserCircle2 } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import GlowCard from '../components/ui/GlowCard';

const roles = [
  { id: 'recruiter', label: 'Recruiter', icon: Briefcase, description: 'Manage hiring pipeline and shortlists' },
  { id: 'candidate', label: 'Candidate', icon: UserCircle2, description: 'Track applications and interview prep' }
];

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <GlowCard className="w-full max-w-xl p-8 shadow-xl">
        <div className="flex justify-center mb-6">
          <div className="bg-primary-600 p-3 rounded-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {roles.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              type="button"
              onClick={() => setRole(id)}
              className={`rounded-xl border p-3 text-left transition ${role === id
                ? 'border-primary-500 bg-primary-50 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${role === id ? 'text-primary-600' : 'text-slate-500'}`} />
                <span className="font-semibold text-slate-800">{label}</span>
              </div>
              <p className="text-xs text-slate-500">{description}</p>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && <>
            <input type="text" placeholder="Your full name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-primary-500" required />
            <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-primary-500" required />
            {role === 'recruiter' && <input type="text" placeholder="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full rounded-lg border bg-slate-50 p-3 outline-none focus:ring-2 focus:ring-primary-500" required />}
          </>}
          <div className="relative">
            <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-primary-500 bg-slate-50"
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="w-full btn-primary py-3 font-bold text-lg disabled:opacity-60 disabled:cursor-not-allowed">
            {loading ? 'Please wait...' : (isLogin ? `Sign In as ${roles.find(r => r.id === role)?.label}` : `Create ${roles.find(r => r.id === role)?.label} Account`)}
          </button>
        </form>

        <p className="text-center mt-6 text-slate-600">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-primary-600 font-bold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </GlowCard>
    </div>
  );
};

export default Login;
