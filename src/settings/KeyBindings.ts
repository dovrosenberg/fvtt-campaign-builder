import moduleJson from '@module';
import { getCampaignBuilderApp, wbApp } from '@/applications/CampaignBuilder';
import { useNavigationStore } from '@/applications/stores/navigationStore';

export enum KeyBindingKeys {
  closeTab = 'closeTab',   // close the current tab
  historyBack = 'historyBack',   // move back in tab history
  historyForward = 'historyForward',   // move forward in tab history
  toggleWindow = 'toggleWindow',   // open/close the main window
}

export class KeyBindings {
  public static register() {
    if (!game.keybindings)
      return;

    const keybindings = [
      {
        bindingId: KeyBindingKeys.closeTab,
        name: 'fcb.settings.keybindings.closeTab',
        hint: 'fcb.settings.keybindings.closeTabHelp',
        onDown: () => { 
          // only trap this when the window is open
          if (wbApp?.rendered) {
            const store = useNavigationStore();
            const tab = store.getActiveTab();
            if (tab) {
              store.removeTab(tab.id);
            }
          }
        },
        editable: [
          {
            key: 'KeyW',
            modifiers: [ 
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT,
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
            ]
          }
        ],
      },
      {
        bindingId: KeyBindingKeys.historyBack,
        name: 'fcb.settings.keybindings.historyBack',  
        hint: 'fcb.settings.keybindings.historyBackHelp',
        onDown: async () => { 
          // only trap this when the window is open
          if (wbApp?.rendered) {
            const store = useNavigationStore();
            await store.navigateHistory(-1);
          }
        },
        editable: [
          {
            key: 'ArrowLeft',
            modifiers: [ 
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT,
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
            ]
          }
        ],
      },
      {
        bindingId: KeyBindingKeys.historyForward,
        name: 'fcb.settings.keybindings.historyForward',
        hint: 'fcb.settings.keybindings.historyForwardHelp',
        onDown: async () => { 
          // only trap this when the window is open
          if (wbApp?.rendered) {
            const store = useNavigationStore();
            await store.navigateHistory(1);
          }
        },
        editable: [
          {
            key: 'ArrowRight',
            modifiers: [ 
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.ALT,
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL
            ]
          }
        ],
      },
      {
        bindingId: KeyBindingKeys.toggleWindow,
        name: 'fcb.settings.keybindings.toggleWindow',
        hint: 'fcb.settings.keybindings.toggleWindowHelp',
        onDown: async () => { 
          // only trap this when the window is open
          if (wbApp?.rendered) {
            wbApp.close();
          } else {
            const app = getCampaignBuilderApp();
            app.render(true);
          }
        },
        editable: [
          {
            key: 'Z',
            modifiers: [ 
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL,
              foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.SHIFT
            ]
          }
        ],
      },
    ];

    for (let i=0; i<keybindings.length; i++) {
      const binding = keybindings[i];

      const { bindingId, ...bindingData } = binding;
      game.keybindings.register(moduleJson.id, bindingId, {
        onUp: () => {},
        precedence: CONST.KEYBINDING_PRECEDENCE.NORMAL,
        restricted: true,   // restrict to GM only
        repeat: false,
        reservedModifiers: [],
        ...bindingData,
      });
    }
  }
}