// server/utils/resumeParser.js
const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (buffer) => {
    try {
        console.log(`🔍 PDF Parser received buffer of size: ${buffer.length} bytes`);
        
        const data = await pdfParse(buffer);
        
        if (!data || !data.text) {
            console.warn("⚠️ PDF Parsed, but no text content found.");
            return "";
        }
        
        // Basic cleanup of the text
        return data.text.trim();

    } catch (error) {
        console.error("❌ PDF LIBRARY ERROR:", error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
};

module.exports = { extractTextFromPDF };