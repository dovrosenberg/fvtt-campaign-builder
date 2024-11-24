export * from './entry';
export * from './session';
import moduleJson from '@module';

export const DOCUMENT_TYPES = {
  Entry: `${moduleJson.id}.entry`,
  Session: `${moduleJson.id}.session`,
};