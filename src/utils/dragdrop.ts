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
      const actor = await fromUuid(uuid) as Actor;

      if (actor) {
        // Set the drag data using the actor's toDragData method
        event.dataTransfer.setData("text/plain", JSON.stringify(actor.toDragData()));

        // Optional: Set a drag image if needed
        if (actor.img && canvas.ready) {
          // size depends on canvas
          const pt = actor.prototypeToken;
          const w = pt.width * canvas.dimensions.size * Math.abs(pt.texture.scaleX) * canvas.stage.scale.x;
          const h = pt.height * canvas.dimensions.size * Math.abs(pt.texture.scaleY) * canvas.stage.scale.y;
          const preview = foundry.applications.ux.DragDrop.implementation.createDragImage(actor.img, w, h);
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
      const item = await fromUuid(uuid) as Item;

      if (item) {
        // Set the drag data using the actor's toDragData method
        event.dataTransfer.setData("text/plain", JSON.stringify(item.toDragData()));

        // Optional: Set a drag image if needed
        if (item.img && canvas.ready) {
          // size depends on canvas
          const pt = item.prototypeToken;
          const w = pt.width * canvas.dimensions.size * Math.abs(pt.texture.scaleX) * canvas.stage.scale.x;
          const h = pt.height * canvas.dimensions.size * Math.abs(pt.texture.scaleY) * canvas.stage.scale.y;
          const preview = foundry.applications.ux.DragDrop.implementation.createDragImage(item.img, w, h);
          event.dataTransfer.setDragImage(preview, w / 2, h / 2);
        }

        // Set the drag effect
        event.dataTransfer.effectAllowed = 'copy';
      }
    } catch (error) {
      console.error("Error setting up drag data:", error);
    }
  }