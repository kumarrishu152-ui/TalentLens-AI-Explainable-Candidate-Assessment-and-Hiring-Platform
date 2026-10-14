const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parseQuestionsJson, generateAssessmentQuestions, generateAgentReply, parseInterviewJson, runInterviewTurn } = require('./geminiService');

test('parseQuestionsJson accepts Gemini fenced JSON and normalizes question fields', () => {
  const questions = parseQuestionsJson('```json\n{"questions":[{"question":"What is a closure?","options":["A","B","C","D"],"correctAnswer":2}]}\n```');
  assert.equal(questions.length, 1);
  assert.equal(questions[0].prompt, 'What is a closure?');
  assert.equal(questions[0].correctAnswer, 2);
});

test('parseQuestionsJson rejects malformed or incomplete multiple choice responses', () => {
  assert.throws(() => parseQuestionsJson('not JSON'), /not valid JSON/i);
  assert.throws(() => parseQuestionsJson('{"questions":[{"prompt":"Incomplete?","options":["A","B"],"correctAnswer":0}]}'), /no usable/i);
});

test('generateAssessmentQuestions uses structured output and normalizes valid model results', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  let params;
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function (modelParams) {
      params = modelParams;
      return { generateContent: async () => ({ response: { text: () => JSON.stringify({ questions: [{ prompt: 'A test?', options: ['A', 'B', 'C', 'D'], correctAnswer: 1 }] }) } }) };
    };
    const questions = await generateAssessmentQuestions({ topic: 'React', count: 1, level: 'beginner' }, 'test-key');
    assert.equal(params.model, 'gemini-3.5-flash');
    assert.equal(params.generationConfig.responseMimeType, 'application/json');
    assert.equal(questions[0].correctAnswer, 1);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});

test('generateAssessmentQuestions falls back to the next model when one is overloaded', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  const modelsUsed = [];
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function (modelParams) {
      modelsUsed.push(modelParams.model);
      return {
        generateContent: async () => {
          if (modelParams.model === 'gemini-3.5-flash') {
            const error = new Error('[503 Service Unavailable] This model is currently experiencing high demand.');
            error.status = 503;
            throw error;
          }
          return { response: { text: () => JSON.stringify({ questions: [{ prompt: 'Fallback question?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }] }) } };
        }
      };
    };
    const questions = await generateAssessmentQuestions({ topic: 'React', count: 1, level: 'beginner' }, 'test-key');
    assert.equal(questions[0].prompt, 'Fallback question?');
    assert.deepEqual(modelsUsed, ['gemini-3.5-flash', 'gemini-3.5-flash-lite']);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});

test('generateAssessmentQuestions fails fast on non-retryable errors', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  const modelsUsed = [];
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function (modelParams) {
      modelsUsed.push(modelParams.model);
      return {
        generateContent: async () => {
          const error = new Error('API key not valid. Please pass a valid API key.');
          error.status = 400;
          throw error;
        }
      };
    };
    await assert.rejects(
      () => generateAssessmentQuestions({ topic: 'React', count: 1, level: 'beginner' }, 'bad-key'),
      /api key not valid/i
    );
    assert.deepEqual(modelsUsed, ['gemini-3.5-flash']);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});

test('parseInterviewJson normalizes an interview turn and clamps the score', () => {
  const turn = parseInterviewJson('```json\n{"question":"Why this role?","feedback":"Clear answer.","score":145,"strengths":[" specific  "],"improvements":["Add a number"],"summary":""}\n```');
  assert.equal(turn.question, 'Why this role?');
  assert.equal(turn.score, 100);
  assert.deepEqual(turn.strengths, ['specific']);
  assert.equal(parseInterviewJson('{"question":"Q1","score":null}').score, null);
});

test('parseInterviewJson rejects responses that are not JSON', () => {
  assert.throws(() => parseInterviewJson('I could not help with that.'), /not valid JSON/i);
});

test('runInterviewTurn returns the opening question with a structured response', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  let modelParams;
  let prompt;
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function (params) {
      modelParams = params;
      return {
        generateContent: async (contents) => {
          prompt = contents;
          return { response: { text: () => JSON.stringify({ question: 'Tell me about a project you led.', feedback: '', score: null, strengths: [], improvements: [], summary: '' }) } };
        }
      };
    };
    const turn = await runInterviewTurn(
      { phase: 'start', round: 1, totalQuestions: 3, context: { targetRole: 'Frontend Engineer', skills: ['react'] } },
      'test-key'
    );
    assert.equal(modelParams.generationConfig.responseMimeType, 'application/json');
    assert.equal(turn.question, 'Tell me about a project you led.');
    assert.equal(turn.done, false);
    assert.match(prompt, /Frontend Engineer/);
    assert.match(prompt, /Opening turn/);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});

test('runInterviewTurn marks the configured last round as the final turn', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  let prompt;
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function () {
      return {
        generateContent: async (contents) => {
          prompt = contents;
          return { response: { text: () => JSON.stringify({ question: '', feedback: 'Add a metric to each bullet.', score: 72, strengths: ['structured'], improvements: ['quantify impact'], summary: 'Solid practice run; keep answers shorter.' }) } };
        }
      };
    };
    const turn = await runInterviewTurn(
      { phase: 'answer', round: 3, totalQuestions: 3, answer: 'I led the migration to a component library.', history: [{ role: 'assistant', content: 'Tell me about a project you led.' }], context: {} },
      'test-key'
    );
    assert.equal(turn.done, true);
    assert.equal(turn.score, 72);
    assert.equal(turn.question, '');
    assert.match(prompt, /Final turn \(question 3 of 3\)/);
    assert.match(prompt, /I led the migration/);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});

test('runInterviewTurn retries and fails when an answer turn has no score', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  let attempts = 0;
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function () {
      return {
        generateContent: async () => {
          attempts += 1;
          return { response: { text: () => JSON.stringify({ question: 'Next?', feedback: 'Fine.', strengths: [], improvements: [], summary: '' }) } };
        }
      };
    };
    await assert.rejects(
      () => runInterviewTurn({ phase: 'answer', round: 1, totalQuestions: 5, answer: 'my answer', context: {} }, 'test-key'),
      /missing a score/i
    );
    assert.equal(attempts, 2);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});

test('generateAgentReply selects the persona for the requested agent and account role', async () => {
  const original = GoogleGenerativeAI.prototype.getGenerativeModel;
  let prompt;
  try {
    GoogleGenerativeAI.prototype.getGenerativeModel = function () {
      return {
        generateContent: async (contents) => {
          prompt = contents;
          return { response: { text: () => 'Here you go.' } };
        }
      };
    };
    await generateAgentReply({ role: 'candidate', agent: 'interviewer', message: 'Quiz me' }, 'test-key');
    assert.match(prompt, /Interview Trainer/);
    await generateAgentReply({ role: 'candidate', message: 'Review my resume' }, 'test-key');
    assert.match(prompt, /Talent Coach/);
    await generateAgentReply({ role: 'recruiter', agent: 'interviewer', message: 'Draft a JD' }, 'test-key');
    assert.match(prompt, /Hiring Copilot/);
  } finally {
    GoogleGenerativeAI.prototype.getGenerativeModel = original;
  }
});
