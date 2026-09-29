/**
 * Integration tests for the HTTP API (Supertest against the Express app).
 * We import the app without starting a listener (app.js only listens when run directly).
 * State is reset before each test so tests are order-independent.
 */
const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

beforeEach(() => {
  taskService._reset();
});

const createTask = async (body = { title: 'Sample' }) => {
  const res = await request(app).post('/tasks').send(body);
  return res.body;
};

describe('POST /tasks', () => {
  test('creates a task and returns 201 with defaults', async () => {
    const res = await request(app).post('/tasks').send({ title: 'Write tests', priority: 'high' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      title: 'Write tests',
      priority: 'high',
      status: 'todo',
      completedAt: null,
      assignee: null,
    });
    expect(res.body.id).toBeDefined();
  });

  test('returns 400 when title is missing', async () => {
    const res = await request(app).post('/tasks').send({ priority: 'high' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/);
  });

  test('returns 400 for an invalid priority', async () => {
    const res = await request(app).post('/tasks').send({ title: 'x', priority: 'urgent' });
    expect(res.status).toBe(400);
  });

  // Bug #4: malformed JSON used to fall into the catch-all handler and return 500.
  test('returns 400 (not 500) for malformed JSON', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'application/json')
      .send('{"title": ');

    expect(res.status).toBe(400);
  });
});

describe('GET /tasks', () => {
  test('returns an empty array when there are no tasks', async () => {
    const res = await request(app).get('/tasks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns all tasks', async () => {
    await createTask({ title: 'A' });
    await createTask({ title: 'B' });

    const res = await request(app).get('/tasks');
    expect(res.body).toHaveLength(2);
  });

  test('filters by exact status', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=done');

    expect(res.status).toBe(200);
    expect(res.body.map((t) => t.title)).toEqual(['B']);
  });

  // Bug #1
  test('a partial status value does not match anything', async () => {
    await createTask({ title: 'A', status: 'todo' });
    await createTask({ title: 'B', status: 'done' });

    const res = await request(app).get('/tasks?status=do');
    expect(res.body).toEqual([]);
  });

  // Bug #2
  test('paginates with 1-indexed pages', async () => {
    for (const title of ['T1', 'T2', 'T3', 'T4', 'T5']) await createTask({ title });

    const page1 = await request(app).get('/tasks?page=1&limit=2');
    const page3 = await request(app).get('/tasks?page=3&limit=2');
    const page4 = await request(app).get('/tasks?page=4&limit=2');

    expect(page1.body.map((t) => t.title)).toEqual(['T1', 'T2']);
    expect(page3.body.map((t) => t.title)).toEqual(['T5']);
    expect(page4.body).toEqual([]);
  });

  test('falls back to page 1 / limit 10 when page and limit are not numbers', async () => {
    await createTask({ title: 'A' });

    const res = await request(app).get('/tasks?page=abc&limit=xyz');
    expect(res.body).toHaveLength(1);
  });
});

describe('PUT /tasks/:id', () => {
  test('updates the task', async () => {
    const task = await createTask({ title: 'Old' });

    const res = await request(app).put(`/tasks/${task.id}`).send({ title: 'New', status: 'in_progress' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: task.id, title: 'New', status: 'in_progress' });
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).put('/tasks/nope').send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid data', async () => {
    const task = await createTask();
    const res = await request(app).put(`/tasks/${task.id}`).send({ status: 'bogus' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /tasks/:id', () => {
  test('deletes the task and returns 204 with no body', async () => {
    const task = await createTask();

    const res = await request(app).delete(`/tasks/${task.id}`);
    expect(res.status).toBe(204);
    expect(res.text).toBe('');

    const list = await request(app).get('/tasks');
    expect(list.body).toEqual([]);
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).delete('/tasks/nope');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /tasks/:id/complete', () => {
  test('marks the task done and sets completedAt', async () => {
    const task = await createTask();

    const res = await request(app).patch(`/tasks/${task.id}/complete`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
    expect(res.body.completedAt).not.toBeNull();
  });

  // Bug #3
  test('keeps the original priority', async () => {
    const task = await createTask({ title: 'Urgent', priority: 'high' });

    const res = await request(app).patch(`/tasks/${task.id}/complete`);
    expect(res.body.priority).toBe('high');
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).patch('/tasks/nope/complete');
    expect(res.status).toBe(404);
  });
});

describe('GET /tasks/stats', () => {
  test('returns counts by status and the overdue count', async () => {
    await createTask({ title: 'A', status: 'todo', dueDate: '2000-01-01T00:00:00.000Z' });
    await createTask({ title: 'B', status: 'in_progress' });
    await createTask({ title: 'C', status: 'done', dueDate: '2000-01-01T00:00:00.000Z' });

    const res = await request(app).get('/tasks/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ todo: 1, in_progress: 1, done: 1, overdue: 1 });
  });

  test('is not shadowed by the /:id routes', async () => {
    const res = await request(app).get('/tasks/stats');
    expect(res.status).toBe(200);
  });
});

describe('PATCH /tasks/:id/assign (new feature)', () => {
  test('assigns the task and returns the updated task', async () => {
    const task = await createTask();

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Priya' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: task.id, assignee: 'Priya' });
  });

  test('persists the assignment (visible on subsequent GET)', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Priya' });

    const list = await request(app).get('/tasks');
    expect(list.body[0].assignee).toBe('Priya');
  });

  test('trims whitespace around the name', async () => {
    const task = await createTask();
    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: '  Priya ' });

    expect(res.body.assignee).toBe('Priya');
  });

  test('returns 404 when the task does not exist', async () => {
    const res = await request(app).patch('/tasks/nope/assign').send({ assignee: 'Priya' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  test.each([
    ['empty string', { assignee: '' }],
    ['whitespace only', { assignee: '   ' }],
    ['missing field', {}],
    ['non-string', { assignee: 123 }],
    ['too long', { assignee: 'a'.repeat(101) }],
  ])('returns 400 for %s and leaves the task unchanged', async (_label, body) => {
    const task = await createTask();

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send(body);
    expect(res.status).toBe(400);

    const list = await request(app).get('/tasks');
    expect(list.body[0].assignee).toBeNull();
  });

  test('reassigning an already-assigned task succeeds and replaces the assignee', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Priya' });

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Rahul' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Rahul');
  });

  test('can assign a completed task (assignment is independent of status)', async () => {
    const task = await createTask();
    await request(app).patch(`/tasks/${task.id}/complete`);

    const res = await request(app).patch(`/tasks/${task.id}/assign`).send({ assignee: 'Priya' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('done');
  });
});
