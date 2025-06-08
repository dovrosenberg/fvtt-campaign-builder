import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/SessionNotes.vue';
import { localize } from '@/utils/game';
import { Session } from '@/classes';
import { theme } from '@/components/styles/primeVue';
import { usePlayingStore } from '@/applications/stores';

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
        width: 550,
        height: 400,
      },
      actions: {}
    }
  };

  /**
   * Closes the application and unmounts all instances.
   * 
   * @param {ApplicationClosingOptions} [options] - Optional parameters for closing the application.
   * @returns {Promise<BaseApplication>} - A Promise which resolves to the rendered Application instance.
   */
    async close(options = {}) {
      // clear the variable
      sessionNotesApp = null;

      // get store and set window to null
      const playingStore = usePlayingStore();
      playingStore.openSessionNotesWindow = null;

      // Call the close method of the base application
      return await super.close(options);
    }

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

  // get store and set window to the component instance
  const playingStore = usePlayingStore();
  playingStore.openSessionNotesWindow = sessionNotesApp.parts.app ?? null;
}
