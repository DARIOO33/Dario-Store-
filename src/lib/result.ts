import { createTranslator, type MessageKey, type Params } from "../i18n/translate";

// A UserError is a problem the person can fix ("price is invalid", "sold
// out"). Actions turn it into { ok: false, error } so forms can show it;
// anything else is a real bug and is allowed to throw.
//
// Errors a customer can see are made with `userError(key, params)`: the message
// is the English text, and `safely` translates it to the visitor's language.
// Errors only the admin sees (always English) can stay plain `new UserError("…")`.
export class UserError extends Error {
  constructor(
    message: string,
    readonly key?: MessageKey,
    readonly params?: Params,
  ) {
    super(message);
  }
}

const english = createTranslator("en");

export function userError(key: MessageKey, params?: Params) {
  return new UserError(english(key, params), key, params);
}

export type Result<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function safely<T extends object = object>(work: () => Promise<T | void>): Promise<Result<T>> {
  try {
    const value = await work();
    return { ok: true, ...((value ?? {}) as T) };
  } catch (error) {
    if (error instanceof UserError) {
      return { ok: false, error: await translated(error) };
    }
    throw error;
  }
}

// Imported here, not at the top, so services that only throw errors don't pull in `next/headers`.
async function translated(error: UserError) {
  if (!error.key) return error.message;

  const { getT } = await import("../i18n/server");
  return (await getT())(error.key, error.params);
}
