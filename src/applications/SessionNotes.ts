import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/SessionNotes.vue';
import { localize } from '@/utils/game';
import { Session } from '@/classes';
import { theme } from '@/components/styles/primeVue';
import { useMainStore, usePlayingStore } from '@/applications/stores';
import { FCBDialog } from '@/dialogs';
import SessionNotes from '@/components/applications/SessionNotes.vue';

const { ApplicationV2 } = foundry.applications.api;

export class SessionNotesApplication extends VueApplicationMixin(ApplicationV2) {
  public static title: string;
  public static app: SessionNotesApplication | null = null;

  constructor() { 
    super(); 
    SessionNotesApplication.app = this; 
  }

  public static get component(): typeof SessionNotes {
    return SessionNotesApplication.app?.parts.app;
  }

  public static async close(): Promise<void> {
    await SessionNotesApplication.app?.close();
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
      const component = SessionNotesApplication.component;
      const session = usePlayingStore().currentPlayedSession;
      
      if (component && session) {
        // check if the session notes window is dirty and save if needed
        if (component.isDirty()) {
          if (await FCBDialog.confirmDialog(localize('dialogs.saveSessionNotes.title'), localize('dialogs.saveSessionNotes.message'))) {

            session.notes = component.getNotes();
            if (session.notes != null)
              await session.save();

            // refresh the content in case we're looking at the notes page for that session
            await useMainStore().refreshCurrentContent();
          }
        }
      }

      // clear the variable
      SessionNotesApplication.app = null;

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
  if (SessionNotesApplication.app) {
    // close the old one
    await SessionNotesApplication.app.close();
  }

  SessionNotesApplication.title = `Session ${session.number}`;
  SessionNotesApplication.app = new SessionNotesApplication();

  await SessionNotesApplication.app.render(true);
}
