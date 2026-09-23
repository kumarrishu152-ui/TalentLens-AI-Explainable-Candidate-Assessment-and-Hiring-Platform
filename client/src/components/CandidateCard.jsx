import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap, ChevronRight, AlertTriangle, Layers, ClipboardCheck } from 'lucide-react';
import GlowCard from './ui/GlowCard'; 

const CandidateCard = ({ candidate, blindMode = false }) => {
  const navigate = useNavigate();

  const getAnonName = (id) => {
    if (!id) return 'Candidate #XXXXX';
    return `Candidate #${id.slice(-5).toUpperCase()}`;
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'C';
    return fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() || '')
      .join('') || 'C';
  };

  const avatarPalette = ['bg-slate-900', 'bg-indigo-600', 'bg-emerald-600', 'bg-violet-600', 'bg-sky-600', 'bg-amber-500'];
  const avatarClass = avatarPalette[(candidate?._id?.length || 0) % avatarPalette.length];

  const name = blindMode ? getAnonName(candidate._id) : (candidate.name || 'Unknown Candidate');
  const email = blindMode ? '[Email Hidden]' : candidate.email;
  const summary = blindMode ? 'Summary hidden in blind review mode.' : candidate.summary;
  const expYears = candidate.years_experience !== undefined ? candidate.years_experience : (candidate.experience_years || 0);

  return (
    <GlowCard 
      onClick={() => navigate(`/candidate/${candidate._id}`)}
      className="cursor-pointer hover:shadow-md h-full p-5 relative border border-slate-100 flex flex-col justify-between bg-white/90" 
    >
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm ${avatarClass}`}>
              {getInitials(blindMode ? 'Candidate' : (candidate.name || 'Candidate'))}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {name}
                {candidate.prediction?.duplicateFound && (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" /> Dup
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 font-mono">{email}</p>
            </div>
          </div>
          <ChevronRight className="mt-1 w-5 h-5 text-slate-400" />
        </div>

        {candidate.prediction?.disqualified && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs font-semibold">
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              <span>Disqualified: Missing must-have tags</span>
            </div>
            {candidate.prediction.missingMustHaves && candidate.prediction.missingMustHaves.length > 0 && (
              <p className="mt-1 text-[10px] text-red-600 font-mono">
                Missing: {candidate.prediction.missingMustHaves.join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4 text-[11px] text-slate-600 font-semibold">
          <div className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
            <Briefcase className="w-3.5 h-3.5 text-primary-500" />
            <span>{expYears} yrs</span>
          </div>
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full border ${candidate.verificationTest?.status === 'Passed' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>{candidate.verificationTest?.status === 'Passed' ? 'Test passed' : 'Test required'}</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
            <GraduationCap className="w-3.5 h-3.5 text-primary-500" />
            <span>{candidate.education_degree || 'Bachelors'}</span>
          </div>
          <div className="flex items-center space-x-1 bg-slate-50 px-2 py-1 rounded-full border border-slate-200">
            <Layers className="w-3.5 h-3.5 text-primary-500" />
            <span>{candidate.pipelineStatus || 'New'}</span>
          </div>
          {candidate.prediction?.success_score > 0 && (
            <div className="flex items-center bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200 font-bold text-primary-700">
              Score: {candidate.prediction.success_score}%
            </div>
          )}
        </div>

        {summary && (
          <p className="text-sm text-slate-600 line-clamp-2 italic mb-4 leading-relaxed">
            "{summary}"
          </p>
        )}
      </div>

      {candidate.skills && candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
          {candidate.skills.slice(0, 4).map((skill, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold border border-slate-200"
            >
              {skill}
            </span>
          ))}
          {candidate.skills.length > 4 && (
            <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold">
              +{candidate.skills.length - 4}
            </span>
          )}
        </div>
      )}
    </GlowCard>
  );
};

export default CandidateCard;
