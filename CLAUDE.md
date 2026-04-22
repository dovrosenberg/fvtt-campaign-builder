# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Foundry VTT module for world-building and campaign management. GMs create interconnected entries (characters, locations, organizations, events), plan sessions (Lazy DM style), manage story arcs, fronts, and story webs. Optional AI-assisted content generation via external backend.

**Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia, PrimeVue 4, TypeScript, Vite 6, SCSS. Target: Foundry VTT v13+.

## Commands

- **`npm run debug`** — Preferred dev build (~7 seconds, non-minified). Reload Foundry to see changes.
- **`npm run debug:test`** — Use instead of `debug` when adjusting unit tests.
- **`npm run build`** — Production build. Only use if explicitly asked.
- **`npm run lint`** — ESLint for `.ts` and `.vue` files.
- **`npm run tscvue`** — Full TypeScript + Vue type checking.
- **`npm test`** — Playwright E2E tests (headless Chrome).

## Architecture

### Foundry Integration
- Extends Foundry's `DocumentSheetV2` via custom `VueApplicationMixin` (in `src/libraries/fvtt-vue/`).
- Singleton Vue app with portal-based rendering (`VueHost`) for multi-window support.
- Hook-based initialization in `src/hooks/`. Entry point: `src/main.ts`.
- All data stored as JournalEntryPage subtypes: `entry2`, `session2`, `campaign2`, `arc2`, `front2`, `storyWeb2`, `setting2`. Schemas in `src/documents/`, wrapper classes in `src/classes/Documents/`.

### State Management
- 11 Pinia stores in `src/applications/stores/` (mainStore, navigationStore, storyWebStore, etc.).
- Per-panel content state managed by `useTabPanelState` composable — each `TabPanel` creates its own independent state.
- Story Web: `storyWebStore` is a thin facade (~90 lines) delegating to per-panel `useStoryWebGraphState` composables (~1630 lines), provided via `STORY_WEB_GRAPH_STATE_KEY` and injected by `StoryWebGraph.vue`. Multiple Story Webs can be open in parallel panels.

### Path Aliases
- `@/` → `src/`
- `@module` → `static/module.json`
- `@unittest/` → `test/unit/`

### Key Directories
- `src/components/` — ~91 Vue SFCs organized by feature (ContentTab/, Directory/, Editor/, FCBHeader/, AIGeneration/, tables/, dialogs/).
- `src/classes/Documents/` — Wrapper classes around Foundry documents (Entry, Campaign, Session, Arc, Front, StoryWeb, FCBSetting).
- `src/utils/` — ~55 stateless utility service modules (single object with methods, default export).
- `src/composables/` — 11 Composition API composables for per-panel and derived state.
- `src/apiClient/` — Auto-generated REST client (`npm run updateREST`).
- `static/lang/` — i18n files. Only edit `en.json`; the build pipeline handles translations.

## Conventions

Detailed conventions live in AGENTS.md files — follow them when editing in those directories:
- **Root** `AGENTS.md` — Commands, architecture, coding standards (TypeScript, Vue, style/linting).
- **`src/components/AGENTS.md`** — Mandatory Vue component template, file header, `<script setup>` section ordering.
- **`src/utils/AGENTS.md`** — Utility service pattern (single default-exported object, JSDoc on every method).
- **`test/unit/AGENTS.md`** — Quench testing patterns, shared test setting, batch registration.

### Key Rules
- `@typescript-eslint/no-floating-promises: error` — all promises must be handled.
- Avoid `any`; use `unknown` and narrow. Prefer `== null` over `=== null`.
- No single-line if bodies.
- All `.ts` methods must have JSDoc comments. No `@memberof`.
- Localize user-facing strings via `localize()` from `@/utils/game`, not Foundry's i18n.
- CSS styles are namespaced under `.fcb` prefix (PostCSS) to isolate from Foundry styles.
- When Foundry VTT APIs are available both globally and inside the `foundry` namespace, use the namespace, not the global.

## Testing

### Unit Tests (Quench)
- Run **inside actual Foundry VTT** — not pure unit tests. Never stub core Foundry APIs (`game`, `Actor`, etc.).
- All batches share one global `FCBSetting` managed by `testSettingManager` in `test/unit/testUtils.ts`.
- Use `createBatch()` for standard batch registration with setup/teardown boilerplate.
- Build with `npm run debug:test` before running tests in Foundry's Quench UI.

### E2E Tests (Playwright)
- `npm test` runs headless Chrome tests. Serial execution (single worker).
- Requires a running Foundry instance with `CampaignBuilderTest` world and module installed.

## Pitfalls

- Foundry hooks like `updateJournalEntryPage` combined with `refreshContentAcrossPanels()` can trigger watcher loops by producing new computed-ref object identities on every save. Guard watchers to fire only on meaningful changes (e.g., different UUID), and use explicit regeneration methods inside modification paths rather than relying on watchers.
- The `app` workspace folder (if present) contains Foundry VTT client source. Treat it as **read-only reference** — never modify it.
