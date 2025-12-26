// @ts-nocheck
// from mouse0270/fvtt-vue

import { App, createApp, h, reactive } from 'vue';
import { vueHost } from './VueHost';
import { notifyWarn } from '@/utils/notifications';

export const VueApplicationMixinVersion = '0.0.6';

// Use a WeakMap to store portal IDs per application instance
const portalIdMap = new WeakMap<Application, string | null>();

/**
 * Vue Application Mixin with Singleton Host Integration
 * 
 * This mixin extends FoundryVTT ApplicationV2 classes with Vue.js functionality.
 * Instead of creating individual Vue apps per window (which breaks Vue DevTools),
 * it registers each window as a "portal" with the singleton VueHost.
 * 
 * 
 * Originally based on fvtt-vue package, but significant rework to allow for multiple windows to share one vue instnace
 * 
 * Architecture Overview:
 * ┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
 * │ FoundryVTT      │    │ VueApplication   │    │ Vue Component   │
 * │ Window/Dialog   │◄──►│ Mixin            │◄──►│ (.vue file)     │
 * │ (DOM Element)   │    │                  │    │                 │
 * └─────────────────┘    └──────────────────┘    └─────────────────┘
 *                                │
 *                                ▼
 *                       ┌─────────────────--─┐
 *                       │ VueHost (Singleton)│
 *                       │ - Single Vue App   │
 *                       │ - Teleport Render  │
 *                       │ - Shared Plugins   │
 *                       └──────────────────--┘
 * 
 * How it works:
 * 1. Window opens → VueApplicationMixin._renderHTML() prepares component
 * 2. VueApplicationMixin._replaceHTML() calls vueHost.registerPortal()
 * 3. VueHost renders component via <Teleport> into the window's DOM element
 * 4. Window closes → VueApplicationMixin.close() calls vueHost.unregisterPortal()
 * 
 * Key changes from original (fvtt-vue):
 * - No more per-window createApp() calls
 * - Uses async registerPortal() instead of synchronous app mounting
 * - Maintains the same PARTS system for component configuration
 * - Preserves all existing component and props handling
 * 
 * Benefits:
 * - Vue DevTools works (single app instance)
 * - Shared plugins/stores across all windows
 * - Better performance (no repeated app creation)
 * - Maintains backward compatibility with existing components
 * 
 * Usage (unchanged):
 * class MyWindow extends VueApplicationMixin(ApplicationV2) {
 *   static PARTS = {
 *     app: {
 *       component: MyComponent,
 *       props: { ... },
 *       use: { ... } // Plugins are now installed globally in VueHost
 *     }
 *   };
 * }
 * 
 * @template {typeof BaseApplication} BaseApplication - The base application class to extend
 */
export function VueApplicationMixin<TBase extends new (...args: any[]) => foundry.applications.api.ApplicationV2>(BaseApplication: TBase) {

  type VueApplicationConstructor = typeof VueApplication & {
    PARTS: Record<string, any>;
    DEBUG: boolean;
    SHADOWROOT: boolean;
    DEFAULT_OPTIONS?: {
      actions?: Record<string, Function>;
    }
  }

  class VueApplication extends BaseApplication {
    /**
     * Indicates whether the application is in debug mode.
     * @type {boolean}
     */
    static DEBUG = false;

    /**
     * Indicates whether the application should be attached to the shadow dom.
     * @type {boolean}
     */
    static SHADOWROOT = false;


    /**
     * The parts of the Vue application.
     * @type {Object<string, *>}
     */
    static PARTS = {};

    /**
     * The public container for component instances.
     * @type {Object<string, *>}
     */
    parts: Record<string, any> = {};

    /**
     * The private containers for Vue instances.
     * @type {string | null}
     * 
     * Stores the portal ID returned by VueHost.registerPortal().
     * This replaces the previous #instance field that held the Vue app.
     */
    #portalId: string | null = null;

    /**
     * The private containers for Vue instances.
     * @type {Object<string, Object>}
     */
    #props = {};

    /**
     * Configure the render options for the Vue application.
     * @param {Object} options - The render options.
     */
    _configureRenderOptions(options) {
      super._configureRenderOptions(options);
      options.parts ??= Object.keys((this.constructor as VueApplicationConstructor).PARTS);
    }

    /**
     * Render the HTML content of the Vue application.
     * 
     * This method prepares the components and props but doesn't actually
     * render them. The actual rendering happens in _replaceHTML() via
     * the VueHost portal system.
     * 
     * @param {Object} context - The render context.
     * @param {Object} options - The render options.
     * @returns {Promise<Object<string, string>>} - The rendered HTML content.
     */
    async _renderHTML(context, options) {
      const rendered = {};
      // Loop through the parts and render them
      for (const partId of options.parts) {
        // Get the part from the PARTS object
        const part = (this.constructor as VueApplicationConstructor).PARTS[partId];

        // If part is not in the PARTS object, skip it
        if (!part) {
          notifyWarn(`Part "${partId}" is not a supported template part for ${this.constructor.name}`);
          continue;
        }

        // If props for the part don't exist, create them
        if (!this.#props?.[partId]) this.#props[partId] = reactive(options?.props ?? part?.props ?? {});
        // If props for the part exist, merge the options into the existing props
        else foundry.utils.mergeObject(this.#props[partId], options?.props ?? {}, { inplace: true, insertKeys: true});

        // Get the Part and add it to the rendered object
        rendered[partId] = await (part?.app ?? part?.component ?? part?.template);
      }

      return rendered;
    }

    /**
     * Replace the HTML content of the Vue application.
     * 
     * This is where the portal registration happens. Instead of creating
     * a new Vue app, we register with the singleton VueHost.
     * 
     * @param {Object<string, string>} result - The rendered HTML content.
     * @param {HTMLElement} content - The content element.
     * @param {Object} options - The render options.
     */
    async _replaceHTML(result, content, options) {

      // Register portal with the singleton host if not already done
      if (!this.#portalId) {
        // Check if we already have a portal registered for this application instance
        // We store it in a WeakMap to persist across renders
        const existingPortalId = portalIdMap.get(this);
        
        if (existingPortalId && vueHost.hasPortal(existingPortalId)) {
          // Reuse the existing portal for this app
          this.#portalId = existingPortalId;
          // Update the container reference in case it changed
          const portal = vueHost.getPortal(existingPortalId);
          if (portal) {
            portal.container = content;
          }
        } else {
          const Instance = this;
          const firstPartId = options.parts[0];
          const firstPart = (this.constructor as VueApplicationConstructor).PARTS[firstPartId];
          const firstComponent = result[firstPartId];

          // Register portal with host
          const portalId = await vueHost.registerPortal(
            firstComponent,
            this.#props[firstPartId] || {},
            content,
            (componentInstance) => { if (componentInstance) Instance.parts[firstPartId] = componentInstance; }
          );

          // registerPortal might return undefined if the container already has a portal
          if (!portalId) {
            // Try to find the existing portal for this container
            const existingPortalId = vueHost.getPortalIds().find(id => {
              const portal = vueHost.getPortal(id);
              return portal?.container === content;
            });
            if (existingPortalId) {
              this.#portalId = existingPortalId;
              portalIdMap.set(this, existingPortalId);
            } else {
              console.error(`VueApplicationMixin | _replaceHTML | No existing portal found for container`);
            }
          } else {
            this.#portalId = portalId;
            // Store the portal ID in the WeakMap to persist across renders
            portalIdMap.set(this, portalId);
          }

          // Attach Part Listeners (once, on first portal creation)
          this._attachPartListeners(content, options);

        }
      } else {
        // Update portal props if already registered
        const firstPartId = options.parts[0];
        await vueHost.updatePortalProps(this.#portalId, this.#props[firstPartId] || {});
      }
    }


    
    /**
     * Attaches event listeners to the Vue Instance.
     *
     * @param {HTMLElement} content - The content element.
     * @param {Object} options - The options object.
     */
    _attachPartListeners(content, options) {
      // NOOP: listeners are handled by the singleton host; we only keep this for compatibility
    }

    /**
     * Closes the application and unmounts all instances.
     * 
     * @param {ApplicationClosingOptions} [options] - Optional parameters for closing the application.
     * @returns {Promise<BaseApplication>} - A Promise which resolves to the rendered Application instance.
     */
    async close(options = {}) {
      // Unregister the portal from the singleton host
      if (this.#portalId) {
        vueHost.unregisterPortal(this.#portalId);
        // Clear the stored portal ID from the WeakMap
        portalIdMap.delete(this);
        this.#portalId = null;
      }
      
      // Call the close method of the base application with animate: false
      // to prevent the background from showing during the close animation
      return await super.close({ animate: false, ...options });
    }



    /**
     * Handles the form submission event.
     *
     * @private
     * @param {HTMLElement} htmlElement - The HTML element that triggered the event.
     * @param {Event} event - The form submission event.
     * @returns {Promise<void>} - A promise that resolves when the form submission is handled.
     */
    async #onSubmitForm(htmlElement, event) {
      event.preventDefault();

      // Get the part ID from the data attribute
      const partId = htmlElement?.dataset?.applicationPart;
      // Get the part from the PARTS object
      const part = (this.constructor as VueApplicationConstructor).PARTS[partId];

      // Skip if part is not found
      if (!part?.forms) 
        return;

      // Loop through the forms and check if the form is found
      for (const [selector, formConfig] of Object.entries(part.forms)) {
        const form = htmlElement.matches(selector) ? htmlElement : htmlElement.querySelector(selector);

        // Skip if form is not found
        if (!form) return;

        // Get the form data and call the handler function
        const { handler, closeOnSubmit } = formConfig;
        const formData = new FormDataExtended(form);
        if (handler instanceof Function) await handler.call(this, event, form, formData);
        // Close the form if closeOnSubmit is true
        if (closeOnSubmit) await this.close();
      }
    }

    /**
     * Handles the change event for a form element.
     *
     * @private
     * @param {HTMLElement} htmlElement - The HTML element that triggered the change event.
     * @param {Event} event - The change event object.
     * @returns {void}
     */
    #onChangeForm(htmlElement, event) {
      // Get the part ID from the data attribute
      const partId = htmlElement?.dataset?.applicationPart;
      // Get the part from the PARTS object
      const part = (this.constructor as VueApplicationConstructor).PARTS[partId];

      // Skip if part is not found
      if (!part?.forms) 
        return;

      // Loop through the forms and check if the form is found
      for (const [selector, formConfig] of Object.entries(part.forms)) {
        const form = htmlElement.matches(selector) ? htmlElement : htmlElement.querySelector(selector);

        // Skip if form is not found
        if (!form) return;

        // Call the handler function if it exists
        if (formConfig?.submitOnChange) 
          void this.#onSubmitForm(htmlElement, event);
      }
    }
  }

  return VueApplication;
}