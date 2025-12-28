import { VueApplicationMixin } from '@/libraries/fvtt-vue/VueApplicationMixin';
import PrimeVue from 'primevue/config';
import App from '@/components/dialogs/RelatedItemDialog.vue';
import { theme } from '@/components/styles/primeVue';

const { ApplicationV2 } = foundry.applications.api;

class RelatedItemApplication extends VueApplicationMixin(ApplicationV2) {
  constructor() { super(); }

  static DEFAULT_OPTIONS = {
    id: `app-fcb-related-item`,
    classes: ['fcb-related-item'], 
    window: {
      title: '',
      icon: '',
      resizable: false,
      // popOut: true,
      // editable: true,
      // //viewPermission: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
      // scrollY: ['ol.fcb-setting-list']
    },
    position: {
      // width: 600,
      // height: 300,
    },
    actions: {}
  };

  static DEBUG = false;

  static SHADOWROOT = false;

  static PARTS = {
    app: {
      id: 'fcb-related-item-app',
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

/** returns the selected uuid */
async function relatedItemDialog(
  title: string, 
  mainButtonLabel: string, 
  options: { id: string; label: string}[], 
  useOptions2: boolean = false, 
  options2: (id: string) => Promise<{id: string; label: string}[]> = async () => [], 
  extraFields: {field: string; header: string}[] = [], 
  itemId: string = '', 
  itemName: string = '', 
  allowCreate: boolean = false, 
  createButtonLabel: string = ''
): Promise<string | null> {
  // construct a promise that returns when the callback is called
  return new Promise<string | null>((resolve) => {
    const dialog = new RelatedItemApplication();

    const props = { 
      modelValue: true,
      title,
      mainButtonLabel,
      createButtonLabel,
      options,
      useOptions2,
      options2,
      extraFields,
      itemId,
      itemName,
      allowCreate,
      callback: async (selectedId: string): Promise<void> => {
        dialog.close(); 

        resolve(selectedId);
        return;
      }        
    };
   
    dialog.render({ force: true, props });
  });
}

export { 
  relatedItemDialog,
}

