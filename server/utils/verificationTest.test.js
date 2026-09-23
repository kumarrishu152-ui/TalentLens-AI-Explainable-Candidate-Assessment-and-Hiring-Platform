const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVerificationQuestions } = require('./verificationTest');

test('buildVerificationQuestions returns 10 questions for CS candidates', () => {
  const questions = buildVerificationQuestions([
    'JavaScript',
    'React',
    'Node.js',
    'SQL',
    'Python',
    'Java',
    'MongoDB',
    'TypeScript',
    'Docker',
    'Git'
  ]);

  assert.equal(questions.length, 10);
  questions.forEach((question) => {
    assert.ok(question.question);
    assert.equal(question.options.length, 4);
    assert.ok(Number.isInteger(question.correctAnswer));
    assert.ok(question.correctAnswer >= 0 && question.correctAnswer < 4);
  });
});

test('buildVerificationQuestions adds practical non-CS questions when skills are unrelated', () => {
  const questions = buildVerificationQuestions(['Marketing', 'Sales', 'Customer Success', 'Communication']);

  assert.equal(questions.length, 10);
  const practicalQuestion = questions.find((question) =>
    question.question.toLowerCase().includes('customer') ||
    question.question.toLowerCase().includes('communication') ||
    question.question.toLowerCase().includes('problem') ||
    question.question.toLowerCase().includes('delivery') ||
    question.question.toLowerCase().includes('sales')
  );

  assert.ok(practicalQuestion);
  assert.equal(practicalQuestion.options.length, 4);
});
