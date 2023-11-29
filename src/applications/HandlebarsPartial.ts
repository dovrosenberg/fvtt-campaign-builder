// a class that handles rendering of a Handlebars partial
// getData() should be called in the parent getData() and passed to the partial as the only input
// activateListeners() should be called in the parent activateListeners() and passed in the JQuery element for the parent
// registerCallback() is how you register event handlers, each implementing class can define its own
// There should also be a namespace with the same name as the class that contains an enum called CallBacks
// these classes also generally have other exposed properties that the parent might need and are passed
//    callbacks for various events the parent might need to know about
export abstract class HandlebarsPartial<CallbackType extends string | number> {
  protected _partials = {} as Record<string, HandlebarsPartial<any>>;
  protected _callbacks = {} as Record<CallbackType, (...args: any[]) => void>;

  constructor() {
    this._createPartials();
  }

  protected _makeCallback(callbackType: CallbackType, ...args: any[]) {
    let cb = this._callbacks[callbackType];
    if (cb)
      cb(...args);
  }

  // called by the constructor - should populate _partials
  protected abstract _createPartials(): void;

  public registerCallback(callbackType: CallbackType, callback: (...args: any[]) => void) {
    this._callbacks[callbackType] = callback;    
  }

  public abstract getData(): Promise<Record<string, any>>;
  public abstract activateListeners(html: JQuery<HTMLElement>): void;
};
