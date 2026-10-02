const Application = require('../models/Application');
const Assessment = require('../models/Assessment');
const AssessmentResult = require('../models/AssessmentResult');
const { getGeminiApiKey } = require('../utils/geminiKey');
const { generateAssessmentQuestions: generateWithGemini } = require('../services/geminiService');
const { sanitizeProctoringReport } = require('../utils/proctoring');

exports.generateQuestions = async (req, res) => {
  try {
    const { topic, count = 8, level = 'intermediate' } = req.body || {};
    if (typeof topic !== 'string' || !topic.trim()) return res.status(400).json({ error: 'Enter a skill or topic for the questions.' });
    const questionCount = Math.max(1, Math.min(15, Number(count) || 8));
    const difficulty = ['beginner', 'intermediate', 'advanced'].includes(String(level).toLowerCase()) ? String(level).toLowerCase() : 'intermediate';
    const key = await getGeminiApiKey(req.user.id);
    if (!key) return res.status(503).json({ error: 'Add a Gemini API key to generate test questions.' });
    const questions = await generateWithGemini({ topic, count: questionCount, level: difficulty }, key);
    res.json({ questions });
  } catch (error) {
    console.error('Assessment question generation failed:', error);
    const message = String(error?.message || '');
    const status = error?.status || error?.statusCode || 0;
    const friendly = /api key is not configured/i.test(message) ? 'Gemini is not configured. Add a Gemini key in your profile or server environment.'
      : /api key not valid|invalid api key|permission denied/i.test(message) ? 'Gemini rejected the saved API key. Update the key in your profile and try again.'
      : status === 429 || /quota|rate limit/i.test(message) ? 'Gemini has reached its usage limit. Try again later or use another API key.'
      : /network|fetch failed|enotfound/i.test(message) ? 'The server could not reach Gemini. Check the server network connection.'
      : message || 'Question generation is unavailable. Check the server logs and try again.';
    res.status(503).json({ error: friendly });
  }
};

exports.createAssessment = async (req, res) => {
  try {
    const { applicationId, title, questions, durationMinutes, passingScore } = req.body || {};
    const application = await Application.findOne({ _id: applicationId, recruiterId: req.user.id });
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    if (!Array.isArray(questions) || !questions.length || questions.length > 30) return res.status(400).json({ error: 'Choose between 1 and 30 questions.' });
    for (const q of questions) {
      if (typeof q.prompt !== 'string' || !q.prompt.trim() || !Array.isArray(q.options) || q.options.length < 2 || !Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) return res.status(400).json({ error: 'Each question needs text, answer choices, and a valid correct answer.' });
    }
    const assessment = await Assessment.create({ applicationId, recruiterId: req.user.id, title: String(title || 'Candidate assessment').trim(), questions, durationMinutes, passingScore });
    application.status = 'Reviewed';
    await application.save();
    res.status(201).json({ assessment: { _id: assessment._id, title: assessment.title, questionCount: questions.length, durationMinutes: assessment.durationMinutes }, application });
  } catch (error) {
    console.error('Assessment creation failed:', error);
    res.status(500).json({ error: error.message || 'Could not create assessment.' });
  }
};

/**
 * Recruiter re-arranges (resets) a terminated assessment so the candidate can
 * retake it. Clears the previous result and any in-flight violation record.
 */
exports.resetAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findOne({ _id: req.params.id, recruiterId: req.user.id });
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const result = await AssessmentResult.findOne({ assessmentId: assessment._id });
    const wasTerminated = Boolean(result?.proctoring?.terminated);
    await AssessmentResult.deleteMany({ assessmentId: assessment._id });
    res.json({ recorded: true, wasTerminated, assessmentId: assessment._id, applicationId: assessment.applicationId });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.listMyAssessments = async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id }).select('_id').lean();
    const ids = applications.map(app => app._id);
    const [assessments, results] = await Promise.all([
      Assessment.find({ applicationId: { $in: ids } }).select('-questions.correctAnswer').populate('applicationId', 'jobTitle company').sort({ createdAt: -1 }).lean(),
      AssessmentResult.find({ candidateId: req.user.id }).select('assessmentId score passed submittedAt').lean()
    ]);
    const byAssessment = new Map(results.map(result => [String(result.assessmentId), result]));
    res.json(assessments.map(assessment => ({ ...assessment, result: byAssessment.get(String(assessment._id)) || null })));
  } catch (error) { res.status(500).json({ error: error.message }); }
};

/**
 * Candidate proctoring dismantled the attempt (anti-cheat) and the test was
 * restarted, or the test was terminated after repeated cheating attempts.
 * Records the report server-side without scoring anything.
 */
exports.reportProctoringViolation = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const application = await Application.findOne({ _id: assessment.applicationId, userId: req.user.id });
    if (!application) return res.status(404).json({ error: 'Assessment not assigned to your account.' });
    const { terminated = false, terminateReason = '', restarts = 0 } = req.body || {};
    const proctoring = { ...sanitizeProctoringReport(req.body.proctoring), terminated: terminated === true, terminateReason: String(terminateReason || '').slice(0, 200), restarts: Math.max(0, Math.min(20, Math.round(Number(restarts) || 0))) };
    await AssessmentResult.findOneAndUpdate(
      { assessmentId: assessment._id, candidateId: req.user.id },
      { $set: { assessmentId: assessment._id, applicationId: application._id, candidateId: req.user.id, answers: [], proctoring, score: 0, passed: false, submittedAt: new Date() } },
      { upsert: true, new: true }
    );
    res.json({ recorded: true });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

exports.submitAssessment = async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.id);
    if (!assessment) return res.status(404).json({ error: 'Assessment not found.' });
    const application = await Application.findOne({ _id: assessment.applicationId, userId: req.user.id });
    if (!application) return res.status(404).json({ error: 'Assessment not assigned to your account.' });
    if (!Array.isArray(req.body.answers) || req.body.answers.length !== assessment.questions.length || req.body.answers.some((answer, index) => !Number.isInteger(answer) || answer < 0 || answer >= assessment.questions[index].options.length)) return res.status(400).json({ error: 'Submit one valid answer for every question.' });
    if (await AssessmentResult.exists({ assessmentId: assessment._id, candidateId: req.user.id, 'proctoring.terminated': false })) return res.status(409).json({ error: 'This assessment has already been submitted.' });
    if (await AssessmentResult.exists({ assessmentId: assessment._id, candidateId: req.user.id, 'proctoring.terminated': true })) return res.status(403).json({ error: 'This assessment was terminated for a proctoring violation. Contact the recruiter.' });
    const correct = assessment.questions.reduce((total, question, index) => total + (question.correctAnswer === req.body.answers[index] ? 1 : 0), 0);
    const score = Math.round(correct / assessment.questions.length * 100);
    const result = await AssessmentResult.create({ assessmentId: assessment._id, applicationId: application._id, candidateId: req.user.id, answers: req.body.answers, proctoring: sanitizeProctoringReport(req.body.proctoring), score, passed: score >= assessment.passingScore });
    res.json({ score: result.score, passed: result.passed, passingScore: assessment.passingScore, proctoring: result.proctoring, submittedAt: result.submittedAt });
  } catch (error) { res.status(500).json({ error: error.message }); }
};
