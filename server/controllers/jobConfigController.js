const JobConfig = require('../models/JobConfig');
const { extractTextFromPDF }    = require('../utils/resumeParser');
const { getGeminiApiKey } = require('../utils/geminiKey');
const { parseResumeWithGemini, getSkillsWithEmbeddings } = require('../services/geminiService');

const getImportanceWeight = (importance) => {
    switch (importance) {
        case 'Must-have':    return 100;
        case 'Important':    return 50;
        case 'Nice-to-have': return 20;
        default:             return 50;
    }
};

exports.createJobConfig = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let configData = {};
        try {
            if (req.body.config) {
                configData = typeof req.body.config === 'string' ? JSON.parse(req.body.config) : req.body.config;
            } else {
                configData = req.body;
            }
        } catch (e) {
            throw new Error("Invalid JSON in config data");
        }

        const experienceWeight = parseInt(configData.experienceWeight) || 40;
        const skillsWeight     = parseInt(configData.skillsWeight)     || 40;
        const educationWeight  = parseInt(configData.educationWeight)  || 20;

        const finalSkillsList = (configData.manualSkills || []).map(s => ({
            tag:        s.tag.toLowerCase().trim(),
            category:   s.category   || 'Tool',
            importance: s.importance || 'Important',
            weight:     s.weight !== undefined ? s.weight : getImportanceWeight(s.importance),
            source:     s.source     || 'manual',
            sampleSize: s.sampleSize || 0
        }));

        try {
            const tagsToEmbed = finalSkillsList.map(s => s.tag);
            const geminiApiKey = await getGeminiApiKey(req.user.id);
            const embeddedList = await getSkillsWithEmbeddings(tagsToEmbed, geminiApiKey);
            finalSkillsList.forEach(s => {
                const match = embeddedList.find(e => e.tag === s.tag);
                if (match) s.embedding = match.embedding;
            });
        } catch (err) {
            console.error("Failed to generate job config skill embeddings:", err);
        }

        await JobConfig.updateMany({ userId: req.user.id }, { isActive: false });

        const newConfig = new JobConfig({
            userId:          req.user.id,
            jobTitle:        configData.jobTitle,
            minExperience:   parseInt(configData.minExperience) || 0,
            targetDegree:    configData.targetDegree || 'Bachelors',
            targetField:     configData.targetField  || '',
            salary:          configData.salary || configData.salaryRange || '₹18L - ₹30L',
            location:        configData.location || 'Remote / Flexible',
            jobType:         configData.jobType || 'Full-time',
            experienceWeight,
            skillsWeight,
            educationWeight,
            skillsList:      finalSkillsList,
            goldStandardBenchmark: configData.goldStandardBenchmark || {
                avgYearsExperience:   5,
                topSkills:            [],
                educationDegreeTarget: 'Bachelors',
                educationFieldTarget:  ''
            },
            isActive: true
        });

        await newConfig.save();
        res.status(201).json(newConfig);

    } catch (error) {
        console.error('Job config creation error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getActiveConfig = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const config = await JobConfig.findOne({
            isActive: true,
            userId:   req.user.id
        }).sort({ createdAt: -1 });

        res.json(config || null);
    } catch (error) {
        console.error('Error fetching active config:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getPublicJobs = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const configs = await JobConfig.find({ isActive: true })
            .sort({ createdAt: -1 })
            .populate('userId', 'username')
            .lean();

        const jobs = configs.map((config) => {
            const skillTags = (config.skillsList || []).slice(0, 6).map(s => s.tag).filter(Boolean);
            const roleName = config.jobTitle || 'Open Role';
            const companyLabel = config.userId && config.userId.username ? `${config.userId.username} Hiring` : 'Hiring Team';
            const salaryRange = config.salary || config.salaryRange || '₹18L - ₹30L';
            const location = config.location || 'Remote / Flexible';
            const jobType = config.jobType || 'Full-time';
            const requirements = [...new Set([
                ...(config.minExperience ? [`Minimum ${config.minExperience}+ years of experience`] : []),
                ...(config.targetDegree && config.targetDegree !== 'None' ? [`Degree preference: ${config.targetDegree}`] : []),
                ...(config.targetField ? [`Field preference: ${config.targetField}`] : []),
                ...skillTags.slice(0, 4).map(tag => `Experience with ${tag}`)
            ])].slice(0, 4);

            return {
                _id: config._id,
                role: roleName,
                company: companyLabel,
                type: jobType,
                match: 'New role',
                location,
                salary: salaryRange,
                tags: skillTags.length ? skillTags : ['Product', 'Collaboration', 'Execution'],
                aiInsight: `${roleName} is configured to prioritize ${skillTags.slice(0, 3).join(', ') || 'core product and execution skills'} for screening.`,
                description: `We are hiring for ${roleName}. This opportunity is opened and configured by the recruiter team with role-specific filters and skill priorities.`,
                requirements,
                hiringManager: config.userId && config.userId.username ? config.userId.username : 'Hiring Team',
                responseTime: '2-5 days',
                createdAt: config.createdAt
            };
        });

        res.json(jobs);
    } catch (error) {
        console.error('Error fetching public jobs:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.updateJobConfig = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const config = await JobConfig.findOne({
            isActive: true,
            userId:   req.user.id
        }).sort({ createdAt: -1 });

        if (!config) {
            return res.status(404).json({ error: 'No active job configuration found' });
        }

        config.versionHistory.push({
            timestamp:        new Date(),
            experienceWeight: config.experienceWeight,
            skillsWeight:     config.skillsWeight,
            targetDegree:     config.targetDegree,
            targetField:      config.targetField,
            skillsList:       config.skillsList.map(s => ({
                tag:        s.tag,
                category:   s.category,
                weight:     s.weight,
                importance: s.importance,
                source:     s.source,
                sampleSize: s.sampleSize
            }))
        });

        const { experienceWeight, skillsWeight, educationWeight, targetDegree, targetField, skillsList, minExperience } = req.body;

        if (experienceWeight !== undefined) config.experienceWeight = experienceWeight;
        if (skillsWeight     !== undefined) config.skillsWeight     = skillsWeight;
        if (educationWeight  !== undefined) config.educationWeight  = educationWeight;
        if (targetDegree     !== undefined) config.targetDegree     = targetDegree;
        if (targetField      !== undefined) config.targetField      = targetField;
        if (minExperience    !== undefined) config.minExperience    = minExperience;

        if (skillsList !== undefined) {
            const mappedSkills = skillsList.map(s => ({
                tag:        s.tag.toLowerCase().trim(),
                category:   s.category   || 'Tool',
                importance: s.importance || 'Important',
                weight:     s.weight !== undefined ? s.weight : getImportanceWeight(s.importance),
                source:     s.source     || 'manual',
                sampleSize: s.sampleSize || 0,
                embedding:  s.embedding
            }));

            try {
                const toEmbed = mappedSkills.filter(s => !s.embedding || s.embedding.length === 0);
                if (toEmbed.length > 0) {
                    const tagsToEmbed = toEmbed.map(s => s.tag);
                    const geminiApiKey = await getGeminiApiKey(req.user.id);
                    const embeddedList = await getSkillsWithEmbeddings(tagsToEmbed, geminiApiKey);
                    mappedSkills.forEach(s => {
                        const match = embeddedList.find(e => e.tag === s.tag);
                        if (match) s.embedding = match.embedding;
                    });
                }
            } catch (err) {
                console.error("Failed to generate job config update skill embeddings:", err);
            }

            config.skillsList = mappedSkills;
        }

        await config.save();
        res.json(config);

    } catch (error) {
        console.error('Job config update error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.rollbackJobConfig = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const config = await JobConfig.findOne({
            isActive: true,
            userId:   req.user.id
        }).sort({ createdAt: -1 });

        if (!config) {
            return res.status(404).json({ error: 'No active job configuration found' });
        }

        if (!config.versionHistory || config.versionHistory.length === 0) {
            return res.status(400).json({ error: 'No version history available for rollback' });
        }

        const previous = config.versionHistory.pop();

        config.experienceWeight = previous.experienceWeight;
        config.skillsWeight     = previous.skillsWeight;
        config.targetDegree     = previous.targetDegree;
        config.targetField      = previous.targetField;
        config.skillsList       = previous.skillsList;

        await config.save();
        res.json({ message: 'Rollback successful', config });

    } catch (error) {
        console.error('Config rollback error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.parseBenchmarks = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.json({
                avgYearsExperience:    5,
                educationDegreeTarget: 'Bachelors',
                educationFieldTarget:  '',
                skills:                []
            });
        }

        let totalExp = 0;
        const geminiApiKey = await getGeminiApiKey(req.user.id);
        let fileCount = 0;
        const skillFrequencies = {};
        const skillCategories  = {};
        const degreeCounts     = {};
        const fieldCounts      = {};

        for (const file of req.files) {
            try {
                const text = await extractTextFromPDF(file.buffer);
                let parsed = null;

                if (!text || text.length < 50) {
                    parsed = await parseResumeWithGemini(file.buffer, true, geminiApiKey);
                } else {
                    parsed = await parseResumeWithGemini(text, false, geminiApiKey);
                }

                totalExp += parsed.years_experience || 0;

                const deg = parsed.education_degree || 'Bachelors';
                degreeCounts[deg] = (degreeCounts[deg] || 0) + 1;

                if (parsed.education_field) {
                    const field = parsed.education_field.trim();
                    fieldCounts[field] = (fieldCounts[field] || 0) + 1;
                }

                if (parsed.skills && Array.isArray(parsed.skills)) {
                    parsed.skills.forEach(s => {
                        if (s.tag) {
                            const tag = s.tag.toLowerCase().trim();
                            skillFrequencies[tag] = (skillFrequencies[tag] || 0) + 1;
                            skillCategories[tag]  = s.category || 'Tool';
                        }
                    });
                }
                fileCount++;
            } catch (err) {
                console.error(`Failed to parse benchmark file "${file.originalname}":`, err.message);
            }
        }

        const avgExp = fileCount > 0 ? Math.round(totalExp / fileCount) : 5;

        let benchmarkDegree = 'Bachelors';
        let maxDegreeCount  = 0;
        Object.entries(degreeCounts).forEach(([deg, count]) => {
            if (count > maxDegreeCount) { benchmarkDegree = deg; maxDegreeCount = count; }
        });

        let benchmarkField = '';
        let maxFieldCount  = 0;
        Object.entries(fieldCounts).forEach(([field, count]) => {
            if (count > maxFieldCount) { benchmarkField = field; maxFieldCount = count; }
        });

        const benchmarkSkills = [];
        Object.entries(skillFrequencies).forEach(([tag, freq]) => {
            const pct = (freq / (fileCount || 1)) * 100;
            if (pct >= 25) {
                benchmarkSkills.push({
                    tag,
                    category:   skillCategories[tag] || 'Tool',
                    importance: pct >= 75 ? 'Must-have' : (pct >= 50 ? 'Important' : 'Nice-to-have'),
                    weight:     Math.round(pct),
                    source:     'benchmark',
                    sampleSize: 0
                });
            }
        });

        res.json({
            avgYearsExperience:    avgExp,
            educationDegreeTarget: benchmarkDegree,
            educationFieldTarget:  benchmarkField,
            skills:                benchmarkSkills
        });

    } catch (error) {
        console.error('Benchmark parse error:', error);
        res.status(500).json({ error: error.message });
    }
};
