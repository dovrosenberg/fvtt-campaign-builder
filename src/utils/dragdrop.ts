// Drag/drop helpers for Foundry and internal DnD

import { NodeDragDropData, KnownDragTypes, } from '@/types';

/**
 * Helper function to set combined drag data for FCB entries
 * Combines Foundry's required fields (type and uuid) with custom FCB data
 * 
 * @param event - The drag event
 * @param uuid - The UUID of the JournalEntry
 * @param fcbData - The custom FCB drag data
 */
export const setCombinedDragData = (event: DragEvent, uuid: string, fcbData: NodeDragDropData): void => {
  if (!event.dataTransfer) return;
  
  const dragData = {
    // Foundry-required fields
    type: 'JournalEntry',
    uuid: uuid,
    
    // Our custom FCB data
    fcbData: fcbData
  };
  
  const dataStr = JSON.stringify(dragData);
  event.dataTransfer.setData('text/plain', dataStr);
  event.dataTransfer.setData('application/json', dataStr);
};

/**
 * Validates that a drag event contains valid JSON data in the 'text/plain' format.
 * Checks for proper data transfer format and attempts to parse the JSON content.
 * Note: This doesn't validate the specific type of Entry/Document/etc being dropped,
 * only that the data is text and valid JSON.
 * 
 * But generally Foundry drags have type and uuid and ours have fcbData
 * 
 * @param event - The drag event to validate
 * @returns The parsed JSON data as an object, or undefined if validation fails
 */
export const getValidatedData = (event: DragEvent): KnownDragTypes | undefined => {
  const types = event.dataTransfer?.types ?? [];

  if (!types.includes('text/plain')) return undefined;

  let data;
  try {
    data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
  }
  catch (err) {
    return undefined;
  }

  return data;
};

/** Read a data pack from a drop event. Return the type from fcbData if present, otherwise from the root */
export const getType = (data: KnownDragTypes): string => {
  // @ts-ignore
  return data.fcbData?.type ?? data.type;
};

/**
 * Handles the drag start event for actor documents.
 * Sets up the drag data, creates an appropriate drag image based on the actor's token,
 * and configures the drag operation for dropping actors onto the canvas.
 * 
 * @param event - The drag start event
 * @param uuid - The UUID of the actor to drag
 * @returns A promise that resolves when the drag setup is complete
 */
export const actorDragStart = async(event: DragEvent, uuid: string): Promise<void> => {
    // Remove these lines - they're preventing the drag from working
    // event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer || !canvas) 
      return;

    try {
      // Get the actor document using fromUuid
      const actor = await fromUuid<Actor>(uuid);

      if (actor) {
        // Set the drag data using the actor's toDragData method
        event.dataTransfer.setData("text/plain", JSON.stringify(actor.toDragData()));

        // Set a drag image 
        if (actor.img && canvas.ready) {
          // size depends on canvas
          const pt = actor.prototypeToken;
          let w, h;

          // Make sure pt.texture exists and has the required properties
          if (pt && pt.texture && typeof pt.texture.scaleX === 'number' && typeof pt.texture.scaleY === 'number' && canvas.dimensions && canvas.stage && pt.width && pt.height) {
            w = pt.width * canvas.dimensions.size * Math.abs(pt.texture.scaleX) * canvas.stage.scale.x;
            h = pt.height * canvas.dimensions.size * Math.abs(pt.texture.scaleY) * canvas.stage.scale.y;
          } else if (canvas.dimensions && canvas.stage) {
            // Fallback to a simpler approach if texture properties aren't available
            const size = canvas.dimensions.size;
            const scale = canvas.stage.scale.x;
            w = size * scale;
            h = size * scale;
          } else {
            throw new Error("Failed to drop actor in dragDrop.actorDragStart");
          }

          const preview = foundry.applications.ux.DragDrop.implementation.createDragImage({ src: actor.img }, w, h);
          event.dataTransfer.setDragImage(preview, w / 2, h / 2);
        }

        // Set the drag effect
        event.dataTransfer.effectAllowed = 'copy';
      }
    } catch (error) {
      console.error("Error setting up drag data:", error);
    }
  }
  
/**
 * Handles the drag start event for item documents.
 * Sets up the drag data, creates an appropriate drag image based on the item's icon,
 * and configures the drag operation for dropping items onto the canvas or character sheets.
 * 
 * @param event - The drag start event
 * @param uuid - The UUID of the item to drag
 * @returns A promise that resolves when the drag setup is complete
 */
export const itemDragStart = async(event: DragEvent, uuid: string): Promise<void> => {
  event.stopPropagation();

  if (!event.dataTransfer || !canvas?.dimensions || !canvas?.stage) return;

  try {
    // Get the Item document using fromUuid
    const item = await fromUuid<Item>(uuid);

    if (item) {
      event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));

      // Set a drag image 
      if (item.img && canvas.ready) {
        const size = canvas.dimensions.size;
        const scale = canvas.stage.scale.x;
        const w = size * scale;
        const h = size * scale;
        
        // prevent image caching if foundry does  
        const existingPreview = document.getElementById("drag-preview");
        if (existingPreview) existingPreview.remove();
                  
        const preview = foundry.applications.ux.DragDrop.implementation.createDragImage({ src: item.img }, w, h);

        event.dataTransfer.setDragImage(preview, w / 2, h / 2);
      }

      // Set the drag effect
      event.dataTransfer.effectAllowed = 'copy';
    }
  } catch (error) {
    console.error("Error setting up drag data:", error);
  }
}

/**
 * Handles the drag start event for generic foundry documents.
 * Sets up the drag data, creates an appropriate drag image based on the item's icon,
 * and configures the drag operation for dropping items onto the canvas or character sheets.
 * 
 * @param event - The drag start event
 * @param uuid - The UUID of the item to drag
 * @returns A promise that resolves when the drag setup is complete
 */
export const foundryDragStart = async (event: DragEvent, uuid: string): Promise<void> => {
  event.stopPropagation();

  // just use built in data
  try {
    const doc = await fromUuid(uuid);
    const dragData = doc?.toDragData() || {};
    event.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
  } catch(error) {
     console.error("Error setting up drag data:", error);
  }
}