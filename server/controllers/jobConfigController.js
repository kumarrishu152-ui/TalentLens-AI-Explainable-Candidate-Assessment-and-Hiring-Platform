const JobConfig = require('../models/JobConfig');
const { extractTextFromPDF } = require('../utils/resumeParser');
const { parseResumeWithGemini } = require('../services/geminiService');

// 1. Create & Train New Job Config
exports.createJobConfig = async (req, res) => {
    console.log("\n========================================================");
    console.log("🛠️  JOB CONFIG: Creation & Training Started");
    console.log("========================================================");

    try {
        // 1. Authentication Check
        if (!req.user || !req.user.id) {
            console.warn("⚠️  Unauthorized attempt to create job config.");
            return res.status(401).json({ error: 'Unauthorized: User not found' });
        }

        // 2. Parse Form Data
        let configData = {};
        try {
            configData = JSON.parse(req.body.config);
            console.log(`📋 Job Title: "${configData.jobTitle}"`);
            console.log(`⚙️  User Preferences:`, configData);
        } catch (e) {
            throw new Error("Invalid JSON in 'config' field");
        }

        // 3. Normalize Weights
        const weights = {
            experienceWeight: parseInt(configData.experienceWeight) || 30,
            skillsWeight: parseInt(configData.skillsWeight) || 40,
            educationWeight: parseInt(configData.educationWeight) || 20,
            prevCompanyWeight: 10 
        };

        // 4. TRAINING PHASE: Process Benchmark Files
        let totalExp = 0;
        let totalEducation = 0;
        let fileCount = 0;
        let collectedSkills = new Set(); 

        if (req.files && req.files.length > 0) {
            console.log(`\n📂 PROCESSING ${req.files.length} BENCHMARK RESUMES (TRAINING MODEL)...`);
            
            for (const [index, file] of req.files.entries()) {
                console.log(`   📄 [${index + 1}/${req.files.length}] Reading "${file.originalname}"...`);
                
                try {
                    const text = await extractTextFromPDF(file.buffer);
                    if (!text || text.length < 50) {
                        console.warn(`      ⚠️ Skipping file (Text too short/unreadable)`);
                        continue;
                    }

                    const parsed = await parseResumeWithGemini(text);
                    
                    const exp = parsed.years_experience || 0;
                    const tier = parsed.education_tier || 2;
                    
                    console.log(`      ✅ Parsed: ${exp} yrs exp, Tier ${tier} Edu`);

                    totalExp += exp;
                    totalEducation += tier;
                    
                    if (parsed.skills && Array.isArray(parsed.skills)) {
                        parsed.skills.forEach(s => collectedSkills.add(s));
                    }
                    
                    fileCount++;

                } catch (err) {
                    console.error(`      ❌ Failed to parse file: ${err.message}`);
                }
            }
        } else {
            console.log("\n⚠️  No benchmark files uploaded. Using industry defaults.");
        }

        // 5. Calculate "Gold Standard" Averages
        const avgExp = fileCount > 0 ? Math.round(totalExp / fileCount) : 5;
        const avgEdu = fileCount > 0 ? Math.round(totalEducation / fileCount) : 2; 
        const topSkills = Array.from(collectedSkills).slice(0, 10);

        const benchmark = {
            avgYearsExperience: avgExp,
            educationTierTarget: avgEdu,
            topSkills: topSkills
        };

        console.log("\n🏆 NEW GOLD STANDARD ESTABLISHED:");
        console.log(`   - Target Experience: ${avgExp} years`);
        console.log(`   - Target Education Tier: ${avgEdu}`);
        console.log(`   - Skills Pool Size: ${collectedSkills.size}`);

        // 6. Deactivate Previous Configs
        await JobConfig.updateMany({ userId: req.user.id }, { isActive: false });
        console.log("🔄 Deactivated old job configurations.");

        // 7. Save to Database
        // FIX: Using 'userId' to match the Schema
        const newConfig = new JobConfig({
            userId: req.user.id,
            jobTitle: configData.jobTitle,
            scoringWeights: weights,
            hardFilters: {
                minExperience: parseInt(configData.minExperience) || 0,
                requireTier1College: configData.tier1Only || false
            },
            goldStandardBenchmark: benchmark,
            isActive: true
        });

        await newConfig.save();
        console.log(`✅ Job Config Saved (ID: ${newConfig._id})`);
        console.log("========================================================\n");

        res.status(201).json(newConfig);

    } catch (error) {
        console.error("❌ CRITICAL ERROR IN JOB SETUP:");
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// 2. Get Active Config
exports.getActiveConfig = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // FIX: Query by 'userId'
        const config = await JobConfig.findOne({ 
            isActive: true, 
            userId: req.user.id 
        }).sort({ createdAt: -1 });
        
        res.json(config || null);
    } catch (error) {
        console.error("Error fetching active config:", error);
        res.status(500).json({ error: error.message });
    }
};

// 3. Update Active Config
exports.updateJobConfig = async (req, res) => {
    console.log("\n========================================================");
    console.log("🛠️  JOB CONFIG: Update Request Received");
    console.log("========================================================");

    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { scoringWeights, hardFilters } = req.body;

        // FIX: Query by 'userId'
        const config = await JobConfig.findOne({ 
            isActive: true, 
            userId: req.user.id 
        }).sort({ createdAt: -1 });

        if (!config) {
            return res.status(404).json({ error: 'No active job configuration found' });
        }

        if (scoringWeights) {
            console.log("⚖️ Updating Weights:", scoringWeights);
            // Merge gracefully
            config.scoringWeights = {
                ...config.scoringWeights.toObject(),
                ...scoringWeights
            };
        }

        if (hardFilters) {
             console.log("🛡️ Updating Hard Filters:", hardFilters);
             config.hardFilters = {
                 ...config.hardFilters.toObject(),
                 ...hardFilters
             };
        }

        await config.save();
        console.log("✅ Job Config Updated Successfully");
        console.log("========================================================\n");

        res.json(config);

    } catch (error) {
        console.error("❌ Error updating config:", error);
        res.status(500).json({ error: error.message });
    }
};