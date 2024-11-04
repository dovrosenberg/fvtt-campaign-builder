import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

export default definePreset(Aura, {
  components: {
    datatable: {
      headerBackground: 'inherit',
      headerCellBackground: 'inherit',
      rowBackground: 'inherit',
      rowStripedBackground: 'inherit',
      footerCellBackground: 'inherit',
      footerBackground: 'inherit',
    }
  }
});
