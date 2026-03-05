# Cookbook Plans

## Purpose / Big Picture

Keep the cookbook app easy to run locally, resilient to recipe changes, and safe to edit by preserving a fast build/test loop.

## Progress

- Added repository-local AGENTS guidance with explicit paths and runnable commands.
- Added deterministic build sanity and HTTP smoke test commands.

## Decision Log

- Keep this project dependency-light: use `python3` for local server and smoke checks.
- Prefer a single-file static app workflow; no bundler/toolchain required.

## Outcomes & Retrospective

- Contributors have a copy-paste loop with clear pass/fail criteria.
- Readiness checks can validate documentation and execution consistently.

## Surprises & Discoveries

- Fixed-port smoke checks can fail when the port is occupied.
- Ephemeral-port smoke checks are more stable for automated execution.
