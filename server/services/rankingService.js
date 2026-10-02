const { getPrediction } = require('./mlService');
const AssessmentResult = require('../models/AssessmentResult');
const { aiRankCandidates } = require('./geminiService');
const { getGeminiApiKey } = require('../utils/geminiKey');

const clamp = value => Math.max(0, Math.min(100, Math.round(value || 0)));

/** Explainable role fit using the platform's existing semantic skill scorer. */
async function rankApplication(application, candidate, job) {
  if (!candidate || !job) return null;
  const prediction = await getPrediction(candidate, job);
  const skillScore = clamp(prediction?.debug_details?.skill ?? 0);
  const targetExperience = Number(job.minExperience || job.goldStandardBenchmark?.avgYearsExperience || 0);
  const years = Number(candidate.years_experience || 0);
  const experienceScore = targetExperience === 0 ? 100 : clamp((years / targetExperience) * 100);
  const degreeRank = { none: 0, highschool: 1, associate: 2, bachelors: 3, masters: 4, phd: 5 };
  const wanted = (job.targetDegree || 'None').toLowerCase();
  const actual = (candidate.education_degree || '').toLowerCase();
  const educationScore = wanted === 'none' ? 100 : (actual === wanted ? 100 : ((degreeRank[actual] || 0) >= (degreeRank[wanted] || 3) ? 80 : 45));
  const customAssessmentResult = await AssessmentResult.findOne({ applicationId: application._id }).sort({ submittedAt: -1 }).select('score').lean();
  const assessmentScore = Number(customAssessmentResult?.score ?? candidate.verificationTest?.score ?? 0);
  const resumeText = candidate.resume_text || '';
  const resumeQualityScore = clamp((resumeText.length >= 500 ? 35 : resumeText.length / 500 * 35) +
    (candidate.skills?.length ? 25 : 0) + (candidate.email && candidate.email !== 'unknown@example.com' ? 15 : 0) +
    (candidate.name && candidate.name !== 'Unknown Candidate' ? 10 : 0) +
    (candidate.summary ? 10 : 0) + (candidate.education_degree ? 5 : 0));
  const overallScore = clamp(skillScore * 0.4 + experienceScore * 0.2 + educationScore * 0.1 + assessmentScore * 0.2 + resumeQualityScore * 0.1);
  const required = (job.skillsList || []).map(skill => skill.tag).filter(Boolean);
  const skills = (candidate.skills || []).map(skill => skill.toLowerCase());
  const matchingSkills = required.filter(skill => skills.includes(skill.toLowerCase()));
  const missingSkills = required.filter(skill => !skills.includes(skill.toLowerCase()));
  return {
    overallScore, components: { skill: skillScore, experience: experienceScore, education: educationScore, assessment: assessmentScore, resumeQuality: resumeQualityScore },
    explanation: {
      strengths: [...matchingSkills.map(skill => `Matches required skill: ${skill}`), ...(experienceScore >= 80 ? [`${years} years of relevant experience`] : []), ...(assessmentScore >= 70 ? [`Assessment score: ${assessmentScore}%`] : [])],
      gaps: [...missingSkills.map(skill => `Missing listed skill: ${skill}`), ...(assessmentScore === 0 ? ['Assessment not completed; assessment component is currently zero'] : []), ...(experienceScore < 60 ? [`Experience is below the ${targetExperience}-year role target`] : [])],
      scoring: '40% skills, 20% experience, 10% education, 20% assessment, 10% resume completeness. Missing assessment data scores zero.'
    }, evidence: prediction?.explainability || []
  };
}

/**
 * AI-assisted batch ranking. Runs the deterministic explainable scorer first,
 * then asks Gemini to analyze every candidate against the job as a cohort and
 * returns an AI rank, fit summary, strengths, concerns, recommendation, and
 * red flags per candidate. AI input is evidence-only (no protected traits);
 * AI output is advisory — the transparent rule-based score stays the primary
 * sort and recruiters make the final call.
 */
async function rankApplicantsWithAI({ job, applications, candidateByUser, userId }) {
  const rows = await Promise.all(applications.map(async application => {
    const entry = candidateByUser.get(String(application.userId)) || {};
    const candidateDoc = entry.doc || null;
    const userDoc = entry.userDoc || null;
    let latestResult = null;
    try {
      latestResult = await AssessmentResult.findOne({ applicationId: application._id }).sort({ submittedAt: -1 }).select('score proctoring').lean();
    } catch { /* assessment lookup is optional */ }
    const ranking = await rankApplication(application, candidateDoc, job);
    return {
      application,
      candidate: userDoc ? { displayName: userDoc.displayName, email: userDoc.email } : null,
      candidateDoc,
      ranking,
      proctoringFlags: latestResult?.proctoring?.suspiciousEventCount
        ?? (candidateDoc?.verificationTest?.proctoring?.terminated ? 1 : candidateDoc?.verificationTest?.proctoring?.suspiciousEventCount)
        ?? 0
    };
  }));

  const usable = rows.filter(row => row.ranking);
  const apiKey = await getGeminiApiKey(userId).catch(() => null);

  let aiError = null;
  let aiRankings = [];
  if (apiKey && usable.length) {
    try {
      const candidatesForAI = usable.map((row, index) => ({
        id: String(index),
        name: row.candidate?.displayName || row.application.candidateName || 'Candidate',
        skills: row.candidateDoc?.skills || [],
        years_experience: row.candidateDoc?.years_experience ?? 0,
        education_degree: row.candidateDoc?.education_degree || '',
        education_field: row.candidateDoc?.education_field || '',
        summary: row.candidateDoc?.summary || '',
        assessmentScore: row.ranking.components.assessment || null,
        aiFitScore: row.ranking.overallScore,
        proctoringFlags: row.proctoringFlags || 0
      }));
      aiRankings = await aiRankCandidates({ job, candidates: candidatesForAI }, apiKey);
    } catch (error) {
      console.warn('AI ranking unavailable; falling back to deterministic scores:', error.message);
      aiError = error.message;
    }
  } else if (!apiKey) {
    aiError = 'No Gemini API key configured — AI analysis unavailable.';
  }

  const aiByKey = new Map(aiRankings.map(item => [item.id, item]));
  usable.forEach((row, index) => {
    const ai = aiByKey.get(String(index)) || null;
    row.ai = ai ? {
      rank: ai.rank,
      score: ai.score,
      summary: ai.summary,
      strengths: ai.strengths,
      concerns: ai.concerns,
      recommendation: ai.recommendation,
      redFlags: ai.redFlags
    } : null;
  });

  usable.sort((a, b) => {
    const aiA = a.ai?.rank ?? Infinity;
    const aiB = b.ai?.rank ?? Infinity;
    if (aiA !== aiB) return aiA - aiB;
    return b.ranking.overallScore - a.ranking.overallScore;
  });

  return { rows: rows.filter(row => !row.ranking).concat(usable), aiError };
}

module.exports = { rankApplication, rankApplicantsWithAI };
