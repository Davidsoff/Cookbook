# Cookbook Agent Guide

Project root: `/Users/david/projects/cookbook`

Planning doc: [PLANS.md](PLANS.md)

## Project Context

- `/Users/david/projects/cookbook/index.html`: Vite HTML entry.
- `/Users/david/projects/cookbook/src/main.ts`: Vue app bootstrap.
- `/Users/david/projects/cookbook/src/App.vue`: main UI shell.
- `/Users/david/projects/cookbook/src/components/`: UI components (tree, tabs, panels, timers).
- `/Users/david/projects/cookbook/src/composables/useRecipesSource.ts`: HTTP recipe crawling + polling.
- `/Users/david/projects/cookbook/src/stores/useCookbookStore.ts`: app state.
- `/Users/david/projects/cookbook/src/lib/`: parser/conversion/tree/time helpers.
- `/Users/david/projects/cookbook/src/styles.css`: app styling.
- `/Users/david/projects/cookbook/recipes/`: local `.cook` recipe files served over HTTP.
- `/Users/david/projects/cookbook/tests/`: Vitest coverage for parser/tree/units.
- `/Users/david/projects/cookbook/README.md`: user-facing run instructions and feature summary.

## Commands (Copy/Paste)

Run from `/Users/david/projects/cookbook`.

### Install

```bash
npm install --cache /tmp/.npm-cache
```

Success criteria: installs dependencies without errors.

### Dev

```bash
npm run dev
```

Success criteria: Vite starts without errors and prints a local URL.

### Build Sanity

```bash
npm run build
```

Success criteria: exits with code `0` and emits `dist/` output.

### Test

```bash
npm test
```

Success criteria: Vitest exits with code `0`.

## Dev/Build/Test Loop

1. After each code change, run **Build Sanity**.
2. If build passes, run **Test**.
3. Before opening a PR, run **Build Sanity**, and **Test** from a clean shell in project root.

Loop passes when all commands exit `0` with no traceback/errors.

## Bug Fix Rule

- For every bug fix, add at least one regression test that covers the bug.
- The regression test should fail before the fix and pass after the fix.
- Prefer the smallest effective scope: unit test first, then component/integration when needed.
