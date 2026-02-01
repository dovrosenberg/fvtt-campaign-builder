/**
 * Shared utilities for handling UUID links and drops in text components
 * 
 * This module provides common functionality for:
 * - Handling UUID drops from the directory tree
 * - Converting text to UUID references
 * - Enriching UUID references to displayable links
 */

import { enrichFcbHTML } from '@/components/Editor/helpers';
import DragDropService from '@/utils/dragDrop';
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
  const data = DragDropService.getValidatedData(event);
  if (!data) {
    return { handled: false };
  }

  let entryUuid: string | null = null;
  let showName = false;  // we only put in the name for page headers
  let name = '';

  // handle the base case
  if ((data as FoundryDragType).uuid) {
    entryUuid = (data as FoundryDragType).uuid;
    
    // Check for anchor in Foundry drag data
    const anchor = (data as FoundryDragType).anchor;
    if (anchor?.slug) {
      entryUuid = `${entryUuid}#${anchor.slug}`;

      if (anchor?.name) {
        showName = true;
        name = anchor.name;
      }
    }
  } else if ((data as FCBDragType<any>).fcbData) {
    // Handle different data structures from various drag sources
    switch (DragDropService.getType(data)) {
      case DragDropService.FCBDragTypes.Setting: 
        // From SettingDirectoryNodeWithChildren or SettingDirectoryNode
        entryUuid = (data as FCBDragType<SettingNodeDragData>).fcbData?.settingId;
        break;

      case DragDropService.FCBDragTypes.Entry: 
        // From SettingDirectoryNodeWithChildren or SettingDirectoryNode
        entryUuid = (data as FCBDragType<EntryNodeDragData>).fcbData?.childId;
        break;

      case DragDropService.FCBDragTypes.Campaign: 
        // From DirectoryCampaignNode
        entryUuid = (data as FCBDragType<CampaignNodeDragData>).fcbData?.campaignId;
        break;

      case DragDropService.FCBDragTypes.Session: 
        // From SessionDirectoryNode
        entryUuid = (data as FCBDragType<SessionNodeDragData>).fcbData?.sessionId;
        break;

      case DragDropService.FCBDragTypes.Front: 
        // From FrontDirectoryNode
        entryUuid = (data as FCBDragType<FrontNodeDragData>).fcbData?.frontId;
        break;

      case DragDropService.FCBDragTypes.Arc: 
        // From ArcDirectoryNode
        entryUuid = (data as FCBDragType<ArcNodeDragData>).fcbData?.arcId;
        break;

      case DragDropService.FCBDragTypes.StoryWeb:
        // From StoryWebDirectoryNode
        entryUuid = (data as FCBDragType<StoryWebNodeDragData>).fcbData?.storyWebId;
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
      linkText: `@UUID[${entryUuid}]${showName ? `{${name}}` : ''}`
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
 * Enriches HTML content by converting UUID references to clickable links
 * 
 * @param settingId - The current setting UUID
 * @param content - The content to enrich
 * @returns Promise resolving to the enriched HTML
 */
export const enrichUuidLinks = async(settingId: string | null, content: string): Promise<string> => {
  return enrichFcbHTML(settingId, content);
};

