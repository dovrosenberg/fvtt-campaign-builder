# agents.MD (Windwurf)

This repository uses **Windwurf** to work **directly in Vue SFCs**. Treat every `.vue` file as both UI and API surface.

## Scope

Windwurf is allowed to:
- Create and modify Vue Single File Components (`.vue`)
- Create and modify co-located component files (types, composables, tests) when needed
- Refactor for readability, consistency, and performance without changing behavior (unless explicitly requested)
- Introduce new dependencies without asking

Windwurf is not allowed to:
- Change public behavior, UX flows, or data contracts without an explicit request
- Do broad drive-by formatting across unrelated files

## Repo conventions

### Vue + TypeScript
- Always use **Vue 3** + **Composition API**.
- Prefer `<script setup lang="ts">` unless there is a strong reason not to.
- defineProps uses object syntax:
  const props = defineProps({
    sampleComplexVariable: {
      type: Object as PropType<SampleComplexVariableType>,
      ...
    },
  });
- defineEmits uses object syntax:
  const emit = defineEmits<{
    (e: 'update:modelValue', value: string): void;
    (e: 'create-scene', value: string): void; 
    (e: 'generate-image'): void; 
  }>();

- Avoid `any`. Use `unknown` and narrow whenever possible, unless it is a one-time use and narrowing would require significantly more code/complexity.
- Prefer inline logic in templates over `computed` unless it requires more than 60 characters
 
### Component structure
- One component per file.
- Keep templates readable:
  - Avoid deeply nested inline ternaries.
  - Extract repeated UI into smaller components.
- Prefer small, named helper functions in the script for complex template logic.

### Props, emits, and v-model
- Props:
  - Use clear names and stable types.
  - Provide defaults where appropriate.
- Emits:
  - Declare and type all events.
  - Emit objects for multi-field payloads rather than many positional args.
- `v-model`:
  - Prefer `modelValue` + `update:modelValue` conventions.

### Styling
- Prefer scoped styles when the component is local-only, except for very top-level components (in order to avoid lots of repeating style definitions).
- Prefer CSS variables and existing design tokens when available.
- Avoid hard-coded magic numbers unless it is clearly layout-specific and documented.

### Accessibility
- Inputs must have labels (or `aria-label`).
- Buttons and interactive elements must be keyboard accessible.
- Ensure sensible focus states and tab order.

### Performance
- Avoid unnecessary watchers.
- Use `watchEffect` only when it improves clarity and you truly want implicit dependencies.

## Files MUST  follow a template format 

All new or significantly modified Vue component files **must follow** the following template structure.  Comments with **xx** are for your understanding and are not part of the template.

> Windwurf: Do not invent missing details. Sections can be left blank if unused, but still include the section headers.  

### Required file template

```vue
<!--
[COMPONENT NAME]: <Name>

Purpose
- <one sentence>

Responsibilities
- <description>

Props
- <name: type, meaning, default>

Emits
- <event name, payload type, when emitted>

Slots
- <slot name, expected content>

Dependencies
- Stores: <store names>
- Composables: <composable names>
- Services/API: <service names>

-->

<template>
</template>

<script setup lang="ts">
  // library imports
  // **Imports from npm packages**

  // local imports
  // **Imports from elsewhere in this project**

  // library components
  // **Imports of vue components from npm packages**

  // local components
  // **Imports of vue components from elsewhere in this project**

  // types
  // **Imports of types, regardless of source. Also definitions of file-specific types**

  ////////////////////////////////
  // props
  // **const props = defineProps({...**

  ////////////////////////////////
  // emits
  // **const emit = defineEmits<{...**

  ////////////////////////////////
  // store
  // **definition of store consts (ex. const mainStore = useMainStore();) and storeToRefs**

  ////////////////////////////////
  // data
  // **definitions of consts, variables, and refs**

  ////////////////////////////////
  // computed
  // **definitions of computed properties**

  ////////////////////////////////
  // methods
  // **general methods**

  ////////////////////////////////
  // event handlers
  // **methods used as event handlers in the template**
  // **event handlers should be named on<EventName> or on<Descriptor><EventName> if there are multiple handlers for the same event**

  ////////////////////////////////
  // watchers
  // **watchers**

  ////////////////////////////////
  // lifecycle hooks
  // **lifecycle hooks**
</script>

<style lang="scss" scoped>
</style>