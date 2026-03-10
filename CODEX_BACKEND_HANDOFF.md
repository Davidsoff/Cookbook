# Cookbook Backend Implementation Handoff

Use this prompt as-is in a new Codex session.

---

You are working in `/Users/david/projects/cookbook`.

Read `/Users/david/projects/cookbook/AGENTS.md` first and follow it exactly.

Implement the backend plan below end-to-end. Do not stop at planning. Make the code changes, run validation, and update docs.

## Goal

Add a Phoenix backend in `backend/` with SQLite as the shared datastore, keep the existing Vue app as the current UI, and structure the backend so it can later support a full LiveView rewrite without redoing persistence or core business logic.

Phoenix is the main app shell:
- `mix phx.server` should start the frontend dev process via Phoenix watchers in development.
- Phoenix should serve the built SPA in production.

Shared meal-plan and settings state must move to SQLite.
Recipes remain file-backed.
Timers stay local-only.

## Hard requirements

- Use Phoenix + Ecto + SQLite.
- No auth, accounts, or role system.
- App is local-network only and stores no sensitive data.
- Use `ex_check` for backend quality control.
- Add `ex_check` usage to `AGENTS.md`.
- `mix phx.server` must be the primary full-stack dev command.
- Keep the existing Vue app for now.
- Build backend domain logic so a future LiveView rewrite can reuse it.
- Preserve current cooking UX where possible.

## Existing frontend facts

The current app is a Vue 3 + TypeScript Vite app.
Important files:
- `/Users/david/projects/cookbook/src/composables/useRecipesSource.ts`
- `/Users/david/projects/cookbook/src/stores/useCookbookStore.ts`
- `/Users/david/projects/cookbook/src/lib/mealPlan.ts`
- `/Users/david/projects/cookbook/src/lib/shopping.ts`
- `/Users/david/projects/cookbook/src/lib/sourceSettings.ts`
- `/Users/david/projects/cookbook/src/types/source-settings.ts`
- `/Users/david/projects/cookbook/src/types/meal-plan.ts`
- `/Users/david/projects/cookbook/src/App.vue`

Current behavior:
- recipes come from local HTTP files or a public GitHub repo
- meal plan and source settings persist in browser `localStorage`
- shopping list derives from the planned meals
- timers are client-local

## Target architecture

### Backend

Create `backend/` as a conventional Phoenix app.

Use SQLite.

The backend owns long-term business logic for:
- meal plan rolling-window behavior
- plan normalization and updates
- shopping-list aggregation from planned meals
- recipe loading and path normalization
- shared settings persistence

The backend exposes JSON APIs:
- `GET /api/recipes`
- `GET /api/recipes/:id`
- `GET /api/config`
- `PUT /api/config`
- `GET /api/meal-plan`
- `PUT /api/meal-plan`
- `GET /api/shopping-plan`
- `GET /api/health`

Use whole-resource `PUT` updates for config and meal plan.

### Shared persistence

Use SQLite tables for at least:
- `app_settings`
- `meal_plan_days`

Requirements:
- `meal_plan_days` keyed uniquely by `date_iso`
- deterministic upsert/update behavior
- timers are not persisted

### Recipe/config loading

Backend should read:
- `.cook` files from a configured recipes root
- aisle config files from a configured path
- pantry config files from a configured path

Requirements:
- support nested recipe directories
- normalize paths the same way the frontend currently does
- if a planned recipe later disappears, keep the plan row and surface the recipe as unresolved instead of crashing

### Frontend integration

Refactor the frontend so shared persistence is backend-driven instead of `localStorage`-driven.

Requirements:
- add `backend-api` to source settings mode
- keep `local-http` and `github-public` working during migration unless there is a strong reason not to
- when backend is reachable, `backend-api` should be the preferred/default mode
- timers remain local-only
- do not silently pretend writes are synced if backend is unavailable
- show a clear service-unavailable/offline state when shared writes cannot be performed

### Dev workflow

`mix phx.server` should start Vite in development through Phoenix watchers.

Requirements:
- one normal dev command: `mix phx.server`
- Vite HMR still works
- `/api` requests go to Phoenix cleanly in dev

### Production workflow

Phoenix serves the built frontend assets from `priv/static` or the standard Phoenix static path.

Requirements:
- add/build the frontend before packaging/running Phoenix in production
- client-side routing still works

## ex_check requirement

Configure backend quality tooling around `ex_check`.

Use:
- `ex_check`
- formatter
- ExUnit
- Credo
- Sobelow
- `mix_audit` if compatible

Standardize on `mix check` as the main backend quality command.

Use the documented `preferred_cli_env` / `.check.exs` pattern if appropriate.

Reference docs:
- https://hexdocs.pm/ex_check/readme.html
- https://hexdocs.pm/ex_check/Mix.Tasks.Check.html
- https://hex.pm/packages/ex_check

## AGENTS.md updates required

Update `/Users/david/projects/cookbook/AGENTS.md` to include backend instructions:
- backend paths
- install/dev/test/check commands
- explicit `mix check` requirement after backend changes
- `mix phx.server` as the primary full-stack dev command
- full-stack loop: frontend build/test plus backend `mix check`
- backend regression-test rule
- note that backend domain logic should be written so it can later back LiveView directly

## README.md updates required

Update `/Users/david/projects/cookbook/README.md` to explain:
- new architecture
- local-network assumptions
- SQLite-backed shared persistence
- `mix phx.server` starting frontend in development
- Phoenix serving built frontend assets in production
- where recipes/config files live on the backend host
- which features are shared across devices vs local-only
- backend domain intended to support a future full LiveView rewrite

## Tests and validation required

You must run validation after changes.

Frontend:
- `npm run build`
- `npm test`

Backend:
- install dependencies as needed
- run backend DB setup
- run `mix check`

Add tests for:
- backend meal plan reads/writes
- backend shared settings updates
- nested recipe discovery and config loading
- removed/missing planned recipes resolving safely
- idempotent updates to the same `date_iso`
- frontend API client and/or store integration for backend payloads
- backend-unavailable state on the frontend

## Implementation guidance

- Prefer additive, conventional Phoenix structure.
- Keep backend DTOs/UI contracts stable and reasonably UI-agnostic.
- Do not overengineer for scale.
- Do not add realtime unless required to satisfy an existing feature.
- Keep timers local-only.
- Keep the repo in a state where a later full LiveView rewrite can reuse backend logic without redoing persistence.

## Deliverables

1. Working backend in `backend/`
2. Frontend integrated with backend APIs
3. `AGENTS.md` updated
4. `README.md` updated
5. Tests added and passing
6. Final summary with key file references and exact commands run

## Working style

- Make the changes directly.
- If you find pre-existing unrelated dirty changes, stop and report them.
- Do not ask for approval unless blocked.
- If Phoenix generators or dependency installs are needed, do them.
- If you need to make a reasonable choice, make it and document it in the final summary.

