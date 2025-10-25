// contains the data for the tests

import { Topics } from '@/types';
import { SettingDescriptor } from './setting';

class DataGenerator {
  public settings: SettingDescriptor[] = [];

  constructor() {
    // Setting 1: Dustinna - A desert world with crystalline tech
    this.settings.push({
      name: 'Dustinna',
      genre: 'Science Fiction',
      settingFeeling: 'Gritty survival meets wonder in a harsh crystalline desert',
      description: 'A harsh desert planet where ancient crystalline towers rise from the dunes, remnants of a long-lost civilization. The crystals hum with energy, powering strange technology that the inhabitants barely understand. Water is precious, and survival depends on cooperation between nomadic tribes and settled oasis communities.',
      topics: {
        [Topics.Character]: [
          { name: 'Zephyr Vale' },
          { name: 'Kira Sandborn' },
          { name: 'Oren Crystalwright' },
          { name: 'Nyx the Wanderer' },
        ],
        [Topics.Location]: [
          { name: 'The Amber Oasis' },
          { name: 'Crystal Spire Valley' },
          { name: 'Dune Merchant Caravan' },
          { name: 'The Buried Archives' },
        ],
        [Topics.Organization]: [
          { name: 'The Water Council' },
          { name: 'Crystal Seekers Guild' },
          { name: 'Nomad Confederation' },
          { name: 'Archive Keepers' },
        ],
        [Topics.PC]: [
          { name: 'Rasha Dunestrider' },
          { name: 'Theron Brightstone' },
          { name: 'Mira Windcaller' },
        ],
      },
      campaigns: [
        {
          name: 'The Crystal Awakening',
          sessions: [
            { name: 'Drought at the Oasis', number: 1 },
            { name: 'The Singing Spires', number: 2 },
            { name: 'Raiders from the Deep Sands', number: 3 },
            { name: 'Discovery in the Archives', number: 4 },
          ]
        },
        {
          name: 'Winds of Change',
          sessions: [
            { name: 'The Caravan Arrives', number: 1 },
            { name: 'Secrets of the Water Council', number: 2 },
            { name: 'Storm Over the Dunes', number: 3 },
          ]
        },
      ]
    });

    // Setting 2: Umbral Tides - A world of floating islands and sky pirates
    this.settings.push({
      name: 'Umbral Tides',
      genre: 'Science Fiction',
      settingFeeling: 'Swashbuckling adventure in a world of floating islands and airships',
      description: 'A world where the surface has been lost to an eternal mist called the Umbral Sea. Civilization thrives on floating islands suspended by mysterious gravitational anomalies. Airships sail between islands, carrying trade goods and adventurers. Sky pirates prowl the trade routes while scholars seek to understand the ancient magic that keeps the islands afloat.',
      topics: {
        [Topics.Character]: [
          { name: 'Captain Vex Stormwright' },
          { name: 'Professor Elara Windsong' },
          { name: 'Grimm the Quartermaster' },
          { name: 'Lady Seraphine Cloudreach' },
          { name: 'Boggs the Engineer' },
        ],
        [Topics.Location]: [
          { name: 'Port Horizon' },
          { name: 'The Floating Gardens' },
          { name: 'Skyhold Academy' },
          { name: 'The Shattered Isles' },
          { name: 'Tidemark Station' },
        ],
        [Topics.Organization]: [
          { name: 'The Sky Merchants Company' },
          { name: 'Brotherhood of the Umbral Deep' },
          { name: 'Windcaller Academy' },
          { name: 'The Crimson Sails' },
          { name: 'Island Council' },
        ],
        [Topics.PC]: [
          { name: 'Dash Cloudrunner' },
          { name: 'Astrid Ironhull' },
          { name: 'Felix Brightsail' },
          { name: 'Raven Mistwalker' },
        ],
      },
      campaigns: [
        {
          name: 'The Lost Island',
          sessions: [
            { name: 'Trouble at Port Horizon', number: 1 },
            { name: 'The Ancient Map', number: 2 },
            { name: 'Through the Storm Wall', number: 3 },
            { name: 'Discovery of Shimmerfall Isle', number: 4 },
            { name: 'The Crimson Sails Attack', number: 5 },
          ]
        },
        {
          name: 'Shadows Below',
          sessions: [
            { name: 'The Umbral Expedition', number: 1 },
            { name: 'Strange Signals', number: 2 },
            { name: 'Descent into the Mist', number: 3 },
          ]
        },
      ]
    });
  }
}

export const testData = new DataGenerator();
