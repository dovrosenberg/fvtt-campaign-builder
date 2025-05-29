/**
 * Represents a name generation style configuration with its associated prompt and display name.
 * Used by the name generator system to apply different stylistic approaches to generated names.
 */
export interface NameStyle {
  /** The prompt text sent to the AI generator, including {genre} placeholder for substitution */
  prompt: string;
  /** The human-readable display name shown in the UI */
  displayName: string;
}

/**
 * Collection of predefined name generation styles for use with the AI name generator.
 * Each style provides a different approach to name generation, from traditional to experimental.
 * The {genre} placeholder in prompts will be replaced with the world's genre setting.
 */
export const nameStyles: NameStyle[] = [
  {
    prompt: "Classic {genre} - Familiar and traditional names, often compound last names with heroic elements.",
    displayName: "Classic"
  },
  {
    prompt: "Inventive & Distinctive - Fresh and creative names that break conventional {genre} patterns while still fitting the setting. Mix unfamiliar syllables, rare linguistic roots, or hybrid structures. Most last names should NOT be composite words. These names should feel unique and unexpected.",
    displayName: "Distinctive"
  },
  {
    prompt: "Modern or Familiar - Modern names that are familiar in real life and easy to pronounce.",
    displayName: "Familiar"
  },
  {
    prompt: "Elegant or Elvish – Flowing, vowel-heavy names with poetic or noble tone. May include slurred sounds, musicality, internal rhythm, and fantastical grace.",
    displayName: "Elegant"
  },
  {
    prompt: "Weird or Alien - Unusual, otherworldly names. May include apostrophes, odd syllable combinations, or unnatural phonemes. Think sci-fi, dreamlike, or far realms.",
    displayName: "Weird"
  }
];

