import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

const foundryVariables = {
  colorTextDarkPrimary: 'rgb(25, 24, 19)',    //'#191813',
  colorTextLightPrimary: 'rgb(181, 179, 164)',  //#b5b3a4',
  colorWarm1: 'rgb(238, 155, 58)',  //'ee9b3a',
  colorWarm2: 'rgb(201, 89, 63)',   //'c9593f'
  colorWarm3: 'rgb(93, 20, 43)',   //'#5d142b',  
  colorBorderDark5: 'rgb(102, 102, 102)',   //'#666',   
};

const fcbVariables = {
  fcbDarkOverlay: 'rgba(0, 0, 0, 0.05)',
  fcbLightOverlay: 'rgba(255, 255, 255, 0.10)',
  fcbSheetInputBorder: 'rgb(122, 121, 113)',
  fcbButtonBorderColor: '#444',
};

export default definePreset(Aura, {
  components: {
    datatable: {
      colorScheme: {
        light: {
          headerCellSelectedColor: foundryVariables.colorWarm3,
          rowColor: foundryVariables.colorTextDarkPrimary,
          rowHoverColor: foundryVariables.colorTextDarkPrimary,
          bodyCellBorderColor: 'rgb(165, 165, 155)',
        },
        dark: {
          headerCellSelectedColor: foundryVariables.colorWarm2,
          rowColor: foundryVariables.colorTextLightPrimary,
          rowHoverColor: foundryVariables.colorTextLightPrimary,
          bodyCellBorderColor: 'rgb(165, 165, 155)',
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
          color: foundryVariables.colorTextDarkPrimary,
          background: 'rgba(0, 0, 0, 0.1)',
          borderColor: fcbVariables.fcbSheetInputBorder,
          focusBorderColor: 'black',  // change to var
          focusRingColor: foundryVariables.colorWarm2,
        },
        dark: {
          color: foundryVariables.colorTextLightPrimary,
          background: 'rgb(48, 40, 49)',
          borderColor: fcbVariables.fcbSheetInputBorder,
          focusBorderColor: 'black',  // change to var
          focusRingColor: foundryVariables.colorWarm2,
        }
      },
 
      borderRadius: '4px',
      fontSize: '16px',
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
          background: fcbVariables.fcbDarkOverlay,
          hoverBackground: fcbVariables.fcbDarkOverlay,
          borderColor: fcbVariables.fcbButtonBorderColor,
          checked: {
            background: foundryVariables.colorWarm1,   
            hoverBackground: foundryVariables.colorWarm1,
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
          background: fcbVariables.fcbLightOverlay,
          hoverBackground: fcbVariables.fcbLightOverlay,
          borderColor: fcbVariables.fcbButtonBorderColor,
          checked: {
            background: foundryVariables.colorWarm1,   
            hoverBackground: foundryVariables.colorWarm1,
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
          color: foundryVariables.colorTextDarkPrimary,
          background: 'rgba(0, 0, 0, 0.1)',
          borderColor: fcbVariables.fcbSheetInputBorder,
          focusBorderColor: 'black',  
          focusRingColor: foundryVariables.colorWarm2,
        },
        dark: {
          color: foundryVariables.colorTextLightPrimary,
          background: 'rgb(48, 40, 49)',
          borderColor: fcbVariables.fcbSheetInputBorder,
          focusBorderColor: 'black',  
          focusRingColor: foundryVariables.colorWarm2,
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
      }, 
      gutter: {
        background: 'rgb(185, 185, 172)',
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
