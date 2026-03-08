import { MigrationConstructor } from '../types';
import { MigrationV1_6 } from './MigrationV1_6';
import { MigrationV1_7 } from './MigrationV1_7';
import { MigrationV1_8 } from './MigrationV1_8';
import { MigrationV1_8_5 } from './MigrationV1_8_5';
import { MigrationV1_8_6 } from './MigrationV1_8_6';
import { MigrationV1_9 } from './MigrationV1_9';
import { MigrationV1_9_1 } from './MigrationV1_9_1';
import { MigrationV1_10 } from './MigrationV1_10';

export const migrationVersions: Record<string, MigrationConstructor> = {
  '1.6.0': MigrationV1_6,
  '1.7.0': MigrationV1_7,
  '1.8.0': MigrationV1_8,
  '1.8.5': MigrationV1_8_5,
  '1.8.6': MigrationV1_8_6,
  '1.9.0': MigrationV1_9,
  '1.9.1': MigrationV1_9_1,
  '1.10.0': MigrationV1_10,
};
