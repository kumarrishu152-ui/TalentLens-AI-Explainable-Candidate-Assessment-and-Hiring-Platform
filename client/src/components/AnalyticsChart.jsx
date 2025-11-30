import React from 'react';
import { TrendingUp, Award, FileText } from 'lucide-react';
import GlowCard from './ui/GlowCard';

const AnalyticsChart = ({ prediction }) => {
  if (!prediction) return null;

  // Handle both old and new field names for robustness
  const { success_score, chart_base64, chart_url, analysis } = prediction;
  const chartImage = chart_base64 || chart_url;

  // Determine score color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    return 'Needs Review';
  };

  // Safe score formatting
  const displayScore = typeof success_score === 'number' ? success_score : 0;

  return (
    <div className="space-y-6">
      
      {/* 1. Success Score Card */}
      <GlowCard className="text-center p-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
          <Award className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-sm font-medium text-slate-600 mb-2">
          Predicted Success Score
        </h3>
        
        <div className={`inline-block px-8 py-4 rounded-2xl border-2 mb-2 ${getScoreColor(displayScore)}`}>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold tracking-tight">{displayScore.toFixed(0)}</span>
            <span className="text-lg font-medium text-opacity-80">%</span>
          </div>
        </div>
        
        <p className={`text-sm font-bold mt-2 ${getScoreColor(displayScore).split(' ')[0]}`}>
          {getScoreLabel(displayScore)}
        </p>
      </GlowCard>

      {/* 2. Radar Chart */}
      {chartImage && (
        <GlowCard className="p-6">
          <div className="flex items-center space-x-2 mb-6">
            <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Benchmark Comparison
            </h3>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-100 p-2 flex justify-center items-center min-h-[250px]">
            <img
              src={chartImage.startsWith('data:') ? chartImage : `data:image/png;base64,${chartImage}`}
              alt="Performance Radar Chart"
              className="w-full max-w-[300px] h-auto object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = '<p class="text-sm text-red-500">Failed to load chart image</p>';
              }}
            />
          </div>
          
          <div className="mt-4 flex justify-center gap-6 text-xs text-slate-500">
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500/20 border border-blue-500 rounded-sm"></div>
                <span>Candidate</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500/20 border border-orange-500 rounded-sm"></div>
                <span>Gold Standard</span>
            </div>
          </div>
        </GlowCard>
      )}

      {/* 3. AI Analysis Text (If not handled in parent, we show it here as backup) */}
      {/* Note: In the CandidateDetails.jsx update, we moved the analysis text 
         OUTSIDE this component to be its own card. 
         However, keeping a small fallback here is good practice in case this component is used elsewhere.
      */}
      {/* {analysis && (
        <GlowCard className="p-5 bg-gradient-to-br from-white to-slate-50 border-l-4 border-l-primary-500">
          <h4 className="flex items-center gap-2 font-semibold text-slate-900 mb-2">
            <FileText className="w-4 h-4 text-primary-600" />
            AI Insights
          </h4>
          <p className="text-sm text-slate-600 leading-relaxed">
            {analysis}
          </p>
        </GlowCard>
      )} */}
      
    </div>
  );
};

export default AnalyticsChart;