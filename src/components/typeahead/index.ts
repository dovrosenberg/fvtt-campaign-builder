import { HandlebarsPartial } from '@/applications/HandlebarsPartial';

export type TypeAheadData = {
}

export class TypeAhead extends HandlebarsPartial<TypeAhead.CallbackType> {
  static override _template = 'modules/world-builder/templates/TypeAhead.hbs';

  constructor() {
    super();
  }

  protected _createPartials(): void {
    // no subcomponents
  }

  public async getData(): Promise<TypeAheadData> {
    const data = {
    };
  
    // log(false, data);
    return data;
  }

  public activateListeners(html: JQuery) {
    // Sample data for the typeahead
    var data = ['Apple', 'Banana', 'Cherry', 'Date', 'Grape', 'Lemon'];

    // Get input and dropdown elements
    var input = document.getElementById('typeaheadInput');
    var dropdown = document.getElementById('typeaheadDropdown');

    // Event listener for input changes
    input.addEventListener('input', function () {
      var inputValue = input.value.toLowerCase();
      var filteredItems = data.filter(function (item) {
        return item.toLowerCase().includes(inputValue);
      });

      // Render the filtered items - we're not using handlebars because it's overly complicated to pass up a re-render request
      let items = '';
      for (let i=0; i< filteredItems.length; i++) {
        items += `<div class="typeahead-item">${filteredItems[i]}</div>`
      }
      dropdown.innerHTML = items;      
    });

    // Event listener for item clicks
    dropdown.addEventListener('click', function (event) {
      if (event.target.classList.contains('typeahead-item')) {
        input.value = event.target.textContent;
        dropdown.innerHTML = ''; // Clear the dropdown
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