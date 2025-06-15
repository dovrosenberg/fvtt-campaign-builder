import DefaultTheme from 'vitepress/theme'
import './custom.css'
import './plugins/tooltip/tooltip.css'
import { VERSION } from './utils/version'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.provide('version', VERSION)
  }
} 
