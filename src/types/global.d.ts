import { BaseActor } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/documents.mjs';
import '@league-of-foundry-developers/foundry-vtt-types/src/index';

declare global {
   interface JournalPageSheet extends DocumentSheet {
    toc: any;
    object: any;
    onAutoSave(string): void;
    onNewSteps(): void;
  }

  // not quite right, but close enough
  interface JournalEntryPage extends JournalEntry {
  }
}

