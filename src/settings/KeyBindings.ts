import moduleJson from '@module';
import { wbApp } from '@/applications/WorldBuilder';
import { useNavigationStore } from '@/applications/stores/navigationStore';

export enum KeyBindingKeys {
  closeTab = 'closeTab',   // close the current tab
}

export class KeyBindings {
  public static register() {
    if (!game.keybindings)
      return;

    const keybindings = [
      {
        bindingId: KeyBindingKeys.closeTab,
        name: 'wcb.keybindings.closeTab',
        hint: 'wcb.keybindings.closeTabHelp',
        onDown: () => { 
          // only trap this when the window is open
          if (wbApp && wbApp.rendered) {
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
            modifiers: [ KeyboardManager.MODIFIER_KEYS.ALT ]
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