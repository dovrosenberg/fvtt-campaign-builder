import moduleJson from '@module';

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
        name: 'fwb.keybindings.closeTab',
        hint: 'fwb.keybindings.closeTabHelp',
        onDown: () => { alert('close tab'); /* call function on getWorldBuilderApp */ },
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