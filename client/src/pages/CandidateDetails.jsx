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
  CheckCircle,
  ShieldAlert,
  AlertTriangle,
  FileCheck,
  EyeOff,
  Eye,
  Plus,
  Minus,
  ClipboardCheck
} from 'lucide-react';
import { candidateAPI } from '../services/api';
import AnalyticsChart from '../components/AnalyticsChart';
import GlowCard from '../components/ui/GlowCard';
import VoiceInterviewPractice from '../components/VoiceInterviewPractice';

const CandidateDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [candidate, setCandidate] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState(null);
  const [blindMode, setBlindMode] = useState(false);
  const [testAnswers, setTestAnswers] = useState([]);
  const [testLoading, setTestLoading] = useState(false);

  // Ratings State
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
      
      const candidateData = data.candidate || data;
      setCandidate(candidateData);
      if (candidateData.verificationTest?.questions?.length && candidateData.verificationTest.status === 'Not started') {
        setTestAnswers(candidateData.verificationTest.questions.map(question =>
          Number.isInteger(question.selectedAnswer) ? question.selectedAnswer : null
        ));
      }
      
      if (candidateData.prediction && candidateData.prediction.success_score) {
        setPrediction(candidateData.prediction);
      }

      // Check if current user already gave a rating
      const myRating = (candidateData.hr_ratings || []).find(r => r.userId === localStorage.getItem('userId'));
      if (myRating) {
        setRating(myRating.rating);
        setRatingSuccess(true);
      } else if (candidateData.hr_rating) {
        setRating(candidateData.hr_rating);
        setRatingSuccess(false); // Can still add/adjust rating
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
      const updatedCandidate = await candidateAPI.generatePrediction(id);
      
      if (updatedCandidate && updatedCandidate.prediction) {
          setPrediction(updatedCandidate.prediction);
          setCandidate(updatedCandidate); 
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

  const submitRating = async (selectedRating) => {
    setIsRatingSubmitting(true);
    try {
        const updatedCandidate = await candidateAPI.rateCandidate(id, selectedRating);
        setCandidate(updatedCandidate);
        setRating(selectedRating);
        setRatingSuccess(true);
        if (updatedCandidate.prediction) {
          setPrediction(updatedCandidate.prediction);
        }
    } catch (err) {
        console.error("Rating failed", err);
        alert("Failed to submit rating.");
    } finally {
        setIsRatingSubmitting(false);
    }
  };

  const startVerificationTest = async () => {
    try {
      setTestLoading(true);
      const data = await candidateAPI.startVerificationTest(id);
      setCandidate(current => ({ ...current, verificationTest: data.verificationTest }));
      setTestAnswers(Array(data.verificationTest.questions.length).fill(null));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to start the verification test.');
    } finally {
      setTestLoading(false);
    }
  };

  const submitVerificationTest = async () => {
    if (testAnswers.some(answer => answer === null)) {
      setError('Answer every verification question before submitting.');
      return;
    }
    try {
      setTestLoading(true);
      const data = await candidateAPI.submitVerificationTest(id, testAnswers);
      setCandidate(current => ({ ...current, verificationTest: data.verificationTest }));
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to submit the verification test.');
    } finally {
      setTestLoading(false);
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

  // Handle blind review fields
  const name = blindMode ? `Candidate #${candidate._id.slice(-5).toUpperCase()}` : (candidate.name || 'Unknown Candidate');
  const email = blindMode ? '[Email Hidden]' : candidate.email;
  const summary = blindMode ? 'Summary hidden in blind review mode.' : candidate.summary;
  const resumeText = blindMode ? 'Resume raw content hidden in blind review mode.' : candidate.resume_text;

  // Split matches vs gaps in explainability
  const matches = (prediction?.explainability || []).filter(e => e.type === 'match' || e.type === 'bonus');
  const gaps = (prediction?.explainability || []).filter(e => e.type === 'mismatch' || e.type === 'penalty');

  const expYears = candidate.years_experience !== undefined ? candidate.years_experience : (candidate.experience_years || 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Navigation & Actions Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Blind toggle */}
          <button 
            onClick={() => setBlindMode(!blindMode)}
            className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-colors text-xs font-semibold ${blindMode ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            {blindMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{blindMode ? 'Blind Review On' : 'Blind Review'}</span>
          </button>
          
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
            title="Delete Candidate"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Candidate identity card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{name}</h1>
        <p className="text-sm text-slate-500 font-mono mb-4">{email}</p>

        {candidate.prediction?.disqualified && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm font-semibold flex flex-col gap-1">
            <span className="flex items-center gap-1.5 text-red-800 font-bold">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Candidate Disqualified
            </span>
            <p className="text-xs text-red-700 font-medium">
              This candidate is missing one or more required "Must-have" skills:
            </p>
            <p className="text-xs font-mono bg-red-100/50 px-2.5 py-1 rounded mt-1 border border-red-200 text-red-800 w-fit">
              {candidate.prediction.missingMustHaves?.join(', ') || 'None'}
            </p>
          </div>
        )}
        
        {/* Status flags */}
        <div className="flex flex-wrap gap-3">
          {candidate.prediction?.duplicateFound && (
            <div className="flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
              <AlertTriangle className="w-4 h-4" />
              Duplicate Record Detected
            </div>
          )}
          {candidate.prediction?.authenticityFlag && (
            <div className="flex items-center gap-1.5 bg-red-50 text-red-800 border border-red-200 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">
              <ShieldAlert className="w-4 h-4" />
              Keyword-Stuffing Anomaly Flag
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Information & Evidence) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Overview */}
          <GlowCard className="p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              Profile Breakdown
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Experience</p>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{expYears} Years</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Degree</p>
                <p className="text-lg font-extrabold text-slate-900 mt-1">{candidate.education_degree || 'Bachelors'}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-xs font-bold text-slate-500 uppercase">Field of Study</p>
                <p className="text-lg font-extrabold text-slate-900 mt-1 truncate">{candidate.education_field || 'N/A'}</p>
              </div>
            </div>
          </GlowCard>

          {/* Professional Summary */}
          {summary && (
            <GlowCard className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                Professional Summary
              </h2>
              <p className="text-sm text-slate-700 leading-relaxed italic bg-slate-50 p-4 rounded-lg border border-slate-100">
                "{summary}"
              </p>
            </GlowCard>
          )}

          {/* Skills Verification Evidence table */}
          {prediction?.skillEvidence && prediction.skillEvidence.length > 0 && (
            <GlowCard className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-600" />
                Skills Authenticity & Evidence
              </h2>
              <p className="text-[10px] text-slate-500 mb-4 font-medium leading-relaxed">
                Direct quotes parsed from the candidate's resume to verify keyword legitimacy and prevent gaming.
              </p>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-700 w-1/4">Skill Tag</th>
                      <th className="p-3 font-bold text-slate-700 w-3/4">Verifiable Evidence Quote</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediction.skillEvidence.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-extrabold text-primary-700 capitalize">{item.tag}</td>
                        <td className="p-3 text-slate-600 italic">"{item.quote}"</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlowCard>
          )}

          <GlowCard className="p-6 border border-indigo-100">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-indigo-600" />
              Mandatory Resume Verification Test
            </h2>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This skill-based check must be passed at 70% or higher before the candidate can move to Interview or Offer.
            </p>

            {candidate.verificationTest?.status === 'Passed' ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 font-semibold">
                Passed — {candidate.verificationTest.score}% verified. Candidate is eligible for Interview and Offer stages.
              </div>
            ) : candidate.verificationTest?.questions?.length ? (
              <div className="space-y-5">
                {candidate.verificationTest.status === 'Failed' && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 font-semibold">
                    Previous attempt: {candidate.verificationTest.score}%. A score of 70% is required. Start a new attempt when ready.
                  </div>
                )}
                {candidate.verificationTest.status !== 'Failed' && candidate.verificationTest.questions.map((item, questionIndex) => (
                  <fieldset key={questionIndex} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                    <legend className="text-sm font-semibold text-slate-800 mb-2">
                      {questionIndex + 1}. {item.question}
                    </legend>
                    <p className="text-[10px] uppercase tracking-wide font-bold text-indigo-600 mb-2">Claimed skill: {item.skill}</p>
                    <div className="space-y-2">
                      {item.options.map((option, optionIndex) => (
                        <label key={optionIndex} className="flex gap-2 items-start text-xs text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name={`verification-${questionIndex}`}
                            checked={testAnswers[questionIndex] === optionIndex}
                            onChange={() => setTestAnswers(current => current.map((answer, index) => index === questionIndex ? optionIndex : answer))}
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
                {candidate.verificationTest.status !== 'Failed' ? (
                  <button onClick={submitVerificationTest} disabled={testLoading} className="btn-primary text-sm disabled:opacity-50">
                    {testLoading ? 'Submitting...' : 'Submit verification test'}
                  </button>
                ) : (
                  <button onClick={startVerificationTest} disabled={testLoading} className="btn-secondary text-sm disabled:opacity-50">
                    {testLoading ? 'Preparing...' : 'Start a new attempt'}
                  </button>
                )}
              </div>
            ) : (
              <button onClick={startVerificationTest} disabled={testLoading} className="btn-primary text-sm disabled:opacity-50">
                {testLoading ? 'Preparing test...' : 'Start required test'}
              </button>
            )}
          </GlowCard>

          <VoiceInterviewPractice candidate={candidate} />

          {/* Resume Raw Text */}
          {resumeText && (
            <GlowCard className="p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Resume Original Content</h2>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-72 overflow-y-auto text-xs font-mono text-slate-600 leading-relaxed whitespace-pre-wrap">
                {resumeText}
              </div>
            </GlowCard>
          )}
        </div>

        {/* Right Column (Scoring & Interactive Tuning) */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Collaborative Feedback & Rating */}
          <GlowCard className="p-6 border border-purple-100">
             <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Collaborative Ratings
             </h3>
             <p className="text-xs text-slate-600 mb-4 leading-relaxed font-semibold">
                Submit a rating (1-10) to update the aggregate score. This will incrementally tune matching weights.
             </p>

             <div className="flex flex-col items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
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
                                    className={`w-5.5 h-5.5 ${
                                        starValue <= (hoverRating || rating) 
                                        ? 'text-yellow-400 fill-yellow-400' 
                                        : 'text-slate-300'
                                    }`} 
                                />
                            </button>
                        );
                    })}
                </div>
                <div className="text-xs font-extrabold text-purple-600">
                    {hoverRating > 0 ? `Rate candidate: ${hoverRating} / 10` : (rating > 0 ? `Your rating: ${rating}/10` : 'Select stars to submit')}
                </div>
             </div>

             {/* Reviewer agreement list */}
             {candidate.hr_ratings && candidate.hr_ratings.length > 0 && (
               <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                 <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Reviewer breakdown</h4>
                 {candidate.hr_ratings.map((reviewer, idx) => (
                   <div key={idx} className="flex justify-between items-center text-xs">
                     <span className="font-semibold text-slate-600">{reviewer.reviewerName}</span>
                     <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                       {reviewer.rating}/10
                     </span>
                   </div>
                 ))}
               </div>
             )}
          </GlowCard>

          {/* AI Prediction & Radar Chart */}
          {!prediction ? (
            <GlowCard className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
                <Sparkles className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                Success Prediction
              </h3>
              <p className="text-slate-600 text-xs mb-6 leading-relaxed">
                Analyze this candidate's profile credentials against the active job config metrics.
              </p>
              <button
                onClick={handleGeneratePrediction}
                disabled={predicting}
                className="btn-primary w-full flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {predicting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Profile...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Profile</span>
                  </>
                )}
              </button>
            </GlowCard>
          ) : (
            <div className="space-y-6">
              {/* Radar Chart */}
              <AnalyticsChart prediction={prediction} />
              
              {/* Explainability Matches Panel */}
              {prediction.explainability && prediction.explainability.length > 0 && (
                <GlowCard className="p-5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary-600" />
                    Why This Score
                  </h4>
                  
                  <div className="space-y-4">
                    {/* Strong Matches */}
                    {matches.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-green-700 uppercase tracking-wider bg-green-50 px-2 py-0.5 rounded w-max">
                          Matches & Bonuses
                        </div>
                        {matches.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-xs bg-green-50/30 p-2 rounded border border-green-100">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                              {item.tag}
                            </span>
                            <span className="font-bold text-green-700">+{item.scoreEffect}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Gap Mismatches */}
                    {gaps.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider bg-red-50 px-2 py-0.5 rounded w-max">
                          Gaps & Adjustments
                        </div>
                        {gaps.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start text-xs bg-red-50/30 p-2 rounded border border-red-100">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <Minus className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                              {item.tag}
                            </span>
                            <span className="font-bold text-red-700">{item.scoreEffect}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </GlowCard>
              )}
              
              {/* Analysis Text Card */}
              {prediction.analysis && (
                  <GlowCard className="p-5 border-l-4 border-primary-500">
                      <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-2 text-xs uppercase tracking-wide">
                          <FileText className="w-4 h-4 text-primary-600" />
                          AI Insights Summary
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                          {prediction.analysis}
                      </p>
                  </GlowCard>
              )}
              
              {/* Re-run button */}
              <button 
                  onClick={handleGeneratePrediction}
                  disabled={predicting}
                  className="w-full py-2 text-xs font-semibold text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                  {predicting ? <Loader2 className="w-3 h-3 animate-spin"/> : <Sparkles className="w-3 h-3"/>}
                  Regenerate Prediction
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CandidateDetails;
