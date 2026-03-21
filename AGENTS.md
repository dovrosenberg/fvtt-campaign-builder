# AGENTS.md

## Project Overview

Foundry VTT module for world-building and campaign management. GMs create interconnected entries (characters, locations, organizations, events), plan sessions (Lazy DM style), manage story arcs, fronts, and story webs. Optional AI-assisted content generation via external backend.

**Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia, PrimeVue 4, TypeScript, Vite 6, SCSS. Target: Foundry VTT v13+.

## Commands

- **`npm run debug`** — Preferred build command (dev mode, non-minified). Reload Foundry to see changes.
- `npm run build` — Production build (minified). Only use if explicitly asked.
- `npm run lint` — ESLint for .ts and .vue files
- `npm run tscvue` — TypeScript + Vue type checking
- `npm test` — Playwright E2E tests (headless)

## Architecture

### Foundry Integration
- Extends Foundry's `DocumentSheetV2` via custom `VueApplicationMixin` (in `src/libraries/fvtt-vue/`)
- Singleton Vue app with portal-based rendering (`VueHost`) for multi-window support and Vue DevTools
- Hook-based initialization in `src/hooks/` (init, ready, updateDocuments)
- Entry point: `src/main.ts` registers all Foundry hooks

### Custom Document Types
All stored as JournalEntryPage subtypes: `entry2`, `session2`, `campaign2`, `arc2`, `front2`, `storyWeb2`, `setting2`. Document schemas in `src/documents/`, wrapper classes in `src/classes/Documents/`.

### State Management
11 Pinia stores in `src/applications/stores/`: mainStore, navigationStore, settingDirectoryStore, campaignDirectoryStore, relationshipStore, campaignStore, sessionStore, playingStore, frontStore, storyWebStore, arcStore, backendStore.

### Key Directories
- `src/components/` — Vue components (~91 files), organized by feature (ContentTab/, Directory/, Editor/, FCBHeader/, AIGeneration/, tables/, dialogs/)
- `src/classes/` — Business logic classes (Entry, Campaign, Session, Arc, Front, StoryWeb, WindowTab)
- `src/documents/` — Foundry document type definitions with custom `fields/`
- `src/utils/` — ~30 utility modules (search, generation, migration, entity linking, UUID handling, etc.)
- `src/apiClient/` — Auto-generated REST client from OpenAPI spec (`npm run updateREST`)
- `static/lang/` — i18n files (en, fr, de, ru)

### Path Aliases
- `@/` → `src/`
- `@module` → `static/module.json`
- `@unittest/` → test utilities

## Scope Rules
- Don't change public behavior, UX flows, or data contracts without an explicit request.
- Don't do broad drive-by formatting across unrelated files.

## Coding Conventions

### TypeScript
- Avoid `any`; use `unknown` and narrow. Exception: one-time use where narrowing adds significant complexity.
- Prefer `== null` over `=== null` to catch both null and undefined.
- No single-line if bodies — always put the body on a new line.
- Don't create intermediate variables for one-time expressions unless it significantly improves readability.
- Only define functions inside other functions if they need to modify outer variables.
- All methods in .ts files must have JSDoc comments.  Don't use @memberof in JSDoc comments.
- Include one-line comments for all non-trivial logic.

### Vue Components
- Must follow the template in `src/components/AGENTS.md` — mandatory file header comment (Purpose, Responsibilities, Props, Emits, Slots, Dependencies) and strict section ordering in `<script setup>`.
- Section order: library imports → local imports → library components → local components → types → props → emits → store → data → computed → methods → event handlers → watchers → lifecycle hooks. Do not insert new sections. Leave unused sections with just the header (no "None" or "Empty" filler).
- One component per file.
- Event handlers named `on<EventName>` or `on<Descriptor><EventName>`.
- Methods called by other methods need JSDoc; event handlers don't.
- Include one-line comments for non-trivial logic and particularly complex template sections.
- Prefer inline template logic unless >60 characters. Avoid deeply nested inline ternaries. Extract repeated UI into smaller components.
- Localize all user-facing strings via `localize()` from `@/utils/game`, not Foundry's i18n directly.  Only localize strings into `en.json`.  The build process will handle translations.
- Props: object syntax with `PropType`, clear names, stable types, provide defaults.
- Emits: typed object syntax. Emit objects for multi-field payloads rather than positional args. Prefer `modelValue` + `update:modelValue` for v-model.
- Scoped SCSS styles; use CSS variables and design tokens. Avoid hard-coded magic numbers unless clearly layout-specific and documented.
- Accessibility: inputs must have labels or `aria-label`, buttons must be keyboard accessible, ensure sensible focus states and tab order.
- Performance: avoid unnecessary watchers. Use `watchEffect` only when it improves clarity and you truly want implicit dependencies.

### Utility Services (`src/utils/`)
- Structure as a single plain object with methods, exported as the default export. No classes or `new`.
- Each method must have JSDoc comments with `@param` and `@returns`.
- Use proper TypeScript types for parameters and return values.
- Use this pattern for stateless grouped utilities, external API interactions, and cross-cutting concerns.
- Don't use this pattern for stateful services (use Pinia stores), composables, or single-function exports (export the function directly).
- See `src/utils/AGENTS.md` for the full template and examples.

### Style/Linting
- 2-space indentation, single quotes, semicolons, unix line endings
- Vue files: script indented 1 level (2 spaces base indent)
- `@typescript-eslint/no-floating-promises: error` — all promises must be handled
- Vue: max 3 attributes per single line, 1 per line for multiline; hyphenated events and attributes

## Unit Testing (Quench)

See `test/unit/AGENTS.md` for all testing guidelines, patterns, and examples.
