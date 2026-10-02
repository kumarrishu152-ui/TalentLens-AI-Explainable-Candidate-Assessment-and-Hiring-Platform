import React from 'react';
import { MoonStar, Sun } from 'lucide-react';

const ThemeToggle = ({ darkMode, setDarkMode }) => (
  <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur dark-theme-control" aria-label="Color theme">
    <button type="button" onClick={() => setDarkMode(false)} aria-pressed={!darkMode} title="Day mode" className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${!darkMode ? 'bg-amber-100 text-amber-900 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
      <Sun className="h-4 w-4" /> <span>Day</span>
    </button>
    <button type="button" onClick={() => setDarkMode(true)} aria-pressed={darkMode} title="Night mode" className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition ${darkMode ? 'bg-indigo-950 text-indigo-100 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>
      <MoonStar className="h-4 w-4" /> <span>Night</span>
    </button>
  </div>
);

export default ThemeToggle;
