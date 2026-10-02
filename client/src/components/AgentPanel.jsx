import React, { useState } from 'react';
import { agentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { KeyRound } from 'lucide-react';

const AgentPanel = ({ kind, context }) => {
  const candidate = kind === 'candidate';
  const { setShowKeyModal } = useAuth();
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyIssue, setKeyIssue] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const text = message.trim();
    if (!text || busy) return;
    const nextHistory = [...history, { role: 'user', content: text }];
    setHistory(nextHistory);
    setMessage('');
    setBusy(true);
    setError('');
    setKeyIssue(false);
    try {
      const data = await agentAPI.chat({ message: text, history, context });
      setHistory([...nextHistory, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the assistant.');
      setKeyIssue(['GEMINI_KEY_MISSING', 'GEMINI_KEY_INVALID', 'GEMINI_KEY_DECRYPT_FAILED'].includes(err.response?.data?.code));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="agent-title">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">AI assistant</p>
          <h2 id="agent-title" className="mt-1 text-lg font-semibold text-slate-900">{candidate ? 'Talent Coach' : 'Hiring Copilot'}</h2>
          <p className="mt-1 text-sm text-slate-500">{candidate ? 'Career guidance grounded in your profile.' : 'Recruiting help grounded in this workspace.'}</p>
        </div>
        {history.length > 0 && <button type="button" onClick={() => { setHistory([]); setError(''); }} className="text-xs font-medium text-slate-500 hover:text-slate-900">New chat</button>}
      </div>
      <div className="mb-4 max-h-72 space-y-3 overflow-y-auto" aria-live="polite">
        {history.length === 0 ? <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{candidate ? 'Ask for interview practice, resume feedback, or a skill growth plan.' : 'Ask for a job description, assessment outline, or evidence based candidate review.'}</p> : history.map((entry, index) => (
          <div key={index} className={`rounded-xl px-3 py-2 text-sm ${entry.role === 'user' ? 'ml-8 bg-slate-100 text-slate-800' : 'mr-4 bg-violet-50 text-slate-800'}`}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{entry.role === 'user' ? 'You' : candidate ? 'Talent Coach' : 'Hiring Copilot'}</p>
            <p className="whitespace-pre-wrap">{entry.content}</p>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500" role="status">Thinking…</p>}
      </div>
      {error && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
        <p className="flex-1">{error}</p>
        {keyIssue && <button type="button" onClick={() => setShowKeyModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"><KeyRound className="h-3.5 w-3.5" /> Update Gemini key</button>}
      </div>}
      <form onSubmit={submit} className="flex gap-2">
        <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder={candidate ? 'Ask your career coach…' : 'Ask your hiring copilot…'} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" aria-label="Message assistant" />
        <button disabled={busy || !message.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Send</button>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">Conversation is kept in this browser session. Verify important decisions with the underlying evidence.</p>
    </section>
  );
};

export default AgentPanel;
