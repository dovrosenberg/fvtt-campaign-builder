/* 
 * An node representing a session in the campaign tree structures
 */

import { CollapsibleNode, Session } from '@/classes';
import { ModuleSettings, SettingKey } from '@/settings';
import { SessionDisplayMode } from '@/types';
import { localize } from '@/utils/game';

// represents an entry in the type-grouped structure
// has no children, the parent is a DirectoryTypeNode
export class DirectorySessionNode extends CollapsibleNode<never> {
  private _name: string;
  private _sessionNumber: number;
  private _date: Date | null;
  
  constructor(id: string, name: string, sessionNumber: number, date: Date | null, parentId: string | null) {
    super(id, false, parentId, [], [], []);

    this._name = name;
    this._sessionNumber = sessionNumber;
    this._date = date;
  }

  get name(): string {
    const displayMode = ModuleSettings.get(SettingKey.sessionDisplayMode);
    
    switch (displayMode) {
      case SessionDisplayMode.Date:
        if (this._date) {
          return this._date.toLocaleDateString();
        }
        // Fall back to number if no date is available
        return `${localize('labels.session.session')} ${this._sessionNumber}`;
      
      case SessionDisplayMode.Name:
        // Use the actual session name if it exists and isn't empty
        if (this._name && this._name.trim() !== '') {
          return this._name;
        }
        // Fall back to number if no name is available
        return `${localize('labels.session.session')} ${this._sessionNumber}`;
      
      case SessionDisplayMode.Number:
      default:
        return `${localize('labels.session.session')} ${this._sessionNumber}`;
    }
  }

  get sessionNumber(): number {
    return this._sessionNumber;
  }

  get tooltip(): string {
    // Always show a comprehensive tooltip regardless of display mode
    let tooltip = `${localize('labels.session.session')} ${this._sessionNumber}`;
    
    // Add the name if it exists and isn't empty
    if (this._name && this._name.trim() !== '') {
      tooltip += ` - ${this._name}`;
    }
    
    // Add the date if it exists
    if (this._date) {
      tooltip += ` (${this._date.toLocaleDateString()})`;
    }
    
    return tooltip;
  }

  // converts the entry to a DirectoryEntryNode for cleaner interface
  static fromSession = (session: Session, campaignId: string): DirectorySessionNode => {
    if (!CollapsibleNode._currentSetting)
      throw new Error('No currentSetting in DirectorySessionNode.fromEntry()');

    return new DirectorySessionNode(
      session.uuid,
      session.name,
      session.number,
      session.date,
      campaignId,
    );
  };
  
  /**
    * no children
    * @override
    */
  override async _loadNodeList(_ids: string[], _updateIds: string[] ): Promise<void> {}
}

