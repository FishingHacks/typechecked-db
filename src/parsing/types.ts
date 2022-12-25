export interface IGenerator<T> {
    generate(values: T[]): string;
    typings(value: T[]): string;
}

export interface IGenerator2<T> {
    generate(values: T[]): [string, string];
    typings(value: T[]): [string, string];
}

export interface IGenerator3<T> {
    generate(values: T): string;
    typings(value: T): string;
}

export type ITransformer<T, K = void> = K extends void
    ? {
          transform(value: T): T;
      }
    : {
          transform(value: T): K;
      };
