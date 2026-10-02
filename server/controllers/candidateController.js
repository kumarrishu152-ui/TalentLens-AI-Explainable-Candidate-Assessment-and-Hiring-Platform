const Candidate = require('../models/Candidate');
const JobConfig  = require('../models/JobConfig');
const User       = require('../models/User');
const Application = require('../models/Application');
const Assessment = require('../models/Assessment');
const AssessmentResult = require('../models/AssessmentResult');
const { extractResumeText }    = require('../utils/resumeParser');
const { getGeminiApiKey } = require('../utils/geminiKey');
const { parseResumeLocally } = require('../utils/localResumeParser');
const { parseResumeWithGemini, getSkillsWithEmbeddings } = require('../services/geminiService');
const { getPrediction, tuneWeights } = require('../services/mlService');
const { buildVerificationQuestions } = require('../utils/verificationTest');
const { sanitizeProctoringReport } = require('../utils/proctoring');

const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const checkDuplicate = async (userId, email, name) => {
    const escapedName = escapeRegExp(name || '');
    return await Candidate.findOne({
        user: userId,
        $or: [
            { email: email },
            { name: { $regex: new RegExp(`^${escapedName}$`, 'i') } }
        ]
    });
};

exports.uploadResume = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const geminiApiKey = await getGeminiApiKey(req.user.id);
        let resumeText = '';
        let parsedData = null;

        try {
            resumeText = await extractResumeText(req.file.buffer, req.file.mimetype, req.file.originalname);
        } catch (err) {
            console.error('PDF text extraction failed, falling back to multimodal parsing:', err.message);
        }

        if (!resumeText || resumeText.length < 50) {
            const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
            if (!isPdf) {
                return res.status(400).json({ error: 'This DOCX file contains too little readable text. Upload a text-based PDF or DOCX resume.' });
            }
            if (!geminiApiKey) return res.status(400).json({ error: 'This PDF appears to be scanned and has no extractable text. Please upload a text-based PDF or DOCX resume.' });
            parsedData = await parseResumeWithGemini(req.file.buffer, true, geminiApiKey);
            resumeText = `[Scanned PDF]\nName: ${parsedData.name}\nEmail: ${parsedData.email}\nSummary: ${parsedData.summary}`;
        } else {
            if (geminiApiKey) {
                try {
                    parsedData = await parseResumeWithGemini(resumeText, false, geminiApiKey);
                } catch (aiError) {
                    console.warn('Gemini parsing unavailable; using local resume parser:', aiError.message);
                }
            }
            if (!parsedData) {
                parsedData = parseResumeLocally(resumeText);
            }
        }

        const duplicate     = await checkDuplicate(req.user.id, parsedData.email, parsedData.name);
        const duplicateFound = !!duplicate;

        const tags         = (parsedData.skills || []).map(s => s.tag.toLowerCase().trim());
        let skillEmbeddings = [];
        try {
            skillEmbeddings = await getSkillsWithEmbeddings(tags, geminiApiKey);
        } catch (embeddingError) {
            console.warn('Gemini embeddings unavailable; continuing without semantic embeddings:', embeddingError.message);
        }
        const skillEvidence = (parsedData.skills_evidence || []).map(se => ({
            tag:   se.tag.toLowerCase().trim(),
            quote: se.quote
        }));

        const candidateData = {
            name:             parsedData.name || 'Unknown Candidate',
            email:            parsedData.email || 'unknown@example.com',
            skills:           tags,
            skillEmbeddings:  skillEmbeddings,
            years_experience: parsedData.years_experience || 0,
            education_degree: parsedData.education_degree || 'Bachelors',
            education_field:  parsedData.education_field  || '',
            summary:          parsedData.summary || '',
            resume_text:      resumeText,
            resume_filename:  req.file.originalname,
            user:             req.user.id,
            verificationTest: { status: 'Not started', questions: [], score: null },
            prediction: {
                success_score:    0,
                analysis:         'Not yet analyzed.',
                chart_url:        '',
                explainability:   [],
                skillEvidence:    skillEvidence,
                duplicateFound:   duplicateFound,
                authenticityFlag: parsedData.is_keyword_stuffed || false
            }
        };
        const account = await User.findById(req.user.id).select('role');
        let newCandidate;
        if (account?.role === 'candidate') {
            newCandidate = await Candidate.findOneAndUpdate(
                { user: req.user.id },
                { $set: candidateData },
                { new: true, upsert: true, setDefaultsOnInsert: true }
            );
        } else {
            newCandidate = new Candidate(candidateData);
            await newCandidate.save();
        }
        res.status(201).json(newCandidate);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
};

exports.getMyProfile = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ user: req.user.id }).sort({ updatedAt: -1, createdAt: -1 });
        res.json(candidate || null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.predictCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) {
            return res.status(404).json({ error: 'Candidate not found or access denied' });
        }

        const activeConfig = await JobConfig.findOne({
            isActive: true,
            userId:   req.user.id
        }).sort({ createdAt: -1 });

        const predictionData = await getPrediction(candidate, activeConfig);

        if (predictionData) {
            candidate.prediction = {
                ...candidate.prediction.toObject(),
                success_score:    predictionData.success_score,
                analysis:         predictionData.analysis,
                chart_url:        predictionData.chart_base64,
                explainability:   predictionData.explainability   || [],
                skillEvidence:    predictionData.skillEvidence     || candidate.prediction.skillEvidence,
                duplicateFound:   predictionData.duplicateFound    || candidate.prediction.duplicateFound,
                authenticityFlag: predictionData.authenticityFlag  || candidate.prediction.authenticityFlag,
                disqualified:     predictionData.disqualified      || false,
                missingMustHaves: predictionData.missingMustHaves  || []
            };

            await candidate.save();
        } else {
            console.error('ML service returned no result for candidate:', req.params.id);
        }

        res.json(candidate);

    } catch (error) {
        console.error('Prediction error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.rateCandidate = async (req, res) => {
    try {
        const { rating } = req.body;
        if (!rating || rating < 1 || rating > 10) {
            return res.status(400).json({ error: 'Rating must be between 1 and 10.' });
        }

        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        const user         = await User.findById(req.user.id);
        const reviewerName = user ? user.username : 'Reviewer';

        const existingIdx = candidate.hr_ratings.findIndex(r => r.userId.toString() === req.user.id.toString());
        if (existingIdx !== -1) {
            candidate.hr_ratings[existingIdx].rating = rating;
        } else {
            candidate.hr_ratings.push({ userId: req.user.id, reviewerName, rating });
        }

        await candidate.save();

        if (candidate.prediction?.duplicateFound) {
            return res.json(candidate);
        }

        const activeConfig = await JobConfig.findOne({ userId: req.user.id, isActive: true });

        if (activeConfig) {
            const updatedSkillsList = await tuneWeights(candidate, activeConfig);
            if (updatedSkillsList) {
                activeConfig.versionHistory.push({
                    timestamp:        new Date(),
                    experienceWeight: activeConfig.experienceWeight,
                    skillsWeight:     activeConfig.skillsWeight,
                    targetDegree:     activeConfig.targetDegree,
                    targetField:      activeConfig.targetField,
                    skillsList:       activeConfig.skillsList.map(s => ({
                        tag:        s.tag,
                        category:   s.category,
                        weight:     s.weight,
                        importance: s.importance,
                        source:     s.source,
                        sampleSize: s.sampleSize
                    }))
                });

                activeConfig.skillsList = updatedSkillsList;
                await activeConfig.save();
            }
        }

        res.json(candidate);

    } catch (error) {
        console.error('Rating error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updatePipelineStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!status || !['New', 'Screening', 'Interview', 'Offer', 'Rejected'].includes(status)) {
            return res.status(400).json({ error: 'Invalid pipeline status.' });
        }

        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

        if (['Interview', 'Offer'].includes(status) && candidate.verificationTest?.status !== 'Passed') {
            return res.status(409).json({
                error: 'Candidate must pass the resume verification test before moving to Interview or Offer.'
            });
        }

        candidate.pipelineStatus = status;
        await candidate.save();
        res.json(candidate);

    } catch (error) {
        console.error('Pipeline status update error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getAllCandidates = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
        const candidates = await Candidate.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCandidateById = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteCandidate = async (req, res) => {
    try {
        const candidate = await Candidate.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const publicVerificationTest = (verificationTest) => ({
    status: verificationTest.status,
    score: verificationTest.score,
    completedAt: verificationTest.completedAt,
    proctoring: verificationTest.proctoring,
    questions: (verificationTest.questions || []).map(({ skill, question, options, selectedAnswer }) => ({
        skill, question, options, selectedAnswer
    }))
});

exports.startVerificationTest = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });

        candidate.verificationTest = {
            status: 'Not started',
            questions: buildVerificationQuestions(candidate.skills),
            score: null,
            completedAt: null
        };
        await candidate.save();
        res.json({ verificationTest: publicVerificationTest(candidate.verificationTest) });
    } catch (error) {
        console.error('Verification test setup error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.submitVerificationTest = async (req, res) => {
    try {
        const { answers } = req.body;
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
        const questions = candidate.verificationTest?.questions || [];
        if (!questions.length) return res.status(400).json({ error: 'Start the verification test before submitting it.' });
        if (!Array.isArray(answers) || answers.length !== questions.length || answers.some(answer => !Number.isInteger(answer))) {
            return res.status(400).json({ error: 'Answer every verification question before submitting.' });
        }

        let correct = 0;
        questions.forEach((question, index) => {
            question.selectedAnswer = answers[index];
            if (question.correctAnswer === answers[index]) correct += 1;
        });
        const score = Math.round((correct / questions.length) * 100);
        candidate.verificationTest.status = score >= 70 ? 'Passed' : 'Failed';
        candidate.verificationTest.score = score;
        candidate.verificationTest.completedAt = new Date();
        const proctoring = sanitizeProctoringReport(req.body.proctoring);
        if (proctoring) candidate.verificationTest.proctoring = proctoring;
        await candidate.save();
        res.json({ verificationTest: publicVerificationTest(candidate.verificationTest) });
    } catch (error) {
        console.error('Verification test submit error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Candidate proctoring dismantled the verification attempt (anti-cheat) and the
 * test was restarted, or the test was terminated after repeated violations.
 * Records the report server-side without scoring anything.
 */
exports.reportVerificationViolation = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
        const { terminated = false, terminateReason = '', restarts = 0 } = req.body || {};
        const proctoring = { ...sanitizeProctoringReport(req.body.proctoring), terminated: terminated === true, terminateReason: String(terminateReason || '').slice(0, 200), restarts: Math.max(0, Math.min(20, Math.round(Number(restarts) || 0))) };
        if (terminated) {
            candidate.verificationTest.status = 'Failed';
            candidate.verificationTest.score = 0;
            candidate.verificationTest.completedAt = new Date();
            candidate.verificationTest.questions = [];
        }
        candidate.verificationTest.proctoring = proctoring;
        await candidate.save();
        res.json({ recorded: true });
    } catch (error) {
        console.error('Verification violation report error:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Recruiter re-arranges (resets) the candidate's verification test after a
 * proctoring termination so they can take it again.
 */
exports.resetVerificationTest = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
        const wasTerminated = candidate.verificationTest?.proctoring?.terminated === true;
        candidate.verificationTest = {
            status: 'Not started',
            questions: [],
            score: null,
            completedAt: null,
            proctoring: {
                enabled: false,
                permissioned: false,
                cameraStreamHealthy: true,
                micStreamHealthy: true,
                suspiciousEventCount: 0,
                terminated: false,
                terminateReason: '',
                restarts: 0,
                events: []
            }
        };
        await candidate.save();
        res.json({ recorded: true, wasTerminated, candidateId: candidate._id, status: candidate.verificationTest.status });
    } catch (error) {
        console.error('Verification test reset error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.applyToJob = async (req, res) => {
    try {
        const { jobId, jobTitle, company, salary } = req.body;
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        if (!jobTitle) {
            return res.status(400).json({ error: 'Job title is required.' });
        }

        if (!jobId) return res.status(400).json({ error: 'Choose a published job before applying.' });
        const jobConfig = await JobConfig.findOne({ _id: jobId, isPublished: true }).select('userId jobTitle salary');
        if (!jobConfig) return res.status(404).json({ error: 'This job is no longer available.' });
        const recruiterId = jobConfig.userId;
        const recruiter = await User.findById(recruiterId).select('companyName username');

        const candidate = await Candidate.findOne({ user: req.user.id }).sort({ createdAt: -1 });
        const application = await Application.findOneAndUpdate(
            {
                userId: req.user.id,
                jobId
            },
            {
                userId: req.user.id,
                candidateId: candidate?._id || null,
                recruiterId,
                jobId: jobId || null,
                jobTitle: jobConfig.jobTitle,
                company: recruiter?.companyName || company || recruiter?.username || '',
                salary: jobConfig.salary || salary || 'Competitive',
                candidateName: candidate?.name || 'Candidate',
                candidateEmail: candidate?.email || '',
                status: 'Submitted'
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(201).json({
            message: 'Application submitted successfully.',
            application
        });
    } catch (error) {
        console.error('Apply to job error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const apps = await Application.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(apps);
    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getRecruiterApplications = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const applications = await Application.find({ recruiterId: req.user.id }).sort({ createdAt: -1 }).lean();
        const userIds = [...new Set(applications.map(app => String(app.userId)))];
        const profiles = await Candidate.find({ user: { $in: userIds } }).lean();
        const profileByUser = new Map(profiles.map(profile => [String(profile.user), profile]));
        const jobIds = [...new Set(applications.map(app => app.jobId).filter(Boolean).map(String))];
        const jobs = await JobConfig.find({ _id: { $in: jobIds } }).lean();
        const jobById = new Map(jobs.map(job => [String(job._id), job]));
        const appIds = applications.map(app => app._id);
        const [assessments, results] = await Promise.all([
            Assessment.find({ applicationId: { $in: appIds } }).select('applicationId title').lean(),
            AssessmentResult.find({ applicationId: { $in: appIds } }).select('assessmentId applicationId score passed proctoring submittedAt').sort({ submittedAt: -1 }).lean()
        ]);
        const assessmentByApp = new Map(assessments.map(a => [String(a.applicationId), a]));
        const latestResultByApp = new Map();
        results.forEach(result => { if (!latestResultByApp.has(String(result.applicationId))) latestResultByApp.set(String(result.applicationId), result); });
        const enriched = await Promise.all(applications.map(async app => {
            const candidate = profileByUser.get(String(app.userId));
            const job = jobById.get(String(app.jobId));
            let match = null;
            if (candidate && job) {
                try { match = await getPrediction(candidate, job); } catch (error) { console.warn('Application match scoring failed:', error.message); }
            }
            const latestResult = latestResultByApp.get(String(app._id)) || null;
            const candidateVerification = candidate?.verificationTest || null;
            return {
                ...app,
                jobField: job ? (job.jobField || 'Other') : null,
                assessment: assessmentByApp.get(String(app._id)) ? { _id: assessmentByApp.get(String(app._id))._id, title: assessmentByApp.get(String(app._id)).title || 'Candidate assessment' } : null,
                latestResult: latestResult ? {
                    score: latestResult.score,
                    passed: latestResult.passed,
                    submittedAt: latestResult.submittedAt,
                    proctoring: latestResult.proctoring || null
                } : null,
                verificationTest: candidateVerification ? {
                    status: candidateVerification.status,
                    score: candidateVerification.score,
                    terminated: candidateVerification.proctoring?.terminated === true,
                    terminateReason: candidateVerification.proctoring?.terminateReason || '',
                    restarts: candidateVerification.proctoring?.restarts || 0,
                    candidateDocId: candidate._id
                } : null,
                candidateProfile: candidate ? { _id: candidate._id, skills: candidate.skills || [], years_experience: candidate.years_experience || 0, education_degree: candidate.education_degree, education_field: candidate.education_field, resume_filename: candidate.resume_filename, summary: candidate.summary } : null,
                matchScore: match?.success_score ?? null,
                matchReasons: match?.explainability || []
            };
        }));
        res.json(enriched);
    } catch (error) {
        console.error('Get recruiter applications error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateApplicationStatus = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['Submitted', 'Reviewed', 'Shortlisted', 'Interview', 'Selected', 'Offer', 'Rejected'].includes(status)) return res.status(400).json({ error: 'Choose a valid application status.' });
        // Update only the status field. Saving a stale document can fail validation
        // because of unrelated legacy application data.
        const application = await Application.findOneAndUpdate(
            { _id: req.params.id, recruiterId: req.user.id },
            { $set: { status } },
            { new: true, runValidators: true }
        );
        if (!application) return res.status(404).json({ error: 'Application not found.' });
        res.json(application);
    } catch (error) {
        console.error('Update application status failed:', error);
        if (error.name === 'CastError') return res.status(400).json({ error: 'Invalid application id.' });
        if (error.name === 'ValidationError') return res.status(400).json({ error: error.message });
        res.status(500).json({ error: 'Could not save the application status. Check the server connection and try again.' });
    }
};
