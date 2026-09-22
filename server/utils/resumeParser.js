const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const extractResumeText = async (buffer, mimetype = '', filename = '') => {
    try {
        const isDocx = mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            || filename.toLowerCase().endsWith('.docx');

        if (isDocx) {
            const result = await mammoth.extractRawText({ buffer });
            return (result.value || '').trim();
        }

        const data = await pdfParse(buffer);

        if (!data || !data.text) {
            return "";
        }

        return data.text.trim();

    } catch (error) {
        console.error('PDF parse error:', error);
        throw new Error(`Failed to parse resume: ${error.message}`);
    }
};

module.exports = { extractResumeText, extractTextFromPDF: extractResumeText };
