import type MarkdownIt from 'markdown-it'
import fs from 'fs'
import path from 'path'

// Cache for common tooltips
let commonTooltips: Record<string, string> = {}
let tooltipsLoaded = false

// Function to load common tooltips from file
function loadCommonTooltips() {
  if (tooltipsLoaded) return commonTooltips
  
  try {
    const tooltipsPath = path.join(__dirname, 'common-tooltips.md')
    if (fs.existsSync(tooltipsPath)) {
      const content = fs.readFileSync(tooltipsPath, 'utf-8')
      
      // Parse the content to extract tooltip definitions
      // Format: [^term]: definition text
      const lines = content.split('\n')
      for (const line of lines) {
        const match = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/)
        if (match) {
          const [, term, definition] = match
          commonTooltips[term.trim().toLowerCase()] = definition.trim()
        }
      }
    }
  } catch (error) {
    console.warn('Could not load common tooltips:', error)
  }
  
  tooltipsLoaded = true
  return commonTooltips
}

// Plugin to handle [^term]{definition} and [^term] syntax for tooltips
export default function tooltipPlugin(md: MarkdownIt) {
  // Load common tooltips
  loadCommonTooltips()

  // Inline rule to match [^term]{definition} or [^term] pattern
  md.inline.ruler.before('emphasis', 'tooltip', (state, silent) => {
    const start = state.pos
    const maximum = state.posMax

    // Must start with [^
    if (start >= maximum - 1 || 
        state.src.charCodeAt(start) !== 0x5B /* [ */ ||
        state.src.charCodeAt(start + 1) !== 0x5E /* ^ */) {
      return false
    }

    // Find closing ]
    let pos = start + 2 // Start after [^
    let found = false
    while (pos < maximum) {
      if (state.src.charCodeAt(pos) === 0x5D /* ] */) {
        found = true
        break
      }
      pos++
    }

    if (!found) {
      return false
    }

    const term = state.src.slice(start + 2, pos) // Skip [^
    let definition = ''

    // Check if this is inline definition syntax [^term]{definition}
    if (pos < maximum - 1 && state.src.charCodeAt(pos + 1) === 0x7B /* { */) {
      // Find closing }
      let defStart = pos + 2
      let defEnd = defStart
      found = false
      while (defEnd < maximum) {
        if (state.src.charCodeAt(defEnd) === 0x7D /* } */) {
          found = true
          break
        }
        defEnd++
      }

      if (!found) {
        return false
      }

      definition = state.src.slice(defStart, defEnd)
      pos = defEnd // Update position to after the }
    } else {
      // Look up term in common tooltips
      const lookupTerm = term.trim().toLowerCase()
      definition = commonTooltips[lookupTerm]
      
      if (!definition) {
        // Term not found in common tooltips, don't process as tooltip
        return false
      }
    }

    if (!term.trim() || !definition.trim()) {
      return false
    }

    if (!silent) {
      const token = state.push('tooltip', 'span', 0)
      token.markup = state.src.slice(start, pos + 1)
      token.meta = { term: term.trim(), definition: definition.trim() }
    }

    state.pos = pos + 1
    return true
  })

  // Renderer for tooltip tokens
  md.renderer.rules.tooltip = (tokens, idx) => {
    const token = tokens[idx]
    const { term, definition } = token.meta
    
    // Escape HTML entities in the definition for safety
    const escapedDefinition = md.utils.escapeHtml(definition)
    const escapedTerm = md.utils.escapeHtml(term)
    
    return `<span class="tooltip-container" data-tooltip="${escapedDefinition}">${escapedTerm}</span>`
  }
} 