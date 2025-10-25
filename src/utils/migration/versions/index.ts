import { MigrationConstructor } from '../types';
import { MigrationV1_5 } from './MigrationV1_5';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.5.0': MigrationV1_5,
};
