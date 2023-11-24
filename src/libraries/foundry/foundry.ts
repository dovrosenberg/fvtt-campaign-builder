declare global {
  interface Window {
    renderTemplate: any;
    srcExists: any;
  }
}

export class Foundry {
  static renderTemplate(path: string, data?: { [key: string]: string }): Promise<any> {
    return window.renderTemplate(path, data);
  }

  static srcExists(path: string): boolean {
    return window.srcExists(path);
  }
}
