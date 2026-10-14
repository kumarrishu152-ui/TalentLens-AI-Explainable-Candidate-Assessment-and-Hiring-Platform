import React, { useId, useState } from 'react';
import { agentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { KeyRound } from 'lucide-react';

// Copy for each agent so the same panel can serve the career helper, the interview
// trainer and the recruiter copilot without every caller repeating the wording.
const AGENT_COPY = {
  coach: {
    title: 'Talent Coach',
    description: 'Career guidance grounded in your profile.',
    placeholder: 'Ask your career coach…',
    empty: 'Ask for interview practice, resume feedback, or a skill growth plan.',
    suggestions: [
      'Review my resume for one big fix',
      'Which roles fit my skills right now?',
      'Plan my next four weeks of learning',
      'How should I answer "tell me about yourself"?'
    ]
  },
  interviewer: {
    title: 'Interview Coach',
    description: 'Free-form coaching for the interviews you are preparing for.',
    placeholder: 'Ask your interview coach…',
    empty: 'Ask for a practice question, STAR phrasing, or delivery tips.',
    suggestions: [
      'Give me a behavioral question',
      'How do I use the STAR method?',
      'What should I say to "why this role?"',
      'How do I answer questions about a weak spot?'
    ]
  },
  copilot: {
    title: 'Hiring Copilot',
    description: 'Recruiting help grounded in this workspace.',
    placeholder: 'Ask your hiring copilot…',
    empty: 'Ask for a job description, assessment outline, or evidence based candidate review.',
    suggestions: [
      'Draft a job description',
      'Write five screening questions',
      'Explain a score from its evidence'
    ]
  }
};

const KEY_ISSUE_CODES = ['GEMINI_KEY_MISSING', 'GEMINI_KEY_INVALID', 'GEMINI_KEY_DECRYPT_FAILED'];

// kind -> default agent, `agent` -> which backend persona to use. `bare` drops the card
// chrome so the panel can sit inside a tab in another card.
const AgentPanel = ({ kind, context, agent, title, description, placeholder, suggestions, bare = false, className = '' }) => {
  const candidate = kind === 'candidate';
  const fallbackAgent = candidate ? 'coach' : 'copilot';
  const agentName = AGENT_COPY[agent] ? agent : fallbackAgent;
  const copy = AGENT_COPY[agentName];
  const { setShowKeyModal } = useAuth();
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyIssue, setKeyIssue] = useState(false);
  const headingId = useId();

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
      const data = await agentAPI.chat({ message: text, history, context, agent: agentName });
      setHistory([...nextHistory, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not reach the assistant.');
      setKeyIssue(KEY_ISSUE_CODES.includes(err.response?.data?.code));
    } finally {
      setBusy(false);
    }
  };

  const resetChat = () => { setHistory([]); setError(''); };
  const showSuggestions = history.length === 0 && !busy;
  const chips = suggestions || copy.suggestions;

  return (
    <section
      aria-labelledby={bare ? undefined : headingId}
      className={`${bare ? 'w-full' : 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'} ${className}`.trim()}
    >
      {bare ? (
        history.length > 0 && (
          <div className="mb-3 flex justify-end">
            <button type="button" onClick={resetChat} className="text-xs font-medium text-slate-500 hover:text-slate-900">New chat</button>
          </div>
        )
      ) : (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">AI assistant</p>
            <h2 id={headingId} className="mt-1 text-lg font-semibold text-slate-900">{title || copy.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{description || copy.description}</p>
          </div>
          {history.length > 0 && <button type="button" onClick={resetChat} className="text-xs font-medium text-slate-500 hover:text-slate-900">New chat</button>}
        </div>
      )}

      <div className="mb-4 max-h-72 space-y-3 overflow-y-auto" aria-live="polite">
        {history.length === 0 ? (
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{copy.empty}</p>
        ) : history.map((entry, index) => (
          <div key={index} className={`rounded-xl px-3 py-2 text-sm ${entry.role === 'user' ? 'ml-8 bg-slate-100 text-slate-800' : 'mr-4 bg-violet-50 text-slate-800'}`}>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{entry.role === 'user' ? 'You' : title || copy.title}</p>
            <p className="whitespace-pre-wrap">{entry.content}</p>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500" role="status">Thinking…</p>}
      </div>

      {error && <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
        <p className="flex-1">{error}</p>
        {keyIssue && <button type="button" onClick={() => setShowKeyModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100"><KeyRound className="h-3.5 w-3.5" /> Update Gemini key</button>}
      </div>}

      {showSuggestions && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setMessage(suggestion)}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex gap-2">
        <input value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder={placeholder || copy.placeholder} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100" aria-label="Message assistant" />
        <button disabled={busy || !message.trim()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Send</button>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">Conversation is kept in this browser session. Verify important decisions with the underlying evidence.</p>
    </section>
  );
};

export default AgentPanel;
