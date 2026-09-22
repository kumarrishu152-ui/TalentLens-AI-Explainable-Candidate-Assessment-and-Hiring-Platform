import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Mic, MicOff } from 'lucide-react';

const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

const getErrorMessage = (error) => ({
  'not-allowed': 'Microphone access is blocked. Allow it in this site’s browser settings, then try again.',
  'service-not-allowed': 'Speech recognition is blocked by the browser. Use Chrome or Edge and allow microphone access.',
  'audio-capture': 'No microphone was found. Connect or enable one, then try again.',
  network: 'Speech recognition needs a network connection. Check your connection and try again.',
  'no-speech': 'No speech was detected. Try again and speak after Listening appears.',
})[error] || 'Voice input could not start. Check your microphone permission and try again.';

// Uses the browser's Web Speech API. No audio is uploaded or stored by TalentLens AI.
const VoiceInput = ({ onTranscript, label = 'Use voice input', className = '' }) => {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    setSupported(Boolean(getSpeechRecognition()));
    return () => recognitionRef.current?.abort();
  }, []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setSupported(false);
      setMessage('Voice input is not available in this browser. Use the latest Chrome or Edge.');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setMessage('Voice input requires HTTPS when the app is opened from a network address. Use https:// or open the app through localhost.');
      return;
    }

    setMessage('');
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== 'aborted') setMessage(getErrorMessage(event.error));
    };
    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (!result?.isFinal) return;
      const transcript = result[0]?.transcript?.trim();
      if (transcript) onTranscript(transcript);
      recognition.stop();
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setListening(false);
      setMessage('Voice input is already starting. Wait a moment and try again.');
    }
  };

  return (
    <span className="relative inline-flex flex-col items-start">
      <button
        type="button"
        onClick={toggleListening}
        aria-label={label}
        title={label}
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-semibold transition-colors ${listening ? 'bg-red-50 text-red-700 border border-red-200 animate-pulse' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'} ${className}`}
      >
        {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        <span>{listening ? 'Listening...' : 'Voice'}</span>
      </button>
      {!supported && !message && <span className="mt-1 text-[10px] text-amber-700">Use Chrome or Edge for voice input.</span>}
      {message && (
        <span role="alert" className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] leading-relaxed text-amber-900 shadow-sm">
          <AlertCircle className="mr-1 inline h-3.5 w-3.5" />{message}
        </span>
      )}
    </span>
  );
};

export default VoiceInput;
