import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { candidateAPI } from '../services/api';
import {
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  FileText,
  Target,
  Upload,
  TrendingUp,
  Search,
  MapPin,
  Star,
  Bell,
  ShieldCheck,
  Clock3,
  Filter,
  SlidersHorizontal,
  ArrowUpRight,
  Check,
  BadgeCheck,
  Wallet
} from 'lucide-react';

const CandidateDashboard = () => {
  const { user } = useAuth();
  const [resumeName, setResumeName] = useState('resume_v2.pdf');
  const [selectedJobIndex, setSelectedJobIndex] = useState(0);
  const [jobQuery, setJobQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [locationFilter, setLocationFilter] = useState('All');
  const [salaryFilter, setSalaryFilter] = useState('All');
  const [jobsFound, setJobsFound] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState([]);

  const stats = [
    { label: 'Applications', value: '04', icon: FileText, accent: 'bg-blue-100 text-blue-700' },
    { label: 'Interviews', value: '02', icon: CalendarClock, accent: 'bg-violet-100 text-violet-700' },
    { label: 'Offers', value: '01', icon: CheckCircle2, accent: 'bg-emerald-100 text-emerald-700' },
    { label: 'Profile Score', value: '89%', icon: Target, accent: 'bg-amber-100 text-amber-700' }
  ];

  const applications = [
    { title: 'Senior Frontend Engineer', company: 'Nexa Labs', stage: 'Technical Interview', status: 'In Progress', date: 'Sep 24, 2026', location: 'Remote • US' },
    { title: 'Product Designer', company: 'Northstar Studio', stage: 'Portfolio Review', status: 'Awaiting Review', date: 'Sep 28, 2026', location: 'Hybrid • Bengaluru' },
    { title: 'AI Product Analyst', company: 'AstraIQ', stage: 'HR Screening', status: 'Completed', date: 'Sep 18, 2026', location: 'On-site • Pune' }
  ];

  const interviewSchedule = [
    { title: 'System Design Round', interviewer: 'Aarav Mehta', time: 'Tue, 10:30 AM', type: 'Virtual' },
    { title: 'Portfolio Review', interviewer: 'Priya Nair', time: 'Thu, 2:00 PM', type: 'On-site' },
    { title: 'Hiring Manager Call', interviewer: 'Daniel Brooks', time: 'Fri, 9:15 AM', type: 'Phone' }
  ];

  const profileProgress = [
    { name: 'Profile Completion', value: 87, color: 'bg-emerald-500' },
    { name: 'Skills Match', value: 92, color: 'bg-blue-500' },
    { name: 'Portfolio', value: 74, color: 'bg-violet-500' },
    { name: 'References', value: 66, color: 'bg-amber-500' }
  ];

  const skills = ['React', 'Node.js', 'UX Research', 'Product Thinking', 'AI Tools'];

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
    };

    loadJobs();
    return () => {
      isMounted = false;
    };
  }, []);

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
      const locationMatch = locationFilter === 'All' || (job.location || '').includes(locationFilter);
      const salaryValue = String(job.salary || '');
      const parsedSalary = Number.parseInt(salaryValue.replace(/[^\d]/g, ''), 10) || 0;
      const salaryMatch =
        salaryFilter === 'All' ||
        (salaryFilter === '₹20L+' && parsedSalary >= 20) ||
        (salaryFilter === '₹15L+' && parsedSalary >= 15);

      return keywordMatch && typeMatch && locationMatch && salaryMatch;
    });
  }, [activeSearch, jobQuery, selectedType, locationFilter, salaryFilter, jobsFound]);

  const selectedJob = filteredJobs[selectedJobIndex] || jobsFound[0] || null;

  useEffect(() => {
    if (filteredJobs.length === 0) {
      setSelectedJobIndex(0);
      return;
    }

    if (selectedJobIndex > filteredJobs.length - 1) {
      setSelectedJobIndex(0);
    }
  }, [filteredJobs, selectedJobIndex, selectedJob]);

  const handleResumeUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setResumeName(file.name);
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
        alert(`Application submitted for ${job?.role || 'the selected role'}.`);
      }
    } catch (error) {
      console.error('Apply failed:', error);
      alert(error.response?.data?.error || 'Unable to submit application right now.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl p-6 md:p-8">
      <div className="mb-8 rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-6 text-white shadow-xl shadow-emerald-200">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100">Candidate Portal</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">Welcome back, {user?.username || 'Candidate'}!</h1>
            <p className="mt-2 text-sm text-emerald-50">Your job search is moving fast. Keep your profile updated for better matches.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <div className="rounded-xl bg-white/15 p-2">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-100">Next milestone</p>
              <p className="mt-1 text-base font-semibold">Technical interview on Sep 24</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
              </div>
              <div className={`rounded-xl p-3 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div id="ai-match-section" className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              value={jobQuery}
              onChange={(e) => setJobQuery(e.target.value)}
              placeholder="Job title, keywords, or company"
              className="w-full border-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
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
              className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 hover:bg-primary-700"
            >
              Find jobs
            </button>
          </div>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">AI match</p>
              </div>
              <p className="text-lg font-bold text-slate-900">91% profile fit</p>
              <p className="mt-1 text-xs text-slate-600">You are strongly aligned with product, frontend, and AI roles.</p>
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
                    className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${selectedJob && selectedJob.role === job.role ? 'border-primary-200 bg-primary-50/40 shadow-primary-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}
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
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">AI summary</p>
                        <p className="mt-1 text-sm text-slate-700">{job.aiInsight}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleApply(job);
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-3 py-2 text-xs font-semibold text-white hover:bg-primary-700"
                      >
                        {applied ? 'Applied' : 'Apply'} <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedJob ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Role preview</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900">{selectedJob.role}</h3>
                  </div>
                  <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-700">{selectedJob.match}</span>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
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

                <button
                  type="button"
                  onClick={() => handleApply(selectedJob)}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-primary-200 hover:bg-primary-700"
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
                { label: 'Submitted', value: '4', color: 'bg-blue-100 text-blue-700' },
                { label: 'Under Review', value: '2', color: 'bg-violet-100 text-violet-700' },
                { label: 'Interviewing', value: '1', color: 'bg-emerald-100 text-emerald-700' }
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${item.color}`}>
                    {item.label}
                  </div>
                  <p className="mt-3 text-3xl font-bold text-slate-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              {applications.map((job) => (
                <div key={job.title} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{job.title}</h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">{job.company}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{job.stage} • {job.location}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${job.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : job.status === 'Awaiting Review' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {job.status}
                    </span>
                    <span className="text-sm text-slate-500">{job.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
                <Upload className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Resume</h2>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-4">
              <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                <div className="rounded-full bg-primary-100 p-3 text-primary-700">
                  <Upload className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-700">Upload your latest resume</p>
                <p className="mt-1 text-xs text-slate-500">PDF, DOCX up to 5MB</p>
                <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleResumeUpload} />
              </label>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">Current file:</span> {resumeName}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-emerald-100 p-2 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <Sparkles className="h-5 w-5" />
              </div>
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

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Career Snapshot</h2>
            </div>
            <ul className="space-y-3 text-sm text-slate-600">
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span>Years of experience</span>
                <strong className="text-slate-900">5+</strong>
              </li>
              <li className="flex justify-between border-b border-slate-100 pb-2">
                <span>Primary domain</span>
                <strong className="text-slate-900">Product / AI</strong>
              </li>
              <li className="flex justify-between">
                <span>Last updated</span>
                <strong className="text-slate-900">Today</strong>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
                <Clock3 className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Interview Schedule</h2>
            </div>
            <div className="space-y-4">
              {interviewSchedule.map((interview) => (
                <div key={interview.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-base font-bold text-slate-900">{interview.title}</h3>
                  <p className="mt-2 text-sm text-slate-500">{interview.interviewer}</p>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">{interview.time}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700">{interview.type}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
