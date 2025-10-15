import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

const foundryVariables = {
  colorWarm1: 'rgb(238, 155, 58)',  //'ee9b3a',
  colorWarm2: 'rgb(201, 89, 63)',   //'c9593f'
  colorWarm3: 'rgb(93, 20, 43)',   //'#5d142b',  
  colorBorderDark5: 'rgb(102, 102, 102)',   //'#666',   
};

const fcbVariables = {
  light: {
    fcbText: 'hsl(210 12% 18%)',
    fcbSurface2: 'hsl(210 15% 95%)',
    fcbControlBg: '#fff',
    fcbRing: 'hsl(22 100% 55%)',
    fcbControlBorder: 'hsl(210 10% 82%)',
    fcbSheetInputBorder: 'rgb(122, 121, 113)',
  },
  dark: {
    fcbText: 'hsl(210 20% 94%)',
    fcbSurface2: 'hsl(210 14% 15%)',
    fcbControlBg: 'hsl(210, 12%, 18%)',
    fcbRing: 'hsl(22 100% 55%)',
    fcbControlBorder: 'hsl(210 12% 24%)',
    fcbSheetInputBorder: 'rgb(122, 121, 113)',
  },
  fcbDarkOverlay: 'rgba(0, 0, 0, 0.05)',
  fcbLightOverlay: 'rgba(255, 255, 255, 0.10)',
  fcbButtonBorderColor: '#444',
  
};

export default definePreset(Aura, {
  components: {
    datatable: {
      colorScheme: {
        light: {
          headerCellSelectedColor: foundryVariables.colorWarm3,
          rowColor: fcbVariables.light.fcbText,
          rowHoverColor: fcbVariables.light.fcbSurface2,
          bodyCellBorderColor: 'rgb(165, 165, 155)',
        },
        dark: {
          headerCellSelectedColor: foundryVariables.colorWarm2,
          rowColor: fcbVariables.dark.fcbText,
          rowHoverColor: fcbVariables.dark.fcbSurface2,
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
          color: fcbVariables.light.fcbText,
          background: fcbVariables.light.fcbControlBg,
          borderColor: fcbVariables.light.fcbControlBorder,
          focusBorderColor: fcbVariables.light.fcbRing,  // change to var
          focusRingColor: foundryVariables.colorWarm2,
        },
        dark: {
          color: fcbVariables.dark.fcbText,
          background: fcbVariables.dark.fcbControlBg,
          borderColor: fcbVariables.dark.fcbControlBorder,
          focusBorderColor: fcbVariables.dark.fcbRing,  // change to var
          focusRingColor: foundryVariables.colorWarm2,
        }
      },
 
      borderRadius: '4px',
      fontSize: '0.9rem',
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
          color: fcbVariables.light.fcbText,
          background: 'rgba(0, 0, 0, 0.1)',
          borderColor: fcbVariables.light.fcbSheetInputBorder,
          focusBorderColor: 'black',  
          focusRingColor: foundryVariables.colorWarm2,
        },
        dark: {
          color: fcbVariables.dark.fcbText,
          background: 'rgb(48, 40, 49)',
          borderColor: fcbVariables.dark.fcbSheetInputBorder,
          focusBorderColor: 'black',  
          focusRingColor: foundryVariables.colorWarm2,
        }
      },
      fontSize: '0.9rem',
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
        background: 'rgba(222, 225, 230, 1)',
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
