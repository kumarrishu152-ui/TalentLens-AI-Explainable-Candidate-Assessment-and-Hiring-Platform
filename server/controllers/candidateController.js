const Candidate = require('../models/Candidate');
const JobConfig  = require('../models/JobConfig');
const User       = require('../models/User');
const { extractTextFromPDF }    = require('../utils/resumeParser');
const { parseResumeWithGemini, getSkillsWithEmbeddings } = require('../services/geminiService');
const { getPrediction, tuneWeights } = require('../services/mlService');

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

        let resumeText = '';
        let parsedData = null;

        try {
            resumeText = await extractTextFromPDF(req.file.buffer);
        } catch (err) {
            console.error('PDF text extraction failed, falling back to multimodal parsing:', err.message);
        }

        if (!resumeText || resumeText.length < 50) {
            parsedData = await parseResumeWithGemini(req.file.buffer, true);
            resumeText = `[Scanned PDF]\nName: ${parsedData.name}\nEmail: ${parsedData.email}\nSummary: ${parsedData.summary}`;
        } else {
            parsedData = await parseResumeWithGemini(resumeText, false);
        }

        const duplicate     = await checkDuplicate(req.user.id, parsedData.email, parsedData.name);
        const duplicateFound = !!duplicate;

        const tags         = (parsedData.skills || []).map(s => s.tag.toLowerCase().trim());
        const skillEmbeddings = await getSkillsWithEmbeddings(tags);
        const skillEvidence = (parsedData.skills_evidence || []).map(se => ({
            tag:   se.tag.toLowerCase().trim(),
            quote: se.quote
        }));

        const newCandidate = new Candidate({
            name:             parsedData.name || 'Unknown Candidate',
            email:            parsedData.email || 'unknown@example.com',
            skills:           tags,
            skillEmbeddings:  skillEmbeddings,
            years_experience: parsedData.years_experience || 0,
            education_degree: parsedData.education_degree || 'Bachelors',
            education_field:  parsedData.education_field  || '',
            summary:          parsedData.summary || '',
            resume_text:      resumeText,
            user:             req.user.id,
            prediction: {
                success_score:    0,
                analysis:         'Not yet analyzed.',
                chart_url:        '',
                explainability:   [],
                skillEvidence:    skillEvidence,
                duplicateFound:   duplicateFound,
                authenticityFlag: parsedData.is_keyword_stuffed || false
            }
        });

        await newCandidate.save();
        res.status(201).json(newCandidate);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
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