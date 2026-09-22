const SKILLS = [
    ['javascript', 'Language'], ['typescript', 'Language'], ['python', 'Language'],
    ['java', 'Language'], ['c++', 'Language'], ['c#', 'Language'], ['sql', 'Language'],
    ['react', 'Framework'], ['angular', 'Framework'], ['vue', 'Framework'], ['node.js', 'Framework'],
    ['express', 'Framework'], ['django', 'Framework'], ['flask', 'Framework'], ['spring', 'Framework'],
    ['mongodb', 'Tool'], ['mysql', 'Tool'], ['postgresql', 'Tool'], ['docker', 'Tool'],
    ['kubernetes', 'Tool'], ['aws', 'Tool'], ['azure', 'Tool'], ['git', 'Tool'],
    ['figma', 'Tool'], ['tableau', 'Tool'], ['power bi', 'Tool'], ['excel', 'Tool'],
    ['machine learning', 'Practice'], ['agile', 'Practice'], ['scrum', 'Practice'],
    ['communication', 'Soft-Skill'], ['leadership', 'Soft-Skill']
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parseResumeLocally = (text) => {
    const normalized = (text || '').replace(/\r/g, '');
    const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
    const email = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || '';
    const name = lines.find(line =>
        /^[A-Za-z][A-Za-z .'-]{2,60}$/.test(line) && !/@|resume|curriculum vitae/i.test(line)
    ) || 'Unknown Candidate';
    const years = normalized.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?experience/i)?.[1];

    const skills = SKILLS
        .filter(([skill]) => new RegExp(`(^|[^a-z])${escapeRegExp(skill)}([^a-z]|$)`, 'i').test(normalized))
        .map(([tag, category]) => ({ tag, category }));
    const skills_evidence = skills.map(({ tag }) => {
        const line = lines.find(value => new RegExp(escapeRegExp(tag), 'i').test(value));
        return { tag, quote: line || tag };
    });

    const education_degree = /\b(ph\.?d|doctorate)\b/i.test(normalized) ? 'PhD'
        : /\b(master|m\.s\.?|m\.tech|mba)\b/i.test(normalized) ? 'Masters'
        : /\b(bachelor|b\.s\.?|b\.tech|b\.e\.)\b/i.test(normalized) ? 'Bachelors'
        : /\bassociate\b/i.test(normalized) ? 'Associate' : 'None';
    const education_field = normalized.match(/(?:computer science|information technology|software engineering|data science|business administration|engineering)/i)?.[0] || '';

    return {
        name,
        email,
        skills,
        years_experience: Number(years || 0),
        education_degree,
        education_field,
        skills_evidence,
        summary: lines.slice(0, 3).join(' ').slice(0, 600),
        is_keyword_stuffed: false
    };
};

module.exports = { parseResumeLocally };
