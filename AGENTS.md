# Cookbook Agent Guide

Project root: `/Users/david/projects/cookbook`

Planning doc: [PLANS.md](PLANS.md)

## Project Context

- `/Users/david/projects/cookbook/src/main.ts`: Vue app bootstrap.
- `/Users/david/projects/cookbook/src/App.vue`: main UI shell and backend-sync orchestration.
- `/Users/david/projects/cookbook/src/components/`: UI components (tree, tabs, panels, timers).
- `/Users/david/projects/cookbook/src/composables/useRecipesSource.ts`: recipe loading for backend/local/GitHub sources.
- `/Users/david/projects/cookbook/src/stores/useCookbookStore.ts`: app state and local-only timer behavior.
- `/Users/david/projects/cookbook/src/lib/`: parser/conversion/tree/time helpers plus API client.
- `/Users/david/projects/cookbook/src/styles.css`: app styling.
- `/Users/david/projects/cookbook/src/types/`: frontend DTOs and shared state types.
- `/Users/david/projects/cookbook/tests/`: Vitest coverage for parser/tree/units/store/source behavior.
- `/Users/david/projects/cookbook/backend/mix.exs`: Phoenix app definition and backend quality deps.
- `/Users/david/projects/cookbook/backend/config/`: Phoenix runtime, dev watcher, and repo config.
- `/Users/david/projects/cookbook/backend/lib/backend/`: backend domain logic for settings, meal plans, recipes, and shopping.
- `/Users/david/projects/cookbook/backend/lib/backend_web/`: Phoenix controllers/router/endpoint.
- `/Users/david/projects/cookbook/backend/priv/repo/migrations/`: SQLite schema migrations.
- `/Users/david/projects/cookbook/backend/test/`: ExUnit coverage for backend context and API routes.
- `/Users/david/projects/cookbook/recipes/`: local `.cook` recipe files served by the backend.
- `/Users/david/projects/cookbook/README.md`: user-facing run instructions and architecture summary.

## Commands (Copy/Paste)

Run from `/Users/david/projects/cookbook` unless noted.

### Install Frontend

```bash
npm install --cache /tmp/.npm-cache
```

Success criteria: installs Node dependencies without errors.

### Install Backend

```bash
cd /Users/david/projects/cookbook/backend && mix deps.get
```

Success criteria: installs Mix dependencies without errors.

### Backend DB Setup

```bash
cd /Users/david/projects/cookbook/backend && mix ecto.setup
```

Success criteria: creates/migrates the SQLite database without errors.

### Full-Stack Dev

```bash
cd /Users/david/projects/cookbook/backend && mix phx.server
```

Success criteria:
- Phoenix starts on port `4000` without errors.
- Phoenix watcher starts the Vite dev server.
- Vite prints a local URL (typically `http://127.0.0.1:5173`).

### Frontend Build Sanity

```bash
npm run build
```

Success criteria: exits with code `0` and emits `dist/` output.

### Frontend Test

```bash
npm test
```

Success criteria: Vitest exits with code `0`.

### Phoenix Static Build

```bash
npm run build:phoenix
```

Success criteria: emits built frontend assets into `backend/priv/static`.

### Backend Quality Check

```bash
cd /Users/david/projects/cookbook/backend && mix check
```

Success criteria: exits with code `0`.

`mix check` is required for backend quality control and is configured via `ex_check` in `backend/.check.exs`.

## Dev/Build/Test Loop

1. After frontend code changes, run **Frontend Build Sanity**.
2. If frontend build passes, run **Frontend Test**.
3. After backend code changes, run **Backend Quality Check**.
4. Before opening a PR, run **Frontend Build Sanity**, **Frontend Test**, and **Backend Quality Check** from a clean shell.

Loop passes when all commands exit `0` with no traceback/errors.

## Backend Rules

- Keep backend domain logic in `backend/lib/backend/` reusable for a future LiveView rewrite.
- Treat Phoenix as the long-term source of truth for shared meal plans, shared settings, recipe loading, and shopping aggregation.
- Keep timers local-only unless the user explicitly asks to sync them.
- Prefer conventional Phoenix/Ecto structure over custom framework glue.
- Keep the app local-network oriented; do not add auth unless explicitly requested.
- After backend changes, always run `mix check`.

## Bug Fix Rule

- For every bug fix, add at least one regression test that covers the bug.
- The regression test should fail before the fix and pass after the fix.
- Prefer the smallest effective scope: unit test first, then controller/component/integration when needed.
- For backend bugs, prefer ExUnit coverage in `backend/test/`.
- For frontend bugs, prefer Vitest coverage in `tests/`.
