// `temporal-polyfill/global` (imported for its runtime side effect in
// src/prisma/db.ts) ships an empty public .d.ts, so the ambient `Temporal`
// namespace has to be pulled in separately for type-checking.
import "temporal-spec/global";
