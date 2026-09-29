# Bug Report — Task API

Found by writing tests against the original code and by reading `src/`. Line numbers refer to the **original** files.
Status legend: ✅ fixed in this submission · ⚠️ documented, not fixed (a `test.failing` test pins the expected behaviour).

| # | Bug | Severity | Status |
|---|-----|----------|--------|
| 1 | Status filter does substring matching | High | ✅ |
| 2 | Pagination skips the first page | High | ✅ |
| 3 | Completing a task resets its priority | High | ✅ |
| 4 | Malformed JSON returns 500 instead of 400 | Medium | ✅ |
| 5 | `PUT` allows overwriting `id`/`createdAt`; `status: done` via PUT never sets `completedAt` | Medium | ⚠️ |
| 6 | Completing an already-completed task overwrites `completedAt` | Low | ⚠️ |
| 7 | No validation of `page`/`limit`; `?status` silently disables pagination | Medium | ⚠️ |
| 8 | Validators use truthiness checks, so `""` slips through | Low | ⚠️ |

---

## 1. Status filter does substring matching ✅
- **Where:** `taskService.js:9` — `tasks.filter((t) => t.status.includes(status))`
- **Expected:** `GET /tasks?status=todo` returns only tasks whose status is exactly `todo`; an unknown value returns `[]`.
- **Actual:** `String.prototype.includes` is a substring test, so `?status=do` returns both `todo` and `done` tasks, `?status=o` returns everything, etc.
- **Why:** the author wanted equality but used a string method that looks similar. Nothing validates the query value either.
- **Found by:** unit test `getByStatus > does not do substring matching`.
- **Fix:** `t.status === status`.

## 2. Pagination skips the first page ✅
- **Where:** `taskService.js:12` — `const offset = page * limit;`
- **Expected:** `?page=1&limit=10` returns items 1–10 (the route defaults `page` to 1, so pages are clearly 1-indexed).
- **Actual:** offset for page 1 is `10`, so the first 10 tasks are never reachable; page 1 returns items 11–20.
- **Why:** off-by-one: 1-indexed page number used as a 0-indexed offset.
- **Found by:** creating 5 tasks and requesting `page=1&limit=2` — got T3,T4 rather than T1,T2.
- **Fix:** `(page - 1) * limit`.

## 3. Completing a task resets its priority ✅
- **Where:** `taskService.js:69` — `priority: 'medium'` inside `completeTask`.
- **Expected:** `PATCH /tasks/:id/complete` changes only `status` and `completedAt`.
- **Actual:** a `high` (or `low`) priority task comes back as `medium` and the change is persisted — silent data loss, and it corrupts any priority-based reporting on completed work.
- **Why:** an unrelated field was written in the same object literal; likely copy/paste or leftover code.
- **Found by:** create a `high` task, complete it, compare priority.
- **Fix:** delete that line.

## 4. Malformed JSON returns 500 ✅
- **Where:** `app.js:9-12` — the error middleware always responds `500`.
- **Expected:** a client sending invalid JSON gets `400`.
- **Actual:** `express.json()` throws an error with `status = 400`; the catch-all ignores it, logs a stack trace, and returns `500 Internal server error`. That is misleading for clients and pollutes error monitoring with client mistakes.
- **Found by:** Supertest POST with body `{"title": ` and `Content-Type: application/json`.
- **Fix:** honour `err.status` for 4xx; keep 500 + logging for real server errors.

## 5. `PUT` is a raw merge ⚠️
- **Where:** `taskService.js:50` — `{ ...tasks[index], ...fields }` (route passes `req.body` straight through after validation that only checks a few fields).
- **Expected:** `id`, `createdAt` (and `completedAt`) are server-controlled. Moving a task to `done` should also stamp `completedAt`, keeping `status`/`completedAt` consistent with `/complete`.
- **Actual:** `PUT /tasks/:id {"id":"x","createdAt":"1999-..."}` overwrites them (mass-assignment). `PUT {"status":"done"}` leaves `completedAt: null`, and it counts as done in `/stats`, so data is inconsistent depending on which endpoint was used. Also, "full update" semantics aren't enforced — it behaves like PATCH.
- **Fix sketch:** whitelist `title, description, status, priority, dueDate` (and `assignee`) in `update`; set/clear `completedAt` when `status` changes to/from `done`.
- **Tests:** two `test.failing` cases in `taskService.test.js`.

## 6. Re-completing overwrites `completedAt` ⚠️
- **Where:** `taskService.js:63-77` — no check for existing `status === 'done'`.
- **Expected:** completion is idempotent; the original timestamp is preserved (or a 409 is returned).
- **Actual:** every call replaces `completedAt` with "now".
- **Fix sketch:** `if (task.status === 'done') return task;`.

## 7. Pagination parameter handling ⚠️
- **Where:** `routes/tasks.js:11-28`.
- **Actual:**
  - `parseInt(page) || 1` lets negatives through (`page=-1` → negative offset → `slice` returns odd results; `limit=-5` likewise). `page=0` becomes 1 only because `0` is falsy — accidental, not designed.
  - No upper bound on `limit`.
  - If `status` is present the `page`/`limit` params are ignored entirely, so a filtered list cannot be paginated.
  - Paginated responses are a bare array with no total count, so a client can't tell how many pages exist.
- **Fix sketch:** validate `page >= 1`, `1 <= limit <= 100` → 400 otherwise; apply status filter first and paginate the result; consider returning `{ data, page, limit, total }`.

## 8. Validators use truthiness checks ⚠️
- **Where:** `validators.js:8,11,14,24,27,30` — e.g. `if (body.status && !VALID.includes(...))`.
- **Actual:** `status: ""` / `priority: ""` are falsy so validation is skipped; on create the destructuring default only applies to `undefined`, so an empty string is stored as the status and the task then vanishes from `/stats` counts (since `counts[""]` is undefined).
- **Fix sketch:** check `!== undefined` and validate types explicitly.

---

## Doc inconsistency (not a code bug)
`README.md` lists statuses as `pending | in-progress | completed`, but the code and `ASSIGNMENT.md` use `todo | in_progress | done`. I followed the code. The README should be corrected.
