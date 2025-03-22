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