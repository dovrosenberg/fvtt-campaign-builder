// replace 'campaign-builder' below with package name

import copy from 'rollup-plugin-copy';
import scss from 'rollup-plugin-scss';
import path from 'path';
import envCompatible from 'vite-plugin-env-compatible';
import * as fsPromises from 'fs/promises';
import { createHtmlPlugin } from 'vite-plugin-html';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import { defineConfig, Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import postcssPrefixSelector from 'postcss-prefix-selector';
import istanbul from 'vite-plugin-istanbul';
// import Components from 'unplugin-vue-components/vite';
// import { PrimeVueResolver } from '@primevue/auto-import-resolver';

// to get the version number
import npmPackage from './package.json';

export default defineConfig(({ mode }) => {
  const isDevelopment = (mode === 'development' || mode === 'test');
  const isTest = mode === 'test';

  return {
    // our dev mode is still using build so we have to overwrite like this
    define: {
      __DEV_BUILD__: JSON.stringify(isDevelopment),
      __VUE_PROD_DEVTOOLS__: JSON.stringify(isDevelopment),  // true for debugging purposes only
    },

    // base: './',
    resolve: {
      alias: [
        {
          find: '@',
          replacement: path.resolve(__dirname,'src')
        },
        {
          find: '@module',
          replacement: path.resolve(__dirname,'static/module.json')
        },
        {
          find: '@test',
          replacement: path.resolve(__dirname,'test')
        },
        {
          find: '@unittest',
          replacement: path.resolve(__dirname,'test/unit')
        },
      ],
      extensions: [
        '.mjs',
        '.js',
        '.ts',
        '.jsx',
        '.tsx',
        '.json',
        '.vue'
      ]
    },
    plugins: [
      // copy the static module file
      copy({
        targets: [
          { src: 'static/lang', dest: 'dist' },
          { src: 'static/templates', dest: 'dist' },
          // changelog for big bag module manager; strip the badges
          { 
            src: 'CHANGELOG.md', 
            dest: 'dist',
            transform: (contents) => contents.toString().replace(/!\[.*\]\(.*\)/g, '')
          }
        ],
        hook: 'writeBundle',
      }),
      vue(),
      // Add Vue DevTools in development mode
      vueDevTools(),
      // Components({
      //   resolvers: [
      //     PrimeVueResolver()
      //   ]
      // }),
      // combine all the scss output into one file
      scss({
        api: 'modern',
        output: 'styles/style.css',
        sourceMap: isDevelopment,
        include: ['src/**/*.scss', 'src/**/*.css', 
          'node_modules/@imengyu/vue3-context-menu/lib/vue3-context-menu.css',
          'node_modules/@yaireo/tagify/dist/tagify.css',
          'node_modules/vis-timeline/styles/vis-timeline-graph2d.css'
        ],
        watch: ['src/**/*.scss', 'src/**/*.css', 'src/'],
      }),
      viteCommonjs(),
      envCompatible(),
      createHtmlPlugin({
        inject: {
          data: {
            title: 'campaign-builder'
          }
        }
      }),
      updateModuleManifestPlugin(),
      // Instrument source code for coverage collection in test mode
      ...(isTest ? [istanbul({
        include: 'src/**/*',
        exclude: ['node_modules', 'test/**/*'],
        extension: ['.ts', '.vue'],
        requireEnv: false,
        forceBuildInstrument: true,
      })] : []),
    ],
    css: {
      postcss: {
        plugins: [
          postcssPrefixSelector({
            prefix: '.fcb',
            transform: (prefix, selector) => {
              // Skip if selector already has .fcb prefix
              if (selector.includes('.fcb ')) {
                return selector;
              }
              // Skip selectors for our custom dropdown class - these render at body level
              if (selector.includes('.fcb-tagify-dropdown')) {
                return selector;
              }
              // Only prefix Tagify-related selectors and tags-input
              if (selector.includes('tagify') || selector.includes('.tag') || selector.includes('[data-tagify]') || selector.includes('tags-input')) {
                return `${prefix} ${selector}`;
              }
              return selector;
            }
          })
        ]
      },
      preprocessorOptions: {
        scss: {
          // Injected at the top of every <style lang="scss"> block and .scss file
          additionalData: `@use "@/components/styles/mixins" as *;`
        }
      }
    },
    build: {
      sourcemap: mode === 'development' || mode === 'test',
      minify: mode !== 'development' && mode !== 'test',
      outDir: 'dist',
      rollupOptions: {
        input: 'src/main.ts',
        output: {
          // rename output.css to campaign-builder.css
          assetFileNames: (assetInfo): string => {
            if (assetInfo.name === 'output.css') 
              return 'styles/campaign-builder.css';
            else if (assetInfo.name ==='output.css.map')
              return 'styles/campaign-builder.css.map';
            else if (assetInfo.name)
              return assetInfo.name;
            else
              throw 'Asset missing name';
          },        
          entryFileNames: 'scripts/index.js',
          // chunkFileNames: 'scripts/[name].js',
          format: 'es',
          // inlineDynamicImports: true,
        },
      },
    }
  };
});


// a plugin to save the manifest, setting the version # from the npm package.json
function updateModuleManifestPlugin(): Plugin {
  return {
    name: 'update-module-manifest',
    async writeBundle(): Promise<void> {
      // get github info
      const githubProject = process.env.GH_PROJECT;
      const githubTag = process.env.GH_TAG;

      // get the version number
      const moduleVersion = npmPackage.version;

      // read the static file
      const manifestContents: string = await fsPromises.readFile(
        'static/module.json',
        'utf-8'
      );

      // convert to JSON
      const manifestJson = JSON.parse(manifestContents) as Record<string,unknown>;

      // set the version #
      if (moduleVersion) {
        delete manifestJson['## comment:version'];
        manifestJson.version = moduleVersion;
      }

      // set the release info
      if (githubProject) {
        const baseUrl = `https://github.com/${githubProject}/releases`;
        manifestJson.manifest = `${baseUrl}/latest/download/module.json`;

        if (githubTag) {
          manifestJson.download = `${baseUrl}/download/${githubTag}/module.zip`;
        }
      }

      // write the updated file
      await fsPromises.writeFile(
        'dist/module.json',
        JSON.stringify(manifestJson, null, 4)
      );
    },
  };
}