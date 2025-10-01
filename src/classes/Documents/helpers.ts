import { FCB_DOCUMENT_TYPES } from '@/documents';

    
/**
 * Creates a new content wrapper.  Does not add to FCBSetting (but does put in the compendium).
 * 
 * @param {string} compendiumId - The compendium to create the content in. 
 * @param {FCB_DOCUMENT_TYPES} documentType - The subtype of JournalEntryPage
 * @param {string} folderName - The name of the folder to create the content in
 * @param {string} name - The name of the content 
 * @param {T['system']} defaultSystem - The default system data for the content
 * @returns A promise that resolves when the page has been created with either the page or null for failure
 */
export const create = async<FCBJournalPageType extends JournalEntryPage<JournalEntryPage.SubType>>(
  compendiumId: string, 
  folderName: string,
  documentType: FCB_DOCUMENT_TYPES, 
  name: string,
  defaultSystem: FCBJournalPageType['system'],
): Promise<FCBJournalPageType | null> => {
  // find the folder it goes in 
  const pack = game.packs.get(compendiumId);
  let folder = pack?.folders.find(f => f.name === folderName);
  if (!folder) {
    // make it
    const folders = await Folder.createDocuments([{
      name: folderName,
      type: 'JournalEntry' as const,
      sorting: 'a' as const,
    }], { pack: compendiumId });

    if (!folders)
      throw new Error('Invalid folder in FCBJournalEntryPage.create()');

    folder = folders[0];
  }

  // create a wrapping journal entry for the content
  const journalEntry = await JournalEntry.create({
    name: name,
    folder: folder.id,
  },{
    pack: compendiumId,
  });

  if (!journalEntry)
    throw new Error('Couldn\'t create new journal entry');

  // now add the page
  const pages = await JournalEntryPage.createDocuments([{
    type: documentType as any,
    name: name,
    system: defaultSystem
  }],{
    parent: journalEntry,
  }) as unknown as FCBJournalPageType[];

  if (!pages || pages.length === 0)
    throw new Error('Couldn\'t create new journal entry page');
  
  return pages[0];
}
  
/**
 * Updates document in the database and updates the name on the parent
 *    journal entry if needed
 * 
 * @returns A promise with the updated JournalEntryPage, or null if the update failed.
 */
export const update = async<
  FCBJournalPageType extends JournalEntryPage<JournalEntryPage.SubType>,
  UpdateDataType extends JournalEntryPage.UpdateData
>(
  document: FCBJournalPageType, updateData: UpdateDataType): Promise<FCBJournalPageType | undefined> => {
  if (!document.parent)
    return undefined;

  let success = true;
  try {
    // update the name on the wrapper
    if (updateData.name) {
      await document.parent.update({ name: updateData.name });
    }

    // now save the page
    await document.update(updateData);
  } catch (e) {
    console.error(`Error updating journal entry page ${document.uuid}`, e);
    success = false;
  }

  return success ? document : undefined;
}
