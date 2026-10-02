import React, { useEffect, useState } from 'react';
import { candidateAPI } from '../services/api';
import { BarChart3, Users, UserCheck, Target, Loader2 } from 'lucide-react';

const AnalyticsPage = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { candidateAPI.getAnalytics().then(setData).catch(err => setError(err.response?.data?.error || 'Analytics could not be loaded.')); }, []);
  if (error) return <main className="mx-auto max-w-7xl p-8"><p role="alert" className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p></main>;
  if (!data) return <main className="flex min-h-[50vh] items-center justify-center"><Loader2 className="animate-spin text-primary-600" /></main>;
  const metrics = [
    ['Total applicants', data.totalApplicants, Users], ['Shortlisted', data.pipeline.Shortlisted || 0, UserCheck],
    ['Selected', (data.pipeline.Selected || 0) + (data.pipeline.Offer || 0), Target], ['Hiring success', `${data.hiringSuccessRate}%`, BarChart3]
  ];
  const max = Math.max(1, ...data.applicationsPerJob.map(job => job.applications));
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
    <header><p className="text-sm font-semibold uppercase tracking-[.18em] text-primary-700">Recruiting overview</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Hiring analytics</h1><p className="mt-2 text-slate-600">A live view of your application pipeline and role activity.</p></header>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value, Icon]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-medium text-slate-500">{label}</p><Icon className="h-5 w-5 text-primary-600" /></div><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p></article>)}</section>
    <section className="grid gap-6 lg:grid-cols-2"><article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-900">Candidate pipeline</h2><div className="mt-5 space-y-4">{Object.entries(data.pipeline).map(([status, count]) => <div key={status}><div className="mb-1 flex justify-between text-sm"><span className="text-slate-600">{status}</span><span className="font-semibold text-slate-900">{count}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-primary-600" style={{ width: `${data.totalApplicants ? count / data.totalApplicants * 100 : 0}%` }} /></div></div>)}</div></article>
    <article className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-900">Applications per job</h2><div className="mt-5 space-y-4">{data.applicationsPerJob.length ? data.applicationsPerJob.map(job => <div key={job.jobId || job.title}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-slate-600">{job.title}</span><span className="font-semibold text-slate-900">{job.applications}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-500" style={{ width: `${job.applications / max * 100}%` }} /></div></div>) : <p className="text-sm text-slate-500">Applications will appear here when candidates apply.</p>}<p className="pt-2 text-sm text-slate-600">Average assessment score: <strong>{data.averageAssessmentScore == null ? 'No assessments yet' : `${data.averageAssessmentScore}%`}</strong></p></div></article></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-900">Candidate skill distribution</h2><div className="mt-4 flex flex-wrap gap-2">{Object.entries(data.skillDistribution).sort((a,b) => b[1]-a[1]).slice(0, 30).map(([skill, count]) => <span key={skill} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm text-slate-700">{skill}<strong className="ml-2 text-primary-700">{count}</strong></span>)}{!Object.keys(data.skillDistribution).length && <p className="text-sm text-slate-500">Parsed candidate skills will appear here.</p>}</div></section>
  </main>;
};
export default AnalyticsPage;
