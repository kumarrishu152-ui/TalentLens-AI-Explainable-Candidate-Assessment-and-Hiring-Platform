const JobConfig = require('../models/JobConfig');
const Application = require('../models/Application');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const User = require('../models/User');
const { rankApplicantsWithAI } = require('../services/rankingService');

exports.listJobs = async (req, res) => {
  const filter = { isPublished: true };
  if (req.query.location) filter.location = new RegExp(String(req.query.location).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.role) filter.jobTitle = new RegExp(String(req.query.role).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const jobs = await JobConfig.find(filter).populate('userId', 'companyName').sort({ createdAt: -1 }).lean();
  const q = String(req.query.skills || '').toLowerCase().split(',').map(x => x.trim()).filter(Boolean);
  res.json(jobs.filter(job => !q.length || q.every(term => (job.skillsList || []).some(s => s.tag.toLowerCase().includes(term)))));
};

exports.updateJob = async (req, res) => {
  const job = await JobConfig.findOne({ _id: req.params.id, userId: req.user.id });
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  const fields = ['jobTitle', 'description', 'location', 'salary', 'jobType', 'minExperience', 'targetDegree', 'targetField', 'isPublished', 'assessmentRequirements'];
  fields.forEach(field => { if (req.body[field] !== undefined) job[field] = req.body[field]; });
  await job.save();
  res.json(job);
};

exports.rankApplicants = async (req, res) => {
  const job = await JobConfig.findOne({ _id: req.params.jobId, userId: req.user.id });
  if (!job) return res.status(404).json({ error: 'Job not found.' });
  const apps = await Application.find({ recruiterId: req.user.id, jobId: job._id }).sort({ createdAt: -1 }).lean();
  const userIds = [...new Set(apps.map(app => String(app.userId)))];
  const [candidateDocs, userDocs] = await Promise.all([
    Candidate.find({ user: { $in: userIds } }).lean(),
    User.find({ _id: { $in: userIds } }).select('displayName email').lean()
  ]);
  const candidateByUser = new Map();
  candidateDocs.forEach(doc => candidateByUser.set(String(doc.user), { doc, userDoc: null }));
  userDocs.forEach(user => {
    const entry = candidateByUser.get(String(user._id));
    if (entry) entry.userDoc = user;
  });

  const { rows, aiError } = await rankApplicantsWithAI({ job, applications: apps, candidateByUser, userId: req.user.id });

  res.json({
    aiError,
    rows: rows.map(({ application, candidate, ranking, ai, proctoringFlags }) => ({
      application,
      candidate,
      ranking,
      ai: ai || null,
      proctoringFlags: proctoringFlags || 0
    }))
  });
};

exports.scheduleInterview = async (req, res) => {
  const { scheduledAt, durationMinutes, meetingUrl, notes } = req.body;
  const date = new Date(scheduledAt);
  if (!scheduledAt || Number.isNaN(date.getTime()) || date <= new Date()) return res.status(400).json({ error: 'Choose a valid future interview date and time.' });
  const application = await Application.findOne({ _id: req.params.applicationId, recruiterId: req.user.id });
  if (!application) return res.status(404).json({ error: 'Application not found.' });
  const interview = await Interview.create({ applicationId: application._id, recruiterId: req.user.id, candidateId: application.userId, scheduledAt: date, durationMinutes, meetingUrl, notes });
  application.status = 'Interview';
  await application.save();
  res.status(201).json(interview);
};

exports.myInterviews = async (req, res) => {
  const filter = req.accountRole === 'candidate' ? { candidateId: req.user.id } : { recruiterId: req.user.id };
  res.json(await Interview.find(filter).sort({ scheduledAt: 1 }).populate('applicationId', 'jobTitle company status candidateName').populate('candidateId', 'displayName').lean());
};

exports.analytics = async (req, res) => {
  const filter = req.accountRole === 'admin' ? {} : { recruiterId: req.user.id };
  const apps = await Application.find(filter).select('userId jobId jobTitle status').lean();
  const statusCounts = Object.fromEntries(['Submitted', 'Reviewed', 'Shortlisted', 'Interview', 'Selected', 'Offer', 'Rejected'].map(status => [status, apps.filter(a => a.status === status).length]));
  const perJob = Object.values(apps.reduce((acc, app) => { const key = String(app.jobId || app.jobTitle); acc[key] ||= { jobId: app.jobId, title: app.jobTitle, applications: 0 }; acc[key].applications++; return acc; }, {}));
  const userIds = [...new Set(apps.map(app => String(app.userId)).filter(Boolean))];
  const candidates = await Candidate.find({ user: { $in: userIds } }).select('verificationTest.score skills').lean();
  const scores = candidates.map(c => c.verificationTest?.score).filter(Number.isFinite);
  const skills = candidates.flatMap(c => c.skills || []).reduce((acc, skill) => { acc[skill] = (acc[skill] || 0) + 1; return acc; }, {});
  res.json({ totalApplicants: apps.length, pipeline: statusCounts, applicationsPerJob: perJob, averageAssessmentScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null, hiringSuccessRate: apps.length ? Math.round((statusCounts.Selected + statusCounts.Offer) / apps.length * 100) : 0, skillDistribution: skills });
};
