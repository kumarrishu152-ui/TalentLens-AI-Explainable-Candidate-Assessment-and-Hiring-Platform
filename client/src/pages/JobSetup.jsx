import React, { useState, useEffect } from 'react';
import { Upload, Sliders, AlertCircle, FileText, Briefcase, Loader2, CheckCircle2, Plus, X, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { candidateAPI } from '../services/api';
import GlowCard from '../components/ui/GlowCard';

const JobSetup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [activeConfig, setActiveConfig] = useState(null);
  
  // Custom skills builder state
  const [newSkillTag, setNewSkillTag] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Tool');
  const [newSkillImportance, setNewSkillImportance] = useState('Important');

  const [formData, setFormData] = useState({
    jobTitle: '',
    minExperience: 0,
    targetDegree: 'Bachelors',
    targetField: '',
    experienceWeight: 40,
    skillsWeight: 40,
    educationWeight: 20,
    manualSkills: [], // items are { tag, category, importance, source }
  });

  const [benchmarkFiles, setBenchmarkFiles] = useState([]);

  useEffect(() => {
    const loadActiveConfig = async () => {
      try {
        const config = await candidateAPI.getActiveJobConfig();
        if (config) {
          setActiveConfig(config);
        }
      } catch (err) {
        console.error("Failed to load active job config:", err);
      }
    };
    loadActiveConfig();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 12) {
      alert("Maximum 12 files allowed. Please select fewer files.");
      return;
    }
    setBenchmarkFiles(files);
  };

  const handleParseBenchmarks = async () => {
    if (benchmarkFiles.length === 0) {
      setStep(3);
      return;
    }
    setLoading(true);
    setLoadingMessage("Analyzing benchmark resumes to construct base criteria...");
    try {
      const payload = new FormData();
      benchmarkFiles.forEach(file => {
        payload.append('benchmark_resumes', file);
      });
      const data = await candidateAPI.parseBenchmarks(payload);
      
      setFormData(prev => {
        const existingTags = prev.manualSkills.map(s => s.tag.toLowerCase().trim());
        const benchmarkSkills = (data.skills || [])
          .filter(s => !existingTags.includes(s.tag.toLowerCase().trim()))
          .map(s => ({
            tag: s.tag,
            category: s.category || 'Tool',
            importance: s.importance || 'Important',
            weight: s.weight || 50,
            source: 'benchmark'
          }));

        return {
          ...prev,
          minExperience: data.avgYearsExperience || prev.minExperience,
          targetDegree: data.educationDegreeTarget || prev.targetDegree,
          targetField: data.educationFieldTarget || prev.targetField,
          manualSkills: [...prev.manualSkills, ...benchmarkSkills],
          goldStandardBenchmark: {
            avgYearsExperience: data.avgYearsExperience || 5,
            topSkills: (data.skills || []).map(s => s.tag),
            educationDegreeTarget: data.educationDegreeTarget || 'Bachelors',
            educationFieldTarget: data.educationFieldTarget || ''
          }
        };
      });
      setStep(3);
    } catch (err) {
      console.error("Benchmark analysis failed.", err);
      alert("Gold Standard resumes could not be processed automatically. Proceeding with manual criteria setup.");
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSkill = () => {
    if (!newSkillTag.trim()) return;
    const tag = newSkillTag.toLowerCase().trim();
    
    if (formData.manualSkills.some(s => s.tag.toLowerCase().trim() === tag)) {
      alert("This skill tag already exists in the criteria list.");
      return;
    }

    setFormData(prev => ({
      ...prev,
      manualSkills: [
        ...prev.manualSkills,
        {
          tag: newSkillTag.trim(),
          category: newSkillCategory,
          importance: newSkillImportance,
          source: 'manual'
        }
      ]
    }));
    setNewSkillTag('');
  };

  const handleRemoveSkill = (indexToRemove) => {
    setFormData(prev => ({
      ...prev,
      manualSkills: prev.manualSkills.filter((_, idx) => idx !== indexToRemove)
    }));
  };

  const handleRollback = async () => {
    if (!window.confirm("Are you sure you want to rollback to the previous weight configurations?")) return;
    setLoading(true);
    setLoadingMessage("Rolling back configuration...");
    try {
      await candidateAPI.rollbackJobConfig();
      alert("Successfully rolled back to the previous configuration version.");
      window.location.reload();
    } catch (err) {
      alert("Rollback failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.jobTitle) {
        alert("Please enter a Job Title.");
        setStep(1);
        return;
    }

    setLoading(true);
    setLoadingMessage("Saving job configuration & starting pipeline...");

    try {
        await candidateAPI.createJobConfig(formData);
        navigate('/'); 

    } catch (err) {
        console.error('Job config submission failed:', err);
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

      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-primary-600" />
              Job Configuration & Training
          </h1>
          <p className="text-slate-600 mt-2">
              Configure criteria tags, select target degree filters, and upload performer resumes to seed scoring weights.
          </p>
        </div>
        {activeConfig && activeConfig.versionHistory && activeConfig.versionHistory.length > 0 && (
          <button 
            onClick={handleRollback}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 bg-white rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Rollback Configuration
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-4">
            <StepIndicator number={1} title="Job Details" current={step} />
            <StepIndicator number={2} title="Gold Standard" current={step} />
            <StepIndicator number={3} title="Criteria Builder" current={step} />
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
                            <p className="text-sm text-slate-500">Upload resumes of your top performers to seed criteria and extract profiles.</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg flex gap-3 border border-blue-100">
                            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <strong>Success Profile Extraction (Optional):</strong> The parser will identify experience patterns, top degree credentials, and common technical tags across these files to pre-seed Step 3. You can skip this step to configure criteria manually.
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
                            <button onClick={handleParseBenchmarks} className="btn-primary flex-1">
                                {benchmarkFiles.length > 0 ? 'Analyze & Continue' : 'Skip & Configure Manually'}
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3: Criteria tag builder */}
                {step === 3 && (
                    <div className="space-y-6">
                         <div className="border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-900">Criteria Builder</h2>
                            <p className="text-sm text-slate-500">Add skill tags, configure educational standards, and set priority weights.</p>
                        </div>
                        
                        {/* Hard & Soft Filters Section */}
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <AlertCircle className="w-4 h-4 text-slate-500" /> Educational & Experience Thresholds
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Min. Experience (Years)</label>
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                                    value={formData.minExperience}
                                    onChange={(e) => setFormData({...formData, minExperience: parseInt(e.target.value) || 0})}
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Target Degree Level</label>
                                <select 
                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white"
                                    value={formData.targetDegree}
                                    onChange={(e) => setFormData({...formData, targetDegree: e.target.value})}
                                >
                                    <option value="None">None (No degree required)</option>
                                    <option value="Associate">Associate Degree</option>
                                    <option value="Bachelors">Bachelors Degree</option>
                                    <option value="Masters">Masters Degree</option>
                                    <option value="PhD">PhD Doctor of Philosophy</option>
                                </select>
                              </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Target Field of Study (Optional)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. Computer Science"
                                    className="w-full p-2 border rounded-md focus:ring-2 focus:ring-primary-500 outline-none text-sm bg-white animate-transition"
                                    value={formData.targetField}
                                    onChange={(e) => setFormData({...formData, targetField: e.target.value})}
                                />
                            </div>
                        </div>

                        {/* Coarse weights sliders */}
                        <div className="space-y-4">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm uppercase tracking-wide">
                                <Sliders className="w-4 h-4 text-slate-500" /> Core Ranking Weights
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <WeightSlider 
                                    label="Experience Weight" 
                                    value={formData.experienceWeight} 
                                    onChange={(val) => setFormData({...formData, experienceWeight: val})} 
                                />
                                <WeightSlider 
                                    label="Skills Match Weight" 
                                    value={formData.skillsWeight} 
                                    onChange={(val) => setFormData({...formData, skillsWeight: val})} 
                                />
                                <WeightSlider 
                                    label="Education Weight" 
                                    value={formData.educationWeight} 
                                    onChange={(val) => setFormData({...formData, educationWeight: val})} 
                                />
                            </div>
                        </div>

                        {/* Detailed Tag Builder Section */}
                        <div className="space-y-4 border-t border-slate-100 pt-6">
                            <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">
                                Candidate Skill & Trait Tags
                            </h3>
                            
                            {/* Skills Builder Add Box */}
                            <div className="flex flex-col sm:flex-row gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <input 
                                    type="text"
                                    placeholder="Add skill tag, e.g. docker, communication..."
                                    className="flex-1 p-2 border rounded-md text-sm outline-none bg-white focus:ring-2 focus:ring-primary-500"
                                    value={newSkillTag}
                                    onChange={(e) => setNewSkillTag(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault() || handleAddSkill())}
                                />
                                <select 
                                    className="p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500"
                                    value={newSkillCategory}
                                    onChange={(e) => setNewSkillCategory(e.target.value)}
                                >
                                    <option value="Language">Language</option>
                                    <option value="Framework">Framework</option>
                                    <option value="Tool">Tool</option>
                                    <option value="Practice">Practice</option>
                                    <option value="Soft-Skill">Soft-Skill</option>
                                </select>
                                <select 
                                    className="p-2 border rounded-md text-sm bg-white outline-none focus:ring-2 focus:ring-primary-500"
                                    value={newSkillImportance}
                                    onChange={(e) => setNewSkillImportance(e.target.value)}
                                >
                                    <option value="Must-have">Must-have</option>
                                    <option value="Important">Important</option>
                                    <option value="Nice-to-have">Nice-to-have</option>
                                </select>
                                <button 
                                    type="button" 
                                    onClick={handleAddSkill}
                                    className="btn-primary px-4 py-2 flex items-center justify-center gap-1"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add
                                </button>
                            </div>

                            {/* Tags list */}
                            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto pr-1">
                                {formData.manualSkills.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No skill tags configured yet. Add some manual tags or upload performers resumes to auto-extract.</p>
                                ) : (
                                    formData.manualSkills.map((skill, index) => {
                                        const badgeColors = {
                                            'Must-have': 'bg-red-50 text-red-700 border-red-200',
                                            'Important': 'bg-blue-50 text-blue-700 border-blue-200',
                                            'Nice-to-have': 'bg-slate-100 text-slate-700 border-slate-200'
                                        };

                                        return (
                                            <div 
                                                key={index} 
                                                className={`flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full border text-xs font-semibold ${badgeColors[skill.importance] || 'bg-slate-100 text-slate-700'}`}
                                            >
                                                <span>{skill.tag}</span>
                                                <span className="opacity-50 text-[10px]">({skill.category})</span>
                                                <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-inherit">
                                                    {skill.source === 'benchmark' ? 'AI' : 'HR'}
                                                </span>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handleRemoveSkill(index)}
                                                    className="p-0.5 hover:bg-slate-200/50 rounded-full transition-colors"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
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
            <span className="text-xs font-semibold text-slate-600">{label}</span>
            <span className="text-xs text-primary-600 font-bold bg-primary-50 px-2 py-0.5 rounded">{value}%</span>
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