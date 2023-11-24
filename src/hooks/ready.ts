import { registerHelpers } from '@/handlebars';

export function registerForReadyHook() {
  Hooks.once('ready', ready);
}

async function ready(): Promise<void> {
  registerHelpers();
}

