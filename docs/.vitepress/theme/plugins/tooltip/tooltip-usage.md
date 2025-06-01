# Tooltip System Usage

The tooltip system provides two ways to add hover tooltips to your documentation using the `[^term]` syntax to differentiate from shortcuts:

## 1. Common Definitions (Recommended)

Define terms once in `theme/plugins/tooltip/common-tooltips.md` and reuse them throughout your documentation.

### Adding Common Definitions

Edit `docs/common-tooltips.md` and add terms in this format:

```markdown
[^term]: definition text
```

Example:
```markdown
[^API]: Application Programming Interface - a set of protocols and tools for building software applications
[^HTML]: HyperText Markup Language - the standard markup language for creating web pages
```

### Using Common Definitions

Simply reference the term with the caret syntax:

```markdown
[^HTML] is the foundation of web pages.
When working with [^API] endpoints, consider rate limiting.
```

**Result**: [^HTML] is the foundation of web pages. When working with [^API] endpoints, consider rate limiting.

## 2. Inline Definitions

For one-off definitions or terms specific to a single page, use inline syntax:

```markdown
[^term]{definition}
```

Example:
```markdown
[^VitePress]{A Vue.js-based static site generator} powers this documentation site.
```

**Result**: [^VitePress]{A Vue.js-based static site generator} powers this documentation site.

## Syntax Differentiation

The tooltip system uses `[^term]` syntax to clearly differentiate from other markdown features:

- **Tooltips**: `[^term]` or `[^term]{definition}`
- **Links/Shortcuts**: `[text](url)` or `[text](id)`
- **Regular markdown**: `[text]` (not processed as tooltip)

## Features

- **Responsive**: Tooltips scale with browser zoom and work on mobile devices
- **Accessible**: Support for screen readers and keyboard navigation
- **Styled**: Matches your VitePress theme (light/dark mode support)
- **Fast**: Common definitions are cached for performance
- **Case-insensitive**: `[^html]` and `[^HTML]` both work for common definitions
- **No conflicts**: Won't interfere with shortcuts or other markdown syntax

## Best Practices

1. **Use common definitions for frequently used terms** like technical acronyms, project-specific terminology, etc.

2. **Use inline definitions for page-specific terms** or when you need a different definition than what's in the common file.

3. **Keep definitions concise** - tooltips work best with short, clear explanations.

4. **Use descriptive terms** - make sure the term text clearly indicates what will be explained.

## Syntax Rules

- Terms must be enclosed in `[^term]` brackets with caret
- Inline definitions must immediately follow: `[^term]{definition}`
- No spaces between term and definition: `[^term] {definition}` won't work
- Empty terms or definitions are ignored
- Terms not found in common definitions file are ignored (unless using inline syntax)

## Examples

### Technical Documentation
```markdown
The [^REST] [^API] accepts [^JSON] payloads and returns structured data.
Use [^CRUD] operations to manage resources.
```

### Gaming Documentation  
```markdown
As a [^GM], you'll manage [^NPCs] while players control their [^PCs].
[^Foundry VTT] provides excellent support for [^D&D] campaigns.
```

### Mixed Approach
```markdown
The [^Campaign Builder] uses [^Vue.js]{A progressive JavaScript framework} 
for the frontend and [^Node.js]{A JavaScript runtime for server-side development} 
for the backend [^API].
```

### With Links and Shortcuts
```markdown
Visit the [Campaign Builder homepage](https://example.com) to learn about [^Campaign Builder].
Use the [Advanced Features] shortcut while working with [^Foundry VTT].
``` 