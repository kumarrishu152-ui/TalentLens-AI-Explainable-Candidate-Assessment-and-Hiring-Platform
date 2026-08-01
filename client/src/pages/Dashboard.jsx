import React, { useState, useEffect } from 'react';
import { 
  Users, Loader2, AlertCircle, RefreshCw, Trash2, Plus, Upload, 
  Settings, Briefcase, Save, X, GraduationCap, Grid, List, EyeOff, Eye, Download, Info, Search, ShieldAlert
} from 'lucide-react';
import CandidateCard from '../components/CandidateCard';
import Leaderboard from '../components/Leaderboard';
import ResumeUploader from '../components/ResumeUploader'; 
import AboutSection from '../components/AboutSection'; 
import GlowCard from '../components/ui/GlowCard';
import { candidateAPI, userAPI } from '../services/api';

const Dashboard = () => {
  const [candidates, setCandidates] = useState([]);
  const [jobConfig, setJobConfig] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetting, setResetting] = useState(false);
  
  // View & Obfuscation Preferences
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'board'
  const [blindMode, setBlindMode] = useState(false);
  
  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [minScoreFilter, setMinScoreFilter] = useState(0);
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');
  const [sortKey, setSortKey] = useState('score'); // 'score', 'exp', 'rating', 'date'

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
      
      const [candidatesData, configData] = await Promise.all([
        candidateAPI.getAllCandidates(),
        candidateAPI.getActiveJobConfig()
      ]);

      setCandidates(candidatesData.candidates || candidatesData || []);
      
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

  const handleUpdatePipelineStatus = async (candidateId, newStatus) => {
    try {

      setCandidates(prev => prev.map(c => c._id === candidateId ? { ...c, pipelineStatus: newStatus } : c));
      await apiPatchStatus(candidateId, newStatus);
    } catch (err) {
      alert("Failed to update status");
      fetchDashboardData();
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
    if (!response.ok) throw new Error("API status patch failed");
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

    return matchesSearch && matchesStatus && matchesScore && matchesTag;
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Users className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-slate-900">
              Candidate Dashboard
            </h1>
          </div>
          <p className="text-slate-600">
            {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} matched criteria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
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

      {/* --- SEARCH & FILTERS PANEL --- */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 mb-8 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <Search className="w-3.5 h-3.5" /> Search
              </label>
              <input 
                  type="text" 
                  className="w-full p-2 border rounded-lg text-sm bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                  placeholder="Search name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
              />
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
          <div className="sm:col-span-2 md:col-span-4 border-t border-slate-100 pt-3 flex items-center justify-between">
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
            // LIST VIEW
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCandidates.map((candidate) => (
                <CandidateCard key={candidate._id} candidate={candidate} blindMode={blindMode} />
              ))}
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
          
          {/* Bias Audit Log (Legally Defensive Hiring Audit) */}
          <GlowCard className="p-4 bg-slate-50/50">
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