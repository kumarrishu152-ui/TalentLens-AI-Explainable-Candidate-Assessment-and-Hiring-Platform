import React, { useState } from 'react';
import { KeyRound, RotateCcw, Send, Target, Volume2 } from 'lucide-react';
import { agentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import VoiceInput from './VoiceInput';
import AgentPanel from './AgentPanel';

const ROUND_OPTIONS = [3, 5, 8];
const KEY_ISSUE_CODES = ['GEMINI_KEY_MISSING', 'GEMINI_KEY_INVALID', 'GEMINI_KEY_DECRYPT_FAILED'];

const scoreTone = (score) => {
  if (typeof score !== 'number') return 'bg-slate-100 text-slate-600';
  if (score >= 75) return 'bg-emerald-100 text-emerald-700';
  if (score >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-rose-100 text-rose-700';
};

// Second candidate-facing agent: a guided mock interview that scores each answer,
// plus a free-form chat with the same interviewer persona.
const InterviewTrainer = ({ context }) => {
  const { setShowKeyModal } = useAuth();
  const [tab, setTab] = useState('mock');
  const [total, setTotal] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [keyIssue, setKeyIssue] = useState(false);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [rounds, setRounds] = useState([]);
  const [summary, setSummary] = useState('');
  const [history, setHistory] = useState([]);

  const started = round > 0;
  const finished = Boolean(summary);
  const lastRound = rounds.length ? rounds[rounds.length - 1] : null;
  const scoredRounds = rounds.filter((item) => typeof item.score === 'number');
  const average = scoredRounds.length
    ? Math.round(scoredRounds.reduce((sum, item) => sum + item.score, 0) / scoredRounds.length)
    : null;

  const handleError = (err) => {
    setError(err.response?.data?.error || 'Could not reach the interview coach.');
    setKeyIssue(KEY_ISSUE_CODES.includes(err.response?.data?.code));
  };

  const startSession = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    setKeyIssue(false);
    setRounds([]);
    setHistory([]);
    setSummary('');
    setQuestion('');
    setAnswer('');
    setRound(0);
    try {
      const data = await agentAPI.interviewTurn({ phase: 'start', round: 1, totalQuestions: total, history: [], context });
      setQuestion(data.question || 'Tell me about yourself and the role you are targeting.');
      setHistory([{ role: 'assistant', content: data.question || 'Tell me about yourself and the role you are targeting.' }]);
      setRound(1);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const submitAnswer = async () => {
    const text = answer.trim();
    if (!text || busy) return;
    const questionInFlight = question;
    const historyInFlight = history;
    setBusy(true);
    setError('');
    setKeyIssue(false);
    setAnswer('');
    try {
      const data = await agentAPI.interviewTurn({
        phase: 'answer',
        round,
        totalQuestions: total,
        answer: text,
        history: historyInFlight,
        context
      });
      setRounds((prev) => [...prev, {
        round,
        question: questionInFlight,
        answer: text,
        score: data.score,
        feedback: data.feedback || '',
        strengths: data.strengths || [],
        improvements: data.improvements || []
      }]);
      const reply = [data.feedback || '', data.question || ''].filter(Boolean).join('\n\n');
      setHistory([...historyInFlight, { role: 'user', content: text }, { role: 'assistant', content: reply }]);
      if (data.done) {
        setSummary(data.summary || 'Session complete.');
        setQuestion('');
      } else {
        setQuestion(data.question || 'One more: give me another example from your experience.');
        setRound((value) => value + 1);
      }
    } catch (err) {
      setAnswer(text); // keep what was typed so nothing is lost
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const resetSession = () => {
    setRound(0);
    setQuestion('');
    setAnswer('');
    setRounds([]);
    setSummary('');
    setHistory([]);
    setError('');
  };

  const speakQuestion = () => {
    if (!question || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(question));
  };

  const tabs = [
    { id: 'mock', label: 'Mock interview' },
    { id: 'chat', label: 'Ask a coach' }
  ];

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-white via-white to-indigo-50 p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-indigo-100 p-2 text-indigo-700"><Target className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">AI interviewer</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Interview Trainer</h2>
            <p className="mt-1 text-sm text-slate-500">Run a scored mock interview, then ask the coach anything.</p>
          </div>
        </div>
        <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs font-semibold" role="tablist" aria-label="Interview trainer mode">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={`rounded-lg px-3 py-1.5 transition ${tab === item.id ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mock' && error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
          <p className="flex-1">{error}</p>
          {keyIssue && (
            <button type="button" onClick={() => setShowKeyModal(true)} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-100">
              <KeyRound className="h-3.5 w-3.5" /> Update Gemini key
            </button>
          )}
        </div>
      )}

      {tab === 'chat' ? (
        <AgentPanel bare kind="candidate" agent="interviewer" context={context} />
      ) : !started ? (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <p className="text-sm leading-6 text-slate-700">
            You get {total} questions built from your resume and your target role. Answer out loud or type — the coach scores each answer, names what worked, and tells you exactly what to change before the real thing.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              Questions
              <select
                value={total}
                onChange={(event) => setTotal(Number(event.target.value))}
                disabled={busy}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-indigo-400"
              >
                {ROUND_OPTIONS.map((count) => <option key={count} value={count}>{count}</option>)}
              </select>
            </label>
            <button
              type="button"
              onClick={startSession}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Target className="h-4 w-4" />
              {busy ? 'Setting up…' : 'Start mock interview'}
            </button>
          </div>
        </div>
      ) : finished ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${scoreTone(average)}`}>{average === null ? 'Not scored' : `${average}/100`}</span>
              <div>
                <p className="text-sm font-bold text-emerald-800">Session complete</p>
                <p className="mt-0.5 text-xs text-emerald-700">{rounds.length} answer{rounds.length === 1 ? '' : 's'} graded · focus on the fixes below</p>
              </div>
            </div>
            <button
              type="button"
              onClick={resetSession}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> New session
            </button>
          </div>

          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{summary}</p>

          <ol className="space-y-3">
            {rounds.map((item) => (
              <li key={item.round} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Question {item.round}</p>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(item.score)}`}>{typeof item.score === 'number' ? `${item.score}/100` : '—'}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-800">{item.question}</p>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-slate-600">{item.answer}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{item.feedback}</p>
                {(item.strengths.length > 0 || item.improvements.length > 0) && (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <p className="rounded-xl bg-emerald-50 p-2 text-xs text-emerald-800"><strong>Keep:</strong> {item.strengths.join(' · ') || '—'}</p>
                    <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800"><strong>Fix:</strong> {item.improvements.join(' · ') || '—'}</p>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Question {round} of {total}</p>
            <div className="flex items-center gap-2">
              {average !== null && <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(average)}`}>Running avg {average}</span>}
              <button
                type="button"
                onClick={speakQuestion}
                title="Read question aloud"
                aria-label="Read question aloud"
                className="rounded-lg border border-slate-200 bg-white p-2 text-indigo-700 transition hover:bg-indigo-50"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {lastRound && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Feedback on answer {lastRound.round}</p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${scoreTone(lastRound.score)}`}>{typeof lastRound.score === 'number' ? `${lastRound.score}/100` : '—'}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{lastRound.feedback}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <p className="rounded-xl bg-emerald-50 p-2 text-xs text-emerald-800"><strong>Keep:</strong> {lastRound.strengths.join(' · ') || '—'}</p>
                <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-800"><strong>Fix:</strong> {lastRound.improvements.join(' · ') || '—'}</p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="whitespace-pre-wrap rounded-xl bg-indigo-50 px-3 py-3 text-sm font-semibold text-slate-800">{question}</p>
            <textarea
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              rows={4}
              maxLength={3000}
              placeholder="Type your answer, or use the Voice button to dictate it…"
              className="mt-3 w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <VoiceInput label="Answer out loud" onTranscript={(text) => setAnswer((prev) => (prev ? `${prev} ${text}` : text))} />
              <button
                type="button"
                onClick={submitAnswer}
                disabled={busy || !answer.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {busy ? 'Scoring…' : 'Submit answer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default InterviewTrainer;
