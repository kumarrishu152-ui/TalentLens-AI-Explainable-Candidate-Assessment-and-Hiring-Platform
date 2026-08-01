const cosineSimilarity = (vecA, vecB) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const calculateComponentScores = (candidate, jobConfig) => {
    const targetExp = parseFloat(jobConfig.goldStandardBenchmark?.avgYearsExperience || 5);
    const candExp = candidate.years_experience || 0;

    let scoreExp = 0;
    if (targetExp > 0) {
        scoreExp = Math.min(candExp / targetExp, 1.5) * 100;
    } else {
        scoreExp = 100;
    }
    scoreExp = Math.min(Math.round(scoreExp), 100);

    const passesExpFilter = candExp >= (jobConfig.minExperience || 0);
    if (!passesExpFilter) {
        scoreExp = 0;
    }

    const activeTags = (jobConfig.skillsList || []).filter(t => t.weight > 0);
    const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase().trim());
    const candidateEmbeddings = candidate.skillEmbeddings || [];

    let scoreSkill = 0;
    let explainability = [];
    const skillEvidence = [];
    const missingMustHaves = [];

    if (activeTags.length > 0) {
        let sumMatchedWeight = 0;
        let sumAllWeight = 0;
        let mustHaveMatchedCount = 0;

        activeTags.forEach(tag => {
            const normalizedTag = tag.tag.toLowerCase().trim();
            sumAllWeight += tag.weight;

            let bestSimilarity = 0;
            let matchedCandidateTag = '';

            // 1. Check semantic matching via Cosine Similarity
            if (tag.embedding && tag.embedding.length > 0 && candidateEmbeddings.length > 0) {
                candidateEmbeddings.forEach(candSkill => {
                    if (candSkill.embedding && candSkill.embedding.length > 0) {
                        const sim = cosineSimilarity(tag.embedding, candSkill.embedding);
                        if (sim > bestSimilarity) {
                            bestSimilarity = sim;
                            matchedCandidateTag = candSkill.tag;
                        }
                    }
                });
            }

            // 2. Fallback to exact string match
            const isExactMatch = candidateSkills.includes(normalizedTag);
            if (isExactMatch && bestSimilarity < 1.0) {
                bestSimilarity = 1.0;
                matchedCandidateTag = normalizedTag;
            }

            // A similarity of 0.82 is our threshold for semantic relevance
            const isMatch = bestSimilarity >= 0.82;

            if (isMatch) {
                // If similarity is very high (>=0.95), treat as 100% match. Otherwise scale by similarity
                const matchFactor = bestSimilarity >= 0.95 ? 1.0 : bestSimilarity;
                sumMatchedWeight += tag.weight * matchFactor;

                if (tag.importance === 'Must-have') {
                    mustHaveMatchedCount++;
                }

                const isSemanticOnly = bestSimilarity < 0.95;
                const pct = Math.round(bestSimilarity * 100);

                explainability.push({
                    type: 'match',
                    tag: tag.tag,
                    scoreEffect: Math.round((tag.weight / 100) * 15 * matchFactor),
                    reason: isSemanticOnly
                        ? `Semantically matched ${tag.importance} skill: "${tag.tag}" with candidate's skill "${matchedCandidateTag}" (${pct}% match)`
                        : `Matched ${tag.importance} skill: ${tag.tag}`
                });

                const evidence = (candidate.prediction?.skillEvidence || []).find(e => 
                    e.tag.toLowerCase().trim() === normalizedTag || 
                    e.tag.toLowerCase().trim() === matchedCandidateTag.toLowerCase().trim()
                );
                
                if (evidence) {
                    skillEvidence.push(evidence);
                } else {
                    skillEvidence.push({ 
                        tag: tag.tag, 
                        quote: isSemanticOnly 
                            ? `Found via semantic relation to candidate skill "${matchedCandidateTag}".`
                            : 'Found in parsed skills profile.' 
                    });
                }
            } else {
                explainability.push({
                    type: 'mismatch',
                    tag: tag.tag,
                    scoreEffect: -Math.round((tag.weight / 100) * 15),
                    reason: `Missing ${tag.importance} skill: ${tag.tag}`
                });
                if (tag.importance === 'Must-have') {
                    missingMustHaves.push(tag.tag);
                }
            }
        });

        let baseSkillScore = (sumMatchedWeight / sumAllWeight) * 100;
        const bonusMultiplier = 1 + (mustHaveMatchedCount * 0.05);
        scoreSkill = Math.min(Math.round(baseSkillScore * bonusMultiplier), 100);
    } else {
        scoreSkill = 100;
    }

    const degreeLevels = { 'None': 0, 'Associate': 1, 'Bachelors': 2, 'Masters': 3, 'PhD': 4 };
    const candDegreeLevel = degreeLevels[candidate.education_degree] || 2;
    const targetDegreeLevel = degreeLevels[jobConfig.targetDegree] || 2;

    let degreeScore = 10;
    if (candDegreeLevel >= targetDegreeLevel) {
        degreeScore = 100;
    } else if (candDegreeLevel === targetDegreeLevel - 1) {
        degreeScore = 70;
    } else if (candDegreeLevel === targetDegreeLevel - 2) {
        degreeScore = 40;
    }

    let fieldScore = 100;
    if (jobConfig.targetField && jobConfig.targetField.trim() !== '') {
        const target = jobConfig.targetField.toLowerCase().trim();
        const candField = (candidate.education_field || '').toLowerCase().trim();
        if (candField.includes(target) || target.includes(candField)) {
            fieldScore = 100;
        } else {
            fieldScore = 30;
        }
    }

    const scoreEdu = Math.round((degreeScore * 0.7) + (fieldScore * 0.3));

    return { scoreExp, scoreSkill, scoreEdu, explainability, skillEvidence, fieldScore, missingMustHaves };
};

const generateRadarChartSvg = (candidate, jobConfig, scoreSkill, scoreEdu, fieldScore) => {
    const targetExp = parseFloat(jobConfig.goldStandardBenchmark?.avgYearsExperience || 5);
    const cExp = targetExp > 0 ? Math.min((candidate.years_experience || 0) / targetExp, 1.5) * 6.6 : 6.6;
    const cSkill = (scoreSkill || 50) / 10.0;
    const cEdu = (scoreEdu || 50) / 10.0;
    const cField = (fieldScore !== undefined ? fieldScore : 50) / 10.0;

    const candValues = [cExp, cSkill, cEdu, cField];
    const avgValues = [6.6, 8.0, 8.0, 10.0];

    const width = 300;
    const height = 300;
    const cx = 150;
    const cy = 150;
    const rMax = 80;

    const getCoords = (values) => {
        return values.map((val, i) => {
            const angle = -Math.PI / 2 + (i * Math.PI / 2);
            const x = cx + (val / 10) * rMax * Math.cos(angle);
            const y = cy + (val / 10) * rMax * Math.sin(angle);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        }).join(' ');
    };

    const candPoints = getCoords(candValues);
    const avgPoints = getCoords(avgValues);

    let gridPolygons = '';
    const levels = [2.5, 5, 7.5, 10];
    levels.forEach(level => {
        const pts = [
            `${cx},${cy - (level / 10) * rMax}`,
            `${cx + (level / 10) * rMax},${cy}`,
            `${cx},${cy + (level / 10) * rMax}`,
            `${cx - (level / 10) * rMax},${cy}`
        ].join(' ');
        gridPolygons += `  <polygon points="${pts}" fill="none" stroke="#e2e8f0" stroke-width="1" />\n`;
    });

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
${gridPolygons}
  <line x1="${cx}" y1="${cy - rMax}" x2="${cx}" y2="${cy + rMax}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
  <line x1="${cx - rMax}" y1="${cy}" x2="${cx + rMax}" y2="${cy}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="2,2" />
  <polygon points="${avgPoints}" fill="#f59e0b" fill-opacity="0.05" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4" />
  <polygon points="${candPoints}" fill="#2563eb" fill-opacity="0.1" stroke="#2563eb" stroke-width="2" />
  <text x="${cx}" y="${cy - rMax - 10}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#475569">Experience</text>
  <text x="${cx + rMax + 8}" y="${cy + 4}" text-anchor="start" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#475569">Skills Match</text>
  <text x="${cx}" y="${cy + rMax + 18}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#475569">Degree Match</text>
  <text x="${cx - rMax - 8}" y="${cy + 4}" text-anchor="end" font-family="system-ui, sans-serif" font-size="10" font-weight="600" fill="#475569">Field Match</text>
</svg>`;

    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const getPrediction = async (candidateData, jobConfig) => {
    try {
        const defaultWeights = { experienceWeight: 40, skillsWeight: 40, educationWeight: 20 };
        const defaultBenchmark = { avgYearsExperience: 5, educationDegreeTarget: 'Bachelors', educationFieldTarget: '' };

        const config = jobConfig || {
            ...defaultWeights,
            goldStandardBenchmark: defaultBenchmark,
            skillsList: []
        };

        const w_exp   = parseFloat(config.experienceWeight  !== undefined ? config.experienceWeight  : 40);
        const w_skill = parseFloat(config.skillsWeight       !== undefined ? config.skillsWeight       : 40);
        const w_edu   = parseFloat(config.educationWeight    !== undefined ? config.educationWeight    : 20);

        const { scoreExp, scoreSkill, scoreEdu, explainability, skillEvidence, fieldScore, missingMustHaves } = calculateComponentScores(candidateData, config);

        let totalWeight = w_exp + w_skill + w_edu;
        if (totalWeight === 0) totalWeight = 100;

        const finalScore = (
            (scoreExp   * w_exp) +
            (scoreSkill * w_skill) +
            (scoreEdu   * w_edu)
        ) / totalWeight;

        const chartB64 = generateRadarChartSvg(candidateData, config, scoreSkill, scoreEdu, fieldScore);

        const analysis = (
            `Experience match: ${scoreExp.toFixed(0)}/100, ` +
            `Skills tag alignment: ${scoreSkill.toFixed(0)}/100, ` +
            `Education profile relevance: ${scoreEdu.toFixed(0)}/100.`
        );

        const duplicateFound    = candidateData.prediction?.duplicateFound    || false;
        const authenticityFlag  = candidateData.prediction?.authenticityFlag  || candidateData.is_keyword_stuffed || false;

        return {
            success_score:    Math.round(finalScore * 10) / 10,
            chart_base64:     chartB64,
            analysis:         analysis,
            explainability:   explainability,
            skillEvidence:    skillEvidence,
            duplicateFound:   duplicateFound,
            authenticityFlag: authenticityFlag,
            disqualified:     missingMustHaves.length > 0,
            missingMustHaves: missingMustHaves,
            debug_details:    { exp: scoreExp, skill: scoreSkill, edu: scoreEdu }
        };

    } catch (error) {
        console.error('ML prediction error:', error);
        return null;
    }
};

const tuneWeights = async (ratedCandidate, currentConfig) => {
    try {
        if (!ratedCandidate.hr_rating) {
            return null;
        }

        const candidateSkills = (ratedCandidate.skills || []).map(s => s.toLowerCase().trim());
        const skillsList = [...(currentConfig.skillsList || [])];
        const scaledRating = ratedCandidate.hr_rating * 10;

        let updated = false;

        skillsList.forEach((skill, idx) => {
            const normalizedTag = skill.tag.toLowerCase().trim();
            if (candidateSkills.includes(normalizedTag)) {
                const sampleSize = (skill.sampleSize || 0) + 1;
                const alpha = 0.1 / Math.sqrt(sampleSize);

                let newWeight = skill.weight + alpha * (scaledRating - skill.weight);

                if (skill.importance === 'Must-have') {
                    newWeight = Math.max(80, newWeight);
                }

                newWeight = Math.max(10, Math.min(100, newWeight));

                skillsList[idx] = {
                    ...(typeof skill.toObject === 'function' ? skill.toObject() : { ...skill }),
                    weight:     Math.round(newWeight),
                    sampleSize: sampleSize,
                    source:     'learned'
                };
                updated = true;
            }
        });

        return updated ? skillsList : null;

    } catch (error) {
        console.error('Weight calibration error:', error);
        return null;
    }
};

module.exports = { getPrediction, tuneWeights };
