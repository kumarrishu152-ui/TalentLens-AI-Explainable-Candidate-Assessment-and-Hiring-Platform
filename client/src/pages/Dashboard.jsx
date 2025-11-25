import React, { useState, useEffect } from 'react';
import { 
  Users, Loader2, AlertCircle, RefreshCw, Trash2, Plus, Upload, 
  Settings, Briefcase, Save, X, GraduationCap 
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
  
  // Modals State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  
  // Weights State for the Modal
  const [editWeights, setEditWeights] = useState({
    experienceWeight: 30,
    skillsWeight: 40,
    educationWeight: 20
  });
  const [savingWeights, setSavingWeights] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Parallel fetch for speed
      const [candidatesData, configData] = await Promise.all([
        candidateAPI.getAllCandidates(),
        candidateAPI.getActiveJobConfig()
      ]);

      setCandidates(candidatesData.candidates || candidatesData || []);
      
      if (configData) {
        setJobConfig(configData);
        // Pre-fill modal with current weights
        if (configData.scoringWeights) {
            setEditWeights(configData.scoringWeights);
        }
      }

    } catch (err) {
      console.error("Dashboard Load Error:", err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetJob = async () => {
    if (!window.confirm("⚠️ DANGER: This will delete ALL candidates and job settings permanently. Are you sure?")) {
      return;
    }

    setResetting(true);
    try {
      await userAPI.resetJob();
      setCandidates([]); 
      setJobConfig(null);
      alert("Job reset successfully.");
      window.location.reload(); // Hard refresh to clear everything
    } catch (err) {
      alert("Failed to reset job.");
    } finally {
      setResetting(false);
    }
  };

  const handleSaveWeights = async () => {
    setSavingWeights(true);
    try {
        const updatedConfig = await candidateAPI.updateJobConfig({
            scoringWeights: editWeights
        });
        setJobConfig(updatedConfig);
        setIsConfigModalOpen(false);
        // Optional: Trigger re-fetch of candidates if you want to implement auto-re-scoring later
        alert("Scoring weights updated! Future predictions will use these new settings.");
    } catch (err) {
        alert("Failed to update weights");
    } finally {
        setSavingWeights(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
      </div>
    );
  }

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
            {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} in your pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm shadow-primary-200"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>

          {/* Job Reset */}
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

      {/* --- JOB PROFILE HEADER (Feature 3 Display) --- */}
      {jobConfig && (
        <GlowCard className="mb-8 p-6 bg-gradient-to-r from-white to-blue-50/50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                {/* Job Info */}
                <div>
                    <div className="flex items-center gap-2 text-primary-600 mb-1">
                        <Briefcase className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wider">Active Hiring Role</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">{jobConfig.jobTitle}</h2>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                            <Briefcase className="w-3 h-3" /> 
                            Gold Standard: <strong>{jobConfig.goldStandardBenchmark?.avgYearsExperience || 5} Years</strong>
                        </span>
                        <span className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-200">
                            <GraduationCap className="w-3 h-3" /> 
                            Target Tier: <strong>{jobConfig.goldStandardBenchmark?.educationTierTarget || 2}</strong>
                        </span>
                    </div>
                </div>

                {/* Edit Weights Button */}
                <button 
                    onClick={() => setIsConfigModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                    <Settings className="w-4 h-4" />
                    Tune Scoring Model
                </button>
            </div>
        </GlowCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Main Content: Candidate Grid */}
        <div className="lg:col-span-3">
          {error && (
            <div className="card mb-6 bg-red-50 border-red-100 text-center p-4">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {candidates.length === 0 ? (
            <div className="card text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                <Users className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                No Candidates Yet
              </h3>
              <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                Get started by uploading your first resume to the pipeline.
              </p>
              <button 
                onClick={() => setIsUploadModalOpen(true)}
                className="btn-primary inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload Resume
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map((candidate) => (
                <CandidateCard key={candidate._id} candidate={candidate} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Leaderboard */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 space-y-6">
            <Leaderboard />
            
            <div className="card bg-blue-50 border-blue-100 p-4">
              <h4 className="font-bold text-blue-900 mb-2">Recruiting Tip</h4>
              <p className="text-sm text-blue-800">
                Use the "Tune Scoring Model" button above to adjust weights if the top candidates don't match your expectations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      <AboutSection />

      {/* --- MODALS --- */}

      {/* 1. Resume Uploader */}
      <ResumeUploader 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)} 
      />

      {/* 2. Weight Configuration Modal (Feature 3) */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-primary-600" />
                        Tune Scoring Model
                    </h3>
                    <button onClick={() => setIsConfigModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="p-6 space-y-6">
                    <p className="text-sm text-slate-600">
                        Adjust how much importance the AI gives to each factor when calculating success scores.
                    </p>
                    
                    {/* Experience Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Experience Weight</span>
                            <span className="text-sm font-bold text-primary-600">{editWeights.experienceWeight}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="5"
                            value={editWeights.experienceWeight}
                            onChange={(e) => setEditWeights({...editWeights, experienceWeight: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                    </div>

                    {/* Skills Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Skills Weight</span>
                            <span className="text-sm font-bold text-primary-600">{editWeights.skillsWeight}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="5"
                            value={editWeights.skillsWeight}
                            onChange={(e) => setEditWeights({...editWeights, skillsWeight: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                    </div>

                    {/* Education Slider */}
                    <div>
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-slate-700">Education Weight</span>
                            <span className="text-sm font-bold text-primary-600">{editWeights.educationWeight}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="100" step="5"
                            value={editWeights.educationWeight}
                            onChange={(e) => setEditWeights({...editWeights, educationWeight: parseInt(e.target.value)})}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                        />
                    </div>

                    <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-100">
                        Note: New weights will apply to future predictions. Existing scores remain unchanged until re-predicted.
                    </div>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-slate-50">
                    <button onClick={() => setIsConfigModalOpen(false)} className="btn-secondary flex-1">Cancel</button>
                    <button 
                        onClick={handleSaveWeights} 
                        disabled={savingWeights}
                        className="btn-primary flex-1 flex justify-center items-center gap-2"
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