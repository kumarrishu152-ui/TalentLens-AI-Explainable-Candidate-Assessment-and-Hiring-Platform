import React, { useState } from 'react';
import { Key, Lock, Loader2 } from 'lucide-react';
import { userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SetupModal = () => {
  const { user, showKeyModal, updateApiKeyStatus } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!showKeyModal) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await userAPI.saveApiKey(apiKey);
      updateApiKeyStatus();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the Gemini API key. Check the server configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 m-4">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <Key className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Setup Your API Key</h2>
          <p className="text-slate-600 mt-2">
            TalentLens AI uses Google Gemini for its AI assistant and resume intelligence. Add your own key to enable these features.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your Gemini API Key here"
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg text-xs text-slate-500">
            <p className="flex items-center gap-2 mb-1">
              <Lock className="w-3 h-3" /> Security Guarantee:
            </p>
            <p>Your key is encrypted before storage and used only for your AI requests. Create or manage a key at <a className="font-semibold text-blue-700 underline" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</p>
          </div>

          <button
            type="submit"
            disabled={loading || !apiKey}
            className="w-full btn-primary py-3 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Securely Save Key'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupModal;
