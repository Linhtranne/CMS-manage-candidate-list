import type { vi } from './locales/vi';

export type TranslationPrimitive = string | number;
export type TranslationParams = Readonly<Record<string, TranslationPrimitive>>;

export type DeepMessageShape<T> = {
  readonly [Key in keyof T]: T[Key] extends string
    ? string
    : T[Key] extends Readonly<Record<string, unknown>>
      ? DeepMessageShape<T[Key]>
      : never;
};

type IsPluralMessage<T> = T extends { readonly other: string } ? true : false;

export type DotLeafKeys<T, Prefix extends string = ''> = {
  [Key in keyof T & string]: T[Key] extends string
    ? `${Prefix}${Key}`
    : IsPluralMessage<T[Key]> extends true
      ? `${Prefix}${Key}`
      : T[Key] extends Readonly<Record<string, unknown>>
        ? DotLeafKeys<T[Key], `${Prefix}${Key}.`>
        : never;
}[keyof T & string];

export type TranslationKey = DotLeafKeys<typeof vi>;
export type Translate = (key: TranslationKey, params?: TranslationParams) => string;
export type MessageDictionary = Readonly<Record<string, unknown>>;
