import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

// Read the common links file
const commonLinksPath = path.join(__dirname, '../common-links.md')
const commonLinks = fs.existsSync(commonLinksPath) ? fs.readFileSync(commonLinksPath, 'utf-8') : ''

export default defineConfig({
  ignoreDeadLinks: true,
  title: 'World & Campaign Builder',
  description: 'A Foundry VTT module for worldbuilding and campaign management',
  base: '/fvtt-campaign-builder/',
  
  markdown: {
    config: (md) => {
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
        text: 'UI Guide',
        items: [
          { text: 'Navigation & Interface', link: '/reference/navigation' },
          { text: 'World Building Features', link: '/reference/world-building' },
          { text: 'Campaign Management', link: '/reference/campaign-management' },
          { text: 'Settings & Configuration', link: '/reference/settings' }
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