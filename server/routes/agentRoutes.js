const express = require('express');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { getGeminiApiKey } = require('../utils/geminiKey');
const { generateAgentReply } = require('../services/geminiService');

const router = express.Router();

const explainGeminiError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  const embeddedStatus = message.match(/\[(\d{3})\s/);
  const status = Number(error?.status || error?.statusCode || error?.response?.status || embeddedStatus?.[1] || 0);
  if (message.includes('api key is not configured')) {
    return { status: 503, code: 'GEMINI_KEY_MISSING', message: 'No Gemini API key is configured. Add your key with the key button below to use the AI assistant.' };
  }
  if (status === 429 || message.includes('quota') || message.includes('rate limit')) {
    return { status: 429, code: 'GEMINI_QUOTA', message: 'Gemini has reached its current usage limit. Check the quota for this API key or try again later.' };
  }
  if ([400, 401, 403].includes(status) || message.includes('api key not valid') || message.includes('invalid api key') || message.includes('permission denied')) {
    return { status: 503, code: 'GEMINI_KEY_INVALID', message: 'Gemini rejected this API key. Save a valid Gemini API key and try again.' };
  }
  if (status === 404 || message.includes('not found')) {
    return { status: 503, code: 'GEMINI_MODEL_UNAVAILABLE', message: 'The configured Gemini model is unavailable for this API key or region.' };
  }
  if (message.includes('encryption') || message.includes('bad decrypt') || message.includes('iv length')) {
    return { status: 503, code: 'GEMINI_KEY_DECRYPT_FAILED', message: 'The saved key could not be decrypted. Check that the server ENCRYPTION_KEY matches the key used when it was saved, then save the Gemini key again.' };
  }
  if (message.includes('fetch failed') || message.includes('enotfound') || message.includes('network')) {
    return { status: 503, code: 'GEMINI_NETWORK', message: 'The server could not reach Gemini. Check the server internet connection and try again.' };
  }
  return { status: 503, code: 'GEMINI_UNAVAILABLE', message: 'Gemini could not answer. Check the server logs for the exact error and try again.' };
};

router.post('/chat', auth, requireRole('candidate', 'recruiter'), async (req, res) => {
  try {
    const { message, history, context } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Enter a message to continue.' });
    }
    const apiKey = await getGeminiApiKey(req.user.id);
    const reply = await generateAgentReply({
      role: req.accountRole,
      message: message.trim(),
      history: Array.isArray(history) ? history.slice(-10) : [],
      context: context && typeof context === 'object' ? context : {}
    }, apiKey);
    res.json({ reply });
  } catch (error) {
    console.error('Assistant response failed:', error);
    const details = explainGeminiError(error);
    res.status(details.status).json({ error: details.message, code: details.code });
  }
});

module.exports = router;
