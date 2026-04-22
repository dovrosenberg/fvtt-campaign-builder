# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Project conventions, stack, commands, architecture, and coding style live in @AGENTS.md — treat it as authoritative.

## Additional notes for Claude

- Nested `AGENTS.md` files exist in `src/`, `src/components/`, `src/utils/`, and `test/unit/`. When editing inside those directories, the local `CLAUDE.md` pulls in the corresponding `AGENTS.md` — follow it for file-level conventions.
- `npm run debug` takes ~7 seconds; prefer it over `npm run build` unless the user explicitly asks for production output.
- Only edit `static/lang/en.json`; the build pipeline handles other translations.
- Story Web has a non-obvious architecture: `storyWebStore` is a thin facade (~90 lines) and the real state lives in per-panel `useStoryWebGraphState` composables, provided via `STORY_WEB_GRAPH_STATE_KEY` and injected by `StoryWebGraph.vue`. Multiple Story Webs can be open in parallel panels.
- Foundry hooks like `updateJournalEntryPage` combined with `refreshContentAcrossPanels()` can trigger watcher loops by producing new computed-ref object identities on every save. Guard watchers to fire only on meaningful changes (e.g. different UUID), and use explicit regeneration methods inside modification paths rather than relying on watchers.
