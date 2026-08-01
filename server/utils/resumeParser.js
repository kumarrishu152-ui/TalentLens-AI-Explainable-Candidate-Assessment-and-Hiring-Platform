const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (buffer) => {
    try {
        const data = await pdfParse(buffer);

        if (!data || !data.text) {
            return "";
        }

        return data.text.trim();

    } catch (error) {
        console.error('PDF parse error:', error);
        throw new Error(`Failed to parse PDF: ${error.message}`);
    }
};

module.exports = { extractTextFromPDF };