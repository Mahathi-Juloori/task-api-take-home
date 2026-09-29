/**
 * Unit tests for src/services/taskService.js
 *
 * The service holds state in a module-level array, so every test starts from a clean
 * slate via _reset(). Tests assert on observable behaviour (return values), not on
 * how the array is stored internally.
 *
 * Tests marked `test.failing` document KNOWN, UNFIXED bugs (see BUG_REPORT.md).
 * Jest treats them as passing while the bug exists; once someone fixes the bug the
 * test starts "failing" and reminds them to convert it to a normal `test`.
 */
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('create', () => {
  test('applies defaults when only a title is given', () => {
    const task = taskService.create({ title: 'Write tests' });

    expect(task).toMatchObject({
      title: 'Write tests',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completedAt: null,
      assignee: null,
    });
    expect(typeof task.id).toBe('string');
    expect(Number.isNaN(Date.parse(task.createdAt))).toBe(false);
  });

  test('respects supplied fields and generates unique ids', () => {
    const a = taskService.create({ title: 'A', priority: 'high', status: 'in_progress' });
    const b = taskService.create({ title: 'B' });

    expect(a.priority).toBe('high');
    expect(a.status).toBe('in_progress');
    expect(a.id).not.toBe(b.id);
  });
});

describe('getAll / findById', () => {
  test('getAll returns every task; mutating the returned array does not affect the store', () => {
    taskService.create({ title: 'A' });
    taskService.create({ title: 'B' });

    const all = taskService.getAll();
    expect(all).toHaveLength(2);

    all.pop();
    expect(taskService.getAll()).toHaveLength(2);
  });

  test('findById returns the task, or undefined when missing', () => {
    const task = taskService.create({ title: 'A' });

    expect(taskService.findById(task.id)).toEqual(task);
    expect(taskService.findById('nope')).toBeUndefined();
  });
});

describe('getByStatus', () => {
  beforeEach(() => {
    taskService.create({ title: 'T1', status: 'todo' });
    taskService.create({ title: 'T2', status: 'in_progress' });
    taskService.create({ title: 'T3', status: 'done' });
  });

  test('returns only tasks with exactly that status', () => {
    const result = taskService.getByStatus('todo');
    expect(result.map((t) => t.title)).toEqual(['T1']);
  });

  // Bug #1: used String.includes, so a partial value matched multiple statuses.
  test('does not do substring matching ("do" must not match "todo" or "done")', () => {
    expect(taskService.getByStatus('do')).toEqual([]);
  });

  test('returns an empty array for an unknown status', () => {
    expect(taskService.getByStatus('archived')).toEqual([]);
  });
});

describe('getPaginated', () => {
  beforeEach(() => {
    for (let i = 1; i <= 5; i++) taskService.create({ title: `T${i}` });
  });

  // Bug #2: offset was page * limit, so page 1 skipped the first `limit` items.
  test('page 1 returns the first `limit` items', () => {
    expect(taskService.getPaginated(1, 2).map((t) => t.title)).toEqual(['T1', 'T2']);
  });

  test('subsequent pages continue where the last one ended', () => {
    expect(taskService.getPaginated(2, 2).map((t) => t.title)).toEqual(['T3', 'T4']);
    expect(taskService.getPaginated(3, 2).map((t) => t.title)).toEqual(['T5']);
  });

  test('a page past the end returns an empty array', () => {
    expect(taskService.getPaginated(4, 2)).toEqual([]);
  });
});

describe('getStats', () => {
  test('returns zeros when there are no tasks', () => {
    expect(taskService.getStats()).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
  });

  test('counts tasks by status', () => {
    taskService.create({ title: 'A', status: 'todo' });
    taskService.create({ title: 'B', status: 'todo' });
    taskService.create({ title: 'C', status: 'in_progress' });
    taskService.create({ title: 'D', status: 'done' });

    expect(taskService.getStats()).toMatchObject({ todo: 2, in_progress: 1, done: 1 });
  });

  test('overdue counts past-due tasks that are not done; ignores future, done and undated', () => {
    const past = '2000-01-01T00:00:00.000Z';
    const future = '2999-01-01T00:00:00.000Z';
    taskService.create({ title: 'overdue todo', dueDate: past });
    taskService.create({ title: 'overdue in progress', status: 'in_progress', dueDate: past });
    taskService.create({ title: 'past but done', status: 'done', dueDate: past });
    taskService.create({ title: 'future', dueDate: future });
    taskService.create({ title: 'no due date' });

    expect(taskService.getStats().overdue).toBe(2);
  });
});

describe('update', () => {
  test('merges the supplied fields and returns the updated task', () => {
    const task = taskService.create({ title: 'Old' });
    const updated = taskService.update(task.id, { title: 'New', priority: 'high' });

    expect(updated).toMatchObject({ id: task.id, title: 'New', priority: 'high' });
    expect(taskService.findById(task.id).title).toBe('New');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.update('nope', { title: 'x' })).toBeNull();
  });

  // Bug #5 (UNFIXED): update spreads the raw body over the task (mass assignment).
  test.failing('does not let callers overwrite immutable fields (id, createdAt)', () => {
    const task = taskService.create({ title: 'A' });
    const updated = taskService.update(task.id, { id: 'hijacked', createdAt: '1999-01-01T00:00:00.000Z' });

    expect(updated.id).toBe(task.id);
    expect(updated.createdAt).toBe(task.createdAt);
  });

  // Bug #5b (UNFIXED): moving a task to done via update never sets completedAt.
  test.failing('sets completedAt when status is changed to done', () => {
    const task = taskService.create({ title: 'A' });
    const updated = taskService.update(task.id, { status: 'done' });

    expect(updated.completedAt).not.toBeNull();
  });
});

describe('remove', () => {
  test('removes the task and returns true', () => {
    const task = taskService.create({ title: 'A' });

    expect(taskService.remove(task.id)).toBe(true);
    expect(taskService.getAll()).toHaveLength(0);
  });

  test('returns false for an unknown id and leaves other tasks alone', () => {
    taskService.create({ title: 'A' });

    expect(taskService.remove('nope')).toBe(false);
    expect(taskService.getAll()).toHaveLength(1);
  });
});

describe('completeTask', () => {
  test('marks the task done and stamps completedAt', () => {
    const task = taskService.create({ title: 'A' });
    const done = taskService.completeTask(task.id);

    expect(done.status).toBe('done');
    expect(Number.isNaN(Date.parse(done.completedAt))).toBe(false);
    expect(taskService.findById(task.id).status).toBe('done');
  });

  // Bug #3: completing a task used to reset priority to 'medium'.
  test('preserves the existing priority', () => {
    const high = taskService.create({ title: 'H', priority: 'high' });
    const low = taskService.create({ title: 'L', priority: 'low' });

    expect(taskService.completeTask(high.id).priority).toBe('high');
    expect(taskService.completeTask(low.id).priority).toBe('low');
  });

  test('returns null for an unknown id', () => {
    expect(taskService.completeTask('nope')).toBeNull();
  });

  // Bug #6 (UNFIXED): completing again overwrites the original completion time.
  test.failing('completing an already-completed task keeps the original completedAt', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const task = taskService.create({ title: 'A' });
    const first = taskService.completeTask(task.id);

    jest.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    const second = taskService.completeTask(task.id);

    expect(second.completedAt).toBe(first.completedAt);
  });
});

describe('assignTask (new feature)', () => {
  test('stores the assignee and returns the updated task', () => {
    const task = taskService.create({ title: 'A' });
    const updated = taskService.assignTask(task.id, 'Priya');

    expect(updated.assignee).toBe('Priya');
    expect(taskService.findById(task.id).assignee).toBe('Priya');
  });

  test('trims surrounding whitespace', () => {
    const task = taskService.create({ title: 'A' });
    expect(taskService.assignTask(task.id, '  Priya  ').assignee).toBe('Priya');
  });

  test('reassigning an already-assigned task replaces the assignee', () => {
    const task = taskService.create({ title: 'A' });
    taskService.assignTask(task.id, 'Priya');

    expect(taskService.assignTask(task.id, 'Rahul').assignee).toBe('Rahul');
  });

  test('does not change any other field', () => {
    const task = taskService.create({ title: 'A', priority: 'high' });
    const updated = taskService.assignTask(task.id, 'Priya');

    expect(updated).toEqual({ ...task, assignee: 'Priya' });
  });

  test('returns null for an unknown id', () => {
    expect(taskService.assignTask('nope', 'Priya')).toBeNull();
  });
});
