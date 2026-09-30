# Take-Home Assignment — The Untested API

A 2-day take-home assignment. You'll read unfamiliar code, write tests, track down bugs, and ship a small feature.

Read [**ASSIGNMENT.md**](./ASSIGNMENT.md) for the full brief before you start.

\---

## A note on AI tools

You're welcome to use AI tools. What we're evaluating is your ability to read and reason about unfamiliar code — so your submission should reflect your own understanding, not just generated output.

Concretely:

* For each bug you report: include where in the code it lives and why it happens
* For the feature you implement: briefly explain the design decisions you made
* If something surprised you or you had to make a tradeoff, say so

\---

## Getting Started

**Prerequisites:** Node.js 18+

```bash
cd task-api
npm install
npm start        # runs on http://localhost:3000
```

**Tests:**

```bash
npm test           # run test suite
npm run coverage   # run with coverage report
```

\---

## Project Structure

```
task-api/
  src/
    app.js                  # Express app setup
    routes/tasks.js         # Route handlers
    services/taskService.js # Business logic + in-memory data store
    utils/validators.js     # Input validation helpers
  tests/                    # Your tests go here
  package.json
  jest.config.js
ASSIGNMENT.md               # Full brief — read this first
```

> The data store is in-memory. It resets every time the server restarts.

\---

## API Reference

|Method|Path|Description|
|-|-|-|
|`GET`|`/tasks`|List all tasks. Supports `?status=`, `?page=`, `?limit=`|
|`POST`|`/tasks`|Create a new task|
|`PUT`|`/tasks/:id`|Full update of a task|
|`DELETE`|`/tasks/:id`|Delete a task (returns 204)|
|`PATCH`|`/tasks/:id/complete`|Mark a task as complete|
|`GET`|`/tasks/stats`|Counts by status + overdue count|
|`PATCH`|`/tasks/:id/assign`|**Assign a task to a user** *(to implement)*|

### Task shape

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "status": "pending | in-progress | completed",
  "priority": "low | medium | high",
  "dueDate": "ISO 8601 or null",
  "completedAt": "ISO 8601 or null",
  "createdAt": "ISO 8601"
}
```

### Sample requests

**Create a task**

```bash
curl -X POST http://localhost:3000/tasks \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Write tests", "priority": "high"}'
```

**List tasks with filter**

```bash
curl "http://localhost:3000/tasks?status=pending\&page=1\&limit=10"
```

**Mark complete**

```bash
curl -X PATCH http://localhost:3000/tasks/<id>/complete
```

\---

## What to Submit

See [ASSIGNMENT.md](./ASSIGNMENT.md) for full submission requirements. At minimum, include:

* **Test files** — covering the endpoints and edge cases you identified
* **Bug report** — what you found, where in the code, and why it's a bug (not just symptoms)
* **At least one fix** — with a note on your approach
* **`PATCH /tasks/:id/assign` implementation** — plus a short explanation of any design decisions (validation, edge cases, etc.)



---



## Submission Notes



- Bug report: \[BUG\_REPORT.md](./BUG\_REPORT.md)

- Design decisions, what I'd test next, and questions: \[SUBMISSION\_NOTES.md](./SUBMISSION\_NOTES.md)

- Tests live in `task-api/tests/` (service unit tests, validator unit tests, Supertest integration tests)



### Test results



All 3 suites pass, 80 tests, 0 failures (`npm test`).



### Coverage (`npm run coverage`)



```
-----------------|---------|----------|---------|---------|-------------------
File             | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-----------------|---------|----------|---------|---------|-------------------
All files        |   97.51 |    94.79 |   96.66 |   97.27 |
 src             |      75 |    63.63 |      50 |      75 |
  app.js         |      75 |    63.63 |      50 |      75 | 17-18,24-25
 src/routes      |     100 |      100 |     100 |     100 |
  tasks.js       |     100 |      100 |     100 |     100 |
 src/services    |     100 |    94.73 |     100 |     100 |
  taskService.js |     100 |    94.73 |     100 |     100 | 26
 src/utils       |     100 |      100 |     100 |     100 |
  validators.js  |     100 |      100 |     100 |     100 |
-----------------|---------|----------|---------|---------|-------------------
```



The uncovered lines in `app.js` are `app.listen()` and the generic 500 error branch.



### Live API



https://task-api-take-home.onrender.com



(Hosted on Render's free tier, so the first request after idle can take \~50 seconds to wake up. Try `/tasks` or `/tasks/stats`.)


