import React, { useState } from 'react';
import { Upload, Sliders, AlertCircle, FileText, Briefcase, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { candidateAPI } from '../services/api';
import GlowCard from '../components/ui/GlowCard';

const JobSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [formData, setFormData] = useState({
    jobTitle: '',
    minExperience: 0,
    tier1Only: false,
    experienceWeight: 40,
    skillsWeight: 40,
    educationWeight: 20,
  });

  const [benchmarkFiles, setBenchmarkFiles] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 12) {
      alert("Maximum 12 files allowed. Please select fewer files.");
      return;
    }
    setBenchmarkFiles(files);
  };

  const handleSubmit = async () => {
    if (!formData.jobTitle) {
        alert("Please enter a Job Title.");
        setStep(1);
        return;
    }

    setLoading(true);
    setLoadingMessage("Uploading benchmark resumes...");

    try {
        const payload = new FormData();
        // Pack the form data into a JSON string under 'config'
        payload.append('config', JSON.stringify(formData));
        
        // Append all selected files for benchmarking
        benchmarkFiles.forEach(file => {
            payload.append('benchmark_resumes', file);
        });

        // Update message for the long wait
        setTimeout(() => setLoadingMessage("Training AI Model with Gold Standard data... (This may take a minute)"), 2000);
        
        console.log("🚀 Submitting Job Configuration...");
        await candidateAPI.createJobConfig(payload);
        
        console.log("✅ Job Config Saved!");
        // Redirect to dashboard on success
        navigate('/'); 

    } catch (err) {
        console.error("❌ Submission failed", err);
        alert("Failed to save job configuration: " + (err.response?.data?.error || err.message));
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 relative">
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center h-full min-h-[500px]">
             <div className="bg-white p-8 rounded-2xl shadow-xl border border-primary-100 flex flex-col items-center text-center max-w-sm">
                <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Setting Up Your Job</h3>
                <p className="text-slate-600 animate-pulse">{loadingMessage}</p>
             </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-primary-600" />
            Job Configuration & Training
        </h1>
        <p className="text-slate-600 mt-2">
            Configure scoring weights and upload top performer resumes to train the ranking model.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-4">
            <StepIndicator number={1} title="Job Details" current={step} />
            <StepIndicator number={2} title="Gold Standard" current={step} />
            <StepIndicator number={3} title="Scoring Logic" current={step} />
        </div>

        {/* Main Form Content */}
        <div className="md:col-span-2">
            <GlowCard className="p-6 min-h-[500px]">
                
                {/* STEP 1: Job Details */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">Job Basic Information</h2>
                            <p className="text-sm text-slate-500">Define the role you are hiring for.</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50 focus:bg-white transition-colors"
                                placeholder="e.g. Senior Backend Engineer"
                                value={formData.jobTitle}
                                onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                                autoFocus
                            />
                        </div>

                        <div className="pt-4">
                            <button 
                                onClick={() => formData.jobTitle ? setStep(2) : alert("Please enter a job title")} 
                                className="btn-primary w-full flex justify-center items-center gap-2"
                            >
                                Next: Benchmark Data
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: Gold Standard Benchmark */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">Gold Standard Benchmarking</h2>
                            <p className="text-sm text-slate-500">Upload resumes of your top performers to train the AI.</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-100">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <strong>Why this matters:</strong> The AI extracts patterns (avg experience, top schools, key skills) from these files to create a custom "Success Profile" for this job.
                            </div>
                        </div>
                        
                        {/* THE UPLOAD BOX */}
                        <div className="relative group cursor-pointer">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-600 to-blue-400 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                            <div className="relative bg-white border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                                <Upload className="w-12 h-12 text-primary-500 mx-auto mb-3" />
                                <p className="font-medium text-slate-900">Click to upload Benchmark Resumes</p>
                                <p className="text-sm text-slate-500 mb-2">PDF files only (Max 12)</p>
                                <input 
                                    type="file" 
                                    multiple 
                                    accept=".pdf" 
                                    onChange={handleFileChange} 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        </div>
                        
                        {/* File List */}
                        {benchmarkFiles.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Selected Files ({benchmarkFiles.length})
                                </p>
                                {benchmarkFiles.map((file, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-sm text-slate-700 bg-slate-50 p-2 rounded border border-slate-100">
                                        <div className="flex items-center truncate">
                                            <FileText className="w-4 h-4 mr-2 text-primary-400 flex-shrink-0" /> 
                                            <span className="truncate max-w-[200px]">{file.name}</span>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3 pt-4 mt-auto">
                            <button onClick={() => setStep(1)} className="btn-secondary flex-1">Back</button>
                            <button onClick={() => setStep(3)} className="btn-primary flex-1">Next: Scoring Logic</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: HR Scoring Controls */}
                {step === 3 && (
                    <div className="space-y-6">
                         <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">Scoring Parameters</h2>
                            <p className="text-sm text-slate-500">Fine-tune how the AI prioritizes different candidate attributes.</p>
                        </div>
                        
                        {/* Hard Filters Section */}
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <AlertCircle className="w-4 h-4 text-slate-500" /> Hard Filters
                            </h3>
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-700 font-medium">Min. Years of Experience</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-24 p-2 border rounded-md text-center focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={formData.minExperience}
                                    onChange={(e) => setFormData({...formData, minExperience: parseInt(e.target.value) || 0})}
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    id="tier1"
                                    checked={formData.tier1Only}
                                    onChange={(e) => setFormData({...formData, tier1Only: e.target.checked})}
                                    className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                                />
                                <label htmlFor="tier1" className="text-sm text-slate-700 font-medium cursor-pointer select-none">
                                    Require Top Tier University Only
                                </label>
                            </div>
                        </div>

                        {/* Soft Weights Section */}
                        <div className="space-y-6">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Sliders className="w-4 h-4 text-slate-500" /> Priority Weights
                            </h3>
                            
                            <WeightSlider 
                                label="Experience Importance" 
                                value={formData.experienceWeight} 
                                onChange={(val) => setFormData({...formData, experienceWeight: val})} 
                            />
                            <WeightSlider 
                                label="Skills Match Importance" 
                                value={formData.skillsWeight} 
                                onChange={(val) => setFormData({...formData, skillsWeight: val})} 
                            />
                             <WeightSlider 
                                label="Education Prestige Importance" 
                                value={formData.educationWeight} 
                                onChange={(val) => setFormData({...formData, educationWeight: val})} 
                            />
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-slate-100">
                            <button onClick={() => setStep(2)} className="btn-secondary flex-1" disabled={loading}>Back</button>
                            <button 
                                onClick={handleSubmit} 
                                disabled={loading} 
                                className="btn-primary flex-1 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/30"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Saving...</span>
                                    </>
                                ) : (
                                    'Save & Launch Job'
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </GlowCard>
        </div>
      </div>
    </div>
  );
};

// Helper Components
const StepIndicator = ({ number, title, current }) => (
    <div className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-300 ${current === number ? 'bg-white shadow-md border-primary-100 border' : 'bg-transparent opacity-60'}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold transition-colors ${current === number ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
            {number}
        </div>
        <span className={`font-medium ${current === number ? 'text-primary-900' : 'text-slate-500'}`}>{title}</span>
    </div>
);

const WeightSlider = ({ label, value, onChange }) => (
    <div>
        <div className="flex justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <span className="text-sm text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded">{value}%</span>
        </div>
        <input 
            type="range" 
            min="0" max="100" 
            value={value} 
            onChange={(e) => onChange(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600 hover:accent-primary-700 transition-colors"
        />
    </div>
);

export default JobSetup;