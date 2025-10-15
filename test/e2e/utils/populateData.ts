import { TestContext } from '../types';
import { testData } from '@e2etest/data';

/**
 * Populates the test system with hardcoded data using the ExternalAPI
 */
export async function populateTestData(context: TestContext) {
  const page = context.page!;

  console.log('Populating test data...');

  // Wait for API to be available
  await page.waitForFunction(() => {
    return game?.modules?.get('campaign-builder')?.api;
  });

  // Iterate through each setting in test data
  for (let i = 0; i < testData.settings.length; i++) {
    const settingData = testData.settings[i];
    console.log(`  Creating setting: ${settingData.name}`);

    // Create the setting
    const settingResult = await page.evaluate(async (name: string) => {
      return await game.modules.get('campaign-builder')?.api.createSetting(name, true);
    }, settingData.name);

    if (!settingResult) {
      throw new Error(`Failed to create setting: ${settingData.name}`);
    }

    // Update setting properties
    await page.evaluate(async (args: { uuid: string; genre: string; feeling: string; description: string }) => {
      return await game.modules.get('campaign-builder')?.api.updateSetting(args.uuid, {
        genre: args.genre,
        settingFeeling: args.feeling,
        description: args.description
      });
    }, {
      uuid: settingResult.uuid,
      genre: settingData.genre,
      feeling: settingData.settingFeeling,
      description: settingData.description
    });

    // Create characters
    for (const character of settingData.characters) {
      console.log(`    Creating character: ${character.name}`);
      await page.evaluate(async (args: { topic: string; name: string }) => {
        return await game.modules.get('campaign-builder')?.api.createNamedEntry(
          game.modules.get('campaign-builder')?.api.TOPICS.Character,
          args.name
        );
      }, { topic: 'Character', name: character.name });
    }

    // Create locations
    for (const location of settingData.locations) {
      console.log(`    Creating location: ${location.name}`);
      await page.evaluate(async (args: { topic: string; name: string }) => {
        return await game.modules.get('campaign-builder')?.api.createNamedEntry(
          game.modules.get('campaign-builder')?.api.TOPICS.Location,
          args.name
        );
      }, { topic: 'Location', name: location.name });
    }

    // Create organizations
    for (const organization of settingData.organizations) {
      console.log(`    Creating organization: ${organization.name}`);
      await page.evaluate(async (args: { topic: string; name: string }) => {
        return await game.modules.get('campaign-builder')?.api.createNamedEntry(
          game.modules.get('campaign-builder')?.api.TOPICS.Organization,
          args.name
        );
      }, { topic: 'Organization', name: organization.name });
    }

    // Create PCs
    for (const pc of settingData.pcs) {
      console.log(`    Creating PC: ${pc.name}`);
      await page.evaluate(async (args: { topic: string; name: string }) => {
        return await game.modules.get('campaign-builder')?.api.createNamedEntry(
          game.modules.get('campaign-builder')?.api.TOPICS.PC,
          args.name
        );
      }, { topic: 'PC', name: pc.name });
    }

    // Create campaigns
    for (const campaign of settingData.campaigns) {
      console.log(`    Creating campaign: ${campaign.name}`);
      const campaignResult = await page.evaluate(async () => {
        return await game.modules.get('campaign-builder')?.api.createCampaign();
      });

      if (!campaignResult) {
        throw new Error(`Failed to create campaign: ${campaign.name}`);
      }

      // TODO: Rename campaign and create sessions
      // For now, campaigns and sessions creation will need additional API methods
      console.log(`      Campaign ${campaign.name} created (sessions not yet implemented)`);
    }
  }

  console.log('Test data population complete');
}
