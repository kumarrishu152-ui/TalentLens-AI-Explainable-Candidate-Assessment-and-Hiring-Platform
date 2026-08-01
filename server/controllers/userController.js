const User      = require('../models/User');
const Candidate = require('../models/Candidate');
const JobConfig = require('../models/JobConfig');
const { encrypt } = require('../utils/encryption');

exports.saveApiKey = async (req, res) => {
    try {
        const { apiKey } = req.body;
        const userId = req.user.id;

        if (!apiKey) return res.status(400).json({ error: 'API Key is required' });

        const encryptedData = encrypt(apiKey);

        await User.findByIdAndUpdate(userId, { geminiApiKey: encryptedData });

        res.json({ message: 'API Key saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.resetJob = async (req, res) => {
    try {
        const userId = req.user.id;

        await Candidate.deleteMany({ user: userId });
        await JobConfig.deleteMany({ user: userId });

        res.json({ message: 'Job reset successfully. All candidates deleted.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTopCandidates = async (req, res) => {
    try {
        const userId = req.user.id;

        const candidates = await Candidate.find({
            user: userId,
            'prediction.success_score': { $exists: true }
        })
        .sort({ 'prediction.success_score': -1 })
        .limit(10)
        .select('name email prediction.success_score prediction.analysis');

        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};