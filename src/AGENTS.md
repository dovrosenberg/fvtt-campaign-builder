# agents.MD

## Scope

Agents are is allowed to:
- Create and modify typescript (.ts) and vue (.vue) files
- Create and modify co-located component files (types, composables, tests) when needed
- Refactor for readability, consistency, and performance without changing behavior (unless explicitly requested)
- Introduce new dependencies without asking

Agents are not allowed to:
- Change public behavior, UX flows, or data contracts without an explicit request
- Do broad drive-by formatting across unrelated files

## Foundry VTT
The latest version of the Foundry VTT API is available at https://foundryvtt.com/api/.  This should be used as authoritative reference for all Foundry VTT API questions.  Only the latest version needs to be supported unless specifically noted.

## Repo conventions

### Build command
- Prefer `npm run debug` as the standard build/run command for this repository (unless the user requests otherwise).

### TypeScript
- Avoid `any`. Use `unknown` and narrow whenever possible, unless it is a one-time use and narrowing would require significantly more code/complexity.
- Don't create const/let variables for intermediate expressions that are only used once, unless it is something particularly complex or it significantly improves readability.
- Unless there is a specific need to distinguish null vs. undefined, prefer (xx == null) or (xx != null) vs. === when comparing against null and/or undefined to pick up both at once.  Don't use == to compare against undefined - instead use == null to capture both.
- If statements should always have at least 2 lines (i.e. even if the body is very short, put it on a new line)

### Comments
- Include one-line comments for all non-trivial logic
- Any method in a .ts file should have full jsdoc comments preceeding it.

### function definitions
- Only define functions inside other functions if it needs to modify the variables in the outer function 
