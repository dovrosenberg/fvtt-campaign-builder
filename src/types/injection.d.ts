// these are types used by provides/injects

import { Ref } from 'vue';

export type CollapsedInjectionKeyType = {
  collapsed: Ref<boolean>;
  updateCollapsed: (collapsed: boolean) => void;
};
