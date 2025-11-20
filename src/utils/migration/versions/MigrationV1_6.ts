import { Migration, MigrationResult, MigrationContext } from '../types';
import { notifyError } from '@/utils/notifications';
import { useMainStore } from '@/applications/stores';
import { ArcBasicIndex, SessionBasicIndex, } from '@/types';
import { Arc, Campaign, } from '@/classes';
import { DOCUMENT_TYPES } from '@/documents';
import { VersionUtils } from '@/utils/version';

let processed = 0;
let totalEntries= 0;
const updateProgress = (status: string) => {
  const event = new CustomEvent('migration-progress', {
    detail: { current: processed, total: totalEntries, status }
  });
  document.dispatchEvent(event);
};

/**
 * Migration 1.6.0
 * Rebuilds the topic folder entries index
 */
export class MigrationV1_6 implements Migration {
  public readonly targetVersion = '1.6.0';
  public readonly description = 'Rebuilds the campaign index';

  private _context: MigrationContext;

  constructor(_context: MigrationContext) {
    this._context = _context;
  }

  async migrate(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedCount: 0,
      failedCount: 0,
      errors: [],
      warnings: []
    };

    try {
      const settings = await useMainStore().getAllSettings();

      // these will be fast - so just count by setting
      totalEntries = settings.length;

      // shift from campaignNames to campaigns
      for (const setting of settings) {
        // we have to load the campaigns manually b/c setting.campaignNames isn't valid any more
        const campaignIndex = await setting.compendium.getIndex({
          fields: [
            'name', 
            'uuid', 
            'flags.campaign-builder.campaignBuilderType',
            'pages.system.sessions',
            'pages.system.sessionIndex',
          ]
        });

        // need to setup the campaign index on the setting
        setting.campaignIndex = []

        for (const campaignIdx of campaignIndex) {
          // @ts-ignore
          if (campaignIdx.flags?.['campaign-builder']?.campaignBuilderType !== DOCUMENT_TYPES.Campaign)
            continue;

          setting.campaignIndex.push({
            uuid: campaignIdx.uuid,
            name: campaignIdx.name || '',
            completed: false,
            arcs: [],
          });
          await setting.save();


          // get the sessions off the index if we're coming from 1.5.1 or higher
          // if we're coming from lower, the 1_5_1 migration already moved them 
          //    to session index
          let sessionList: SessionBasicIndex[];

          // loading campaign breaks the index, so we have to capture first
          if (VersionUtils.compareVersions(this._context.originalVersion, '1.5.1') >= 0) {
            sessionList = campaignIdx.pages?.[0].system?.sessions;
          }

          const campaign = await Campaign.fromUuid(campaignIdx.uuid);
          if (!campaign)
            continue;

          if (VersionUtils.compareVersions(this._context.originalVersion, '1.5.1') < 0) {
            sessionList = campaign.sessionIndex;
          }
         
          // create an arc - this will add it to the campaign and setting indexes
          const arc = await Arc.create(campaign, 'All sessions'); 
          if (!arc)
            throw new Error('Failed to create catch-all arc');

          // find the min and max session numbers and create the session index
          let minSessionNumber = Number.MAX_SAFE_INTEGER;
          let maxSessionNumber = Number.MIN_SAFE_INTEGER;
          for (const sessionIdx of sessionList) {
            if (sessionIdx.number < minSessionNumber)
              minSessionNumber = sessionIdx.number;
            if (sessionIdx.number > maxSessionNumber)
              maxSessionNumber = sessionIdx.number;
          }

          arc.startSessionNumber = minSessionNumber;
          arc.endSessionNumber = maxSessionNumber;
          await arc.save();

          const arcIndex = {
            uuid: arc.uuid,
            name: arc.name,
            startSessionNumber: arc.startSessionNumber,
            endSessionNumber: arc.endSessionNumber,
          } as ArcBasicIndex;

          // renamed sessions on the campaign
          campaign.sessionIndex = sessionList;
          campaign.arcIndex = [arcIndex];
          await campaign.save();
        }

        processed++;
        updateProgress(`Processed setting: ${setting.name}`);  
      }
    } catch (outer) {
      result.success = false;
      result.errors?.push(`MigrationV1_6 failed: ${outer}`);
      // eslint-disable-next-line no-console
      notifyError(`MigrationV1_6 failed: ${outer}`);
      console.error('MigrationV1_6 fatal error:', outer);
    }

    return result;
  }    
}
