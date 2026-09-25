import { DEFAULT_LOCALE, INTL_TAGS, type Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { fr } from "./messages/fr";

const DICTIONARIES: Record<Locale, Messages> = { en, fr };

// "nav.shop", "cart.empty.title", ... every text in the dictionary, by its path.
type Leaves<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Leaves<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Leaves<Messages>;
export type Params = Record<string, string | number>;

export type Translator = {
  // t("cart.total") or t("orders.placed", { number: 12 }): `{number}` is replaced.
  (key: MessageKey, params?: Params): string;
  // t.plural("reviews.count", 3): the text holds "one|other" forms, e.g.
  // "{count} review|{count} reviews". `count` is filled in automatically.
  plural: (key: MessageKey, count: number, params?: Params) => string;
  locale: Locale;
  // The whole dictionary, for looking up a text by a runtime value
  // (t.messages.orderStatus[status]).
  messages: Messages;
};

function fill(template: string, params?: Params) {
  return params ? template.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole)) : template;
}

function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) node = (node as Record<string, unknown> | undefined)?.[part];
  return typeof node === "string" ? node : key;
}

// Works on the server and in the browser: it only reads the dictionaries.
export function createTranslator(locale: Locale = DEFAULT_LOCALE): Translator {
  const messages = DICTIONARIES[locale];
  const rules = new Intl.PluralRules(INTL_TAGS[locale]);

  const t = ((key: MessageKey, params?: Params) => fill(lookup(messages, key), params)) as Translator;

  t.plural = (key, count, params) => {
    const forms = lookup(messages, key).split("|");
    const form = rules.select(count) === "one" ? forms[0]! : (forms[1] ?? forms[0]!);
    return fill(form, { ...params, count });
  };
  t.locale = locale;
  t.messages = messages;

  return t;
}
