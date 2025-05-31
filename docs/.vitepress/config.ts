import { defineConfig } from 'vitepress'

export default defineConfig({
  ignoreDeadLinks: true,
  title: 'World & Campaign Builder',
  description: 'A Foundry VTT module for worldbuilding and campaign management',
  base: '/fvtt-campaign-builder/',
  
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Workflows', link: '/workflows/' },
      { text: 'UI Guide', link: '/ui-guide/' }
    ],

    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Installation', link: '/getting-started/' }
        ]
      },
      {
        text: 'Workflows & Tasks',
        items: [
          { text: 'World Building', link: '/workflows/world-building' },
          { text: 'Campaign Planning', link: '/workflows/campaign-planning' },
          { text: 'Session Preparation', link: '/workflows/session-preparation' },
          { text: 'Playing a Session', link: '/workflows/playing-session' }
        ]
      },
      {
        text: 'UI Guide',
        items: [
          { text: 'Navigation & Interface', link: '/ui-guide/navigation' },
          { text: 'World Building Features', link: '/ui-guide/world-building' },
          { text: 'Campaign Management', link: '/ui-guide/campaign-management' },
          { text: 'Settings & Configuration', link: '/ui-guide/settings' }
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