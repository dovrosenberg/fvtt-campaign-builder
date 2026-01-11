import { App, createApp, defineComponent, h, ref, Teleport } from 'vue';
import { pinia } from '@/applications/stores';
import PrimeVue from 'primevue/config';
import { theme } from '@/components/styles/primeVue';
import { useMainStore } from '@/applications/stores';

/**
 * Interface for a portal that renders a Vue component into a specific DOM container
 */
interface Portal {
  id: string;
  component: any;
  props: Record<string, any>;
  container: HTMLElement;
  ref: (instance: any) => void;
}

/**
 * Singleton Vue Host Application
 * 
 * This class implements a singleton pattern that creates exactly ONE Vue app instance
 * for the entire Campaign Builder module. All windows and dialogs that use VueApplicationMixin
 * register as "portals" with this host, which then renders their components via Vue's <Teleport>
 * feature into their respective DOM containers.
 * 
 * Why this exists:
 * - Vue DevTools only supports debugging a single Vue app per page
 * - Previously, each window created its own Vue app via createApp(), breaking DevTools
 * - This pattern maintains the single-app architecture while preserving FoundryVTT window isolation
 * 
 * How it works:
 * 1. VueHost initializes once during the FoundryVTT 'ready' hook
 * 2. Windows using VueApplicationMixin call registerPortal() instead of createApp()
 * 3. The host renders each component via <Teleport to={windowContainer}>
 * 4. When windows close, they call unregisterPortal() for cleanup
 * 
 * Benefits:
 * - Vue DevTools works correctly (single app instance)
 * - Better performance (shared app context, plugins, and stores)
 * - Maintains existing window/component isolation
 * - No changes needed to individual Vue components
 */

class VueHost {
  private static _instance: VueHost | null = null;
  private _app: App | null = null;
  private _portals = new Map<string, Portal>();
  private _portalCounter = 0;
  private _initPromise: Promise<void> | null = null;
  private _isInitialized = false;

  /**
   * Get the singleton VueHost instance
   * @returns The VueHost singleton
   */
  static getInstance(): VueHost {
    if (!VueHost._instance) {
      VueHost._instance = new VueHost();
    }
    return VueHost._instance;
  }

  private constructor() {
    // Don't initialize immediately to avoid circular dependencies
    // Initialization happens via ensureMounted() during the ready hook
  }

  /**
   * Internal method to initialize the Vue app if not already done
   * Handles the actual Vue app creation, plugin installation, and mounting
   */
  private async _ensureMounted(): Promise<void> {
    if (this._isInitialized) return;
    
    if (!this._initPromise) {
      this._initPromise = this._initialize();
    }
    
    return this._initPromise;
  }

  /**
   * Public method to ensure VueHost is initialized
   * Called during the FoundryVTT ready hook to set up the singleton app
   */
  async ensureMounted(): Promise<void> {
    return this._ensureMounted();
  }

  /**
   * Initialize the Vue app with all plugins and mount it to a hidden container
   * Creates the host component that manages all portal rendering
   */
  private async _initialize(): Promise<void> {
    const hostComponent = defineComponent({
      name: 'VueHost',
      setup() {
        const portals = ref<Array<{ key: string; portal: Portal }>>([]);

        const registerPortal = (portal: Portal) => {
          // Check if this container already has a portal registered
          const existingPortal = portals.value.find(p => p.portal.container === portal.container);
          if (existingPortal) {
            // Don't register the new portal - the existing one will handle the container
            return;
          }
          
          portals.value.push({ key: portal.id, portal });
        };

        const unregisterPortal = (id: string) => {
          const index = portals.value.findIndex(p => p.key === id);
          if (index > -1) {
            portals.value.splice(index, 1);
          }
        };

        // Expose methods globally for the mixin to call
        (window as any).__fcbVueHost = {
          registerPortal,
          unregisterPortal,
        };

        return () => [
          ...portals.value.map(({ key, portal }) =>
            h(Teleport, { to: portal.container, key }, [
              h(portal.component, {
                ...portal.props,
                ref: portal.ref,
              })
            ])
          ),
        ];
      },
    });

    this._app = createApp(hostComponent);
    this._app.use(PrimeVue, { theme });
    this._app.use(pinia);

    // Mount to a visible div in body for DevTools to detect
    const mountPoint = document.createElement('div');
    mountPoint.id = 'fcb-vue-host-root';
    // Make it visible but tiny for DevTools detection
    mountPoint.style.position = 'absolute';
    mountPoint.style.left = '-9999px';
    mountPoint.style.top = '-9999px';
    mountPoint.style.width = '1px';
    mountPoint.style.height = '1px';
    mountPoint.style.overflow = 'hidden';
    mountPoint.style.opacity = '0';
    document.body.appendChild(mountPoint);
    this._app.mount(mountPoint);

    // Ensure main store is active for devtools AFTER mounting
    useMainStore();

    // Vite DevTools plugin handles DevTools registration automatically
    // But we need to ensure the app is discoverable
    if (typeof import.meta !== 'undefined' && (import.meta.env?.MODE === 'development' || import.meta.env?.MODE === 'test')) {
      // Make the app available for DevTools
      (window as any).__VUE_APP__ = this._app;
      
      // Force DevTools to detect our app
      setTimeout(() => {
        const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__;
        if (devtools && this._app) {
          devtools.emit?.('app:init', this._app, '3.5.13', { 
            config: this._app.config,
            instance: this._app._instance
          });
        }
      }, 100);
    }

    this._isInitialized = true;
  }

  /**
   * Register a new portal to render a component into a specific container
   * 
   * This is the main entry point for VueApplicationMixin windows. Instead of creating
   * their own Vue app, they register as a portal with the singleton host.
   * 
   * @param component - The Vue component to render
   * @param props - Props to pass to the component
   * @param container - The DOM element to render into (usually the window's content element)
   * @param refCallback - Callback to receive the component instance reference
   * @returns A unique portal ID for later updates/unregistration
   */
  async registerPortal(component: any, props: Record<string, any>, container: HTMLElement, refCallback: (instance: any) => void): Promise<string | undefined> {
    await this._ensureMounted();
    
    // Check if this container already has a portal registered
    const existingPortal = Array.from(this._portals.values()).find(p => p.container === container);
    if (existingPortal) {
      return undefined;
    }
    
    const id = `fcb-portal-${++this._portalCounter}`;
    const portal: Portal = { id, component, props, container, ref: refCallback };
    this._portals.set(id, portal);
    (window as any).__fcbVueHost?.registerPortal(portal);
    return id;
  }

  /**
   * Get a portal by ID
   * 
   * @param id - The portal ID
   * @returns The portal if found, undefined otherwise
   */
  getPortal(id: string): Portal | undefined {
    return this._portals.get(id);
  }

  /**
   * Get all portal IDs
   * 
   * @returns Array of all portal IDs
   */
  getPortalIds(): string[] {
    return Array.from(this._portals.keys());
  }

  /**
   * Check if a portal with the given ID exists
   * 
   * @param id - The portal ID to check
   * @returns True if the portal exists, false otherwise
   */
  hasPortal(id: string): boolean {
    return this._portals.has(id);
  }

  /**
   * Check if a container already has a portal registered
   * 
   * @param container - The DOM element to check
   * @returns The portal ID if found, null otherwise
   */
  getPortalForContainer(container: HTMLElement): string | null {
    for (const [id, portal] of this._portals) {
      if (portal.container === container) {
        return id;
      }
    }
    return null;
  }

  /**
   * Unregister a portal when the window is closed
   * 
   * Cleans up the portal from the host's rendering list and removes it
   * from the DOM. Called by VueApplicationMixin.close().
   * 
   * @param id - The portal ID returned by registerPortal
   */
  unregisterPortal(id: string): void {
    this._portals.delete(id);
    (window as any).__fcbVueHost?.unregisterPortal(id);
  }

  /**
   * Update props for an existing portal
   * 
   * Used when VueApplicationMixin needs to update component props
   * (e.g., when the window re-renders with new data).
   * 
   * @param id - The portal ID to update
   * @param props - New props to merge with existing props
   */
  async updatePortalProps(id: string, props: Record<string, any>): Promise<void> {
    await this._ensureMounted();
    
    const portal = this._portals.get(id);
    if (portal) {
      Object.assign(portal.props, props);
      // Trigger reactivity by replacing the object
      const newPortal = { ...portal, props: { ...portal.props, ...props } };
      this._portals.set(id, newPortal);
      (window as any).__fcbVueHost?.registerPortal(newPortal);
    }
  }
}

export const vueHost = VueHost.getInstance();
