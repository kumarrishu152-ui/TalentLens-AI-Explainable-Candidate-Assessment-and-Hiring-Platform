// server/controllers/candidateController.js

const Candidate = require('../models/Candidate');
const JobConfig = require('../models/JobConfig');
const User = require('../models/User'); 
const { extractTextFromPDF } = require('../utils/resumeParser');
const { parseResumeWithGemini } = require('../services/geminiService');
// Note: We are importing 'tuneWeights' here, which we will implement in the next step
const { getPrediction, tuneWeights } = require('../services/mlServiceBridge');
const { decrypt } = require('../utils/encryption'); 

// 1. Upload & Parse
exports.uploadResume = async (req, res) => {
    console.log("\n================================================");
    console.log("🚀 CONTROLLER: Upload Resume Request Started");
    console.log("================================================");
    
    try {
        if (!req.file) {
            console.warn("⚠️ No file uploaded in request.");
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        if (!req.user || !req.user.id) {
            console.warn("⚠️ Unauthorized upload attempt.");
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        console.log(`📄 Processing File: ${req.file.originalname} (${req.file.size} bytes)`);

        // Step 1: Extract Text
        console.log("⏳ [1/3] Extracting text from PDF...");
        const resumeText = await extractTextFromPDF(req.file.buffer);
        
        if (!resumeText || resumeText.length < 50) {
            throw new Error("Extracted text is too short. PDF might be an image/scan.");
        }

        // Step 2: AI Parse
        console.log("⏳ [2/3] Parsing text with Gemini AI...");
        const parsedData = await parseResumeWithGemini(resumeText);
        console.log("✅ AI Parsing successful.");

        // Step 3: Create Candidate
        console.log("⏳ [3/3] Saving candidate to MongoDB...");
        const newCandidate = new Candidate({
            ...parsedData,
            resume_text: resumeText,
            user: req.user.id 
        });

        await newCandidate.save();
        console.log(`✅ Candidate Created: ${newCandidate.name} (ID: ${newCandidate._id})`);
        console.log("================================================\n");

        res.status(201).json(newCandidate);

    } catch (error) {
        console.error("❌ UPLOAD CONTROLLER ERROR:");
        console.error(error); 
        console.log("================================================\n");
        
        res.status(500).json({ 
            error: error.message || 'Internal Server Error',
            details: error.toString() 
        });
    }
};

// 2. Trigger Prediction
exports.predictCandidate = async (req, res) => {
    console.log("\n================================================");
    console.log(`🔮 CONTROLLER: Prediction Requested (ID: ${req.params.id})`);
    console.log("================================================");

    try {
        // 1. Fetch Candidate
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) {
            console.warn("❌ Candidate not found or belongs to another user.");
            return res.status(404).json({ error: 'Candidate not found or access denied' });
        }
        console.log(`👤 Candidate Found: ${candidate.name}`);

        // 2. Fetch Active Job Configuration
        // FIX: Looking for 'userId' to ensure we find the config
        const activeConfig = await JobConfig.findOne({ 
            isActive: true, 
            userId: req.user.id 
        }).sort({ createdAt: -1 });
        
        if (activeConfig) {
            console.log(`⚙️  Active Job Config Found: "${activeConfig.jobTitle}"`);
            console.log(`   weights: ${JSON.stringify(activeConfig.scoringWeights)}`);
        } else {
            console.warn("⚠️  No Active Config Found. Using System Defaults.");
        }

        // 3. Fetch API Key (if exists)
        const user = await User.findById(req.user.id);
        let decryptedKey = null;
        if (user && user.geminiApiKey && user.geminiApiKey.content) {
            try {
                decryptedKey = decrypt(user.geminiApiKey);
                console.log("🔐 User API Key decrypted successfully.");
            } catch (err) {
                console.error("❌ Key Decryption Failed:", err.message);
            }
        }

        // 4. Call ML Service Bridge
        console.log("🚀 Invoking ML Service Bridge...");
        const predictionData = await getPrediction(candidate, activeConfig, decryptedKey);

        if (predictionData) {
            console.log("✅ ML Service Success. Updating Candidate record...");
            
            candidate.prediction = {
                success_score: predictionData.success_score,
                analysis: predictionData.analysis,
                chart_url: predictionData.chart_base64
            };
            
            await candidate.save();
            console.log("💾 Candidate updated with new prediction scores.");
        } else {
            console.error("❌ ML Service returned NULL. Skipping update.");
        }

        console.log("================================================\n");
        res.json(candidate);

    } catch (error) {
        console.error("❌ PREDICTION CONTROLLER ERROR:", error);
        console.log("================================================\n");
        res.status(500).json({ error: error.message });
    }
};

// 3. Rate Candidate & Trigger Tuning (New Feature)
exports.rateCandidate = async (req, res) => {
    console.log("\n================================================");
    console.log(`⭐ CONTROLLER: Rating Submitted for ID: ${req.params.id}`);
    console.log("================================================");

    try {
        const { rating } = req.body; // Expecting 1-10
        if (!rating || rating < 1 || rating > 10) {
            return res.status(400).json({ error: 'Invalid rating. Must be 1-10.' });
        }

        // 1. Update Candidate Rating
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        candidate.hr_rating = rating;
        await candidate.save();
        console.log(`✅ Rating saved: ${rating}/10 for ${candidate.name}`);

        // 2. CHECK TUNING BUFFER (Every 10 ratings)
        const ratedCount = await Candidate.countDocuments({ 
            user: req.user.id, 
            hr_rating: { $ne: null } 
        });

        console.log(`📊 Total Rated Candidates: ${ratedCount}`);

        if (ratedCount > 0 && ratedCount % 10 === 0) {
            console.log("\n⚡ TRAINING BUFFER FULL (10 New Ratings)");
            console.log("🧠 Initiating Model Fine-Tuning Sequence...");

            // Fetch the Training Data (Last 10 rated candidates)
            const trainingData = await Candidate.find({ 
                user: req.user.id, 
                hr_rating: { $ne: null } 
            })
            .sort({ updatedAt: -1 })
            .limit(10);

            // Fetch Active Config
            const config = await JobConfig.findOne({ 
                userId: req.user.id, 
                isActive: true 
            });

            if (config && tuneWeights) {
                // Call the ML Bridge to calculate optimized weights
                const newWeights = await tuneWeights(trainingData, config);
                
                if (newWeights) {
                    console.log("⚖️  Old Weights:", config.scoringWeights);
                    
                    // Update the Config with the AI's suggested weights
                    config.scoringWeights = {
                        ...config.scoringWeights.toObject(),
                        ...newWeights
                    };
                    await config.save();
                    
                    console.log("✅ New AI-Optimized Weights Saved:", config.scoringWeights);
                } else {
                    console.warn("⚠️ Tuning Service returned no changes.");
                }
            } else {
                console.warn("⚠️ Cannot Tune: No Active Config found or Bridge missing.");
            }
        }

        console.log("================================================\n");
        res.json(candidate);

    } catch (error) {
        console.error("❌ RATING CONTROLLER ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

// 4. Get All Candidates
exports.getAllCandidates = async (req, res) => {
    try {
        if (!req.user || !req.user.id) return res.status(401).json({ error: 'Unauthorized' });
        
        const candidates = await Candidate.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json(candidates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 5. Get Single Candidate
exports.getCandidateById = async (req, res) => {
    try {
        const candidate = await Candidate.findOne({ _id: req.params.id, user: req.user.id });
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
        
        res.json(candidate);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// 6. Delete Candidate
exports.deleteCandidate = async (req, res) => {
    try {
        console.log(`🗑️ Deleting candidate: ${req.params.id}`);
        const candidate = await Candidate.findOneAndDelete({ _id: req.params.id, user: req.user.id });
        
        if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

        res.json({ message: 'Candidate deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};