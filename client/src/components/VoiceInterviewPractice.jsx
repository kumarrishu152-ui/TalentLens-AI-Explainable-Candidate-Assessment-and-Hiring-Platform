import React, { useMemo, useState } from 'react';
import { Volume2, Mic, RotateCcw } from 'lucide-react';
import VoiceInput from './VoiceInput';

const VoiceInterviewPractice = ({ candidate }) => {
  const questions = useMemo(() => {
    const skills = (candidate.skills || []).slice(0, 3);
    const skillQuestions = skills.map(skill => `Tell me about a project where you used ${skill}. What was your specific contribution and what was the outcome?`);
    return [...skillQuestions, 'Describe a difficult problem you faced recently. How did you decide on your approach?'];
  }, [candidate.skills]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [transcript, setTranscript] = useState('');

  const question = questions[questionIndex];
  const speakQuestion = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(question));
  };

  const nextQuestion = () => {
    setQuestionIndex(index => (index + 1) % questions.length);
    setTranscript('');
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2"><Mic className="w-4 h-4 text-violet-600" /> Voice Interview Practice</h3>
          <p className="text-xs text-slate-600 mt-1">Practice a resume-specific answer. Your voice stays in the browser; only this live transcript is shown.</p>
        </div>
        <button type="button" onClick={speakQuestion} className="p-2 text-violet-700 hover:bg-violet-100 rounded" title="Read question aloud"><Volume2 className="w-4 h-4" /></button>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-3">{question}</p>
      <div className="flex items-center gap-2 mb-3">
        <VoiceInput label="Record practice answer" onTranscript={text => setTranscript(current => current ? `${current} ${text}` : text)} />
        <button type="button" onClick={nextQuestion} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-violet-700"><RotateCcw className="w-3.5 h-3.5" /> Next question</button>
      </div>
      <div className="min-h-16 rounded-md border border-violet-100 bg-white p-3 text-xs text-slate-700 leading-relaxed">
        {transcript || 'Your spoken answer will appear here.'}
      </div>
    </div>
  );
};

export default VoiceInterviewPractice;
