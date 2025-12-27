import React, { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { userAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import GlowCard from './ui/GlowCard'; 

const Leaderboard = () => {
  const [candidates, setCandidates] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTop = async () => {
      try {
        const data = await userAPI.getTopCandidates();
        setCandidates(data);
      } catch (err) {
        console.error("Failed to load leaderboard");
      }
    };
    fetchTop();
  }, []);

  if (candidates.length === 0) return null;

  return (
    <GlowCard className="bg-gradient-to-br from-white to-slate-50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-yellow-100 p-2 rounded-lg">
          <Trophy className="w-5 h-5 text-yellow-600" />
        </div>
        <h3 className="font-bold text-slate-900">Top Performers</h3>
      </div>
      
      <div className="space-y-3">
        {candidates.map((cand, idx) => (
          <div 
            key={cand._id}
            onClick={() => navigate(`/candidate/${cand._id}`)}
            className="flex items-center justify-between p-3 bg-white/50 rounded-lg border border-slate-100 hover:border-blue-300 hover:bg-white cursor-pointer transition-all"
          >
            <div className="flex items-center gap-3">
              <span className={`font-bold text-sm w-5 h-5 flex items-center justify-center rounded-full 
                ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : 
                  idx === 1 ? 'bg-slate-200 text-slate-700' : 
                  idx === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'}`}>
                {idx + 1}
              </span>
              <div>
                <p className="font-medium text-sm text-slate-900">{cand.name}</p>
                <p className="text-xs text-slate-500 truncate max-w-[120px]">{cand.email}</p>
              </div>
            </div>
            
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 text-green-600 font-bold text-sm">
                <TrendingUp className="w-3 h-3" />
                {cand.prediction?.success_score?.toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlowCard>
  );
};

export default Leaderboard;