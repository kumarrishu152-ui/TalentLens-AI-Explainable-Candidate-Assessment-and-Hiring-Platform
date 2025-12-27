import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Mail, 
  Briefcase, 
  GraduationCap, 
  Sparkles,
  Loader2,
  AlertCircle,
  Trash2,
  FileText,
  Star,        
  CheckCircle  
} from 'lucide-react';
import { candidateAPI } from '../services/api';
import AnalyticsChart from '../components/AnalyticsChart';
import GlowCard from '../components/ui/GlowCard';

const CandidateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [candidate, setCandidate] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);

  // --- New State for Rating ---
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await candidateAPI.getCandidateById(id);
      
      // Handle structure variations just in case
      const candidateData = data.candidate || data;
      setCandidate(candidateData);
      
      // If prediction exists on load, set it
      if (candidateData.prediction && candidateData.prediction.success_score) {
        setPrediction(candidateData.prediction);
      }

      // --- New: Load Existing Rating ---
      if (candidateData.hr_rating) {
        setRating(candidateData.hr_rating);
        setRatingSuccess(true);
      }

    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidate');
      console.error('Error fetching candidate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePrediction = async () => {
    try {
      setPredicting(true);
      
      // API call to generate new prediction
      const updatedCandidate = await candidateAPI.generatePrediction(id);
      
      if (updatedCandidate && updatedCandidate.prediction) {
          setPrediction(updatedCandidate.prediction);
          setCandidate(updatedCandidate); // Update full candidate state
      } else {
          setError('Prediction generated but no data returned');
      }
      
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate prediction');
      console.error('Error generating prediction:', err);
    } finally {
      setPredicting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await candidateAPI.deleteCandidate(id);
        navigate('/');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete candidate');
      }
    }
  };

  // --- New: Submit Rating Handler ---
  const submitRating = async (selectedRating) => {
    if (ratingSuccess) return; // Prevent re-rating if already done (optional)
    
    setIsRatingSubmitting(true);
    try {
        await candidateAPI.rateCandidate(id, selectedRating);
        setRating(selectedRating);
        setRatingSuccess(true);
    } catch (err) {
        console.error("Rating failed", err);
        alert("Failed to submit rating. Make sure api.js has rateCandidate method.");
    } finally {
        setIsRatingSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlowCard className="max-w-md text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Error Loading Candidate
          </h2>
          <p className="text-slate-600 mb-4">{error || 'Candidate not found'}</p>
          <button onClick={() => navigate('/')} className="btn-primary">
            Back to Dashboard
          </button>
        </GlowCard>
      </div>
    );
  }

  const educationTierLabels = {
    1: 'Top Tier University',
    2: 'Mid Tier University',
    3: 'Entry Level Institution'
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {candidate.name}
            </h1>
            <div className="flex items-center space-x-2 text-slate-600">
              <Mail className="w-4 h-4" />
              <span>{candidate.email}</span>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Candidate Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Stats */}
          <GlowCard className="p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Quick Overview
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <Briefcase className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Experience</p>
                  <p className="font-semibold text-slate-900">
                    {candidate.experience_years || 0} years
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="bg-primary-100 p-3 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Education</p>
                  <p className="font-semibold text-slate-900">
                    {educationTierLabels[candidate.education_tier] || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Summary */}
          {candidate.summary && (
            <GlowCard className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Professional Summary
              </h2>
              <p className="text-slate-700 leading-relaxed">
                {candidate.summary}
              </p>
            </GlowCard>
          )}

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <GlowCard className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Technical Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium border border-primary-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </GlowCard>
          )}

          {/* Additional Data */}
          {candidate.parsed_data && (
            <GlowCard className="p-6">
              <h2 className="text-xl font-bold text-slate-900 mb-4">
                Raw JSON Data
              </h2>
              <pre className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 overflow-auto max-h-60">
                {JSON.stringify(candidate.parsed_data, null, 2)}
              </pre>
            </GlowCard>
          )}
        </div>

        {/* Right Column - Prediction & Rating */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* --- NEW: RATING CARD --- */}
          <GlowCard className="p-6 bg-gradient-to-br from-white to-purple-50 border-purple-100">
             <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Star className={`w-5 h-5 ${ratingSuccess ? 'text-yellow-500 fill-yellow-500' : 'text-slate-400'}`} />
                HR Feedback
             </h3>
             <p className="text-sm text-slate-600 mb-4">
                Rate this candidate (1-10) to help the AI learn your preferences.
             </p>

             {ratingSuccess ? (
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-purple-100 shadow-sm">
                    <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                    <p className="text-lg font-bold text-slate-800">Feedback Saved!</p>
                    <p className="text-sm text-slate-500">You rated this candidate <strong>{rating}/10</strong></p>
                </div>
             ) : (
                <div className="flex flex-col items-center gap-3">
                    {/* 10 Star Rating Component */}
                    <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
                        {[...Array(10)].map((_, i) => {
                            const starValue = i + 1;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => submitRating(starValue)}
                                    onMouseEnter={() => setHoverRating(starValue)}
                                    disabled={isRatingSubmitting}
                                    className="focus:outline-none transition-transform hover:scale-110"
                                >
                                    <Star 
                                        className={`w-5 h-5 ${
                                            starValue <= (hoverRating || rating) 
                                            ? 'text-yellow-400 fill-yellow-400' 
                                            : 'text-slate-300'
                                        }`} 
                                    />
                                </button>
                            );
                        })}
                    </div>
                    <div className="h-6 text-sm font-medium text-purple-600">
                        {hoverRating > 0 ? `${hoverRating} / 10` : 'Click to rate'}
                    </div>
                </div>
             )}
          </GlowCard>

          {/* Main Prediction Card */}
          {!prediction ? (
            <GlowCard className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                AI Prediction
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                Generate an AI-powered success prediction based on this candidate's profile against your Job Config.
              </p>
              <button
                onClick={handleGeneratePrediction}
                disabled={predicting}
                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Prediction</span>
                  </>
                )}
              </button>
            </GlowCard>
          ) : (
            <>
              {/* Chart Component */}
              <AnalyticsChart prediction={prediction} />
              
              {/* Analysis Text Component - Only shows if analysis exists */}
              {prediction.analysis && (
                  <GlowCard className="p-5 border-l-4 border-primary-500">
                      <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
                          <FileText className="w-4 h-4 text-primary-600" />
                          AI Analysis
                      </h4>
                      <p className="text-sm text-slate-600 leading-relaxed">
                          {prediction.analysis}
                      </p>
                  </GlowCard>
              )}
              
              {/* Re-run Button */}
              <button 
                  onClick={handleGeneratePrediction}
                  disabled={predicting}
                  className="w-full py-2 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                  {predicting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                  Regenerate Prediction
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDetails;