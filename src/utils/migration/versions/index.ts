import { MigrationConstructor } from '../types';
import { MigrationV1_2 } from './MigrationV1_2';
import { MigrationV1_3_1 } from './MigrationV1_3_1';
import { MigrationV1_5 } from './MigrationV1_5';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.2.0': MigrationV1_2,
  '1.3.1': MigrationV1_3_1,
  '1.5.0': MigrationV1_5,
};
