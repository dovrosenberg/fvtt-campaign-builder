import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'
import tooltipPlugin from './theme/plugins/tooltip/tooltip-plugin'

// Read the common links file
const commonLinksPath = path.join(__dirname, '/theme/plugins/shortcuts/common-links.md')
const commonLinks = fs.existsSync(commonLinksPath) ? fs.readFileSync(commonLinksPath, 'utf-8') : ''

export default defineConfig({
  // ignoreDeadLinks: true,
  title: 'World & Campaign Builder',
  description: 'A Foundry VTT module for world building and campaign management',
  base: '/fvtt-campaign-builder/',
  
  markdown: {
    config: (md) => {
      // Add tooltip plugin
      md.use(tooltipPlugin)
      
      // Add a rule to append common links to every page
      const originalRender = md.render;

      md.render = function(src, env) {
        // Append common links to the source before rendering
        const modifiedSrc = src + '\n\n' + commonLinks;
        return originalRender.call(this, modifiedSrc, env);
      }
    }
  },
  
  themeConfig: {
    search: {
      provider: 'local'
    },

    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'User Guide', link: '/guide/' },
      { text: 'Reference', link: '/reference/' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Overview', link: '/getting-started/' },
          { text: 'World Building', link: '/getting-started/#world-building' },
          { text: 'Running a Campaign', link: '/getting-started/#running-a-campaign' }
        ]
      },
      {
        text: 'User Guide',
        items: [  
          { text: 'World Building', link: '/guide/world-building' },
          { text: 'Campaign Planning', link: '/guide/campaign-planning' },
          { text: 'Session Preparation', link: '/guide/session-preparation' },
          { text: 'Playing a Session', link: '/guide/playing-session' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Overview', link: '/reference' },
          { text: 'Navigation & Interface', link: '/reference/navigation' },
          { text: 'Settings (World Building)', link: '/reference/world-building' },
          { text: 'Campaigns (Playing)', link: '/reference/playing' },
          { text: 'Advanced Features & Backend', link: '/reference/backend' },
          { text: 'xConfiguration', link: '/reference/configuration' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/dovrosenberg/fvtt-campaign-builder' }
    ],

    footer: {
      message: 'Licensed under the Apache License, Version 2.0.',
      copyright: 'Copyright © 2025 Dov Rosenberg'
    }
  }
}) 