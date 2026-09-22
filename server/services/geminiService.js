const { GoogleGenerativeAI } = require("@google/generative-ai");

const getClient = (apiKey) => {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (!key) {
        throw new Error('Gemini API key is not configured. Save one in the app or set GEMINI_API_KEY in server/.env.');
    }
    return new GoogleGenerativeAI(key);
};

const getPrompt = () => `
You are an expert ATS resume parser. Extract the following information from the resume and return it as strictly valid JSON.
IMPORTANT: Return ONLY the JSON object. Do not add markdown formatting (\`\`\`), code blocks, or any conversational text.

Fields to extract:
1. "name": Candidate's full name.
2. "email": Candidate's email.
3. "skills": Array of objects, each containing:
   - "tag": Normalized canonical name of the skill (e.g., lowercased, standard spelling: "react", "docker", "python", "kubernetes", "communication"). Do NOT leave variations like "ReactJS" or "react.js"; resolve them to "react".
   - "category": Categorize into one of: "Language", "Framework", "Tool", "Practice", "Soft-Skill".
4. "years_experience": Total years of experience (integer).
5. "education_degree": Inferred highest degree level achieved. Must be strictly one of: "PhD", "Masters", "Bachelors", "Associate", "None".
6. "education_field": Inferred primary field of study (e.g. "Computer Science", "Finance", "Biology"). Return empty string if none.
7. "skills_evidence": Array of objects showing verifiable evidence for the extracted skills:
   - "tag": Must match one of the tags from the "skills" array.
   - "quote": A direct quote or short context snippet from the resume proving this skill (e.g., "Led a team of 4 engineers using React to build...", "Wrote automated tests in Python..."). Focus on major tools/languages or soft-skills.
8. "summary": A professional 3-sentence summary of the candidate.
9. "is_keyword_stuffed": Set to true if the resume contains a long list/wall of 40+ disconnected skills without supporting text or career details.
`;

const parseResumeWithGemini = async (resumeTextOrBuffer, isBuffer = false, apiKey) => {
    const genAI = getClient(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = getPrompt();

    try {
        let result;
        if (isBuffer) {
            result = await model.generateContent([
                {
                    inlineData: {
                        data: resumeTextOrBuffer.toString('base64'),
                        mimeType: 'application/pdf'
                    }
                },
                prompt
            ]);
        } else {
            result = await model.generateContent(
                prompt + `\n\nResume Text:\n${resumeTextOrBuffer.substring(0, 15000)}`
            );
        }

        const response = await result.response;
        const text = response.text();

        let cleanText = text.replace(/```json/g, '').replace(/```/g, '');

        const firstBrace = cleanText.indexOf('{');
        const lastBrace  = cleanText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        } else {
            throw new Error("No JSON object found in Gemini response");
        }

        const parsed = JSON.parse(cleanText);

        if (parsed.skills && Array.isArray(parsed.skills)) {
            parsed.skills.forEach(s => {
                if (s.tag) s.tag = s.tag.toLowerCase().trim();
            });
        }
        if (parsed.skills_evidence && Array.isArray(parsed.skills_evidence)) {
            parsed.skills_evidence.forEach(se => {
                if (se.tag) se.tag = se.tag.toLowerCase().trim();
            });
        }

        return parsed;

    } catch (error) {
        console.error("Resume parsing failed:", error);
        throw new Error("Failed to parse resume with AI: " + error.message);
    }
};

const getSkillsWithEmbeddings = async (skills, apiKey) => {
    const genAI = getClient(apiKey);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const promises = (skills || []).map(async (skill) => {
        try {
            const trimmed = skill.toLowerCase().trim();
            const result = await model.embedContent(trimmed);
            return { tag: trimmed, embedding: result.embedding.values };
        } catch (err) {
            console.error(`Failed embedding for skill "${skill}":`, err.message);
            return { tag: skill, embedding: null };
        }
    });
    const results = await Promise.all(promises);
    return results.filter(item => item.embedding !== null);
};

module.exports = { parseResumeWithGemini, getSkillsWithEmbeddings };
