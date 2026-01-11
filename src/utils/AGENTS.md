# Utility Service Structure

This document describes the standard pattern for utility services in the `src/utils` directory. These services should be structured as a single object that encapsulates related functionality and is exported as the default export.

## Pattern

Utility services should follow this structure:

```typescript
// Import dependencies at the top
import { someDependency } from '@/path/to/dependency';

/**
 * Brief description of what this service does.
 * More detailed explanation of the service's purpose and scope.
 */
const ServiceName = {
  /**
   * Description of what this method does.
   * @param param1 - Description of parameter 1
   * @param param2 - Description of parameter 2
   * @returns Description of what is returned
   */
  methodOne: (param1: Type1, param2: Type2): ReturnType => {
    // Implementation here
  },

  /**
   * Description of what this method does.
   * @param config - Configuration object
   * @returns Description of what is returned
   */
  methodTwo: (config: ConfigType): ReturnType => {
    // Implementation here
  },

  // Add more methods as needed
};

// Export the service as default
export default ServiceName;
```

## Key Principles

1. **Single Service Object**: All related functionality is encapsulated in a single object
2. **Default Export**: The service is exported as the default export
3. **Method Documentation**: Each method should have JSDoc comments
4. **Type Safety**: Use proper TypeScript types for parameters and return values
5. **No Class Instantiation**: Services are plain objects, not classes - no `new` keyword needed

## Example

See `appWindow.ts` for a reference implementation:

```typescript
import { moduleId } from '@/settings';

/**
 * Service for managing the Campaign Builder application window state.
 * Provides methods to check if the app is open and to close it properly.
 */
const AppWindowService = {
  /**
   * Checks if the Campaign Builder application is currently open.
   * @returns true if the app is open, false otherwise
   */
  isCampaignBuilderAppOpen: (): boolean => {
    // Implementation
  },

  /**
   * Closes the Campaign Builder application if it's open.
   */
  closeCampaignBuilderApp: (): void => {
    // Implementation
  }
};

export default AppWindowService;
```

## Usage

Import and use the service:

```typescript
import AppWindowService from '@/utils/appWindow';

// Use the service methods
if (AppWindowService.isCampaignBuilderAppOpen()) {
  AppWindowService.closeCampaignBuilderApp();
}
```

## When to Use This Pattern

Use this pattern for:
- Stateless utility functions that are logically grouped
- Services that interact with external APIs or systems
- Helper functions that don't need to maintain internal state
- Cross-cutting concerns like logging, validation, or communication

## When NOT to Use This Pattern

Don't use this pattern for:
- Classes that need to be instantiated with `new`
- Services that maintain internal state (consider Pinia stores instead)
- React/Vue composables (use the composable pattern instead)
- Single function exports (export the function directly)
