declare namespace Search {
  export interface SearchOptions {
    limit?: number;
    suggest?: boolean;
    bool?: 'and' | 'or';
    enrich?: boolean;
    index?: string | string[];
    tag?: string | string[];
    where?: Record<string, any>;
    field?: string | string[];
    boost?: Record<string, number>;
    offset?: number;
  }

  export interface IndexOptions {
    preset?: string;
    tokenize?: 'strict' | 'forward' | 'reverse' | 'full' | Function;
    cache?: boolean | number;
    async?: boolean;
    context?: boolean | Record<string, any>;
    filter?: Function | string[];
    stemmer?: Function | Record<string, any>;
    doc?: DocumentOptions;
  }

  export interface DocumentOptions {
    id?: string;
    field?: string | string[];
    tag?: string | string[];
    store?: boolean | string[];
    index?: Array<{
      field: string;
      tokenize?: 'strict' | 'forward' | 'reverse' | 'full' | Function;
      boost?: number;
      cache?: boolean | number;
      context?: boolean | Record<string, any>;
      filter?: Function | string[];
      stemmer?: Function | Record<string, any>;
    }>;
  }

  export interface SearchResult<T> {
    field: string;
    result: Array<{ id: string; doc?: T }>;
  }

  export class Document<T = any> {
    constructor(options?: IndexOptions);
    add(id: string | T, content?: T): this;
    search(query: string, options?: SearchOptions): Promise<SearchResult<T>[]>;
    update(id: string | T, content?: T): this;
    remove(id: string): this;
  }

  export class Index {
    constructor(options?: IndexOptions);
    add(id: string, content: string): this;
    search(query: string, options?: SearchOptions): Promise<string[]>;
    update(id: string, content: string): this;
    remove(id: string): this;
  }
}