import Aura from '@primevue/themes/aura';
import { definePreset } from '@primevue/themes';

const fcbVariables = {
  light: {
    fcbText: 'hsl(210 12% 18%)',
    fcbTextMuted: 'hsl(210 9% 38%)',
    fcbSurface: '#fff',
    fcbSurface2: 'hsl(210 15% 95%)',
    fcbSurfaceShaded: '#f1edee',  //color-mix(in oklch, var(--fcb-primary-500), white 92%)',
    fcbControlBg: '#fff',
    fcbRing: 'hsl(22 100% 55%)',
    fcbControlBorder: 'hsl(210 10% 82%)',
    fcbControlBorderFocus: 'hsl(22 100% 55%)',
    fcbControlBgHover: 'rgba(0, 0, 0, 0.10)',
    fcbButtonBorder: 'hsl(210 10% 82%)',
    fcbButtonBorderHover: 'hsl(22 100% 55%)',
    fcbSheetInputBorder: 'rgb(122, 121, 113)',
    fcbSplitterGutter: 'hsl(210 10% 82%)',
    fcbTableHeaderBottomBorder: 'hsl(210 7% 50%)',
    fcbPrimary: 'hsl(164 48% 20%)',
  },
  dark: {
    fcbText: 'hsl(210 20% 94%)',
    fcbTextMuted: 'hsl(210 8% 65%)',
    fcbSurface: 'hsl(210, 12%, 18%)',
    fcbSurface2: 'hsl(210 14% 15%)',
    fcbSurfaceShaded: '#293337', //'color-mix(in oklab, var(--fcb-primary) 10%, var(--fcb-surface))',
    fcbControlBg: 'hsl(210, 12%, 18%)',
    fcbRing: 'hsl(22 100% 55%)',
    fcbControlBorder: 'hsl(210 12% 24%)',
    fcbControlBorderFocus: 'hsl(22 100% 55%)',
    fcbControlBgHover: 'rgba(255, 255, 255, 0.10)',
    fcbButtonBorder: 'hsl(210 12% 24%)',
    fcbButtonBorderHover: 'hsl(22 100% 55%)',
    fcbSheetInputBorder: 'rgb(122, 121, 113)',
    fcbSplitterGutter: 'hsl(210 10% 28%)',
    fcbTableHeaderBottomBorder: 'hsl(210 8% 65%)',
    fcbPrimary: 'hsl(164 45% 28%)',
  },
  fcbDarkOverlay: 'rgba(0, 0, 0, 0.05)',
  fcbLightOverlay: 'rgba(255, 255, 255, 0.10)',
  fcbButtonBorderColor: '#444',
  fcbAccent: 'hsl(22 100% 55%)',
  fcbAccent700: 'hsl(22 100% 40%)',
  fcbPrimary: 'hsl(164 48% 20%)',
  fcbPrimary300: '#9cb089',  //'color-mix(in oklch, var(--fcb-primary-500), white 58%)',
  fcbPrimary100: '#e7e0e2',  //color-mix(in oklch, var(--fcb-primary-500), white 86%)
};

export default definePreset(Aura, {
  components: {
    datatable: {
      colorScheme: {
        light: {
          headerColor: fcbVariables.light.fcbTextMuted,
          headerBackground: fcbVariables.light.fcbSurface,
          headerCellBackground: fcbVariables.light.fcbSurface,
          headerCellColor: fcbVariables.light.fcbText,
          headerCellSelectedBackground: fcbVariables.light.fcbSurface2,
          headerCellSelectedColor: fcbVariables.fcbAccent,
          headerCellBorderColor: fcbVariables.light.fcbTableHeaderBottomBorder,
          rowColor: fcbVariables.light.fcbText,
          rowBackground: fcbVariables.light.fcbSurface,
          rowHoverColor: fcbVariables.light.fcbSurface2,
          bodyCellBorderColor: fcbVariables.light.fcbButtonBorder,
        },
        dark: {
          headerColor: fcbVariables.dark.fcbTextMuted,
          headerBackground: fcbVariables.dark.fcbSurface,
          headerCellBackground: fcbVariables.dark.fcbSurface,
          headerCellColor: fcbVariables.dark.fcbText,
          headerCellSelectedBackground: fcbVariables.dark.fcbSurface2,
          headerCellSelectedColor:  fcbVariables.fcbAccent,
          headerCellBorderColor: fcbVariables.dark.fcbTableHeaderBottomBorder,
          rowColor: fcbVariables.dark.fcbText,
          rowBackground: fcbVariables.dark.fcbSurface,
          rowHoverColor: fcbVariables.dark.fcbSurface2,
          bodyCellBorderColor: fcbVariables.dark.fcbButtonBorder,
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
          focusBorderColor: fcbVariables.light.fcbControlBorderFocus, 
          focusRingColor: fcbVariables.light.fcbRing,
        },
        dark: {
          color: fcbVariables.dark.fcbText,
          background: fcbVariables.dark.fcbControlBg,
          borderColor: fcbVariables.dark.fcbControlBorder,
          focusBorderColor: fcbVariables.dark.fcbControlBorderFocus,  
          focusRingColor: fcbVariables.dark.fcbRing,
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
          hoverBackground: fcbVariables.fcbDarkOverlay,
          borderColor: fcbVariables.light.fcbButtonBorder,
          checked: {
            background: fcbVariables.fcbAccent700,   
            hoverBackground: fcbVariables.fcbAccent,
            borderColor: fcbVariables.light.fcbButtonBorder,
            hoverBorderColor: fcbVariables.light.fcbButtonBorderHover,
            focusBorderColor: fcbVariables.light.fcbButtonBorderHover,  
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
          hoverBackground: fcbVariables.fcbLightOverlay,
          borderColor: fcbVariables.dark.fcbButtonBorder,
          checked: {
            background: fcbVariables.fcbAccent700,   
            hoverBackground: fcbVariables.fcbAccent,
            borderColor: fcbVariables.dark.fcbButtonBorder,
            hoverBorderColor: fcbVariables.dark.fcbButtonBorderHover,
            focusBorderColor: fcbVariables.dark.fcbButtonBorderHover,  
          },
          icon: {
            checked: {
              color: 'white',   
              hoverColor: 'white',
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
          background: fcbVariables.light.fcbControlBg,
          borderColor: fcbVariables.light.fcbControlBorder,
          focusBorderColor: fcbVariables.light.fcbControlBorderFocus, 
          focusRingColor: fcbVariables.light.fcbRing,
        },
        dark: {
          color: fcbVariables.dark.fcbText,
          background: fcbVariables.dark.fcbControlBg,
          borderColor: fcbVariables.dark.fcbControlBorder,
          focusBorderColor: fcbVariables.dark.fcbControlBorderFocus,  
          focusRingColor: fcbVariables.dark.fcbRing,
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
      colorScheme: {
        light: {
          gutter: {
            background: fcbVariables.light.fcbSplitterGutter,
          }
        },
        dark: {
          gutter: {
            background: fcbVariables.dark.fcbSplitterGutter,
          }
        }
      },
    },
    splitterpanel: {
      borderRadius: '0',
      background: 'inherit',
      color: 'inherit',
      borderColor: 'none',
    },
    select: {
      colorScheme: {
        light: {
          color: fcbVariables.light.fcbText,
          background: fcbVariables.light.fcbControlBg,  
          borderColor: fcbVariables.light.fcbControlBorder,
          disabledBackground: fcbVariables.light.fcbSurfaceShaded,
          dropdownColor: fcbVariables.fcbPrimary,  
          overlayBackground: fcbVariables.light.fcbSurfaceShaded,  
          overlayBorderColor: fcbVariables.light.fcbText,
          focusBorderColor: fcbVariables.light.fcbControlBorderFocus,
          focusRingColor: fcbVariables.light.fcbRing,
          option: {
            color: fcbVariables.light.fcbText,
            focusBackground: fcbVariables.fcbPrimary100,
            focusColor: fcbVariables.light.fcbText,
            // selectedFocusBackground: fcbVariables.fcbPrimary100,  // in CampaignBuilder.vue
            selectedFocusColor: fcbVariables.fcbAccent700,
            selectedBackground: fcbVariables.light.fcbSurfaceShaded,
            selectedColor: fcbVariables.fcbAccent700,
          }
        },
        dark: {
          color: fcbVariables.dark.fcbText,
          background: fcbVariables.dark.fcbControlBg,  
          borderColor: fcbVariables.dark.fcbControlBorder,
          disabledBackground: fcbVariables.dark.fcbSurfaceShaded,
          dropdownColor: fcbVariables.fcbPrimary,
          overlayBackground: fcbVariables.dark.fcbSurfaceShaded,  
          overlayBorderColor: fcbVariables.dark.fcbText,
          focusBorderColor: fcbVariables.dark.fcbControlBorderFocus,
          focusRingColor: fcbVariables.dark.fcbRing,
          option: {
            color: fcbVariables.dark.fcbText,
            focusBackground: fcbVariables.fcbPrimary300,
            focusColor: fcbVariables.dark.fcbText,
            // selectedFocusBackground: fcbVariables.fcbPrimary300,  // in CampaignBuilder.vue
            selectedFocusColor: fcbVariables.fcbAccent700,
            selectedBackground: fcbVariables.dark.fcbSurfaceShaded,
            selectedColor: fcbVariables.fcbAccent700,
          }
        }
      },
    },
    panel: {
      colorScheme: {
        light: {
          background: fcbVariables.light.fcbSurface,
          color: fcbVariables.light.fcbText,
          headerColor: fcbVariables.light.fcbText,
          borderColor: fcbVariables.light.fcbPrimary,
        },
        dark: {
          background: fcbVariables.dark.fcbSurface,
          color: fcbVariables.dark.fcbText,
          headerColor: fcbVariables.dark.fcbText,
          borderColor: fcbVariables.dark.fcbPrimary,
        }
      }
    }
  }
});
