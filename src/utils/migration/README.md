# Migration System

This folder contains the migration system for handling version upgrades in the Campaign Builder module.

## Structure

```
src/utils/migration/
├── index.ts              # Main exports
├── types.ts              # Type definitions
├── MigrationManager.ts   # Main migration coordinator
├── versions/             # Version-specific migrations
│   └── MigrationV1_2.ts  # PC migration for v1.2.0
└── README.md             # This file
```

## Usage

### For Developers

To add a new migration for a future version:

1. Create a new migration class in `versions/`:
   ```typescript
   import { Migration, MigrationResult, MigrationContext } from '../types';

   export class MigrationV1_3 implements Migration {
     public readonly targetVersion = '1.3.0';
     public readonly description = 'Description of what this migration does';

     constructor(private context: MigrationContext) {}

     async migrate(): Promise<MigrationResult> {
       // Perform the migration
       return {
         success: true,
         migratedCount: 0,
         failedCount: 0
       };
     }
   }
   ```

2. Register the migration in `MigrationManager.ts`:
   ```typescript
   private static migrations: Map<string, new (context: MigrationContext) => Migration> = new Map([
     ['1.2.0', MigrationV1_2],
     ['1.3.0', MigrationV1_3] // Add new migration here
   ]);
   ```

3. Export the migration from `index.ts`:
   ```typescript
   export { MigrationV1_3 } from './versions/MigrationV1_3';
   ```

## Migration Context

The migration context provides information to migrations:

```typescript
interface MigrationContext {
  dryRun?: boolean;           // Whether to perform a dry run
}
```

## Error Handling

Migrations should gracefully handle errors:
- Log detailed error information
- Continue with other items on failure
- Provide clear error messages in results
- Allow rollback where possible

