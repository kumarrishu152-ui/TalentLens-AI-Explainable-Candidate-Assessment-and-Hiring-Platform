const test = require('node:test');
const assert = require('node:assert/strict');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { parseQuestionsJson, generateAssessmentQuestions } = require('./geminiService');

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
