import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

export default definePreset(Aura, {
  components: {
    datatable: {
      headerBackground: 'inherit',
    }
  }
});
