import type { Locale } from "../config";
import { legalEn } from "./en";
import { legalFr } from "./fr";

export const LEGAL = { en: legalEn, fr: legalFr } satisfies Record<Locale, unknown>;
