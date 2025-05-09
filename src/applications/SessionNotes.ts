import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin.mjs';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/SessionNotes.vue';
import { localize } from '@/utils/game';
import { Session } from '@/classes';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let sessionNotesApp: SessionNotesApplication | null = null;

export class SessionNotesApplication extends VueApplicationMixin(ApplicationV2) {
  public static title: string;

  constructor() { 
    super(); 
    sessionNotesApp = this; 
  }
  
  static get DEFAULT_OPTIONS() {
    return {
      id: `app-fcb-session-notes`,
      classes: ['fcb-session-notes'], 
      window: {
        title: `${localize('applications.sessionNotes.title')} - ${SessionNotesApplication.title}`,
        icon: 'fa-solid fa-pen-to-square',
        resizable: true,
      },
      position: {
        width: 500,
        height: 400,
      },
      actions: {}
    }
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-session-notes-app',
      component: App,
      props: {},
      use: {
        primevue: { 
          plugin: PrimeVue, 
          options: {
            theme: theme
          }
        },
      }
    }
  };
}

// Function to open the session notes window
export async function openSessionNotes(session: Session): Promise<void> {
  // Create and render the application
  if (!sessionNotesApp) {
    SessionNotesApplication.title = `Session ${session.number}`;
    sessionNotesApp = new SessionNotesApplication();
  }
  
  await sessionNotesApp.render(true);
}

export async function closeSessionNotes(): Promise<void> {
  if (!sessionNotesApp) 
    return;

  sessionNotesApp.close();
}