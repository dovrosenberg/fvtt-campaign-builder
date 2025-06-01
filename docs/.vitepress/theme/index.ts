import DefaultTheme from 'vitepress/theme'
import CustomLayout from './CustomLayout.vue'
import './custom.css'
import './plugins/tooltip/tooltip.css'

export default {
  extends: DefaultTheme,
  Layout: CustomLayout,
  enhanceApp({ app }) {
  }
} 
