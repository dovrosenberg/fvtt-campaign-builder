import { MigrationConstructor } from '../types';
import { MigrationV1_6 } from './MigrationV1_6';
import { MigrationV1_7 } from './MigrationV1_7';
import { MigrationV1_8 } from './MigrationV1_8';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.6.0': MigrationV1_6,
  '1.7.0': MigrationV1_7,
  '1.8.0': MigrationV1_8,
};
