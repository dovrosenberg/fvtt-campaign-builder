/**
 * Shared utilities for handling UUID links and drops in text components
 * 
 * This module provides common functionality for:
 * - Handling UUID drops from the directory tree
 * - Converting text to UUID references
 * - Enriching UUID references to displayable links
 */

import { getValidatedData, getType } from './dragdrop';
import { replaceEntityReferences, EntityLinkingOptions } from './entityLinking';
import { enrichFcbHTML } from '@/components/Editor/helpers';
import { FCBSetting } from '@/classes';
import { FCBDragTypes } from '@/utils/dragdrop';
import { CampaignNodeDragData, EntryNodeDragData, SessionNodeDragData, FrontNodeDragData, ArcNodeDragData, SettingNodeDragData, StoryWebNodeDragData, FoundryDragType, FCBDragType } from '@/types';


/**
 * Configuration for UUID handling in text components
 */
export interface UuidHandlerOptions {
  /** The current setting UUID for enrichment */
  settingId: string | null;
  /** The UUID of the current entity being edited (to exclude from auto-conversion) */
  currentEntityUuid?: string;
  /** Whether entity linking (auto-conversion) is enabled */
  enableEntityLinking?: boolean;
}

/**
 * Result of processing a UUID drop
 */
export interface UuidDropResult {
  /** Whether the drop was handled successfully */
  handled: boolean;
  /** The UUID link text to insert, if any */
  linkText?: string;
}

/**
 * Processes a drop event to extract UUID and create link text
 * 
 * @param event - The drop event
 * @returns Promise resolving to the drop result
 */
export const processUuidDrop = async(event: DragEvent): Promise<UuidDropResult> => {
  event.stopPropagation();

  // Parse the data using the utility function
  const data = getValidatedData(event);
  if (!data) {
    return { handled: false };
  }

  let entryUuid: string | null = null;

  // handle the base case
  if ((data as FoundryDragType).uuid) {
    entryUuid = (data as FoundryDragType).uuid;
  } else if ((data as FCBDragType).fcbData) {
    // Handle different data structures from various drag sources
    switch (getType(data)) {
      case FCBDragTypes.Setting: 
        // From SettingDirectoryNodeWithChildren or SettingDirectoryNode
        entryUuid = (data.fcbData as SettingNodeDragData)?.settingId;
        break;

      case FCBDragTypes.Entry: 
        // From SettingDirectoryNodeWithChildren or SettingDirectoryNode
        entryUuid = (data.fcbData as EntryNodeDragData)?.childId;
        break;

      case FCBDragTypes.Campaign: 
        // From DirectoryCampaignNode
        entryUuid = (data.fcbData as CampaignNodeDragData)?.campaignId;
        break;

      case FCBDragTypes.Session: 
        // From SessionDirectoryNode
        entryUuid = (data.fcbData as SessionNodeDragData)?.sessionId;
        break;

      case FCBDragTypes.Front: 
        // From FrontDirectoryNode
        entryUuid = (data.fcbData as FrontNodeDragData)?.frontId;
        break;

      case FCBDragTypes.Arc: 
        // From ArcDirectoryNode
        entryUuid = (data.fcbData as ArcNodeDragData)?.arcId;
        break;

      case FCBDragTypes.StoryWeb:
        // From StoryWebDirectoryNode
        entryUuid = (data.fcbData as StoryWebNodeDragData)?.storyWebId;
        break;
        
      default:
        return { handled: false };  // nothing we can handle
    }
  }

  // If we found a valid UUID, return the link text
  if (entryUuid) {
    event.preventDefault();
    return {
      handled: true,
      linkText: `@UUID[${entryUuid}]`
    };
  }

  return { handled: false };
};

/**
 * Inserts text at the current cursor position in a textarea
 * 
 * @param textarea - The textarea element
 * @param text - The text to insert
 */
export const insertTextAtCursor = (textarea: HTMLTextAreaElement, text: string): void => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  
  // Insert the text
  textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(end);
  
  // Move cursor to after the inserted text
  textarea.selectionStart = textarea.selectionEnd = start + text.length;
  
  // Dispatch input event to ensure Vue reactivity
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

/**
 * Handles a UUID drop on a textarea element
 * 
 * @param event - The drop event
 * @param textarea - The textarea element
 * @returns Promise resolving to whether the drop was handled
 */
export const handleUuidDropOnTextarea = async(event: DragEvent, textarea: HTMLTextAreaElement): Promise<boolean> => {
  const result = await processUuidDrop(event);
  
  if (result.handled && result.linkText) {
    insertTextAtCursor(textarea, result.linkText);
    return true;
  }
  
  return false;
};

/**
 * Processes text content to apply entity linking (auto-convert names to UUIDs)
 * 
 * @param content - The text content to process
 * @param setting - The current setting for entity lookup
 * @param options - Configuration options
 * @returns Promise resolving to the processed content
 */
export const processEntityLinking = async(
  content: string,
  setting: FCBSetting,
  options: EntityLinkingOptions = {}
): Promise<string> => {
  return replaceEntityReferences(content, setting, options);
};

/**
 * Enriches HTML content by converting UUID references to clickable links
 * 
 * @param settingId - The current setting UUID
 * @param content - The content to enrich
 * @returns Promise resolving to the enriched HTML
 */
export const enrichUuidLinks = async(settingId: string | null, content: string): Promise<string> => {
  return enrichFcbHTML(settingId, content);
};

/**
 * Processes content on save - applies entity linking if enabled
 * 
 * @param content - The content to process
 * @param setting - The current setting
 * @param options - Processing options
 * @returns Promise resolving to the processed content
 */
export const processOnSave = async(
  content: string,
  setting: FCBSetting | null,
  options: UuidHandlerOptions = {}
): Promise<string> => {
  const { enableEntityLinking, currentEntityUuid } = options;
  
  // Apply entity linking if enabled and we have a setting
  if (enableEntityLinking && setting) {
    try {
      return await processEntityLinking(content, setting, { currentEntityUuid });
    } catch (error) {
      console.error('Failed to apply entity linking:', error);
      // Continue with original content if entity linking fails
    }
  }
  
  return content;
};

/**
 * Processes content for display - enriches UUID links
 * 
 * @param content - The content to process
 * @param options - Processing options
 * @returns Promise resolving to the processed content
 */
export const processForDisplay = async(
  content: string,
  options: UuidHandlerOptions = {}
): Promise<string> => {
  const { settingId } = options;
  
  // Enrich UUID links if we have a settingId
  if (settingId) {
    try {
      return await enrichUuidLinks(settingId, content);
    } catch (error) {
      console.error('Failed to enrich UUID links:', error);
      // Continue with original content if enrichment fails
    }
  }
  
  return content;
};
