/**
 * Unit tests for src/utils/validators.js
 * Validators return an error string, or null when the input is valid.
 */
const {
  validateCreateTask,
  validateUpdateTask,
  validateAssignTask,
} = require('../src/utils/validators');

describe('validateCreateTask', () => {
  test('accepts a minimal valid body', () => {
    expect(validateCreateTask({ title: 'Do it' })).toBeNull();
  });

  test('accepts a fully populated valid body', () => {
    const body = {
      title: 'Do it',
      status: 'in_progress',
      priority: 'low',
      dueDate: '2030-01-01T00:00:00.000Z',
    };
    expect(validateCreateTask(body)).toBeNull();
  });

  test.each([
    ['missing title', {}],
    ['empty title', { title: '' }],
    ['whitespace title', { title: '   ' }],
    ['non-string title', { title: 123 }],
  ])('rejects %s', (_label, body) => {
    expect(validateCreateTask(body)).toMatch(/title/);
  });

  test('rejects an invalid status', () => {
    expect(validateCreateTask({ title: 'x', status: 'pending' })).toMatch(/status/);
  });

  test('rejects an invalid priority', () => {
    expect(validateCreateTask({ title: 'x', priority: 'urgent' })).toMatch(/priority/);
  });

  test('rejects an unparseable dueDate', () => {
    expect(validateCreateTask({ title: 'x', dueDate: 'not-a-date' })).toMatch(/dueDate/);
  });
});

describe('validateUpdateTask', () => {
  test('accepts an empty body (all fields optional)', () => {
    expect(validateUpdateTask({})).toBeNull();
  });

  test('rejects an empty title when title is provided', () => {
    expect(validateUpdateTask({ title: '' })).toMatch(/title/);
  });

  test('rejects invalid status, priority and dueDate', () => {
    expect(validateUpdateTask({ status: 'nope' })).toMatch(/status/);
    expect(validateUpdateTask({ priority: 'nope' })).toMatch(/priority/);
    expect(validateUpdateTask({ dueDate: 'nope' })).toMatch(/dueDate/);
  });
});

describe('validateAssignTask', () => {
  test('accepts a normal name', () => {
    expect(validateAssignTask({ assignee: 'Priya' })).toBeNull();
  });

  test.each([
    ['missing', {}],
    ['undefined body', undefined],
    ['null', { assignee: null }],
    ['number', { assignee: 42 }],
    ['object', { assignee: { name: 'x' } }],
    ['empty string', { assignee: '' }],
    ['whitespace only', { assignee: '   ' }],
  ])('rejects assignee that is %s', (_label, body) => {
    expect(validateAssignTask(body)).toMatch(/assignee/);
  });

  test('rejects names longer than 100 characters, accepts exactly 100', () => {
    expect(validateAssignTask({ assignee: 'a'.repeat(101) })).toMatch(/at most 100/);
    expect(validateAssignTask({ assignee: 'a'.repeat(100) })).toBeNull();
  });
});
