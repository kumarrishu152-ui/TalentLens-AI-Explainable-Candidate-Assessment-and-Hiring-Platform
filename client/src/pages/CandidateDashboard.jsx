import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { candidateAPI } from '../services/api';
import {
  Briefcase,
  Sparkles,
  ArrowRight,
  Upload,
  TrendingUp,
  Search,
  ShieldCheck,
  Clock3,
  SlidersHorizontal,
  ArrowUpRight,
  Check,
  BadgeCheck,
  Wallet
} from 'lucide-react';
import VoiceInput from '../components/VoiceInput';
import AgentPanel from '../components/AgentPanel';
import ThemeToggle from '../components/ThemeToggle';
import ProctoredTestDialog from '../components/ProctoredTestDialog';
import { useTheme } from '../hooks/useTheme';

// Hiring pipeline shown wherever a candidate applies, in recruiter pipeline order.
const PROCESS_STEPS = ['Submitted', 'Reviewed', 'Shortlisted', 'Interview', 'Offer'];
const STEP_CHIP = {
  past: 'bg-emerald-100 text-emerald-700',
  current: 'bg-blue-600 text-white',
  upcoming: 'bg-white text-slate-400 ring-1 ring-slate-200',
  skipped: 'bg-slate-100 text-slate-300',
  rejected: 'bg-rose-600 text-white'
};

const processStepState = (status, step) => {
  if (status === 'Rejected') return step === 'Rejected' ? 'rejected' : 'past';
  if (status === 'Selected') return step === 'Offer' ? 'current' : 'past';
  const order = PROCESS_STEPS.indexOf(status);
  const stepOrder = PROCESS_STEPS.indexOf(step);
  if (step === 'Rejected') return 'skipped';
  if (stepOrder === order) return 'current';
  return stepOrder < order ? 'past' : 'upcoming';
};

const ProcessStepTrack = ({ status, className = '' }) => (
  <ol className={`flex flex-wrap items-center gap-1.5 ${className}`} aria-label="Hiring process steps">
    {[...PROCESS_STEPS, 'Rejected'].map((step, index, all) => {
      const state = processStepState(status, step);
      return (
        <li key={step} className="flex items-center gap-1.5">
          <span title={step} className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${STEP_CHIP[state]}`}>{step}</span>
          {index < all.length - 1 && <span className="h-px w-2 bg-slate-300" />}
        </li>
      );
    })}
  </ol>
);

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useTheme();
  const [resumeName, setResumeName] = useState('No resume uploaded');
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [jobQuery, setJobQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [salaryFilter, setSalaryFilter] = useState('All');
  const [jobsFound, setJobsFound] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [resumeBusy, setResumeBusy] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [assessmentAnswers, setAssessmentAnswers] = useState({});
  const [assessmentScore, setAssessmentScore] = useState(null);
  const [assessmentBusy, setAssessmentBusy] = useState(false);
  const [testError, setTestError] = useState('');
  const [resumeProfile, setResumeProfile] = useState(null);
  const [upcomingInterviews, setUpcomingInterviews] = useState([]);
  const [assignedAssessments, setAssignedAssessments] = useState([]);
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [assessmentChoices, setAssessmentChoices] = useState({});
  const [assessmentMessage, setAssessmentMessage] = useState('');
  const [terminatedTestIds, setTerminatedTestIds] = useState([]);

  const applications = myApplications.map(app => ({ title: app.jobTitle, company: app.company || 'Hiring team', stage: app.status, status: app.status, date: app.createdAt ? new Date(app.createdAt).toLocaleDateString() : '', location: 'See job details' }));

  // Latest application status per job so Apply buttons can show live progress.
  const applicationByJob = new Map(myApplications.flatMap((app) => {
    const entries = [];
    if (app.jobId) entries.push([String(app.jobId), app.status]);
    if (app.jobTitle) entries.push([String(app.jobTitle), app.status]);
    return entries;
  }));

  const stats = [
    { label: 'Applications', value: myApplications.length },
    { label: 'Interviews', value: myApplications.filter(app => app.status === 'Interview').length },
    { label: 'Offers', value: myApplications.filter(app => app.status === 'Offer').length },
    { label: 'Resume', value: resumeProfile ? 'Ready' : 'Add' }
  ];

  const skills = resumeProfile?.skills || [];
  const coachContext = { skills: skills.slice(0, 30), experienceYears: resumeProfile?.years_experience ?? null, education: resumeProfile?.education_field || '', applications: myApplications.slice(0, 12).map(({ jobTitle, status }) => ({ jobTitle, status })) };
  const profileProgress = [
    { name: 'Resume profile', value: resumeProfile ? 100 : 0, color: 'bg-emerald-500' },
    { name: 'Skills detected', value: Math.min(100, skills.length * 12), color: 'bg-blue-500' },
    { name: 'Applications', value: Math.min(100, myApplications.length * 20), color: 'bg-violet-500' }
  ];

  useEffect(() => {
    let isMounted = true;

    const loadJobs = async () => {
      try {
        const jobs = await candidateAPI.getPublicJobs();
        if (isMounted) {
          setJobsFound(Array.isArray(jobs) ? jobs : []);
        }
      } catch (error) {
        console.error('Failed to load jobs for candidate dashboard:', error);
        if (isMounted) {
          setJobsFound([]);
        }
      } finally {
        if (isMounted) {
          setLoadingJobs(false);
        }
      }
      try {
        const mine = await candidateAPI.getMyApplications();
        if (isMounted && Array.isArray(mine)) {
          setMyApplications(mine);
          setAppliedJobs(mine.map(app => app.jobId || app.jobTitle));
        }
      } catch (error) {
        console.error('Failed to load candidate applications:', error);
      }
      try {
        const profile = await candidateAPI.getMyProfile();
        if (isMounted && profile) {
          setResumeProfile(profile);
          setResumeName(profile.resume_filename || 'Resume uploaded');
        }
      } catch (error) {
        console.error('Failed to load candidate profile:', error);
      }
    };

    loadJobs();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    candidateAPI.getInterviews().then(items => setUpcomingInterviews(Array.isArray(items) ? items.filter(item => item.status === 'Scheduled') : [])).catch(() => setUpcomingInterviews([]));
  }, []);

  useEffect(() => {
    candidateAPI.getMyAssessments().then(items => setAssignedAssessments(Array.isArray(items) ? items : [])).catch(() => setAssignedAssessments([]));
  }, []);

  const submitAssignedAssessment = async (proctoringReport, cleanupStreams) => {
    if (!activeAssessment || Object.keys(assessmentChoices).length !== activeAssessment.questions.length) return;
    setAssessmentBusy(true);
    try {
      const answers = activeAssessment.questions.map((_, index) => Number(assessmentChoices[index]));
      const result = await candidateAPI.submitAssessment(activeAssessment._id, answers, proctoringReport);
      setAssignedAssessments(current => current.map(item => item._id === activeAssessment._id ? { ...item, result } : item));
      setAssessmentMessage(`Submitted · ${result.score}% · ${result.passed ? 'Passed' : 'Not passed'}${result.proctoring?.suspiciousEventCount ? ` · ${result.proctoring.suspiciousEventCount} proctoring flag${result.proctoring.suspiciousEventCount === 1 ? '' : 's'} recorded` : ' · clean proctoring session'}`);
      setActiveAssessment(null);
      setAssessmentChoices({});
    } catch (error) { setAssessmentMessage(error.response?.data?.error || 'Could not submit this assessment.'); }
    finally { setAssessmentBusy(false); if (typeof cleanupStreams === 'function') cleanupStreams(); }
  };

  // Anti-cheat: a strike dismantles the attempt (answers wiped, test restarts).
  const dismantleAssignedAssessment = () => setAssessmentChoices({});

  // Anti-cheat: after the final strike the test is terminated for good.
  const terminateAssignedAssessment = async (proctoringReport) => {
    if (!activeAssessment) return;
    try {
      await candidateAPI.reportAssessmentViolation(activeAssessment._id, { proctoring: proctoringReport, terminated: true, terminateReason: proctoringReport.terminateReason, restarts: proctoringReport.restarts });
      setTerminatedTestIds(current => current.includes(activeAssessment._id) ? current : [...current, activeAssessment._id]);
      setAssignedAssessments(current => current.map(item => item._id === activeAssessment._id ? { ...item, result: { score: 0, passed: false, terminated: true } } : item));
    } catch (error) { console.error('Failed to record test termination:', error); }
    setActiveAssessment(null);
    setAssessmentChoices({});
    setAssessmentMessage('Test terminated for a proctoring violation. The recruiter has been notified.');
  };

  const filteredJobs = useMemo(() => {
    const searchValue = (activeSearch || jobQuery || '').trim().toLowerCase();

    return jobsFound.filter((job) => {
      const jobTags = Array.isArray(job.tags) ? job.tags : [];
      const keywordMatch =
        searchValue === '' ||
        (job.role || '').toLowerCase().includes(searchValue) ||
        (job.company || '').toLowerCase().includes(searchValue) ||
        jobTags.some((tag) => (tag || '').toLowerCase().includes(searchValue));

      const typeMatch = selectedType === 'All' || (job.type || 'Full-time') === selectedType;
      const locationMatch = locationFilter === 'All' || String(job.location || '').toLowerCase().includes(locationFilter.toLowerCase());
      const salaryValue = String(job.salary || '');
      const parsedSalary = Number.parseInt(salaryValue.replace(/[^\d]/g, ''), 10) || 0;
      const salaryMatch =
        salaryFilter === 'All' ||
        (salaryFilter === '₹20L+' && parsedSalary >= 20) ||
        (salaryFilter === '₹15L+' && parsedSalary >= 15);

      return keywordMatch && typeMatch && locationMatch && salaryMatch;
    });
  }, [activeSearch, jobQuery, selectedType, locationFilter, salaryFilter, jobsFound]);

  const selectedJob = filteredJobs[selectedJobIndex] || null;
  const selectedJobStatus = selectedJob
    ? (applicationByJob.get(String(selectedJob._id)) || applicationByJob.get(String(selectedJob.role)) || null)
    : null;

  const recommendedSkillGaps = selectedJob && resumeProfile
    ? (selectedJob.tags || []).filter(tag => !skills.some(skill => skill.toLowerCase() === String(tag).toLowerCase())).slice(0, 5)
    : [];

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setSelectedJobIndex(0);
      return;
    }

    if (selectedJobIndex > filteredJobs.length - 1) {
      setSelectedJobIndex(0);
    }
  }, [filteredJobs, selectedJobIndex, selectedJob]);

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeBusy(true);
      try {
        const profile = await candidateAPI.uploadResume(file);
        setResumeProfile(profile);
        setResumeName(file.name);
      } catch (error) {
        alert(error.response?.data?.error || 'Resume upload failed.');
      } finally { setResumeBusy(false); }
    }
  };

  const handleApply = async (job) => {
    const jobKey = job?._id || job?.role || 'job';
    if (appliedJobs.includes(jobKey)) return;

    try {
      const result = await candidateAPI.applyToJob({
        jobId: job?._id || null,
        jobTitle: job?.role,
        company: job?.company,
        salary: job?.salary
      });

      setAppliedJobs((prev) => (prev.includes(jobKey) ? prev : [...prev, jobKey]));
      if (result?.application) {
        setMyApplications(prev => [result.application, ...prev.filter(app => app._id !== result.application._id)]);
        alert(`Application submitted for ${job?.role || 'the selected role'}.`);
      }
    } catch (error) {
      console.error('Apply failed:', error);
      alert(error.response?.data?.error || 'Unable to submit application right now.');
    }
  };

  const startAssessment = async () => {
    if (!resumeProfile?._id || !skills.length) return;
    setAssessmentBusy(true);
    try {
      const result = await candidateAPI.startVerificationTest(resumeProfile._id);
      setAssessment({ candidateId: resumeProfile._id, questions: result.verificationTest.questions });
      setAssessmentAnswers({});
      setAssessmentScore(null);
    } catch (error) {
      alert(error.response?.data?.error || 'Could not prepare the resume skills assessment.');
    } finally { setAssessmentBusy(false); }
  };

  const submitAssessment = async (proctoringReport, cleanupStreams) => {
    if (!assessment) return;
    setAssessmentBusy(true);
    try {
      const answers = assessment.questions.map((_, index) => assessmentAnswers[index]);
      const result = await candidateAPI.submitVerificationTest(assessment.candidateId, answers, proctoringReport);
      setAssessmentScore(result.verificationTest.score);
    } catch (error) {
      alert(error.response?.data?.error || 'Could not submit the assessment.');
    } finally { setAssessmentBusy(false); if (typeof cleanupStreams === 'function') cleanupStreams(); }
  };

  const dismantleVerificationTest = () => setAssessmentAnswers({});

  const terminateVerificationTest = async (proctoringReport) => {
    if (!assessment) return;
    try {
      await candidateAPI.reportVerificationViolation(assessment.candidateId, { proctoring: proctoringReport, terminated: true, terminateReason: proctoringReport.terminateReason, restarts: proctoringReport.restarts });
    } catch (error) { console.error('Failed to record test termination:', error); }
    setAssessment(null);
    setAssessmentAnswers({});
    setAssessmentScore(0);
    setTerminatedTestIds(current => current.includes('verification') ? current : [...current, 'verification']);
    alert('Test terminated for a proctoring violation. This attempt is recorded as failed.');
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8">
      <div className="mb-8 overflow-hidden rounded-[28px] bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-6 text-white shadow-[0_20px_45px_rgba(16,185,129,0.28)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">Candidate Portal</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Welcome back, {user?.displayName || user?.username || 'Candidate'}!</h1>
            <p className="mt-2 text-sm text-emerald-50">Your job search is moving fast. Keep your profile updated for better matches.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Your search</p>
              <p className="mt-1 font-semibold">{myApplications.length} active application{myApplications.length === 1 ? '' : 's'}</p>
            </div>
            <ThemeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-emerald-50 p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div id="ai-match-section" className="mb-8 rounded-3xl border border-slate-200 bg-gradient-to-r from-white via-slate-50 to-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={jobQuery}
              onChange={(e) => { setJobQuery(e.target.value); setActiveSearch(''); setSelectedJobIndex(0); }}
              placeholder="Job title, keywords, or company"
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
            <VoiceInput label="Search jobs by voice" onTranscript={(text) => { setJobQuery(text); setActiveSearch(text); setSelectedJobIndex(0); }} />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
            >
              <option value="All">All locations</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Pune">Pune</option>
              <option value="Remote">Remote</option>
            </select>
            <button
              onClick={() => {
                setActiveSearch(jobQuery.trim());
                setSelectedJobIndex(0);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-primary-700"
            >
              Find jobs
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-slate-500">Filters</h3>
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Job type</p>
              <div className="space-y-2">
                {['All', 'Remote', 'Hybrid', 'Full-time'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${selectedType === type ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>{type}</span>
                    {selectedType === type && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Location</p>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
              >
                <option value="All">All locations</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Pune">Pune</option>
                <option value="Remote">Remote</option>
              </select>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Salary</p>
              <div className="space-y-2">
                {['All', '₹15L+', '₹20L+'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setSalaryFilter(level)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition ${salaryFilter === level ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>{level}</span>
                    {salaryFilter === level && <Wallet className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 p-4 ring-1 ring-violet-100">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">AI match</p>
              </div>
              {resumeProfile ? <>
                <p className="text-sm font-semibold text-slate-900">{skills.length} skills in your profile</p>
                <p className="mt-1 text-xs text-slate-600">{recommendedSkillGaps.length ? `Selected role skill gaps: ${recommendedSkillGaps.join(', ')}.` : selectedJob ? 'Your listed skills cover this role’s tags.' : 'Choose a role to review its skill requirements.'}</p>
              </> : <p className="text-xs text-slate-600">Add your resume to see profile based skill guidance.</p>}
            </div>
          </div>
        </aside>

        <main className="grid grid-cols-1 gap-6 xl:grid-cols-[1.25fr_0.95fr]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Recommended</p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Jobs for you</h2>
              </div>
              <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {filteredJobs.length} roles
              </div>
            </div>

            {loadingJobs ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-bold text-slate-800">Loading live opportunities...</p>
              </div>
            ) : filteredJobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                <p className="text-lg font-bold text-slate-800">No roles match your filters yet.</p>
                <p className="mt-2 text-sm text-slate-500">Try broadening the job type or reset the salary range.</p>
              </div>
            ) : (
              filteredJobs.map((job, index) => {
                const jobKey = job?._id || job?.role || index;
                const applied = appliedJobs.includes(jobKey);

                return (
                  <button
                    key={jobKey}
                    type="button"
                    onClick={() => setSelectedJobIndex(index)}
                    className={`w-full rounded-3xl border p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 ${selectedJob && selectedJob.role === job.role ? 'border-primary-200 bg-gradient-to-r from-primary-50/80 to-white shadow-primary-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-primary-600" />
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{job.company}</p>
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-slate-900">{job.role}</h3>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{job.match}</div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span>{job.location}</span>
                      <span className="text-slate-300">•</span>
                      <span>{job.type}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-semibold text-slate-800">{job.salary}</span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {(job.tags || []).map((tag) => (
                        <span key={tag} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">AI summary</p>
                        <p className="mt-1 text-sm text-slate-700">{job.aiInsight}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleApply(job);
                        }}
                        className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                      >
                        {applied ? 'Applied' : 'Apply'} <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Hiring process shown right where the candidate applies. */}
                    <ProcessStepTrack status={applicationByJob.get(String(jobKey)) || 'Not applied'} className="mt-3" />
                  </button>
                );
              })
            )}
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
            {selectedJob ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Role preview</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedJob.role}</h3>
                  </div>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{selectedJob.match}</span>
                </div>

                <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 p-4 ring-1 ring-emerald-100">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedJob.company}</p>
                      <p className="mt-1 text-sm text-slate-500">{selectedJob.location} • {selectedJob.type}</p>
                    </div>
                    <div className="rounded-xl bg-white px-2.5 py-2 text-right shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Salary</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{selectedJob.salary}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-emerald-700" />
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">AI recommendation</p>
                  </div>
                  <p className="mt-2 text-sm text-emerald-900">{selectedJob.aiInsight}</p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">About the role</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedJob.description}</p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Requirements</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {(selectedJob.requirements || []).map((req) => (
                      <li key={req} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span>Hiring manager</span>
                  <span className="font-semibold text-slate-800">{selectedJob.hiringManager}</span>
                </div>
                <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  <span>Response time</span>
                  <span className="font-semibold text-slate-800">{selectedJob.responseTime}</span>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Hiring process</p>
                  <ProcessStepTrack status={selectedJobStatus || 'Not applied'} className="mt-2.5" />
                  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                    {selectedJobStatus
                      ? 'Your live progress for this role, updated by the recruiter.'
                      : 'Apply to start at Submitted — the recruiter advances you through each step.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleApply(selectedJob)}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 hover:bg-primary-700"
                >
                  {appliedJobs.includes(selectedJob?._id || selectedJob?.role) ? 'Applied' : 'Apply now'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No active roles available right now.
              </div>
            )}
          </aside>
        </main>
      </div>

      {assignedAssessments.length > 0 && <section className="mb-8 rounded-3xl border border-amber-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Recruiter assessments</p><h2 className="mt-1 text-xl font-bold text-slate-900">Tests for your applications</h2>{assessmentMessage && <p className="mt-2 text-sm font-semibold text-emerald-700" role="status">{assessmentMessage}</p>}<div className="mt-4 grid gap-3 md:grid-cols-2">{assignedAssessments.map(item => <article key={item._id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-900">{item.title}</h3><p className="mt-1 text-sm text-slate-500">{item.applicationId?.jobTitle || 'Application'} · {item.questions.length} questions · {item.durationMinutes} min · Pass: {item.passingScore}%</p></div>{item.result ? <span className={`rounded-full px-2 py-1 text-xs font-bold ${item.result.terminated ? 'bg-slate-900 text-white' : item.result.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{item.result.terminated ? 'Locked · contact recruiter to re-arrange' : `${item.result.score}% · ${item.result.passed ? 'Passed' : 'Not passed'}`}</span> : <button type="button" onClick={() => { setActiveAssessment(item); setAssessmentChoices({}); setAssessmentMessage(''); }} className="rounded-lg bg-primary-700 px-3 py-2 text-sm font-semibold text-white">Take test</button>}</div></article>)}</div></section>}
      {activeAssessment && <ProctoredTestDialog
        title={activeAssessment.title}
        subtitle={`${activeAssessment.durationMinutes} minutes · Proctored with camera & mic · Select one answer per question`}
        questions={activeAssessment.questions}
        busy={assessmentBusy}
        error={''}
        canSubmit={Object.keys(assessmentChoices).length === activeAssessment.questions.length}
        submitHint={`Answer all ${activeAssessment.questions.length} questions to submit.`}
        onClose={() => setActiveAssessment(null)}
        onSubmit={submitAssignedAssessment}
        onDismantle={dismantleAssignedAssessment}
        onTerminate={terminateAssignedAssessment}
        renderQuestion={(question, index) => (
          <fieldset key={`${activeAssessment._id}-${index}`} className="mt-5 first:mt-0">
            <legend className="font-semibold text-slate-800">{index + 1}. {question.prompt}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {question.options.map((option, optionIndex) => (
                <label key={optionIndex} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700 hover:bg-slate-50">
                  <input type="radio" name={`recruiter-test-${index}`} checked={Number(assessmentChoices[index]) === optionIndex} onChange={() => setAssessmentChoices(current => ({ ...current, [index]: optionIndex }))} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      />}

      <section className="mb-8 flex flex-col gap-4 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-indigo-50 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">Resume skills assessment</p><h2 className="mt-1 text-xl font-bold text-slate-900">Verify skills from your resume</h2><p className="mt-1 text-sm text-slate-600">Questions are selected from the skills parsed from your uploaded resume.</p></div>
        <button type="button" onClick={startAssessment} disabled={!resumeProfile || !skills.length || assessmentBusy || terminatedTestIds.includes('verification')} className="rounded-xl bg-violet-700 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-violet-200 transition-transform duration-200 hover:-translate-y-0.5 disabled:opacity-50">{terminatedTestIds.includes('verification') ? 'Test terminated — contact recruiter' : assessmentBusy ? 'Preparing…' : resumeProfile ? 'Start skills assessment' : 'Upload a resume first'}</button>
      </section>
      {assessment && assessmentScore === null && <ProctoredTestDialog
        title="Resume skills assessment"
        subtitle={`${assessment.questions.length} questions from your skills · Proctored with camera & mic`}
        questions={assessment.questions}
        busy={assessmentBusy}
        error={''}
        canSubmit={Object.keys(assessmentAnswers).length === assessment.questions.length}
        submitHint={`Answer all ${assessment.questions.length} questions to submit.`}
        onClose={() => setAssessment(null)}
        onSubmit={submitAssessment}
        onDismantle={dismantleVerificationTest}
        onTerminate={terminateVerificationTest}
        renderQuestion={(question, index) => (
          <fieldset key={`${question.skill}-${index}`} className="mt-5 first:mt-0">
            <legend className="font-semibold text-slate-800">{index + 1}. <span className="text-violet-700">{question.skill}:</span> {question.question}</legend>
            <div className="mt-2 grid gap-2">
              {question.options.map((option, optionIndex) => (
                <label key={option} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <input type="radio" name={`q${index}`} checked={assessmentAnswers[index] === optionIndex} onChange={() => setAssessmentAnswers(prev => ({ ...prev, [index]: optionIndex }))} />
                  {option}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      />}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <AgentPanel kind="candidate" context={coachContext} />

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Applications</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">Your status</h2>
              </div>
              <button className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700">
                View all <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { label: 'Submitted', value: myApplications.filter(app => app.status === 'Submitted').length, color: 'bg-blue-100 text-blue-700' },
                { label: 'Under Review', value: myApplications.filter(app => app.status === 'Reviewed').length, color: 'bg-violet-100 text-violet-700' },
                { label: 'Interviewing', value: myApplications.filter(app => app.status === 'Interview').length, color: 'bg-emerald-100 text-emerald-700' }
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
                  <div className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.color}`}>
                    {item.label}
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {applications.length ? applications.map((job) => (
                <div key={job.title} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{job.company}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{job.stage} • {job.location}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{job.date}</span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${job.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                        {job.status}
                      </span>
                    </div>
                    <ProcessStepTrack status={job.status} />
                  </div>
                </div>
              )) : <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">Your submitted applications and recruiter updates will appear here.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-emerald-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Resume</h2>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/80 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary-100 p-3 text-primary-700">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">Upload your latest resume</p>
                <p className="mt-1 text-xs text-slate-500">PDF or DOCX up to 10MB · {resumeBusy ? 'Uploading…' : 'Parsed securely for matching'}</p>
                <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleResumeUpload} />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Current file:</span> {resumeName}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-violet-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Profile Progress</h2>
            </div>

            <div className="space-y-4">
              {profileProgress.map((item) => (
                <div key={item.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-slate-600">{item.name}</span>
                    <span className="font-semibold text-slate-800">{item.value}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <span key={skill} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-sky-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Career Snapshot</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span>Years of experience</span>
                <strong className="text-slate-900">{resumeProfile?.years_experience ?? '—'}</strong>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span>Primary domain</span>
                <strong className="text-slate-900">{resumeProfile?.education_field || 'Add a resume'}</strong>
              </li>
              <li className="flex justify-between">
                <span>Last updated</span>
                <strong className="text-slate-900">Today</strong>
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-amber-50 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-900">Interview Schedule</h2>
            </div>
            <div className="space-y-4">
              {upcomingInterviews.length ? upcomingInterviews.map(interview => <div key={interview._id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{interview.applicationId?.jobTitle || 'Interview'}</p><p className="mt-1 text-sm text-slate-600">{new Date(interview.scheduledAt).toLocaleString()} · {interview.durationMinutes} min</p>{interview.meetingUrl && <a className="mt-2 inline-block text-sm font-semibold text-primary-700 underline" href={interview.meetingUrl} target="_blank" rel="noreferrer">Join interview</a>}</div>) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No interviews scheduled yet. Interview invitations from recruiters will appear here.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
