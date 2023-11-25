// contains typescript types used throughout the application

type WindowTab = {
  id: string,   // unique id
  text: string,   // label on the 
  active: boolean,   // is this the currently active tab
  history: string[],    // array of the history of entityIds shown in this tab (for the forward/back arrows) 
  entity?: any,        // TODO: ??? 
  entityId: string,   // uuid of the entity displayed - TODO: do we need this?
  pageId: string,   // TODO: ???
  anchor: String,     // TODO: ???
}
