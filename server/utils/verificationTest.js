const QUESTION_BANK = {
    javascript: {
        question: 'Which JavaScript feature lets an async function wait for a Promise to settle?',
        options: ['await', 'yield', 'defer', 'callback'],
        correctAnswer: 0
    },
    typescript: {
        question: 'What is TypeScript primarily designed to add to JavaScript?',
        options: ['Static type checking', 'A browser runtime', 'Database queries', 'CSS styling'],
        correctAnswer: 0
    },
    react: {
        question: 'Which React hook is used to keep state in a function component?',
        options: ['useState', 'useEffect', 'useMemo', 'useRef'],
        correctAnswer: 0
    },
    'node.js': {
        question: 'What enables Node.js to handle many I/O operations without blocking the main thread?',
        options: ['The event loop', 'A DOM renderer', 'A SQL compiler', 'CSS modules'],
        correctAnswer: 0
    },
    node: {
        question: 'What enables Node.js to handle many I/O operations without blocking the main thread?',
        options: ['The event loop', 'A DOM renderer', 'A SQL compiler', 'CSS modules'],
        correctAnswer: 0
    },
    python: {
        question: 'Which Python construct is commonly used to create a concise list from an iterable?',
        options: ['A list comprehension', 'A CSS selector', 'A callback queue', 'A schema migration'],
        correctAnswer: 0
    },
    java: {
        question: 'What does the JVM provide for a Java application?',
        options: ['A runtime that executes bytecode', 'A web browser', 'A source-control repository', 'A CSS preprocessor'],
        correctAnswer: 0
    },
    sql: {
        question: 'Which SQL clause filters rows before grouping?',
        options: ['WHERE', 'HAVING', 'ORDER BY', 'JOIN'],
        correctAnswer: 0
    },
    mongodb: {
        question: 'MongoDB stores records primarily as which structure?',
        options: ['BSON documents', 'CSV rows only', 'Java bytecode', 'HTML elements'],
        correctAnswer: 0
    },
    docker: {
        question: 'What is a Docker image?',
        options: ['A blueprint used to create containers', 'A running virtual machine only', 'A source-control branch', 'A database table'],
        correctAnswer: 0
    },
    kubernetes: {
        question: 'Which Kubernetes object is commonly used to maintain a desired number of Pod replicas?',
        options: ['Deployment', 'ConfigMap', 'Namespace', 'Ingress'],
        correctAnswer: 0
    },
    git: {
        question: 'Which Git command records staged changes in the local repository?',
        options: ['git commit', 'git clone', 'git fetch', 'git checkout'],
        correctAnswer: 0
    },
    aws: {
        question: 'Which AWS service provides virtual servers in the cloud?',
        options: ['EC2', 'S3', 'Route 53', 'CloudFront'],
        correctAnswer: 0
    },
    css: {
        question: 'Which CSS property is used to create flexible layouts with rows and columns?',
        options: ['display: flex', 'background-size', 'position: static', 'font-family'],
        correctAnswer: 0
    },
    html: {
        question: 'Which HTML element is best suited for a reusable button that submits a form?',
        options: ['button', 'div', 'span', 'label'],
        correctAnswer: 0
    }
};

const NON_CS_QUESTION_BANK = [
    {
        skill: 'Communication',
        question: 'A customer is upset because a promised delivery date slipped. What is the most professional first response?',
        options: [
            'Acknowledge the issue, apologize, and explain the next steps with a revised timeline',
            'Blame the internal team and avoid discussing the delay',
            'Ignore the complaint and wait for them to contact support again',
            'Ask the customer to stop emailing and call back later'
        ],
        correctAnswer: 0
    },
    {
        skill: 'Customer Success',
        question: 'Which action best shows ownership in customer success?',
        options: [
            'Proactively tracking adoption risks and coordinating follow-ups before the customer escalates',
            'Waiting until the customer complains before checking usage',
            'Sending generic monthly emails without review',
            'Only contacting the customer at renewal time'
        ],
        correctAnswer: 0
    },
    {
        skill: 'Sales',
        question: 'What is the best way to qualify a sales lead quickly?',
        options: [
            'Understand the buyer’s problem, urgency, budget, and decision process',
            'Pitch the product before asking any questions',
            'Assume every lead is a fit for the same offer',
            'Focus only on the customer’s title without discussing their goals'
        ],
        correctAnswer: 0
    },
    {
        skill: 'Project Management',
        question: 'When multiple team members are blocked by a dependency, what is the best next step?',
        options: [
            'Clarify the blocker, map the dependency, and re-sequence work so delivery stays on track',
            'Ask each person to work harder without changing the plan',
            'Ignore the issue until the deadline is closer',
            'Move the work to a separate team without informing stakeholders'
        ],
        correctAnswer: 0
    },
    {
        skill: 'Operations',
        question: 'Which metric is most useful for measuring process efficiency?',
        options: [
            'Cycle time and throughput against the target SLA',
            'Only the number of emails sent',
            'The color of the dashboard background',
            'How often team members log in'
        ],
        correctAnswer: 0
    }
];

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

const buildSkillsQuestions = (skills = []) => {
    const normalizedSkills = [...new Set(skills.map(skill => String(skill).trim()).filter(Boolean).map(skill => skill.toLowerCase()))];
    const questionList = [];

    for (const skill of normalizedSkills) {
        const template = QUESTION_BANK[skill];
        if (template) {
            questionList.push({ skill, ...template });
        }
    }

    if (questionList.length < 7) {
        const nonCsFallback = NON_CS_QUESTION_BANK.filter(question => !normalizedSkills.some(skill => question.skill.toLowerCase() === skill));
        const needed = 7 - questionList.length;
        const extra = nonCsFallback.slice(0, Math.max(0, needed));
        questionList.push(...extra);
    }

    return questionList.slice(0, 10);
};

exports.buildVerificationQuestions = (skills = []) => {
    const hasTechSkills = (skills || []).some(skill => {
        const value = String(skill).trim().toLowerCase();
        return ['javascript', 'react', 'node.js', 'node', 'python', 'java', 'sql', 'mongodb', 'docker', 'git', 'aws', 'typescript', 'html', 'css'].includes(value);
    });

    const derivedQuestions = buildSkillsQuestions(skills);

    if (derivedQuestions.length >= 10) {
        return derivedQuestions;
    }

    const fallback = [...derivedQuestions];
    for (const item of NON_CS_QUESTION_BANK) {
        if (!fallback.some(question => question.skill === item.skill)) {
            fallback.push(item);
        }
        if (fallback.length >= 10) break;
    }

    while (fallback.length < 10) {
        const skillName = hasTechSkills ? 'technical execution' : 'the experience claimed in this resume';
        fallback.push(genericQuestion(skillName));
    }

    return fallback.slice(0, 10);
};
