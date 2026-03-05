# Cooklang Cook Mode (Vue)

Vue 3 + TypeScript app for browsing and cooking from Cooklang (`.cook`) recipes.

## Features

- Auto-load recipes from `./recipes` over HTTP (recursive folder support)
- Collapsible recipe folder tree in the sidebar
- Recipe detail view with front-matter title/description/image
- Ingredient scaling by servings
- Unit conversion between `Metric` and `US Customary`
- Steps tab with inline tokens:
  - ingredients (green)
  - tools (red)
  - timers (blue)
- Start/cancel timers from inline step timers
- Active timers panel with live countdown
- Tools tab listing parsed cookware/tools
- Meal Plan tab for rolling next 7 days (one slot/day)
- Random meal-plan generation with no repeats across filled days
- Per-day planned servings with local persistence (`localStorage`)
- Plan Shopping tab aggregating all planned meals with pantry + aisle config
- Auto-refresh on changes (polling + focus/visibility refresh)

## Run locally

```bash
npm install --cache /tmp/.npm-cache
npm run dev
```

Open the Vite URL shown in terminal (typically `http://127.0.0.1:5173`).

## Build and preview

```bash
npm run build
npm run preview
```

## Tests

```bash
npm test
```

## GitHub Pages deployment

Yes—this app can be built in GitHub Actions and hosted on GitHub Pages.

1. Push to the `main` branch (or trigger the workflow manually).
2. In GitHub repo settings, set **Pages > Build and deployment > Source** to **GitHub Actions**.
3. The workflow at `.github/workflows/deploy-pages.yml` builds with `npm ci && npm run build` and deploys `dist/`.

The workflow uses `actions/configure-pages` and passes its `base_path` to Vite via `VITE_BASE_PATH`, so assets resolve correctly for both project sites and custom-domain/user sites.

## Mutation testing (StrykerJS)

```bash
npm run test:mutation
```

Mutation thresholds are enforced at `100%` (`high`, `low`, and `break`) in [`stryker.conf.json`](/Users/david/projects/cookbook/stryker.conf.json).

## Recipes

Put `.cook` files under `recipes/`, including nested folders, for example:

- `recipes/breakfast/omelette.cook`
- `recipes/dinner/pasta/carbonara.cook`
