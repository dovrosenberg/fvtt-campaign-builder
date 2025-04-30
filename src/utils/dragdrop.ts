export const getValidatedData = (event: DragEvent): Record<string, any> | undefined => {
  if (event.dataTransfer?.types[0]!=='text/plain') 
    return undefined;

  let data;
  try {
    data = JSON.parse(event.dataTransfer?.getData('text/plain') || '');
  }
  catch (err) {
    return undefined;
  }

  return data;
};

export const actorDragStart = async(event: DragEvent, uuid: string): Promise<void> => {
    // Remove these lines - they're preventing the drag from working
    // event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer) return;

    try {
      // Get the actor document using fromUuid
      const actor = await fromUuid(uuid) as Actor | null;

      if (actor) {
        // Set the drag data using the actor's toDragData method
        event.dataTransfer.setData("text/plain", JSON.stringify(actor.toDragData()));

        // Set a drag image 
        if (actor.img && canvas.ready) {
          // size depends on canvas
          const pt = actor.prototypeToken;
          let w, h;

          // Make sure pt.texture exists and has the required properties
          if (pt && pt.texture && typeof pt.texture.scaleX === 'number' && typeof pt.texture.scaleY === 'number') {
            w = pt.width * canvas.dimensions.size * Math.abs(pt.texture.scaleX) * canvas.stage.scale.x;
            h = pt.height * canvas.dimensions.size * Math.abs(pt.texture.scaleY) * canvas.stage.scale.y;
          } else {
            // Fallback to a simpler approach if texture properties aren't available
            const size = canvas.dimensions.size;
            const scale = canvas.stage.scale.x;
            w = size * scale;
            h = size * scale;
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
  
    export const itemDragStart = async(event: DragEvent, uuid: string): Promise<void> => {
    // Remove these lines - they're preventing the drag from working
    // event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer) return;

    try {
      // Get the Item document using fromUuid
      const item = await fromUuid(uuid) as Item | null;

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