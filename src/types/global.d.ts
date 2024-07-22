import '@league-of-foundry-developers/foundry-vtt-types/src/index.d.mts';

declare global {
   interface JournalPageSheet extends DocumentSheet {
    toc: any;
    object: any;
    onAutoSave(string): void;
    onNewSteps(): void;
  }

  interface xyz {
    a: number;
    b: ()=>number;
  }
}

