const axios = require('axios');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

// 1. Get Prediction (Existing)
const getPrediction = async (candidateData, jobConfig, apiKey) => {
    console.log("\n========================================================");
    console.log("🔗 ML BRIDGE: Initiating Prediction Request");
    console.log("========================================================");

    try {
        // Prepare Defaults
        const defaultWeights = { experienceWeight: 30, skillsWeight: 40, educationWeight: 20, prevCompanyWeight: 10 };
        const defaultBenchmark = { avgYearsExperience: 5, educationTierTarget: 2 };

        // Construct Payload
        const payload = {
            candidate: {
                years_exp: candidateData.years_experience || 0,
                skill_score: candidateData.skills ? Math.min(candidateData.skills.length, 10) : 5, 
                education_tier: candidateData.education_tier || 2,
                prev_companies_tier: 2
            },
            config: {
                scoringWeights: jobConfig && jobConfig.scoringWeights ? jobConfig.scoringWeights : defaultWeights,
                goldStandardBenchmark: jobConfig && jobConfig.goldStandardBenchmark ? jobConfig.goldStandardBenchmark : defaultBenchmark
            },
            api_key: apiKey || null
        };

        const requestUrl = `${ML_BASE_URL}/predict`;
        console.log(`🔍 DEBUG: Calling URL -> ${requestUrl}`);

        // Send Request
        const response = await axios.post(`${ML_BASE_URL}/predict`, payload, { timeout: 10000 });

        console.log("✅ ML Service Response Received");
        return response.data;

    } catch (error) {
        console.error("❌ ML BRIDGE PREDICT ERROR:", error.message);
        return null; 
    }
};

// 2. Tune Weights
const tuneWeights = async (trainingData, currentConfig) => {
    console.log("\n========================================================");
    console.log("🧠 ML BRIDGE: Initiating Fine-Tuning Sequence");
    console.log("========================================================");

    try {
        // Format the training data for Python (Extract features + target rating)
        const candidatesPayload = trainingData.map(c => ({
            years_exp: c.years_experience || 0,
            skill_score: c.skills ? Math.min(c.skills.length, 10) : 5,
            education_tier: c.education_tier || 2,
            rating: c.hr_rating // This is the 'y' (target) for the regression
        }));

        const payload = {
            candidates: candidatesPayload,
            current_benchmark: currentConfig.goldStandardBenchmark || { avgYearsExperience: 5, educationTierTarget: 2 }
        };

        console.log(`📤 Sending ${candidatesPayload.length} rated candidates to Python for learning...`);

        // Call the new /fine_tune endpoint
        const response = await axios.post(`${ML_BASE_URL}/fine_tune`, payload, { timeout: 15000 });

        if (response.data && response.data.new_weights) {
            console.log("✨ AI Optimization Complete. New Weights Received:");
            console.log(response.data.new_weights);
            console.log("========================================================\n");
            return response.data.new_weights;
        }

        return null;

    } catch (error) {
        console.error("❌ ML BRIDGE TUNING ERROR:", error.message);
        if(error.response) console.error("   Details:", error.response.data);
        return null;
    }
};

module.exports = { getPrediction, tuneWeights };