# Submission Notes

## What was done
- **Tests** (`task-api/tests/`): service unit tests, validator unit tests, and Supertest integration tests for every endpoint including the new one.
- **Bug report:** `BUG_REPORT.md` (8 issues; where / why / how found / fix).
- **Fixes:** bugs #1–#4. Bugs #5–#8 are documented, and #5/#6 have `test.failing` tests so the suite is green today but flags them the day they get fixed.
- **Feature:** `PATCH /tasks/:id/assign`.

## Feature design: `PATCH /tasks/:id/assign`
| Question | Decision | Why |
|---|---|---|
| Empty / whitespace-only `assignee` | **400** | An empty name is meaningless data. "Unassign" is a different intent and would deserve an explicit design (e.g. `null` or `DELETE`), so I didn't overload the empty string. |
| Non-string / missing `assignee` | **400** | Same validator; body must be `{ "assignee": "<string>" }`. |
| Very long names | **400 over 100 chars** | Cheap guard against junk in an unbounded in-memory store. The limit is arbitrary — a product decision. |
| Whitespace around the name | **Trimmed** | `" Priya "` and `"Priya"` shouldn't be different assignees. |
| Task already assigned | **Allowed; replaces the assignee (200)** | Reassignment is a normal workflow. A 409 would force clients into a two-step unassign→assign. Idempotent: same request twice gives the same result. |
| Task doesn't exist | **404** | As specified. |
| Completed task | **Allowed** | Assignment is independent of status; blocking it adds a rule nobody asked for. |
| Check order | **400 before 404** | Matches the existing `POST`/`PUT` handlers, so the API behaves consistently. |
| Task shape | `assignee: null` by default on create | So every task has a stable shape; clients don't need to handle a missing key. |

## What I'd test next
- Fix #5–#8, then convert the `test.failing` tests to normal tests and add route-level tests for pagination bounds.
- Concurrency/ordering (two rapid assigns), very large payloads, and unicode / emoji names.
- Contract test that asserts the full task shape on every endpoint.

## What surprised me
- The README and ASSIGNMENT disagree on status names (`pending/completed` vs `todo/done`).
- `completeTask` quietly rewriting `priority` — a bug that a happy-path test asserting only `status` would never catch.
- Truthiness-based validation means `status: ""` is accepted and then drops out of `/stats`.

## Questions before production
- Is the in-memory store acceptable? Everything is lost on restart, and it won't work with more than one instance.
- No authentication/authorization: who may assign, and can `assignee` be validated against a real user list rather than free text?
- Should `/tasks` return a paginated envelope with totals? Should there be a max page size?
- What is the intended `PUT` contract (full replace vs partial)?
- Rate limiting, request logging and CORS policy.
