import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, GraduationCap, ChevronRight } from 'lucide-react';
import GlowCard from './ui/GlowCard'; 

const CandidateCard = ({ candidate }) => {
  const navigate = useNavigate();

  const educationTierLabels = {
    1: 'Top Tier',
    2: 'Mid Tier',
    3: 'Entry Level'
  };

  return (
    <GlowCard 
      onClick={() => navigate(`/candidate/${candidate._id}`)}
      className="cursor-pointer hover:shadow-md h-full p-6" 
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">
            {candidate.name || 'Unknown Candidate'}
          </h3>
          <p className="text-sm text-slate-600">{candidate.email}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400" />
      </div>

      <div className="flex items-center space-x-4 mb-4 text-sm text-slate-600">
        <div className="flex items-center space-x-1">
          <Briefcase className="w-4 h-4" />
          <span>{candidate.experience_years || 0} years</span>
        </div>
        {candidate.education_tier && (
          <div className="flex items-center space-x-1">
            <GraduationCap className="w-4 h-4" />
            <span>{educationTierLabels[candidate.education_tier]}</span>
          </div>
        )}
      </div>

      {candidate.skills && candidate.skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {candidate.skills.slice(0, 5).map((skill, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium border border-primary-100"
            >
              {skill}
            </span>
          ))}
          {candidate.skills.length > 5 && (
            <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
              +{candidate.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {candidate.summary && (
        <p className="mt-4 text-sm text-slate-600 line-clamp-2">
          {candidate.summary}
        </p>
      )}
    </GlowCard>
  );
};

export default CandidateCard;