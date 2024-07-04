// pulled in here because we have to recreate it in Vue

  /**
   * Construct an editor element for rich text editing with TinyMCE or ProseMirror.
   * @param {string} content                       The content to display and edit.
   * @param {object} [options]
   * @param {string} [options.target]              The named target data element
   * @param {boolean} [options.button]             Include a button used to activate the editor later?
   * @param {string} [options.class]               A specific CSS class to add to the editor container
   * @param {boolean} [options.editable=true]      Is the text editor area currently editable?
   * @param {string} [options.engine=tinymce]      The editor engine to use, see {@link TextEditor.create}.
   * @param {boolean} [options.collaborate=false]  Whether to turn on collaborative editing features for ProseMirror.
   * @returns {Handlebars.SafeString}
   *
   * @example
   * ```hbs
   * {{editor world.description target="description" button=false engine="prosemirror" collaborate=false}}
   * ```
   */
  static editor(content, options) {
    const { target, editable=true, button, engine="tinymce", collaborate=false, class: cssClass } = options.hash;
    const config = {name: target, value: content, button, collaborate, editable, engine};
    const element = foundry.applications.fields.createEditorInput(config);
    if ( cssClass ) element.querySelector(".editor-content").classList.add(cssClass);
    return new Handlebars.SafeString(element.outerHTML);
  }


  /**
   * Create a `<div class="editor">` element for a StringField.
   * @param {FormInputConfig<string> & EditorInputConfig} config
   * @returns {HTMLDivElement}
   */
  function createEditorInput(config) {
    const {engine="prosemirror", editable=true, button=false, collaborate=false, height} = config;
    const editor = document.createElement("div");
    editor.className = "editor";
    if ( height !== undefined ) editor.style.height = `${height}px`;

    // Dataset attributes
    let dataset = { engine, collaborate };
    if ( editable ) dataset.edit = config.name;
    dataset = Object.entries(dataset).map(([k, v]) => `data-${k}="${v}"`).join(" ");

    // Editor HTML
    let editorHTML = "";
    if ( button && editable ) editorHTML += '<a class="editor-edit"><i class="fa-solid fa-edit"></i></a>';
    editorHTML += `<div class="editor-content" ${dataset}>${config.value ?? ""}</div>`;
    editor.innerHTML = editorHTML;
    return editor;
  }
