const User = require('../models/User');
const { decrypt } = require('./encryption');

const getGeminiApiKey = async (userId) => {
    const user = await User.findById(userId).select('geminiApiKey');
    if (user?.geminiApiKey?.iv && user.geminiApiKey.content) {
        return decrypt(user.geminiApiKey);
    }

    return process.env.GEMINI_API_KEY || null;
};

module.exports = { getGeminiApiKey };
