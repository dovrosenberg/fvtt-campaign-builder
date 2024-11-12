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
    },
    button: {
      colorScheme: { 
        light: {
          primaryHoverBackground: 'inherit',
          primaryHoverBorderColor: 'inherit',
          primaryHoverColor: 'inherit',
          primaryActiveBackground: 'inherit',
          primaryAcriveBorderColor: 'inherit',
          primaryActiveColor: 'inherit',
        },
        dark: {
          primaryHoverBackground: 'inherit',
          primaryHoverBorderColor: 'inherit',
          primaryHoverColor: 'inherit',
          primaryActiveBackground: 'inherit',
          primaryAcriveBorderColor: 'inherit',
          primaryActiveColor: 'inherit',
        },
      }
    },
    dialog: {
      borderRadius: '6px',
    }
  }
});
