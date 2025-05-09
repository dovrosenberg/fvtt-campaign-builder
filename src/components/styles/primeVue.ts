import WCBTheme from '@/applications/presetTheme';

// theme = 'none',  -- can do this if you want to just style everything manually; could also define a theme without a preset?
// for now - trying to just use "unstyled" on all the inputs, buttons, etc. to make it easier to style

export const theme = { 
  preset: WCBTheme,
  options: {
    // prefix: 'fcb-p',
    // cssLayer: {
    //   name: 'fcb-p',
    //   order: 'fcb-p',
    // },
    darkModeSelector: 'body.theme-dark'
  }
}
