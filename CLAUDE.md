# CLAUDE.md

Guidance for AI assistants working in this repo. Read [README.md](README.md) first for the architecture,
data model and business rules; this file is the short list of rules and traps.

## What this is

"Dario Store": a Next.js 16 (App Router, Turbopack) + React 19 + TypeScript (strict) online store for Tunisia.
Prisma 8 ORM ("contract" schema), better-auth (Google + email/password + email OTP), plain CSS. Prices in
Tunisian dinar stored as integer **millimes**. See README for the four shelves (Game Accounts, Game Keys,
Mobile Game Coins, Subscriptions) and the only physical product (IEMs).

## Commands

```bash
npm run dev            # dev server on port 3000 (logins only work at BETTER_AUTH_URL, localhost:3000 by default)
npm run check:ready    # launch checklist (also printed at server start by src/instrumentation.ts)
npm run start:prod     # standalone production server (after npm run build)
npm run typecheck      # tsc --noEmit   (ignore stale errors under .next/, they regenerate on build)
npm run lint           # eslint, must be clean (warnings count as failures)
npm test               # Vitest unit tests (npm run test:watch while working)
npm run build          # production build; always read its real exit code, don't pipe it
npm run contract:emit  # after ANY edit to src/prisma/contract.prisma
npm run db:update      # after contract:emit; destructive steps need `-- --confirm membership`. Uses DATABASE_URL from
                       # .env (prisma.config.ts loads it): check the target with `-- --dry-run` first
npm run seed:store     # demo catalogue
```

## Hard rules (from the owner)

1. **After any schema change run `npm run contract:emit` and then `npm run db:update`.** Review what
   `db:update` will drop before confirming. The contract language has no binary type (photos are base64 text).
2. **Never change the better-auth generated models** (`User`, `Account`, `Session`, `Verification`) beyond
   adding relation fields. **Do not change the Google auth configuration** (`src/lib/auth.ts`,
   the Google buttons in login/register).
3. **Keep backend code simple and readable.** Small functions, plain names, comments only for *why*.
4. **Don't touch the owner's real data.** `src/lib/payments.ts` holds real payment details — never overwrite
   them. The database contains real orders: only delete rows you created (use a distinctive email like
   `zz-…@example.tn` for test data and remove it afterwards).
5. **UI changes must not silently change the design.** Verify visually (see Testing).

## Code rules

- Layering: `app/` + `components/` → `actions/` → `services/` → `prisma/` (repositories) → DB. Repositories hold
  queries only; **business rules live in services**; actions only check the caller, call a service, revalidate.
- Money is integer millimes everywhere; format/parse only via `src/lib/money.ts`. Never send prices from the
  browser — services recompute them.
- User-fixable errors: `throw new UserError("…")` in services, wrap actions with `safely()`.
- Auth: `requireRole()` in server actions (throws), `requirePageRole()` in pages/layouts (redirects).
  **Every admin page calls `await requirePageRole("ADMIN")` itself**: the layout check alone can be skipped with a
  hand-made request (Next renders only the page on client navigation). `src/test/access-rules.test.ts` enforces it.
- Roles (`lib/roles.ts`): ADMIN runs everything; STAFF (`TEAM` / `isTeam()`) gets only orders, the chat, payment checks,
  delivery emails and shipments. Products, categories, reviews, refunds, availability and the dashboard's sales
  figures stay `"ADMIN"`. Giving staff a new page or action is a deliberate choice: update `access-rules.test.ts`.
- **Client components must not import `services/` or `prisma/` at runtime** (only `import type`) — it pulls the
  database into the browser bundle and breaks the build. Shared pure helpers go in `src/lib/`.
- Import style: `@/src/...` alias in `app/` and `components/`; relative imports in `services/`, `prisma/`,
  `actions/`, `lib/` (the seed runs them via `tsx`).
- Payment state is `Order.paymentStatus` (set only in `OrderService`); don't infer it from `paymentSentAt` or `status`.
- Product URLs use `slug` (`/products/<slug>`); link with the slug when you have it. Never change a slug on rename.
- Images: `lib/cloudinary.ts` (public product photos, private chat files). Chat photos go through
  `services/chat-images.ts` (upload/load/delete + DB fallback) — never read `MessageImage.dataBase64` directly.
- Stock changes use a compare-and-swap inside a transaction (see `services/orders.ts`); keep that pattern.
- Chat/photo access checks live in `services/messages.ts` — every read/write goes through `accessFor`.
- Chat closing: only a cancelled order's chat closes by itself. Otherwise it stays open (also after delivery) until
  the team presses "Close chat" (`Order.chatClosedAt`, `MessageService.setClosed`). The customer's review card in a
  delivered order's chat comes from `ReviewService.forOrderChat` and saves through the normal review action.
- "Report a problem": on a chat the team closed, the customer can reopen it with a reason + message for
  `PROBLEM_REPORT_DAYS` (lib/store.ts, 30) after delivery, once per 24 h (`Order.problemReportedAt`,
  `MessageService.reportProblem`, compare-and-swap in `OrderRepository.reopenForProblem`). Admins get an email
  without the message text. After the window the closed chat shows the `CONTACT` channels.
- Chat text and photos are encrypted at rest inside `prisma/messages.ts` (`lib/crypto.ts`, key `CHAT_ENCRYPTION_KEY`).
  Always read/write chat rows through `MessageRepository`, never `db.orm.public.OrderMessage` directly, or you'll store
  plaintext / show ciphertext. Never log message bodies. Changing the key makes old messages unreadable.
- Public tracking (`/track/[code]`): the page must only ever receive the DTO from `ShipmentService.getPublic`
  (masked contact, no notes/links). Never pass a `Shipment` row to a public component, and never rely on CSS blur
  to hide data — mask on the server.
- Reviews: masking the reviewer's name happens in `ReviewService.submit` before saving; keep product rating totals
  in sync through `refreshRating` whenever a review is created, edited, hidden or deleted.

## Emails and order notifications

- All mail goes through `sendEmail()` in `src/lib/email.ts` (SMTP via nodemailer; **does nothing but log until
  `SMTP_HOST` + `MAIL_FROM` are in `.env`**). It never throws; it returns `{ sent }` so callers that must know
  (the admin delivery button) can tell. Never send mail any other way.
- Email designs live in `src/lib/email-templates.ts` (inline-styled tables, shop colours, English + French from the
  `email.*` dictionary keys). New email = a template function there + keys in both dictionaries.
- Order-related notifications (confirmation, "payment confirmed" chat message + email, delivery email) are in
  `src/services/order-notifications.ts`; `OrderService` calls them. The "response time / away until …" wording comes
  from `AvailabilityService` (`services/availability.ts`), which the admin sets on the dashboard; it is also shown at
  checkout and on the order page (`availabilityText` in `lib/availability.ts`).
- SEO: product/category pages set a canonical URL and JSON-LD (`lib/seo.ts`, `components/seo/JsonLd.tsx`). A page
  that sets its own `openGraph` must repeat `siteName` and `images` (it replaces the root one).
- Team emails (new order, payment sent, new customer chat message, problem reported) go to `teamAddresses()` in
  `order-notifications.ts`: the admins (`ADMIN_NOTIFY_EMAIL` or every ADMIN account) plus every STAFF account. The
  chat-message email is sent once per unread batch and never contains the message text.
- Any screen that tells the customer "we sent you an email / a code" also tells them to check their spam folder
  (`src/i18n/email-notes.test.ts` checks the known texts; add a new one there).
- Delivery details typed by the admin are emailed only — never store them in the database or repeat them in the chat.
- The cart is emptied by the order page (`ClearCartAfterOrder`), not by the cart page; keep the spinner overlay in
  `CartView` up until navigation completes.

## Languages (English default + French)

- **Every visible storefront text goes through the dictionaries** in `src/i18n/messages/` (`en.ts` defines the
  keys, `fr.ts` must match — the type checker enforces it). Server code: `await getT()`; client components:
  `useT()`. No hard-coded English in `app/(store)` or `components/` outside admin.
- Plurals: `"{count} review|{count} reviews"` + `t.plural(key, n)`. Dates: pass `t.locale` to `formatDate*`.
- Customer-facing service errors: `throw userError("errors.key", { params })` (translated in `safely()`); errors
  only the admin sees stay `new UserError("English text")`.
- The **admin area is English only** (`src/proxy.ts` sets `x-locale: en` for `/admin/*`). Don't translate it.
- Language = `lang` cookie (default `en`), set by `LanguageSwitcher`. Don't put the language in the URL.
- Products/categories have optional `nameFr`/`descriptionFr`/`blurbFr`: always read them through
  `localized()` from `src/i18n/content.ts` (falls back to English). Order-item snapshots are not translated.
- Payment names/hints and shipment stage wording live in the dictionaries; the account details in
  `src/lib/payments.ts` are language-neutral — don't move them.
- Money stays `12,500 DT` in both languages (`lib/money.ts`).

## Styling rules

- Plain CSS in `src/styles/*.css`, imported in order by `src/app/globals.css`. Colours/fonts are tokens in
  `tokens.css`; use `var(--…)`, don't hardcode colours.
- Look: cream printed paper, black ink outlines, flat spot colours, huge condensed type (Anton), mono labels
  (JetBrains Mono), ticket-shaped product cards. **No icon libraries and no decorative SVG icons** — use text.
- Class names are global. Before deleting or renaming a class, search it in both `src/styles` and `src`.
- The owner has rejected three earlier designs as too loud / generic / "AI-looking": don't restyle globally
  without being asked.

## Testing

- `typecheck` + `lint` + `test` + `build` must pass.
- Unit tests (Vitest, `*.test.ts(x)` next to the code, config in `vitest.config.mts`) never touch the database:
  service tests `vi.mock` the repositories (see `services/messages.test.ts`); component tests start with
  `// @vitest-environment jsdom` and render through `renderWithLocale` (`src/test/render.tsx`).
  Services, access control, helpers and the chat are covered; `[fixed]` tests guard past abuses.
- For UI/flow checks drive the real app with Playwright against **`npm run build && npm start` on port 3000**,
  not `next dev` (dev compiles lazily and multi-page scripts get flaky). Stop your server afterwards and never
  delete `.next/dev/lock` — the owner runs their own dev server.
- To log in as a test user, create a user + session with better-auth's internal adapter in a temporary
  script and set the signed session cookie (see how `auth.$context` and `makeSignature` from
  `better-auth/crypto` are used); delete the users/orders/products you created when done.
- A strong "did I change the design?" check: dump `getComputedStyle` for every element on many pages before and
  after the change and diff them (ignore custom properties). Freeze animations and use reduced motion first.

## Shell/tooling traps

- `pkill -f "next dev"` inside a command that itself contains that text kills your own shell — use
  `pkill -f "[n]ext dev"`.
- Heredoc terminators must match exactly (`<<'PYEOF'` … `PYEOF`), otherwise the rest of the command is swallowed
  into the file.
- `npm install` needs `--legacy-peer-deps`.
- Server actions have a 1 MB body limit by default; `next.config.ts` raises it to 8 MB for chat photos.
- Don't call `useSearchParams` in the header/layout (forces client-side bailouts); read the pathname instead.

## Production

- The site's address is `BETTER_AUTH_URL` (`siteUrl()` in `lib/store.ts`): auth, email links, sitemap, robots and
  share images use it. Never hardcode a domain.
- Payment methods with example details are hidden by `AVAILABLE_ONLINE_METHODS` in `lib/payments.ts`; use that list
  (not `ONLINE_METHODS`) for anything customer-facing.
- Pages that read env at request time (robots, sitemap) must be `force-dynamic`, or the build machine's values are baked in.
- `src/lib/readiness.ts` is the launch checklist: add a line there when a new required setting appears.
- Legal texts live in `src/i18n/legal/{en,fr}.ts` (not the main dictionary); keep both languages in step.
- Contact channels: `CONTACT` in `lib/store.ts`.

## Known gaps (don't "fix" silently — ask)

No online payment gateway (admin confirms payments by hand), no self-service account deletion, no automatic
delivery of digital goods, low-stock dashboard ignores variants.
