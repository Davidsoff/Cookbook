# Cookbook

Cookbook is a Vue 3 + TypeScript cooking UI backed by a Phoenix + SQLite service for shared state on a trusted local network.

## Architecture

The app is split into two layers:

- Frontend: Vue/Vite UI for browsing recipes, cooking steps, timers, meal planning, and shopping views.
- Backend: Phoenix API with SQLite for shared settings and meal plans, plus filesystem-backed recipe/config loading.

Current source of truth:

- Shared across devices:
  - source settings in backend `app_settings`
  - meal plan in backend `meal_plan_days`
- Local only:
  - active timers
  - transient UI state
- File-backed on the backend host:
  - `.cook` recipes under `recipes/`
  - aisle config
  - pantry config

The backend domain is intentionally structured so a future full LiveView rewrite can reuse it without redoing persistence.

## Features

- Shared meal plan across devices on the same LAN
- Shared source/unit settings through Phoenix + SQLite
- Recipe loading from backend-hosted Cooklang files
- Optional local HTTP and public GitHub recipe source modes still available in the UI
- Collapsible recipe folder tree
- Recipe detail view with front-matter title/description/image
- Ingredient scaling by servings
- Metric / US customary conversion
- Step parsing with inline ingredients, tools, and timers
- Device-local timers
- Shared shopping view derived from the current plan

## Local-Network Assumptions

- The service is intended for a trusted local network.
- There is no authentication.
- Do not expose this service publicly without adding auth and basic hardening first.

## Run Locally

### Frontend only dependencies

```bash
npm install --cache /tmp/.npm-cache
```

### Backend dependencies

```bash
cd backend
mix deps.get
mix ecto.setup
```

### Full-stack development

```bash
cd backend
mix phx.server
```

`mix phx.server` is the primary dev command.

In development Phoenix starts on `http://127.0.0.1:4000` and also launches the Vite dev server through Phoenix watchers. Open the Vite URL shown in the terminal, typically `http://127.0.0.1:5173`.

Vite proxies `/api` requests to Phoenix.

## Build

### Frontend build sanity

```bash
npm run build
```

### Build frontend assets for Phoenix

```bash
npm run build:phoenix
```

That writes the SPA build into `backend/priv/static`, which Phoenix serves in production.

## Tests

### Frontend

```bash
npm test
```

### Backend quality

```bash
cd backend
mix check
```

`mix check` is powered by `ex_check` and runs the backend quality gate, including compile warnings, formatting, ExUnit, Credo, Sobelow, and MixAudit.

## Backend Storage

SQLite is the shared datastore.

Main tables:

- `app_settings`
- `meal_plan_days`

This is intentionally lightweight and single-node. That is enough for the expected 5-10 users on a LAN without adding Postgres overhead.

## Recipes and Config Files

The backend reads files from the backend host filesystem.

Defaults:

- recipes: `recipes/`
- aisle config: `config/aisle.conf`
- pantry config: `config/pantry.conf`

Recipe files can be nested, for example:

- `recipes/breakfast/omelette.cook`
- `recipes/dinner/pasta/carbonara.cook`

## Shared vs Local Behavior

Shared across devices:

- meal plan
- default unit system
- backend source settings
- shopping aggregation inputs

Local to each device:

- active timers
- currently selected recipe/tab during the session
- any unsynced UI state while the backend is unavailable

## CI

The repo keeps frontend build/test checks and backend `mix check` as separate concerns.

If you add backend behavior, run:

```bash
cd backend
mix check
```

If you add frontend behavior, run:

```bash
npm run build
npm test
```
