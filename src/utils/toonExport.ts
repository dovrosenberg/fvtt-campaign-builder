/**
 * Service for exporting entire settings to TOON-format (.toon) files intended for LLM consumption.
 *
 * TOON (https://toonformat.dev) is a compact, indentation-based structured format that is cheaper
 * than JSON in tokens while still parseable by LLMs. This exporter builds the same resolved
 * `SettingTree` the markdown exporter uses and hands it directly to `@toon-format/toon`'s
 * `encode()`. The library auto-detects uniform arrays-of-objects and emits them in tabular form.
 *
 * TOON-specific benefits baked into the tree (and therefore the output):
 *   - Every entity carries a `uuid` field as its first property.
 *   - The top-level `index` is an alphabetical lookup of every entry (name/topic/type/uuid) — a
 *     spelling anchor for an LLM given a raw session transcript.
 */

import { encode, type JsonValue } from '@toon-format/toon';

import { FCBSetting } from '@/classes';
import { localize } from '@/utils/game';
import { downloadFile } from '@/utils/fileDownload';
import { notifyError, notifyInfo } from './notifications';
import { buildSettingTree } from './settingExportTree';

/**
 * Shared TOON encode() replacer. Strips empty arrays and explicit nulls so the output isn't
 * padded with `vignettes[0]:` or `todos: null` placeholders. Empty strings are intentionally
 * preserved — dropping them breaks object-shape uniformity and prevents the encoder from
 * choosing tabular form (every row must have the same keys for tabular detection to fire).
 * Primitive falsy values (0, false, '') are also semantically meaningful. `fieldType` is a
 * numeric enum carried on custom-field rows purely for the markdown renderer; an LLM reading
 * `fieldType: 2` has no way to interpret it, and the `value` is already in its final form.
 * @param key - Property key being encoded.
 * @param value - Property value being encoded.
 * @returns The value to encode, or undefined to drop the property.
 */
export const toonReplacer = (key: string, value: JsonValue): JsonValue | undefined => {
  if (key === 'fieldType') {
    return undefined;
  }
  if (value === null) {
    return undefined;
  }
  if (Array.isArray(value) && value.length === 0) {
    return undefined;
  }
  return value;
};

/**
 * Exports an entire setting to a single .toon file and triggers a browser download.
 * @param settingId - UUID of the setting to export.
 */
const exportSettingToon = async (settingId: string): Promise<void> => {
  try {
    const setting = await FCBSetting.fromUuid(settingId);
    if (!setting) {
      throw new Error('Setting not found');
    }

    notifyInfo(localize('notifications.export.starting'));

    const tree = await buildSettingTree(setting);

    const toon = encode(tree as unknown as JsonValue, { replacer: toonReplacer });

    const filename = `${setting.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.toon`;
    downloadFile(toon, filename, 'text/plain');

    notifyInfo(localize('notifications.export.complete'));
  } catch (error) {
    console.error('Error exporting setting as TOON:', error);
    notifyError(localize('notifications.export.failed'));
  }
};

const ToonExportService = {
  exportSettingToon
};

export default ToonExportService;
