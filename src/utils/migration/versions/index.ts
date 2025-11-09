import { MigrationConstructor } from '../types';
import { MigrationV1_5 } from './MigrationV1_5';
import { MigrationV1_5_1 } from './MigrationV1_5_1';
import { MigrationV1_6 } from './MigrationV1_6';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.5.0': MigrationV1_5,
  '1.5.1': MigrationV1_5_1,
  '1.6.0': MigrationV1_6,
};
