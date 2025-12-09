// server/services/geminiService.js

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Verify API Key existence
if (!process.env.GEMINI_API_KEY) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is missing in .env file");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseResumeWithGemini = async (resumeText) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are an expert ATS resume parser. Extract the following information from the resume text below and return it as strictly valid JSON.
    IMPORTANT: Return ONLY the JSON object. Do not add markdown formatting (\`\`\`), code blocks, or any conversational text.
    
    Fields to extract:
    1. "name": Candidate's full name.
    2. "email": Candidate's email.
    3. "skills": Array of technical skills (strings).
    4. "years_experience": Total years of experience (integer).
    5. "education_tier": Infer a tier (1, 2, or 3) based on university prestige (1 is Ivy League/Top Tier, 2 is Standard, 3 is Unknown/Low). Default to 2 if unsure.
    6. "summary": A professional 3-sentence summary of the candidate.

    Resume Text:
    ${resumeText.substring(0, 15000)} 
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log("🤖 Raw Gemini Response:", text.substring(0, 200) + "..."); // Log first 200 chars

        // --- ROBUST CLEANUP LOGIC ---
        // 1. Remove markdown code blocks if present
        let cleanText = text.replace(/```json/g, '').replace(/```/g, '');
        
        // 2. Find the first '{' and last '}' to isolate the JSON object
        // This handles cases where Gemini says "Here is the JSON: { ... }"
        const firstBrace = cleanText.indexOf('{');
        const lastBrace = cleanText.lastIndexOf('}');
        
        if (firstBrace !== -1 && lastBrace !== -1) {
            cleanText = cleanText.substring(firstBrace, lastBrace + 1);
        } else {
            throw new Error("No JSON object found in Gemini response");
        }

        return JSON.parse(cleanText);

    } catch (error) {
        console.error("❌ Gemini Parsing Failed. Error Details:", error);
        
        // If it was a JSON parse error, it means the cleaning logic failed or Gemini returned garbage.
        if (error instanceof SyntaxError) {
             console.error("⚠️ JSON Syntax Error. This usually means Gemini returned invalid JSON.");
        }
        
        throw new Error("Failed to parse resume with AI: " + error.message);
    }
};

module.exports = { parseResumeWithGemini };