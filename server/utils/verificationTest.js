const QUESTION_BANK = {
    javascript: {
        question: 'Which JavaScript feature lets an async function wait for a Promise to settle?',
        options: ['await', 'yield', 'defer', 'callback'], answer: 0
    },
    typescript: {
        question: 'What is TypeScript primarily designed to add to JavaScript?',
        options: ['Static type checking', 'A browser runtime', 'Database queries', 'CSS styling'], answer: 0
    },
    react: {
        question: 'Which React hook is used to keep state in a function component?',
        options: ['useState', 'useEffect', 'useMemo', 'useRef'], answer: 0
    },
    'node.js': {
        question: 'What enables Node.js to handle many I/O operations without blocking the main thread?',
        options: ['The event loop', 'A DOM renderer', 'A SQL compiler', 'CSS modules'], answer: 0
    },
    node: {
        question: 'What enables Node.js to handle many I/O operations without blocking the main thread?',
        options: ['The event loop', 'A DOM renderer', 'A SQL compiler', 'CSS modules'], answer: 0
    },
    python: {
        question: 'Which Python construct is commonly used to create a concise list from an iterable?',
        options: ['A list comprehension', 'A CSS selector', 'A callback queue', 'A schema migration'], answer: 0
    },
    java: {
        question: 'What does the JVM provide for a Java application?',
        options: ['A runtime that executes bytecode', 'A web browser', 'A source-control repository', 'A CSS preprocessor'], answer: 0
    },
    sql: {
        question: 'Which SQL clause filters rows before grouping?',
        options: ['WHERE', 'HAVING', 'ORDER BY', 'JOIN'], answer: 0
    },
    mongodb: {
        question: 'MongoDB stores records primarily as which structure?',
        options: ['BSON documents', 'CSV rows only', 'Java bytecode', 'HTML elements'], answer: 0
    },
    docker: {
        question: 'What is a Docker image?',
        options: ['A blueprint used to create containers', 'A running virtual machine only', 'A source-control branch', 'A database table'], answer: 0
    },
    kubernetes: {
        question: 'Which Kubernetes object is commonly used to maintain a desired number of Pod replicas?',
        options: ['Deployment', 'ConfigMap', 'Namespace', 'Ingress'], answer: 0
    },
    git: {
        question: 'Which Git command records staged changes in the local repository?',
        options: ['git commit', 'git clone', 'git fetch', 'git checkout'], answer: 0
    },
    aws: {
        question: 'Which AWS service provides virtual servers in the cloud?',
        options: ['EC2', 'S3', 'Route 53', 'CloudFront'], answer: 0
    }
};

const genericQuestion = (skill) => ({
    skill,
    question: `Which response best verifies hands-on experience with ${skill}?`,
    options: [
        'Explaining a specific project decision, trade-off, and outcome',
        'Repeating the skill name from a resume',
        'Saying the skill is popular',
        'Naming an unrelated technology'
    ],
    correctAnswer: 0
});

exports.buildVerificationQuestions = (skills = []) => {
    const distinctSkills = [...new Set(skills.map(skill => String(skill).trim()).filter(Boolean))].slice(0, 5);
    const questions = distinctSkills.map(skill => {
        const template = QUESTION_BANK[skill.toLowerCase()];
        return template
            ? { skill, question: template.question, options: template.options, correctAnswer: template.answer }
            : genericQuestion(skill);
    });

    return questions.length ? questions : [genericQuestion('the experience claimed in this resume')];
};
