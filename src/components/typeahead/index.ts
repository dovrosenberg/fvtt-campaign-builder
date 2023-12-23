import './TypeAhead.css';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export type TypeAheadData = {
}

export class TypeAhead extends HandlebarsPartial<TypeAhead.CallbackType> {
  static override _template = 'modules/world-builder/templates/TypeAhead.hbs';
  private _id: string;
  private _list = [] as string[];
  private _filteredItems = [] as string[];
  private _idx: number;
  private _control: JQuery;
  private _hasFocus: boolean;
  private _originalValue: string;

  constructor(list: string[]) {
    super();

    this.updateList(list);

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-ta-' + randomID();
    this._hasFocus = false;
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  // takes the current value
  public async getData(): Promise<TypeAheadData> {
    const data = {
      componentId: this._id,
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {
    // find the overall control
    this._control = html.find(`#${this._id}.fwb-typeahead`);

    // Get input and dropdown elements
    const input = this._control.find('#fwb-ta-input');
    const dropdown = this._control.find('#fwb-ta-dropdown');

    // Event listener for input changes
    input.on('input',  () => {
      // if we're just getting the focus, store the old value
      if (!this._hasFocus) {
        TODO: !!! THIS DOESN'T CAPTURE THE ORIGINAL VALUE... JUST THE FIRST CHANGE
        this._originalValue = input.val()?.toString() || '';
        this._hasFocus = true;
      }

      const inputValue = input.val()?.toString().toLowerCase() || '';

      // blank everything out if the string is empty (so box closes)
      this._filteredItems = !inputValue ? [] : this._list.filter((item)=>item.toLowerCase().indexOf(inputValue)!==-1);
 
      // Render the filtered items - we're not using handlebars because it's overly complicated to pass up a re-render request
      // we clear the index if we're typing
      this._idx = -1;
      this._refreshList();
    });

    // Event listener for item clicks
    dropdown.on('click', (event: JQuery.ClickEvent) => {
      if (event.target.classList.contains('typeahead-entry')) {
        const selection = event.target.textContent; 
        input.val(selection);
        dropdown.html(''); // Clear the dropdown
        this._hasFocus = false;
        this._makeCallback(TypeAhead.CallbackType.SelectionMade, selection);
      }
    });

    // capture keydown for up, down, enter
    this._control.on('keydown', (event: JQuery.KeyDownEvent) => this._onKeydown(event));

    // watch for clicks anywhere outside the control
    jQuery(document).on('click', (event: JQuery.ClickEvent) => {
      if (this._hasFocus && !jQuery(event.currentTarget).closest('.fwb-typeahead')[0]) {
        // we were in it, but now we're not; reset the value
        input.val(this._originalValue);
        this._hasFocus = false;
      }
    });
  }

  // change the valid item list
  public updateList(list: string[]) {
    this._list = deepClone(list);
  }

  private _onKeydown(event: JQuery.KeyDownEvent): void {
    // if no list, don't need to do anything
    if (!this._filteredItems)
      return;

    // either arrow starts at 0 if we're not highlighting something yet
    if (['ArrowUp', 'ArrowDown'].includes(event.key) && this._idx===-1) {
      this._idx = 0;
      this._refreshList();
      return;
    }

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        this._idx = ((this._idx||0) - 1 + this._filteredItems.length) % this._filteredItems.length;
        this._refreshList();
        return;

      case 'ArrowDown':
        event.preventDefault();
        this._idx = ((this._idx||0) + 1) % this._filteredItems.length;
        this._refreshList();
        return;

      case 'Enter':
      case 'Tab': {
        const input = this._control.find('#fwb-ta-input');
        let selection = '';

        // if nothing selected, check for a match or add something new
        // if box is empty, we don't add a new value, but we still say blank was seleted
        if (this._idx===-1 && input?.val()?.toString()) {
          selection = input.val().toString();

          // exact match only to let us add types that are just different cases
          const match = this._list.find(item=>item===selection.toString());
          if (match) {
            // it's match, so we'll select that item but don't need to add anything (we don't use the text
            //    in the box because it might have different case)
            selection = match;
          } else {
            this._list.push(selection);
            this._hasFocus = false;
            this._makeCallback(TypeAhead.CallbackType.ItemAdded, selection);
          }
        } else if (this._idx!==-1) {
          // fill in the input value
          selection = this._filteredItems[this._idx];
          input.val(selection);
        }
  
        // close the list
        this._filteredItems = [];
        this._refreshList();

        this._hasFocus = false;
        this._makeCallback(TypeAhead.CallbackType.SelectionMade, selection);
        return;
      }

      default:
        return;
    }
  }

  private _refreshList(): void {
    var dropdown = this._control.find('#fwb-ta-dropdown');

    // Render the filtered items - we're not using handlebars because it's overly complicated to pass up a re-render request
    let itemHTML = '';
    for (let i=0; i<this._filteredItems.length && i<3; i++) {   // max of 3 items at a time
      itemHTML += `<div class="typeahead-entry ${i===this._idx ? 'highlighted' : ''}">${this._filteredItems[i]}</div>`
    }
    dropdown.html(itemHTML);   
  }
}


export namespace TypeAhead {
  export enum CallbackType {
    NeedToRender,
    SelectionMade,
    ItemAdded,
  }
}