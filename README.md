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

## Recipes

Put `.cook` files under `recipes/`, including nested folders, for example:

- `recipes/breakfast/omelette.cook`
- `recipes/dinner/pasta/carbonara.cook`
