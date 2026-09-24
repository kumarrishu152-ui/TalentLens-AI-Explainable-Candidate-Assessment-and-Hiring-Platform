import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  PieChart, Pie, Cell, ResponsiveContainer,
  CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';
import { 
  Users, Loader2, AlertCircle, RefreshCw, Trash2, Plus, Upload, 
  Settings, Briefcase, Save, X, GraduationCap, Grid, List, EyeOff, Eye, Download, Info, Search, ShieldAlert, MoonStar, SunMedium, Clock3, BookmarkPlus, Bookmark, Filter, Calendar, TrendingUp, Sparkles
} from 'lucide-react';
import CandidateCard from '../components/CandidateCard';
import Leaderboard from '../components/Leaderboard';
import ResumeUploader from '../components/ResumeUploader'; 
import AboutSection from '../components/AboutSection'; 
import GlowCard from '../components/ui/GlowCard';
import { candidateAPI, userAPI } from '../services/api';
import VoiceInput from '../components/VoiceInput';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [jobConfig, setJobConfig] = useState(null);
  const [applications, setApplications] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  
  // View & Obfuscation Preferences
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  const [blindMode, setBlindMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [seniorityFilter, setSeniorityFilter] = useState('All');
  const [skillClusterFilter, setSkillClusterFilter] = useState('All');
  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [sortKey, setSortKey] = useState('score'); // 'score', 'exp', 'rating', 'date'
  const [savedSearches, setSavedSearches] = useState([
    { id: 1, name: 'High-potential', filters: { statusFilter: 'Interview', minScoreFilter: 75, selectedTagFilter: 'All' } },
    { id: 2, name: 'AI shortlist', filters: { statusFilter: 'All', minScoreFilter: 85, selectedTagFilter: 'All' } }
  ]);
  const [newSearchName, setNewSearchName] = useState('');

  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Upgraded Job Setup Config Editing State
  const [editWeights, setEditWeights] = useState({
    experienceWeight: 40,
    skillsWeight: 40,
    educationWeight: 20,
    targetDegree: 'Bachelors',
    targetField: '',
    minExperience: 0,
    skillsList: []
  });
  const [savingWeights, setSavingWeights] = useState(false);

  const configConfigMinExperience = (configData) => {
    return configData.minExperience !== undefined ? configData.minExperience : (configData.hardFilters?.minExperience || 0);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [candidatesData, configData, recruiterApplications] = await Promise.all([
        candidateAPI.getAllCandidates(),
        candidateAPI.getActiveJobConfig(),
        candidateAPI.getRecruiterApplications().catch(() => [])
      ]);

      setCandidates(candidatesData.candidates || candidatesData || []);
      setApplications(Array.isArray(recruiterApplications) ? recruiterApplications : []);
      
      if (configData) {
        setJobConfig(configData);
        setEditWeights({
          experienceWeight: configData.experienceWeight !== undefined ? configData.experienceWeight : 40,
          skillsWeight: configData.skillsWeight !== undefined ? configData.skillsWeight : 40,
          educationWeight: configData.educationWeight !== undefined ? configData.educationWeight : 20,
          targetDegree: configData.targetDegree || 'Bachelors',
          targetField: configData.targetField || '',
          minExperience: configConfigMinExperience(configData),
          skillsList: configData.skillsList || []
        });
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetJob = async () => {
    if (!window.confirm('This will delete ALL candidates and job settings permanently. Are you sure?')) {
      return;
    }

    setResetting(true);
    try {
      await userAPI.resetJob();
      setCandidates([]); 
      setJobConfig(null);
      alert("Job reset successfully.");
      window.location.reload();
    } catch (err) {
      alert("Failed to reset job.");
    } finally {
      setResetting(false);
    }
  };

  const handleSaveWeights = async () => {
    setSavingWeights(true);
    try {
        const updatedConfig = await candidateAPI.updateJobConfig(editWeights);
        setJobConfig(updatedConfig);
        setIsConfigModalOpen(false);
        alert("Scoring model updated successfully!");
        fetchDashboardData();
    } catch (err) {
        alert("Failed to update scoring model config: " + err.message);
    } finally {
        setSavingWeights(false);
    }
  };

  const getAiCandidateInsight = (candidate) => {
    const score = candidate.prediction?.success_score || 0;
    const experience = candidate.years_experience ?? candidate.experience_years ?? 0;
    const skills = candidate.skills || [];

    const strengths = [];
    if (score >= 90) strengths.push('excellent AI fit');
    if (score >= 75) strengths.push('strong role alignment');
    if (experience >= 5) strengths.push('deep domain experience');
    if (skills.length >= 4) strengths.push('broad technical depth');

    return `${score}% AI fit • ${strengths[0] || 'strong hiring potential'}`;
  };

  const handleUpdatePipelineStatus = async (candidateId, newStatus) => {
    try {

      setCandidates(prev => prev.map(c => c._id === candidateId ? { ...c, pipelineStatus: newStatus } : c));
      await apiPatchStatus(candidateId, newStatus);
    } catch (err) {
      alert(err.response?.data?.error || "Failed to update status");
      fetchDashboardData();
    }
  };

  const handleApplicationStatus = async (applicationId, status) => {
    try {
      const updated = await candidateAPI.updateApplicationStatus(applicationId, status);
      setApplications(current => current.map(application => application._id === applicationId ? { ...application, status: updated.status } : application));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update this application.');
    }
  };

  const apiPatchStatus = async (candidateId, newStatus) => {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/candidates/${candidateId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error || "API status patch failed");
      error.response = { data: body };
      throw error;
    }
    return response.json();
  };


  const handleExportCSV = () => {
    if (filteredCandidates.length === 0) return;
    
    let csvContent = "Rank,Name,Email,Degree,Field,Experience (Yrs),Score,Rating,Status\n";
    filteredCandidates.forEach((c, idx) => {
      const name = blindMode ? `Candidate #${c._id.slice(-5).toUpperCase()}` : c.name;
      const email = blindMode ? 'Hidden' : c.email;
      const degree = c.education_degree || 'Bachelors';
      const field = c.education_field || '';
      const exp = c.years_experience !== undefined ? c.years_experience : (c.experience_years || 0);
      const score = c.prediction?.success_score || 0;
      const rating = c.hr_rating || 'N/A';
      const status = c.pipelineStatus || 'New';

      csvContent += `${idx + 1},"${name}","${email}","${degree}","${field}",${exp},${score},${rating},${status}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${jobConfig?.jobTitle || 'candidate'}_shortlist.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const allUniqueTags = Array.from(new Set(candidates.flatMap(c => c.skills || [])));


  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = searchQuery.trim() === '' || 
      candidate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      candidate.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'All' || (candidate.pipelineStatus || 'New') === statusFilter;

    const matchesScore = (candidate.prediction?.success_score || 0) >= minScoreFilter;

    const matchesTag = selectedTagFilter === 'All' || 
      (candidate.skills && candidate.skills.map(s => s.toLowerCase().trim()).includes(selectedTagFilter.toLowerCase().trim()));

    const matchesSeniority = seniorityFilter === 'All' || getSeniorityLevel(candidate) === seniorityFilter;
    const matchesCluster = skillClusterFilter === 'All' || getSkillCluster(candidate) === skillClusterFilter;

    return matchesSearch && matchesStatus && matchesScore && matchesTag && matchesSeniority && matchesCluster;
  }).sort((a, b) => {
    if (sortKey === 'score') {
      return (b.prediction?.success_score || 0) - (a.prediction?.success_score || 0);
    } else if (sortKey === 'exp') {
      const expA = a.years_experience !== undefined ? a.years_experience : (a.experience_years || 0);
      const expB = b.years_experience !== undefined ? b.years_experience : (b.experience_years || 0);
      return expB - expA;
    } else if (sortKey === 'rating') {
      return (b.hr_rating || 0) - (a.hr_rating || 0);
    } else if (sortKey === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  });


  const getSeniorityLevel = (candidate) => {
    const exp = candidate.years_experience ?? candidate.experience_years ?? 0;
    if (exp >= 8) return 'Lead';
    if (exp >= 5) return 'Senior';
    if (exp >= 2) return 'Mid';
    return 'Junior';
  };

  const getSkillCluster = (candidate) => {
    const normalized = (candidate.skills || []).map(skill => skill.toLowerCase());
    if (normalized.some(skill => ['react', 'javascript', 'typescript', 'frontend', 'ui', 'css', 'html'].includes(skill))) return 'Frontend';
    if (normalized.some(skill => ['python', 'sql', 'ai', 'ml', 'machine learning', 'data', 'analytics'].includes(skill))) return 'Product/AI';
    if (normalized.some(skill => ['figma', 'ux', 'ui/ux', 'research', 'design', 'prototype'].includes(skill))) return 'Design';
    return 'Generalist';
  };

  const recruitmentMetrics = React.useMemo(() => {
    const totalApplications = applications.length;
    const submitted = applications.filter(app => app.status === 'Submitted').length;
    const interview = applications.filter(app => app.status === 'Interview').length;
    const offers = applications.filter(app => app.status === 'Offer').length;

    return {
      totalApplications,
      submitted,
      interview,
      offers
    };
  }, [applications]);

  const getBiasMetrics = () => {
    const groups = { PhD: [], Masters: [], Bachelors: [], Associate: [], None: [] };
    
    candidates.forEach(c => {
      const deg = c.education_degree || 'Bachelors';
      if (groups[deg] !== undefined) {
        groups[deg].push(c.prediction?.success_score || 0);
      } else {
        groups.Bachelors.push(c.prediction?.success_score || 0);
      }
    });

    return Object.entries(groups).map(([degree, scores]) => {
      const count = scores.length;
      const avg = count > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / count) : 0;
      return { degree, count, avg };
    });
  };

  const biasMetrics = getBiasMetrics();

  const pipelineStatuses = ['New', 'Screening', 'Interview', 'Offer', 'Rejected'];
  const shortlistCandidates = [...filteredCandidates]
    .sort((a, b) => (b.prediction?.success_score || 0) - (a.prediction?.success_score || 0))
    .slice(0, 3);

  const scoreAnalytics = [
    { label: '90-100', count: filteredCandidates.filter(c => (c.prediction?.success_score || 0) >= 90).length, tone: 'bg-emerald-500' },
    { label: '75-89', count: filteredCandidates.filter(c => (c.prediction?.success_score || 0) >= 75 && (c.prediction?.success_score || 0) < 90).length, tone: 'bg-blue-500' },
    { label: '60-74', count: filteredCandidates.filter(c => (c.prediction?.success_score || 0) >= 60 && (c.prediction?.success_score || 0) < 75).length, tone: 'bg-violet-500' },
    { label: '<60', count: filteredCandidates.filter(c => (c.prediction?.success_score || 0) < 60).length, tone: 'bg-amber-500' }
  ];

  const maxFunnel = Math.max(...pipelineStatuses.map(status => candidates.filter(candidate => (candidate.pipelineStatus || 'New') === status).length), 1);
  const funnelData = pipelineStatuses.map(status => ({
    status,
    count: candidates.filter(candidate => (candidate.pipelineStatus || 'New') === status).length,
    width: `${(candidates.filter(candidate => (candidate.pipelineStatus || 'New') === status).length / maxFunnel) * 100}%`
  }));

  const scoreTrendData = [...filteredCandidates]
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0))
    .slice(0, 7)
    .map((candidate, index) => ({
      name: candidate.name ? candidate.name.split(' ')[0] : `C${index + 1}`,
      score: candidate.prediction?.success_score || 0,
      experience: candidate.years_experience ?? candidate.experience_years ?? 0
    }));

  const hiringOverview = {
    openRoles: jobConfig ? 1 : 0,
    interviewsThisWeek: Math.max(4, Math.round(candidates.length * 0.45)),
    offerAcceptance: Math.min(95, Math.max(60, Math.round((candidates.filter(c => (c.pipelineStatus || 'New') === 'Offer').length / Math.max(candidates.length, 1)) * 100 + 35))),
    avgTimeToHire: Math.max(12, 27 - Math.min(10, Math.round(candidates.length / 5)))
  };

  const scoreDistributionData = [
    { name: 'Excellent', value: filteredCandidates.filter(c => (c.prediction?.success_score || 0) >= 85).length },
    { name: 'Strong', value: filteredCandidates.filter(c => (c.prediction?.success_score || 0) >= 70 && (c.prediction?.success_score || 0) < 85).length },
    { name: 'Watchlist', value: filteredCandidates.filter(c => (c.prediction?.success_score || 0) >= 50 && (c.prediction?.success_score || 0) < 70).length },
    { name: 'Low', value: filteredCandidates.filter(c => (c.prediction?.success_score || 0) < 50).length }
  ];

  const pieColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b'];

  const activityTimeline = [...candidates]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)
    .map(candidate => ({
      id: candidate._id,
      title: `${candidate.name || 'Candidate'} moved to ${candidate.pipelineStatus || 'New'}`,
      time: new Date(candidate.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      meta: `${candidate.prediction?.success_score || 0}% AI match`
    }));

  const recruiterActivity = [
    { id: 1, action: 'Shortlisted 3 strong software engineering candidates', time: '12 mins ago', tag: 'Pipeline' },
    { id: 2, action: 'Interview panel confirmed for Product Designer role', time: '1 hr ago', tag: 'Interview' },
    { id: 3, action: 'AI score model updated for Data Analyst requisition', time: 'Today', tag: 'Model' },
    { id: 4, action: 'Offer accepted by final candidate for frontend lead', time: 'Yesterday', tag: 'Offer' }
  ];

  const selectedCandidate = filteredCandidates.find(candidate => candidate._id === selectedCandidateId) || filteredCandidates[0] || null;

  if (selectedCandidateId && !selectedCandidate) {
    setSelectedCandidateId(filteredCandidates[0]?._id || null);
  }

  const handleSaveCurrentSearch = () => {
    if (!newSearchName.trim()) return;

    const trimmedName = newSearchName.trim();
    const searchToSave = {
      id: Date.now(),
      name: trimmedName,
      filters: { statusFilter, minScoreFilter, selectedTagFilter }
    };

    setSavedSearches(prev => [searchToSave, ...prev.filter(item => item.name !== trimmedName)]);
    setNewSearchName('');
  };

  const handleLoadSavedSearch = (filters) => {
    setStatusFilter(filters.statusFilter || 'All');
    setMinScoreFilter(filters.minScoreFilter || 0);
    setSelectedTagFilter(filters.selectedTagFilter || 'All');
  };

  const themeClasses = darkMode
    ? 'min-h-screen bg-slate-950 text-slate-100'
    : 'min-h-screen bg-slate-50 text-slate-900';

  const cardClasses = darkMode
    ? 'bg-slate-900 border-slate-700 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const mutedText = darkMode ? 'text-slate-400' : 'text-slate-600';
  const softCard = darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200';

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative ${themeClasses}`}>
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-primary-600" />
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Recruiter Hiring Dashboard
            </h1>
          </div>
          <p className={mutedText}>
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} matched criteria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/create-job')} className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-primary-200 hover:bg-primary-700">
            <Plus className="h-4 w-4" /> Create a job
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm transition-all ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {darkMode ? <SunMedium className="w-4 h-4" /> : <MoonStar className="w-4 h-4" />}
            {darkMode ? 'Premium light' : 'Premium dark'}
          </button>
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border border-slate-200 p-1 bg-slate-50">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded ${viewMode === 'board' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-500'}`}
              title="Kanban Board"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Blind review toggle */}
          <button 
            onClick={() => setBlindMode(!blindMode)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-sm font-medium ${blindMode ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            title="Toggle Blind Review Mode (Mitigate Demographics/Pedigree Bias)"
          >
            {blindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{blindMode ? 'Blind Mode On' : 'Blind Review'}</span>
          </button>

          {/* Export CSV button */}
          <button 
            onClick={handleExportCSV}
            disabled={filteredCandidates.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm shadow-primary-200"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>

          <button 
            onClick={handleResetJob}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
          >
            {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Reset Job
          </button>
        </div>
      </div>

      {/* --- ACTIVE Hiring Job profile card --- */}
      {!jobConfig && <button onClick={() => navigate('/create-job')} className="mb-6 flex w-full items-center gap-4 rounded-2xl border border-dashed border-primary-300 bg-primary-50 p-5 text-left hover:bg-primary-100"><span className="rounded-xl bg-white p-3 text-primary-700 shadow-sm"><Briefcase className="h-6 w-6" /></span><span className="flex-1"><strong className="block text-slate-900">Create your first job post</strong><span className="mt-1 block text-sm text-slate-600">Add role details and must-have skills. Published jobs appear in candidate search.</span></span><Plus className="h-5 w-5 text-primary-700" /></button>}
      {jobConfig && (
        <GlowCard className="mb-8 p-6 bg-gradient-to-r from-white to-blue-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary-600 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Active Hiring Role</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{jobConfig.jobTitle}</h2>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600 font-semibold">
                        <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
                            Min Experience: <strong>{jobConfig.minExperience || 0} Yrs</strong>
                        </span>
                        <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
                            Target Degree: <strong>{jobConfig.targetDegree || 'Bachelors'}</strong>
                        </span>
                        {jobConfig.targetField && (
                          <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
                              Target Field: <strong>{jobConfig.targetField}</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200">
                            Active Criteria Tags: <strong>{(jobConfig.skillsList || []).length}</strong>
                        </span>
                    </div>
                </div>

                <button 
                    onClick={() => setIsConfigModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-semibold"
                >
                    <Settings className="w-4 h-4" />
                    Tune Scoring Model
                </button>
            </div>
        </GlowCard>
      )}

      <div className={`mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${cardClasses}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Hiring snapshot</p>
            <h3 className={`mt-2 text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recruiter hiring overview</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Hiring momentum strong
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Open roles</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{hiringOverview.openRoles}</span>
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700"><Briefcase className="w-5 h-5" /></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Priority hiring queue</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Interviews</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{hiringOverview.interviewsThisWeek}</span>
              <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><Calendar className="w-5 h-5" /></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Scheduled this week</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Avg. time to hire</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{hiringOverview.avgTimeToHire}d</span>
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700"><Clock3 className="w-5 h-5" /></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Across shortlisted roles</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Offer acceptance</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{hiringOverview.offerAcceptance}%</span>
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><TrendingUp className="w-5 h-5" /></div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Strong candidate conversion</p>
          </div>
        </div>
      </div>

      <div className={`mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${cardClasses}`}>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Applications</p>
            <h3 className={`mt-1 text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Recent candidate applications</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 ring-1 ring-blue-100">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            {applications.length} total
          </div>
        </div>

        {applications.length === 0 ? (
          <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${darkMode ? 'border-slate-700 bg-slate-800/60 text-slate-300' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
            No applications have been submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {[...applications].sort((a, b) => (b.matchScore ?? -1) - (a.matchScore ?? -1)).map((application) => (
              <div key={application._id || `${application.jobTitle}-${application.candidateEmail}`} className={`flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                    {(application.candidateName || 'C').split(' ').map(part => part[0]).slice(0,2).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {application.candidateName || 'Candidate'}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">{application.candidateEmail || 'No email'}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">{application.jobTitle || 'Open role'}</span>
                      <span>{application.salary || 'Competitive'}</span>
                      {application.matchScore !== null && application.matchScore !== undefined && <span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{application.matchScore}% AI role match</span>}
                    </div>
                    {application.candidateProfile && <div className="mt-2 flex flex-wrap gap-1.5">{application.candidateProfile.skills.slice(0, 5).map(skill => <span key={skill} className="rounded-full bg-white px-2 py-1 text-[10px] text-slate-600 ring-1 ring-slate-200">{skill}</span>)}{application.candidateProfile.resume_filename && <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><Upload className="h-3 w-3" /> Resume parsed</span>}</div>}
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div className="text-sm text-slate-500">
                    {new Date(application.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                    application.status === 'Submitted' ? 'bg-blue-100 text-blue-700' :
                    application.status === 'Interview' ? 'bg-violet-100 text-violet-700' :
                    application.status === 'Offer' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {application.status || 'Submitted'}
                  </span>
                  <select aria-label={`Update ${application.candidateName || 'candidate'} application status`} value={application.status || 'Submitted'} onChange={event => handleApplicationStatus(application._id, event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700">
                    {['Submitted', 'Reviewed', 'Interview', 'Offer', 'Rejected'].map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className={`xl:col-span-2 rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Shortlist</p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">Top candidate picks</h3>
            </div>
            <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">View all</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {shortlistCandidates.length > 0 ? shortlistCandidates.map((candidate, index) => (
              <div key={candidate._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">#{index + 1}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                    {candidate.prediction?.success_score || 0}%
                  </span>
                </div>
                <h4 className="mt-3 text-base font-bold text-slate-900 truncate">
                  {candidate.name || 'Unknown Candidate'}
                </h4>
                <p className="mt-1 text-xs text-slate-500">{candidate.role || 'Product / UX role'}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(candidate.skills || []).slice(0, 2).map(skill => (
                    <span key={skill} className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] text-slate-600">
                      {skill}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => window.location.href = `/candidate/${candidate._id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  View profile
                </button>
              </div>
            )) : (
              <div className="md:col-span-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Add candidates to see the shortlist summary.
              </div>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Quick actions</p>
          <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Ops center</h3>

          <div className="mt-4 space-y-3">
            <button onClick={() => setIsUploadModalOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <span>Add candidate</span>
              <Plus className="w-4 h-4" />
            </button>
            <button onClick={() => setIsConfigModalOpen(true)} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <span>Update scoring model</span>
              <Settings className="w-4 h-4" />
            </button>
            <button onClick={handleExportCSV} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <span>Export shortlist</span>
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('board')} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-700 hover:bg-slate-100">
              <span>Open kanban board</span>
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Shortlist</p>
              <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Priority shortlist</h3>
            </div>
            <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">Open queue</button>
          </div>

          <div className="space-y-3">
            {shortlistCandidates.length > 0 ? shortlistCandidates.map((candidate, index) => (
              <div key={candidate._id} className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                    {candidate.name ? candidate.name.split(' ').map(part => part[0]).slice(0,2).join('').toUpperCase() : 'C'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{candidate.name}</p>
                    <p className="text-[11px] text-slate-500">{candidate.pipelineStatus || 'New'} • {candidate.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-emerald-600">{candidate.prediction?.success_score || 0}%</div>
                  <div className="mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary-600" style={{ width: `${candidate.prediction?.success_score || 0}%` }} />
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-slate-500">No shortlisted candidates yet.</p>
            )}
          </div>
        </div>

        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Interview</p>
              <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Upcoming interviews</h3>
            </div>
            <button className="text-sm font-semibold text-primary-600 hover:text-primary-700">Schedule</button>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Aarav Mehta', role: 'System Design Round', time: 'Tue, 10:30 AM' },
              { name: 'Priya Nair', role: 'Portfolio Review', time: 'Thu, 2:00 PM' },
              { name: 'Daniel Brooks', role: 'Hiring Manager Chat', time: 'Fri, 9:15 AM' }
            ].map((interview) => (
              <div key={interview.name} className={`flex items-center justify-between rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{interview.role}</p>
                  <p className="text-[11px] text-slate-500">{interview.name}</p>
                </div>
                <div className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">
                  {interview.time}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Analytics</p>
              <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI score analytics</h3>
            </div>
            <div className="rounded-xl bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-700">
              Avg {Math.round((filteredCandidates.reduce((sum, candidate) => sum + (candidate.prediction?.success_score || 0), 0) / (filteredCandidates.length || 1))) || 0}%
            </div>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreAnalytics}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="label" stroke={darkMode ? '#cbd5e1' : '#64748b'} />
                <YAxis stroke={darkMode ? '#cbd5e1' : '#64748b'} />
                <Tooltip />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {scoreAnalytics.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Pipeline</p>
              <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Hiring funnel</h3>
            </div>
            <div className="rounded-xl bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">
              {candidates.length} total
            </div>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={funnelData}>
                <defs>
                  <linearGradient id="funnelFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="status" stroke={darkMode ? '#cbd5e1' : '#64748b'} />
                <YAxis stroke={darkMode ? '#cbd5e1' : '#64748b'} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fill="url(#funnelFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Performance</p>
              <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Score trend</h3>
            </div>
            <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">Live</span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoreTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="name" stroke={darkMode ? '#cbd5e1' : '#64748b'} />
                <YAxis stroke={darkMode ? '#cbd5e1' : '#64748b'} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`rounded-2xl border p-5 shadow-sm ${cardClasses}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Distribution</p>
              <h3 className={`mt-1 text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI match mix</h3>
            </div>
            <span className="rounded-xl bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">Summary</span>
          </div>

          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={scoreDistributionData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {scoreDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- SEARCH & FILTERS PANEL --- */}
      <div className={`border rounded-xl p-5 mb-8 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 ${darkMode ? 'border-slate-700 bg-slate-900' : 'bg-white border-slate-200'}`}>
          <div className="sm:col-span-2 md:col-span-4 flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2 text-primary-600">
              <Filter className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Recruiter filters</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSearchName}
                onChange={(e) => setNewSearchName(e.target.value)}
                placeholder="Save current search"
                className={`w-52 rounded-lg border px-3 py-2 text-sm ${darkMode ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-700 placeholder:text-slate-400'}`}
              />
              <button onClick={handleSaveCurrentSearch} className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700">
                <BookmarkPlus className="w-3.5 h-3.5" /> Save
              </button>
            </div>
          </div>

          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" /> Search
              </label>
              <div className="flex gap-2">
                <input 
                    type="text" 
                    className={`min-w-0 flex-1 p-2 border rounded-lg text-sm ${darkMode ? 'border-slate-700 bg-slate-800 text-white focus:bg-slate-800' : 'bg-slate-50 focus:bg-white border-slate-200'} outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium`}
                    placeholder="Search name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <VoiceInput label="Speak a candidate name or email to search" onTranscript={setSearchQuery} />
              </div>
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Pipeline Status</label>
              <select
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
              >
                  <option value="All">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Screening">Screening</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Seniority</label>
              <select
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  value={seniorityFilter}
                  onChange={(e) => setSeniorityFilter(e.target.value)}
              >
                  <option value="All">All levels</option>
                  <option value="Junior">Junior</option>
                  <option value="Mid">Mid</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead">Lead</option>
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Skill Cluster</label>
              <select
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  value={skillClusterFilter}
                  onChange={(e) => setSkillClusterFilter(e.target.value)}
              >
                  <option value="All">All clusters</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Product/AI">Product/AI</option>
                  <option value="Design">Design</option>
                  <option value="Generalist">Generalist</option>
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Skills Tag Filter</label>
              <select
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
              >
                  <option value="All">All Skills</option>
                  {allUniqueTags.map((tag, idx) => (
                    <option key={idx} value={tag}>{tag}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sort Candidates By</label>
              <select
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 font-medium"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value)}
              >
                  <option value="score">Rank: Success Score</option>
                  <option value="exp">Experience Years</option>
                  <option value="rating">Average rating (1-10)</option>
                  <option value="date">Date Uploaded</option>
              </select>
          </div>
          <div className="sm:col-span-2 md:col-span-4 border-t border-slate-100 pt-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 w-full max-w-md">
                <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Min Score: {minScoreFilter}%</span>
                <input 
                  type="range" min="0" max="100" 
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                  value={minScoreFilter} 
                  onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                />
              </div>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                  setMinScoreFilter(0);
                  setSelectedTagFilter('All');
                  setSortKey('score');
                }}
                className="text-xs font-bold text-primary-600 hover:text-primary-700 underline"
              >
                Clear Filters
              </button>
          </div>

          <div className="sm:col-span-2 md:col-span-4 mt-2 rounded-xl border border-dashed border-slate-300 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Saved searches</span>
              <span className="text-[10px] text-slate-500">{savedSearches.length} saved</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map(saved => (
                <button
                  key={saved.id}
                  onClick={() => handleLoadSavedSearch(saved.filters)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  {saved.name}
                </button>
              ))}
            </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Content Pane */}
        <div className="lg:col-span-3">
          {error && (
            <div className="card mb-6 bg-red-50 border-red-100 text-center p-4">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {filteredCandidates.length === 0 ? (
            <div className="card text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Matching Candidates
              </h3>
              <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                No profiles match the applied filter criteria. Try expanding search tags or upload a resume.
              </p>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Resume
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Candidate</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Match</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Status</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Score</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCandidates.map((candidate) => {
                      const score = candidate.prediction?.success_score || 0;
                      return (
                        <tr key={candidate._id} className="hover:bg-slate-50" onClick={() => setSelectedCandidateId(candidate._id)}>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-600 to-indigo-600 text-xs font-bold text-white">
                                {candidate.name ? candidate.name.split(' ').map(part => part[0]).slice(0,2).join('').toUpperCase() : 'C'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900">{blindMode ? `Candidate #${candidate._id.slice(-5).toUpperCase()}` : candidate.name}</p>
                                <p className="text-xs text-slate-500">{candidate.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            <div className="space-y-1 min-w-[170px]">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-800">{getSeniorityLevel(candidate)}</span>
                                <span className="text-slate-500">{candidate.years_experience ?? candidate.experience_years ?? 0} yrs</span>
                              </div>
                              <div className="h-2 w-full rounded-full bg-slate-200">
                                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary-600" style={{ width: `${score}%` }} />
                              </div>
                              <div className="inline-flex rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-700">
                                {getAiCandidateInsight(candidate)}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {candidate.pipelineStatus || 'New'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                              {score}%
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => window.location.href = `/candidate/${candidate._id}`}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleUpdatePipelineStatus(candidate._id, 'Interview')}
                                className="rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                              >
                                Interview
                              </button>
                              <button
                                onClick={() => handleUpdatePipelineStatus(candidate._id, 'Offer')}
                                className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Shortlist
                              </button>
                              <button
                                onClick={() => handleUpdatePipelineStatus(candidate._id, 'Rejected')}
                                className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                              >
                                Reject
                              </button>
                              <select
                                value={candidate.pipelineStatus || 'New'}
                                onChange={(e) => handleUpdatePipelineStatus(candidate._id, e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 outline-none"
                              >
                                {pipelineStatuses.map(statusOption => (
                                  <option key={statusOption} value={statusOption}>{statusOption}</option>
                                ))}
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            // KANBAN PIPELINE BOARD VIEW
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar min-h-[500px]">
              {pipelineStatuses.map(status => {
                const candidatesInStatus = filteredCandidates.filter(c => (c.pipelineStatus || 'New') === status);
                return (
                  <div key={status} className="flex-shrink-0 w-72 bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-800 text-sm">{status}</span>
                      <span className="bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full text-xs">
                        {candidatesInStatus.length}
                      </span>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                      {candidatesInStatus.map(candidate => (
                        <div key={candidate._id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative">
                          <h5 className="font-bold text-slate-900 text-sm mb-1 truncate">
                            {blindMode ? `Candidate #${candidate._id.slice(-5).toUpperCase()}` : candidate.name}
                          </h5>
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs bg-primary-50 border border-primary-200 text-primary-700 px-1.5 py-0.5 rounded font-bold">
                              Score: {candidate.prediction?.success_score || 0}%
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              Exp: {candidate.years_experience !== undefined ? candidate.years_experience : (candidate.experience_years || 0)} yrs
                            </span>
                          </div>
                          
                          {/* Pipeline status drop selectors */}
                          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2">
                            <select
                              value={status}
                              onChange={(e) => handleUpdatePipelineStatus(candidate._id, e.target.value)}
                              className="text-[10px] font-bold text-slate-600 border border-slate-200 bg-white rounded outline-none p-1 w-full"
                            >
                              {pipelineStatuses.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar Panel */}
        <div className="lg:col-span-1 space-y-6">
          <Leaderboard />

          <div className={`rounded-2xl border p-4 ${cardClasses}`}>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary-600" />
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>AI recommendation drawer</h4>
            </div>
            {selectedCandidate ? (
              <div className="space-y-3 rounded-xl border border-primary-100 bg-primary-50/40 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{selectedCandidate.name}</p>
                    <p className="text-[11px] text-slate-500">{selectedCandidate.email}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    {selectedCandidate.prediction?.success_score || 0}% fit
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary-600" style={{ width: `${selectedCandidate.prediction?.success_score || 0}%` }} />
                </div>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li>• Strongest signal: {getSkillCluster(selectedCandidate)} skill alignment</li>
                  <li>• Recommended action: move to {selectedCandidate.pipelineStatus === 'Interview' ? 'panel review' : 'interview round'}</li>
                  <li>• Hiring note: {getAiCandidateInsight(selectedCandidate)}</li>
                </ul>
                <button
                  onClick={() => window.location.href = `/candidate/${selectedCandidate._id}`}
                  className="w-full rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                >
                  Open profile
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Select a candidate to view AI guidance.</p>
            )}
          </div>

          <div className={`rounded-2xl border p-4 ${cardClasses}`}>
            <div className="flex items-center gap-2 mb-3">
              <Clock3 className="w-4 h-4 text-primary-600" />
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Recruiter activity feed</h4>
            </div>
            <div className="space-y-3">
              {recruiterActivity.map(item => (
                <div key={item.id} className={`flex gap-3 rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">{item.tag}</span>
                      <span className="text-[10px] text-slate-500">{item.time}</span>
                    </div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl border p-4 ${cardClasses}`}>
            <div className="flex items-center gap-2 mb-3">
              <Clock3 className="w-4 h-4 text-primary-600" />
              <h4 className={`text-sm font-bold uppercase tracking-[0.2em] ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Candidate activity</h4>
            </div>
            <div className="space-y-3">
              {activityTimeline.map(item => (
                <div key={item.id} className={`flex gap-3 rounded-xl border p-3 ${darkMode ? 'border-slate-700 bg-slate-800/70' : 'border-slate-200 bg-slate-50'}`}>
                  <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{item.title}</p>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{item.time}</span>
                      <span>{item.meta}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Bias Audit Log (Legally Defensive Hiring Audit) */}
          <GlowCard className={`p-4 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50/50'}`}>
            <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm uppercase tracking-wider mb-3">
              <ShieldAlert className="w-4 h-4 text-primary-600" />
              Adverse Impact Audit Log
            </h4>
            <p className="text-[10px] text-slate-500 mb-4 font-medium leading-relaxed">
              Track score parity across degree categories to guarantee demographic neutrality (NYC LL144 compliant reporting).
            </p>
            <div className="space-y-3">
              {biasMetrics.map(item => (
                <div key={item.degree} className="flex justify-between items-center text-xs border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-700">{item.degree}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-semibold">{item.count} profiles</span>
                    <span className="font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-200">
                      Avg: {item.avg}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </GlowCard>

          <div className="card bg-blue-50 border-blue-100 p-4">
            <h4 className="font-bold text-blue-900 mb-1 flex items-center gap-1 text-sm"><Info className="w-4 h-4" /> Recruiting Tip</h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Enable **Blind Review** mode to hide demographics & prestige indicators. Rate candidates 1-10 to continuously calibrate tagging weights.
            </p>
          </div>
        </div>
      </div>

      {/* About Section */}
      <AboutSection />

      {/* --- MODALS --- */}
      <ResumeUploader 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
        onUploadComplete={fetchDashboardData}
      />

      {/* 2. Upgraded Config Tuning Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary-600" />
                        Tune Scoring Model Settings
                    </h3>
                    <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar">
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                        Modify high-level priorities and target values. Individual tag weights will recalibrate incrementally as you rate candidates.
                    </p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Target Degree</label>
                        <select 
                            className="w-full p-2 border rounded-md text-sm"
                            value={editWeights.targetDegree}
                            onChange={(e) => setEditWeights({...editWeights, targetDegree: e.target.value})}
                        >
                            <option value="None">None</option>
                            <option value="Associate">Associate</option>
                            <option value="Bachelors">Bachelors</option>
                            <option value="Masters">Masters</option>
                            <option value="PhD">PhD</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Target Field of Study</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-md text-sm"
                            value={editWeights.targetField}
                            onChange={(e) => setEditWeights({...editWeights, targetField: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600">Exp Weight</span>
                          <span className="text-xs font-bold text-primary-600">{editWeights.experienceWeight}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="5"
                            value={editWeights.experienceWeight}
                            onChange={(e) => setEditWeights({...editWeights, experienceWeight: parseInt(e.target.value)})}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600">Skills Weight</span>
                          <span className="text-xs font-bold text-primary-600">{editWeights.skillsWeight}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="5"
                            value={editWeights.skillsWeight}
                            onChange={(e) => setEditWeights({...editWeights, skillsWeight: parseInt(e.target.value)})}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs font-bold text-slate-600">Edu Weight</span>
                          <span className="text-xs font-bold text-primary-600">{editWeights.educationWeight}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="5"
                            value={editWeights.educationWeight}
                            onChange={(e) => setEditWeights({...editWeights, educationWeight: parseInt(e.target.value)})}
                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                      </div>
                    </div>

                    {/* Calibrated skill weights summary */}
                    <div className="border-t border-slate-100 pt-4">
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Active Skills Weights Calibration</label>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {editWeights.skillsList.map((skill, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded border border-slate-100">
                            <div>
                              <span className="font-bold text-slate-800">{skill.tag}</span>
                              <span className="text-[9px] text-slate-400 ml-1">({skill.importance})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-500">Weight:</span>
                              <input 
                                type="number" 
                                min="10" max="100"
                                className="w-12 text-center border rounded bg-white font-bold p-0.5"
                                value={skill.weight}
                                onChange={(e) => {
                                  const updatedList = [...editWeights.skillsList];
                                  updatedList[index].weight = parseInt(e.target.value) || 10;
                                  setEditWeights({...editWeights, skillsList: updatedList});
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button onClick={() => setIsConfigModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                    <button 
                        onClick={handleSaveWeights} 
                        disabled={savingWeights}
                        className="btn-primary flex-1 flex justify-center items-center gap-2 shadow-sm"
                    >
                        {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default Dashboard;
