import type { Translator } from "../i18n/translate";

// How customers pay, and where they send the money.
// EDIT THE VALUES BELOW with your real accounts — they are shown to customers
// on their order page once they have chosen a method.
export type PaymentMethod = "CASH_ON_DELIVERY" | "D17" | "BINANCE_PAY" | "BANK_TRANSFER" | "CRYPTO";

// Orders with something digital must be paid online; physical-only orders
// are paid in cash on delivery.
export const ONLINE_METHODS: PaymentMethod[] = ["D17", "BINANCE_PAY", "BANK_TRANSFER", "CRYPTO"];

export const CRYPTO_NETWORKS = [
  { id: "USDT_TRC20", label: "USDT · TRON (TRC20)", address: "TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { id: "USDT_BEP20", label: "USDT · BNB Smart Chain (BEP20)", address: "0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
  { id: "BTC", label: "Bitcoin (BTC)", address: "bc1qxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
  { id: "ETH", label: "Ethereum (ERC20)", address: "0xXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" },
] as const;

type Line = { label: string; value: string };

// The account details shown to customers. Method names, hints and the field labels
// ("D17 number", "Name", ...) are translated from the i18n dictionaries.
export const PAYMENT_INFO: Record<PaymentMethod, { lines: Line[] }> = {
  CASH_ON_DELIVERY: {
    lines: [],
  },
  D17: {
    lines: [
      { label: "D17 number", value: "51 099 580" },
      { label: "Name", value: "Anouar Dario Aissaoui" },
    ],
  },
  BINANCE_PAY: {
    lines: [
      { label: "Pay ID", value: "000000000" },
      { label: "Name", value: "Dario Store" },
    ],
  },
  BANK_TRANSFER: {
    lines: [
      { label: "Bank", value: "Your bank name" },
      { label: "RIB", value: "00 000 0000000000000 00" },
      { label: "Holder", value: "Dario Store" },
    ],
  },
  CRYPTO: {
    lines: [],
  },
};

export function paymentLabel(t: Translator, method: PaymentMethod, cryptoNetwork?: string | null) {
  const network = CRYPTO_NETWORKS.find((n) => n.id === cryptoNetwork);
  const label = t.messages.payments[method].label;
  return method === "CRYPTO" && network ? `${label} · ${network.label}` : label;
}

export function paymentHint(t: Translator, method: PaymentMethod) {
  return t.messages.payments[method].hint;
}

// A field name from PAYMENT_INFO, translated when the dictionary knows it.
export function paymentLineLabel(t: Translator, label: string) {
  const known: Record<string, string> = t.messages.payments.lineLabels;
  return known[label] ?? label;
}
