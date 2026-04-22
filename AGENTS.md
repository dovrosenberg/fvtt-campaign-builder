# AGENTS.md

## Project Overview

World & Campaign Builder is a Foundry VTT module (system-agnostic TTRPG tool) built with Vue 3 + TypeScript + Vite. GMs create interconnected entries (characters, locations, organizations, events), plan sessions (Lazy DM style), manage story arcs, fronts, and story webs.  AI features (content/image generation) are optional and disabled by default; they use a separate backend module typically run in Google Cloud.

**Stack:** Vue 3 (Composition API, `<script setup lang="ts">`), Pinia, PrimeVue 4, TypeScript, Vite 6, SCSS. Target: Foundry VTT v13/v14.

## Overall approach **Important**

1. If you have specific questions that you cannot immediately answer, ask the user rather than making assumptions or digging through multiple files.  If the user does not know, then proceed as you otherwise would to find the answer.

2. Keep it simple. Do not over-complicate code.  Do not add extensive readmes or large template comments unless explicitly asked.

3. Don't change public behavior, UX flows, or data contracts without an explicit request.

4. Don't do broad drive-by formatting across unrelated files.

## Build & Development Commands

```bash
npm run build          # Production build (minified, outputs to dist/)
npm run debug          # Development build (unminified, sourcemaps, --mode development)
npm run debug:test     # Test build (unminified, sourcemaps, Istanbul instrumentation, --mode test)
npm run lint           # Lint src/ with ESLint
npm run tsc            # Type-check with tsgo (native TS compiler)
npm run tscvue         # Type-check with vue-tsc (slower, handles Vue SFCs)
```

The built module is deployed to Foundry by symlinking `dist/` into the Foundry data directory: `npm run linkdata` (unlink with `npm run unlinkdata`).

## User documentation
Vitepress site in `/docs`.  

## Tests
### E2E Tests
Tests are Puppeteer-based E2E tests using Mocha in `/test/e2e`, running against a live Foundry instance with a real browser.

### Quench Unit Tests
Unit tests are in `/test/unit` and use [Quench](https://github.com/Ethaks/FVTT-Quench).

### Entry Point & Initialization

`src/main.ts` → `registerForHooks()` in `src/hooks/index.ts` which registers three Foundry hooks:

1. **`init`** (`src/hooks/init.ts`): Registers module settings, key bindings, DataModel types for JournalEntryPage, and the CampaignBuilderApplication sheet
2. **`ready`** (`src/hooks/ready.ts`): Initializes VueHost, external API, text enricher, runs migrations, loads defaults, checks backend
3. **`updateDocuments`** (`src/hooks/updateDocuments.ts`): Handles Foundry document lifecycle events

### Foundry Data Models

All module data is stored as JournalEntryPage subtypes registered in `CONFIG.JournalEntryPage.dataModels`:

- **Entry** (`campaign-builder.entry2`) — Characters, Locations, Organizations, Events, PCs
- **Setting** (`campaign-builder.setting2`) — World/region containers
- **Campaign** (`campaign-builder.campaign2`) — Campaign containers
- **Session** (`campaign-builder.session2`) — Session notes
- **Front** (`campaign-builder.front2`) — DungeonWorld-style fronts
- **Arc** (`campaign-builder.arc2`) — Story arcs
- **StoryWeb** (`campaign-builder.storyWeb2`) — Mindmap/relationship views

Data models are in `src/documents/` with corresponding DataModel classes.

### Application Shell

`CampaignBuilderApplication` (`src/applications/CampaignBuilder.ts`) extends `VueApplicationMixin(DocumentSheetV2)` — a custom mixin (`src/libraries/fvtt-vue/VueApplicationMixin.ts`) that bridges Foundry's DocumentSheetV2 with Vue 3. The VueHost (`src/libraries/fvtt-vue/VueHost.ts`) manages Vue app lifecycle and mounting.

### State Management

Pinia stores in `src/applications/stores/`:

- `mainStore` — Core module state
- `navigationStore` — Navigation/tab state
- `settingDirectoryStore` / `campaignDirectoryStore` — Directory trees
- `relationshipStore` — Entry relationships
- `campaignStore` / `sessionStore` / `frontStore` / `arcStore` / `storyWebStore` — Feature-specific state
- `playingStore` — Live play tracking
- `backendStore` — AI backend configuration

Composables in `src/composables/` provide derived/computed state (e.g., `useEntryDerivedState`, `useCampaignDerivedState`).

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/applications/` | Main app class, stores, directory/sheet classes |
| `src/components/` | Vue SFC components organized by feature (AIGeneration, ContentTab, Directory, Editor, etc.) |
| `src/composables/` | Vue composables for derived state |
| `src/dialogs/` | Dialog helpers (createEntry, saveChanges, confirm, etc.) |
| `src/documents/` | Foundry DataModel definitions and custom fields |
| `src/hooks/` | Foundry hook registrations (init, ready, updateDocuments) |
| `src/libraries/fvtt-vue/` | Vue-Foundry bridge (VueApplicationMixin, VueHost) |
| `src/libraries/foundry/` | Foundry utility wrappers |
| `src/settings/` | Module settings, key bindings, user flags |
| `src/utils/` | Utility services (each exported as default object — see pattern below) |
| `src/apiClient/` | Auto-generated OpenAPI client (regenerated via `npm run updateREST`) |
| `src/compendia/` | Compendium pack management |
| `src/classes/` | Core classes (Entry, WindowTab, ExternalAPI) |
| `src/types/` | Shared TypeScript type definitions |

### Utility Service Pattern

Utils in `src/utils/` follow a singleton object pattern — a plain object with methods, exported as default:

```typescript
const MyService = {
  methodOne: (param: Type): ReturnType => { /* ... */ },
  methodTwo: (): void => { /* ... */ },
};
export default MyService;
```

Do not use classes or `new` for utility services. Stateful services should use Pinia stores instead.

### Path Aliases

- `@/` → `src/`
- `@module` → `static/module.json`
- `@test/` → `test/`
- `@unittest/` → `test/unit/`
- `@e2etest/` → `test/e2e/`

### CSS

All CSS is prefixed with `.fcb` via PostCSS (`postcss-prefix-selector`) to avoid conflicts with Foundry's styles. SCSS is consolidated into `dist/styles/campaign-builder.css`. The `@use "@/components/styles/mixins" as *` is auto-injected into every SCSS block.

### PrimeVue

UI components use PrimeVue 4. Components are manually imported (auto-import resolver is commented out in vite.config.ts).

## Type Checking

- `npm run tsc` uses `tsgo` (native Go-based TypeScript compiler) for faster type checking
- `npm run tscvue` uses `vue-tsc` for full Vue SFC type checking
- `tsconfig.json` has `noImplicitAny: false` and `strictPropertyInitialization: false`
- E2E tests have their own `tsconfig.json` targeting ES2022

## Linting

ESLint with `@typescript-eslint` and `vue/vue3-recommended`. Config in `.eslintrc.json`. Key rules: single quotes, 2-space indent, Unix linebreaks, no floating promises (error).


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