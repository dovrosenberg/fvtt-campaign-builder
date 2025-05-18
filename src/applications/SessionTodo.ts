import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';

import App from '@/components/applications/SessionTodo.vue';
import { localize } from '@/utils/game';
import { Session } from '@/classes';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

// the most recent one; we track this so it can close itself
export let sessionTodoApp: SessionTodoApplication | null = null;

export class SessionTodoApplication extends VueApplicationMixin(ApplicationV2) {
  public static title: string;

  constructor() { 
    super(); 
    sessionTodoApp = this; 
  }
  
  static get DEFAULT_OPTIONS() {
    return {
      id: `app-fcb-session-todo`,
      classes: ['fcb-session-todo'], 
      window: {
        title: `${localize('applications.sessionTodo.title')} - ${SessionTodoApplication.title}`,
        icon: 'fa-solid fa-check-square',
        resizable: true,
      },
      position: {
        width: 550,
        height: 400,
      },
      actions: {}
    }
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-session-todo-app',
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

// Function to open the session todo window
export async function openSessionTodo(session: Session): Promise<void> {
  // Create and render the application
  if (!sessionTodoApp) {
    SessionTodoApplication.title = `Session ${session.number}`;
    sessionTodoApp = new SessionTodoApplication();
  }
  
  await sessionTodoApp.render(true);
}

// Function to close the session todo window
export async function closeSessionTodo(): Promise<void> {
  if (!sessionTodoApp) 
    return;

  sessionTodoApp.close();
  sessionTodoApp = null;
} 