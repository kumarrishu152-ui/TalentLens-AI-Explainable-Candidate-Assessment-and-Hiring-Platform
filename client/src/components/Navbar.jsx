import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brain, PlusCircle, LogOut, Briefcase, UserCircle2, LayoutDashboard, Sparkles, Bell, Pencil } from 'lucide-react';
import { useAuth } from '../context/AuthContext'; 
import VoiceInput from './VoiceInput';
import { userAPI } from '../services/api';

const Navbar = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    if (user) setProfile({
      displayName: user.displayName || '', email: user.email || '', phone: user.phone || '', location: user.location || '',
      headline: user.headline || '', bio: user.bio || '', skills: user.skills || '', companyName: user.companyName || '',
      companyWebsite: user.companyWebsite || '', industry: user.industry || ''
    });
  }, [user]);

  const profileFields = user?.role === 'candidate'
    ? [['displayName', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['location', 'Location'], ['headline', 'Professional headline'], ['skills', 'Skills (comma separated)'], ['bio', 'About you']]
    : [['displayName', 'Your name'], ['email', 'Work email'], ['phone', 'Phone'], ['companyName', 'Company name'], ['companyWebsite', 'Company website'], ['industry', 'Industry'], ['location', 'Company location'], ['bio', 'About the company']];

  const saveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError('');
    try {
      const saved = await userAPI.updateProfile(profile);
      updateUser(saved);
      setShowProfile(false);
    } catch (error) {
      setProfileError(error.response?.data?.error || 'Could not save your profile.');
    } finally { setSavingProfile(false); }
  };

  const notifications = user?.role === 'candidate'
    ? [
        { id: 1, title: 'AI Match update', detail: 'Your profile matches 2 new roles.', time: '2m ago' },
        { id: 2, title: 'Application status', detail: 'A recruiter reviewed your resume.', time: '1h ago' }
      ]
    : [
        { id: 1, title: 'New candidate applied', detail: 'A strong frontend profile matched your role.', time: '10m ago' },
        { id: 2, title: 'Interview scheduled', detail: 'Technical interview confirmed for tomorrow.', time: '3h ago' }
      ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAiMatch = () => {
    if (user?.role === 'candidate') {
      const target = document.getElementById('ai-match-section');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    navigate(user?.role === 'candidate' ? '/candidate' : '/recruiter');
  };

  const handleVoiceCommand = (spokenCommand) => {
    const command = spokenCommand.toLowerCase();
    if (command.includes('new job') || command.includes('create job') || command.includes('job setup')) {
      navigate('/create-job');
    } else if (command.includes('dashboard') || command.includes('home')) {
      navigate(user?.role === 'candidate' ? '/candidate' : '/recruiter');
    } else if (command.includes('ai match') || command.includes('match jobs') || command.includes('jobs for you')) {
      handleAiMatch();
    } else if (command.includes('notification') || command.includes('alerts')) {
      setShowNotifications((prev) => !prev);
    } else if (command.includes('sign out') || command.includes('log out')) {
      handleLogout();
    }
  };

  const roleLabel = user?.role === 'candidate' ? 'Candidate Portal' : 'Recruiter Portal';
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'TL';

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 items-center justify-between gap-4 py-3">
          <Link to={user?.role === 'candidate' ? '/candidate' : user ? '/recruiter' : '/login'} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 shadow-lg shadow-primary-200">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-black text-slate-900">TalentLens AI</span>
              {user && (
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">
                  {roleLabel}
                </span>
              )}
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
            <Link to={user ? (user.role === 'candidate' ? '/candidate' : '/recruiter') : '/login'} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white hover:text-primary-700">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            {user?.role === 'recruiter' && (
              <Link to="/create-job" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white hover:text-primary-700">
                <Briefcase className="h-4 w-4" />
                Jobs
              </Link>
            )}
            <button
              type="button"
              onClick={handleAiMatch}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white hover:text-primary-700"
            >
              <Sparkles className="h-4 w-4" />
              AI Match
            </button>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.role === 'recruiter' ? (
                  <Link 
                    to="/create-job" 
                    className="hidden items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700 sm:inline-flex"
                  >
                    <PlusCircle className="h-4 w-4" />
                    New Job
                  </Link>
                ) : (
                  <Link 
                    to="/candidate" 
                    className="hidden items-center gap-2 rounded-xl bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-colors hover:bg-primary-700 sm:inline-flex"
                  >
                    <UserCircle2 className="h-4 w-4" />
                    My Dashboard
                  </Link>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((prev) => !prev)}
                    aria-label="Toggle notifications"
                    className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-600 shadow-sm transition-colors hover:bg-slate-100"
                  >
                    <Bell className="h-4 w-4" />
                    {notifications.length > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="mb-2 flex items-center justify-between px-2 py-1">
                        <p className="text-sm font-bold text-slate-800">Notifications</p>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">{notifications.length}</span>
                      </div>
                      <div className="space-y-2">
                        {notifications.map((item) => (
                          <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
                              <span className="text-[10px] text-slate-400">{item.time}</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-600">{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <VoiceInput
                  label={user.role === 'candidate' ? 'Voice command: dashboard or sign out' : 'Voice command: dashboard, new job, or sign out'}
                  onTranscript={handleVoiceCommand}
                  className="hidden sm:inline-flex"
                />

                <button type="button" onClick={() => setShowProfile(true)} title="Edit profile" aria-label="Edit profile" className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 text-left shadow-sm hover:border-primary-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-600 text-xs font-bold text-white">
                    {initials}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-semibold text-slate-800">{user.displayName || user.username || 'Account'}</div>
                    <div className="max-w-32 truncate text-[10px] uppercase tracking-[0.15em] text-slate-500">{user.role === 'recruiter' ? (user.companyName || 'Add company') : (user.role || 'candidate')}</div>
                  </div>
                  <Pencil className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
                </button>

                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden md:inline">Sign out</span>
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {showProfile && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowProfile(false); }}><form onSubmit={saveProfile} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-primary-700">{user?.role} profile</p><h2 className="mt-1 text-2xl font-bold text-slate-900">Complete your profile</h2></div><button type="button" onClick={() => setShowProfile(false)} className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">Close</button></div><div className="grid gap-4 sm:grid-cols-2">{profileFields.map(([key, label]) => <label key={key} className={`text-sm font-semibold text-slate-700 ${['bio'].includes(key) ? 'sm:col-span-2' : ''}`}>{label}{key === 'bio' ? <textarea rows={3} value={profile[key] || ''} onChange={event => setProfile(prev => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal outline-none focus:border-primary-500" /> : <input value={profile[key] || ''} onChange={event => setProfile(prev => ({ ...prev, [key]: event.target.value }))} className="mt-1 w-full rounded-lg border border-slate-300 p-3 font-normal outline-none focus:border-primary-500" />}</label>)}</div>{profileError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{profileError}</p>}<button disabled={savingProfile} className="mt-5 w-full rounded-xl bg-primary-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{savingProfile ? 'Saving…' : 'Save profile'}</button></form></div>}
    </nav>
  );
};

export default Navbar;
