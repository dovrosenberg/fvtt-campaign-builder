import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

export default definePreset(Aura, {
  components: {
    datatable: {
      headerBackground: 'inherit',
      headerCellBackground: 'inherit',
      headerCellSelected: {
        background: 'inherit',
        color: '#5d142b',   //'var(--color-warm-3)', - can't seem to set it to a variable?
      },
      rowBackground: 'inherit',
      rowStripedBackground: 'inherit',
      footerCellBackground: 'inherit',
      footerBackground: 'inherit',
      paginatorTopBorderColor: 'black',
      paginatorBottomBorderColor: 'black',
      paginatorTopBorderWidth: '1px',
      paginatorBottomBorderWidth: '1px',
    },
    paginator: {
      navButton: {
        height: '1rem',
        width: '1rem',
      }
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
      header: {
        padding: '0 .5rem',
      }
    },
    splitter: {
      root: {
        background: 'inherit',
        borderColor: 'none',
        color: 'inherit',
      }
    },
    splitterPanel: {
      borderRadius: '0',
      background: 'inherit',
      color: 'inherit',
      borderColor: 'none',
    }
  }
});
