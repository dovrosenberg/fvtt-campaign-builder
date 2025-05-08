import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

export default definePreset(Aura, {
  components: {
    datatable: {
      colorScheme: {
        light: {
          headerCellSelectedColor: '#5d142b',   //'var(--color-warm-3)', - can't seem to set it to a variable?
          rowColor: 'black',
          rowHoverColor: 'black',
          bodyCellBorderColor: '#666',   // var(--color-border-dark-5)
        },
        dark: {
          headerCellSelectedColor: '#5d142b',   //'var(--color-warm-3)', - can't seem to set it to a variable?
          rowColor: 'black',
          rowHoverColor: 'black',
          bodyCellBorderColor: '#666',   // var(--color-border-dark-5)
        }
      },
      headerBackground: 'inherit',
      headerCellBackground: 'inherit',
      headerCellColor: 'inherit',
      headerCellSelected: {
        background: 'inherit',
      },
      row: {
        background: 'inherit',
        hover: {
          background: 'inherit',
        }
      },
      rowStripedBackground: 'inherit',
      footerCellBackground: 'inherit',
      footerBackground: 'inherit',
      paginatorTopBorderWidth: '0px',
      paginatorBottomBorderWidth: '0px',
    },
    paginator: {
      navButton: {
        height: '1rem',
        width: '1rem',
      }
    },
    inputtext: {
      colorScheme: {
        light: {
          color: 'black',   //'var(--color-text-primary)',       // change to var
          background: 'rgba(0, 0, 0, 0.05)', 
          borderColor: 'rgb(122, 121, 113)',   // fcb-sheet-input-border
          focusBorderColor: 'black',  // change to var
          focusRingColor: '#c9593f',  // change to var
        },
        dark: {
          color: 'black',   //'var(--color-text-primary)',       // change to var
          background: 'rgba(0, 0, 0, 0.05)', 
          borderColor: 'rgb(122, 121, 113)',   // fcb-sheet-input-border
          focusBorderColor: 'black',  // change to var
          focusRingColor: '#c9593f',  // change to var
        }
      },
 
      borderRadius: '4px',
      padding: {
        x: '3px',
        y: '1px',
      },
      focusRing: {
        width: '2px',
        style: 'solid',
      }
    },
    checkbox: {
      colorScheme: {
        light: {
          background: 'rgba(0, 0, 0, 0.05)',
          hoverBackground: 'rgba(0, 0, 0, 0.05)',
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
        dark: {
          background: 'rgba(0, 0, 0, 0.05)',
          hoverBackground: 'rgba(0, 0, 0, 0.05)',
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
        }
      },
      borderRadius: '3px',
    },
    textarea: {
      colorScheme: {
        light: {
          color: 'black',   //'var(--color-text-primary)',       // change to var
          background: 'rgba(0, 0, 0, 0.05)', 
          borderColor: 'rgb(122, 121, 113)',   // fcb-sheet-input-border
          focusBorderColor: 'black',  // change to var
          focusRingColor: '#c9593f',  // change to var
        },
        dark: {
          color: 'black',   //'var(--color-text-primary)',       // change to var
          background: 'rgba(0, 0, 0, 0.05)', 
          borderColor: 'rgb(122, 121, 113)',   // fcb-sheet-input-border
          focusBorderColor: 'black',  // change to var
          focusRingColor: '#c9593f',  // change to var
        }
      },
      borderRadius: '4px',
      padding: {
        x: '3px',
        y: '1px',
      },
      focusRing: {
        width: '2px',
        style: 'solid',
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
