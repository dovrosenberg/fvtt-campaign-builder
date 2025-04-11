import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';
import { withDirectives } from 'vue';

export default definePreset(Aura, {
  components: {
    datatable: {
      headerBackground: 'inherit',
      headerCellBackground: 'inherit',
      headerCellColor: 'inherit',
      headerCellSelected: {
        background: 'inherit',
        color: '#5d142b',   //'var(--color-warm-3)', - can't seem to set it to a variable?
      },
      row: {
        background: 'inherit',
        color: 'black',
        hover: {
          background: 'inherit',
          color: 'black',
        }
      },
      bodyCellBorderColor: '#666',   // var(--color-border-dark-5)
      rowStripedBackground: 'inherit',
      footerCellBackground: 'inherit',
      footerBackground: 'inherit',
      // paginatorTopBorderColor: 'black',
      // paginatorBottomBorderColor: 'black',
      paginatorTopBorderWidth: '0px',
      paginatorBottomBorderWidth: '0px',
    },
    paginator: {
      navButton: {
        height: '1rem',
        width: '1rem',
      }
    },
    autocomplete: {
      dropdownBackground: {
        background: 'red',
        color: 'purple',
      },
    },
    inputtext: {
      background: 'rgba(0, 0, 0, 0.05)', 
      color: 'black',   //'var(--color-text-primary)',       // change to var
      borderRadius: '4px',
      focusBorderColor: 'black',  // change to var
      padding: {
        x: '3px',
        y: '1px',
      },
      focusRing: {
        color: '#c9593f',  // change to var
        width: '2px',
        style: 'solid',
      }
    },
    checkbox: {
      background: 'rgba(0, 0, 0, 0.05)',
      hoverBackground: 'rgba(0, 0, 0, 0.05)',
      borderRadius: '3px',
      checked: {
        background: '#ee9b3a',   
        hoverBackground: '#ee9b3a',
        borderColor: 'black',
        hoverBorderColor: 'black',
        focusBorderColor: 'black',  
      },
      icon: {
        checked: {
          color: 'black',   
          hoverColor: 'black',
        }
      },
      focusBorderColor: 'black',
    },
    textarea: {
      background: 'rgba(0, 0, 0, 0.05)', 
      color: 'black',   //'var(--color-text-primary)',       // change to var
      borderRadius: '4px',
      padding: {
        x: '3px',
        y: '1px',
      },
      focusBorderColor: 'black',  // change to var
      focusRing: {
        color: '#c9593f',  // change to var
        width: '2px',
        style: 'solid',
      }
    },
    // button: {
    //   colorScheme: { 
    //     light: {
    //       primaryHoverBackground: 'inherit',
    //       primaryHoverBorderColor: 'inherit',
    //       primaryHoverColor: 'inherit',
    //       primaryActiveBackground: 'inherit',
    //       primaryAcriveBorderColor: 'inherit',
    //       primaryActiveColor: 'inherit',
    //     },
    //     dark: {
    //       primaryHoverBackground: 'inherit',
    //       primaryHoverBorderColor: 'inherit',
    //       primaryHoverColor: 'inherit',
    //       primaryActiveBackground: 'inherit',
    //       primaryAcriveBorderColor: 'inherit',
    //       primaryActiveColor: 'inherit',
    //     },
    //   }
    // },
    // probably want to redo the dialogs in vue to avoid the css complexity of trying to fix them
    dialog: {
      borderRadius: '6px',
      header: {
        padding: '0 .5rem',
        color: 'inherit',
      }
    },
    splitter: {
      root: {
        background: 'inherit',
        borderColor: 'none',
        color: 'inherit',
      }
    },
    splitterpanel: {
      borderRadius: '0',
      background: 'inherit',
      color: 'inherit',
      borderColor: 'none',
    },
  }
});
