import DefaultTheme from 'vitepress/theme'
import CustomLayout from './CustomLayout.vue'
import HomeNoNav from './HomeNoNav.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  themeConfig: {
    search: {
      provider: 'local'
    },
  },
  enhanceApp({ app }) {
    // Register the HomeNoNav component as a custom layout
    app.component('HomeNoNav', HomeNoNav)
  }
} 
