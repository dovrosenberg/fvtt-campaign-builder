import './TypeAhead.css';
import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export type TypeAheadData = {
}

export class TypeAhead extends HandlebarsPartial<TypeAhead.CallbackType> {
  static override _template = 'modules/world-builder/templates/TypeAhead.hbs';
  private _id: string;
  private _list = [] as string[];
  private _idx: number;

  constructor(list: string[]) {
    super();

    this._list = list;

    // we create a random ID so we can use multiple instances
    this._id = 'fwb-ta-' + randomID();
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
    let control = html.find(`#${this._id}.fwb-typeahead`);

    // Get input and dropdown elements
    var input = control.find('#fwb-ta-input');
    var dropdown = control.find('#fwb-ta-dropdown');

    // Event listener for input changes
    input.on('input',  () => {
      var inputValue = input.val()?.toString().toLowerCase() || '';
      var filteredItems = this._list.filter((item)=>item.toLowerCase().includes(inputValue));
 
      // Render the filtered items - we're not using handlebars because it's overly complicated to pass up a re-render request
      let items = '';
      this._idx = 0;
      for (let i=0; i<filteredItems.length && i<3; i++) {   // max of 3 items at a time
        items += `<div class="typeahead-entry ${i===this._idx ? 'highlighted' : ''}">${filteredItems[i]}</div>`
        // TODO - highlighted and handle arrows to move it
      }
      dropdown.html(items);   
    });

    // TODO - need a blur for leaving whole component that records either a selection or an 
    // TODO - need to style so the div overlaps what's nearby

    // Event listener for item clicks
    dropdown.on('click', (event: JQuery.ClickEvent) => {
      if (event.target.classList.contains('typeahead-entry')) {
        const selection = event.target.textContent; 
        input.val(selection);
        dropdown.html(''); // Clear the dropdown
        this._makeCallback(TypeAhead.CallbackType.SelectionMade, selection);
      }
    });
  }
}


export namespace TypeAhead {
  export enum CallbackType {
    NeedToRender,
    SelectionMade,
    ItemAdded,
  }
}