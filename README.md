# Dario Store

An online store for Tunisia built with **Next.js (App Router)**, **Prisma 8** and **better-auth**.
It sells digital goods (game accounts, game keys, mobile game coins, subscriptions) and one physical
product line (IEMs). Prices are in Tunisian dinar, customers pay by D17, Binance Pay, bank transfer or
crypto, and every account order has a private chat between the customer and the store (with payment-proof
photos). The shop speaks **English (default) and French**. Customers who bought a product can leave a star rating and review on it. A separate
"we order it from AliExpress for you" service is tracked with shipments and a public tracking page.

Three kinds of visitor:

| Who | Can do |
| --- | --- |
| **Guest** | Browse, order **physical** items (cash on delivery) with a private order link, and follow an AliExpress order on its public tracking page. |
| **Customer** (`MEMBER`) | Everything above, plus order **digital** items, pick a payment method, chat with the store, upload payment proof, review products they bought. |
| **Admin** (`ADMIN`) | `/admin`: products (with variants), categories and the header menu, orders, payment verification, chat, review moderation, AliExpress shipments and tracking updates. |

## Quick start

Requirements: Node 20+, PostgreSQL 15+.

```bash
npm install --legacy-peer-deps      # some Prisma packages have strict peer ranges
cp .env.example .env                # then fill in DATABASE_URL, BETTER_AUTH_SECRET, Google keys
npm run db:update                   # create/update the tables from the contract
npm run seed:store                  # optional demo catalogue (categories + products)
npm run dev                         # http://localhost:3000
```

> **Use port 3000.** better-auth's `baseURL` is hardcoded to `http://localhost:3000/` in
> [src/lib/auth.ts](src/lib/auth.ts), and it rejects requests from other origins.

Make yourself an admin (the account must exist first — register or use Google):

```sql
update "user" set role = 'ADMIN' where email = 'you@example.com';
```

**Email (SMTP):** emails are designed ([src/lib/email-templates.ts](src/lib/email-templates.ts)) and wired to
SMTP, but **nothing is sent until you fill `SMTP_HOST` and `MAIL_FROM` (plus `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASS`) in `.env`** and restart. Until then, emails are only printed in the server terminal
(that is where you read sign-up codes in development). Set `BETTER_AUTH_URL` to your real address so the buttons in
emails point to it. Emails: sign-up code, order received, payment confirmed, and the delivery email the admin sends.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server, production build, production server. |
| `npm run typecheck` / `lint` | `tsc --noEmit` / ESLint. Both must be clean before you commit. |
| `npm run contract:emit` | Regenerate `contract.json` / `contract.d.ts` from `contract.prisma`. |
| `npm run db:update` | Apply the contract to the database. Destructive changes need `-- --confirm membership`. |
| `npm run db:verify` | Check the database matches the contract. |
| `npm run seed:store` | Insert the demo catalogue (skips anything that already exists by name). |

The `composer:*`, `deploy`, `migrate` and `migration:*` scripts belong to the Prisma Composer / Prisma Compute
scaffold (`module.ts`, `service.ts`, `prisma*.config.ts`) used for deployment.

## How the code is organised

Requests flow in one direction; each layer only talks to the one below it:

```
app/ (routes, server components)  ─┐
components/ (client + shared UI)  ─┼─►  actions/  ─►  services/  ─►  prisma/  ─►  PostgreSQL
                                   │   (server        (business      (repositories:
                                   │    actions)       rules)         plain queries)
                                   └─►  services/ directly (read-only pages)
lib/  – small pure helpers and config used by every layer
```

```
src/
├── app/
│   ├── (store)/            Storefront pages + layout (ticker, header, category bar, footer)
│   │   ├── (auth)/         login, register, success (post-login redirect)
│   │   ├── c/[slug]/       A category's own page (/c/subscriptions)
│   │   ├── track/          Public AliExpress tracking: lookup (/track) and page (/track/DS-XXXXX-XXXXX)
│   │   ├── products/       All products, product page (/products/[id])
│   │   ├── cart/  order/[id]/  orders/  profile/  search/  categories/
│   ├── admin/              Admin dashboard, products, categories, orders (guarded by admin/layout.tsx)
│   ├── api/                auth/[...all] (better-auth) and chat-images/[messageId] (private photos)
│   └── globals.css         Only @imports the files in src/styles/
├── styles/                 Plain CSS split by feature (tokens, base, controls, chrome, home, catalog, ...)
├── components/
│   ├── layout/  Header, Footer, Ticker, PointerFx        ├── cart/    cart page + CartProvider (localStorage)
│   ├── catalog/ product cards, product page, art, tiles   ├── orders/  order panels, status badge
│   ├── chat/    order chat (hooks + pieces)               ├── auth/    email/OTP form, Google icon
│   ├── reviews/ stars, summary, list, review form       ├── tracking/ public tracking page pieces
│   ├── ui/      Img, Price, Pagination, EmptyState        └── admin/   forms and tables for /admin
├── i18n/                   Languages: config, dictionaries (messages/en.ts, fr.ts), translator, getT()/useT()
├── actions/                Server actions ("use server"): check the caller, call a service, revalidate
├── services/               Business rules: catalog, categories, messages, orders, products, reviews, stats
├── prisma/                 contract.prisma (the schema), generated contract.*, db.ts, repositories, seed
└── lib/                    money, time, slug, query, payments, store config, auth, session/guards, email
```

### Conventions worth knowing

- **Money is an integer number of millimes** (1 TND = 1000 millimes) everywhere — database, services,
  components. Only [src/lib/money.ts](src/lib/money.ts) turns it into text (`12,500 DT`) or parses what an admin
  types (`12.500`).
- **User-facing errors** are thrown as `UserError` in services and turned into `{ ok: false, error }` by
  `safely()` in actions ([src/lib/result.ts](src/lib/result.ts)). Anything else is a real bug and is allowed to throw.
- **Who is calling?** Server actions use `requireRole()` (throws), pages use `requirePageRole()` (redirects) —
  both in `src/lib/`. Never trust an id or price from the browser: services recompute prices and stock.
- **Server vs client code:** client components must not import from `services/` or `prisma/` at runtime (type
  imports are fine) — that would pull the database client into the browser bundle. Pure helpers shared by both
  live in `lib/` (for example `cart-key.ts`, `after-login.ts`).
- **Imports:** `app/` and `components/` use the `@/src/...` alias; `services/`, `prisma/`, `actions/` and
  `lib/` use relative imports so the seed script can run them with plain `tsx`.
- **Languages (English + French):** the visitor's choice is the `lang` cookie (default `en`), set by the EN | FR
  switcher in the header/footer. Every visible text lives in [src/i18n/messages/en.ts](src/i18n/messages/en.ts);
  [fr.ts](src/i18n/messages/fr.ts) must have the same keys (TypeScript fails the build otherwise). Server code:
  `const t = await getT()`; client components: `const t = useT()`; plurals are `"{count} item|{count} items"`
  used with `t.plural(key, n)`. Customer-facing service errors are thrown with `userError("errors.key", params)`
  and translated by `safely()`. **The admin area is always English** (`src/proxy.ts`). Products and categories have
  optional French name/description fields (empty = show the English text); order items, variant names and
  reviews stay in the language they were written in. Orders remember the customer's language (`Order.locale`)
  for emails and chat messages the system writes. Dates follow the language via `lib/time.ts`.
- **Styling:** plain CSS with design tokens in [src/styles/tokens.css](src/styles/tokens.css). Class names are
  global; search the name to find its component and its rules. No icon library — buttons and navigation are text.

## Data model

Defined in [src/prisma/contract.prisma](src/prisma/contract.prisma). The better-auth tables (`User`, `Account`,
`Session`, `Verification`) come from better-auth; only add relations to them, never change their columns.

| Model | Notes |
| --- | --- |
| `Category` | `inNav` + `position` decide the header menu; `blurb` is the one-line description; `nameFr` / `blurbFr` are optional French versions. |
| `Product` | `type` is `PHYSICAL` or `VIRTUAL`; `stock` is `null` for unlimited; `featured`, `active`; `nameFr` / `descriptionFr` are optional French versions. |
| `ProductVariant` | Optional options (1 month / 3 months, editions). Carry their own price, stock and photo. |
| `ProductImage` | Gallery images (URLs). |
| `Order` / `OrderItem` | Items keep a **copy** of name, variant and price. `userId` is null for guest orders (they get a `guestToken`). `locale` is the language the customer ordered in; `deliveryEmailSentAt` is when the admin last emailed the delivery. |
| `OrderMessage` / `MessageImage` | The private chat; a message may carry one photo (stored base64). |
| `Shipment` / `ShipmentEvent` | An item we order from AliExpress for a customer who contacted us on social media: private contact details, item, parcel number, ETA, current stage, and a timeline of updates. `trackingCode` is the unguessable public link key. |
| `Review` | One per customer per product: rating 1-5, optional message, `authorName` (masked when "hide my name" is ticked), admin reply, `hidden` flag. `Product.ratingCount` / `ratingSum` hold the totals shown on cards. |

## Business rules (all enforced in `services/`)

- **Physical** products need a delivery address + phone, cost a flat shipping fee (free from a threshold,
  see [src/lib/store.ts](src/lib/store.ts)) and are paid in cash on delivery. Guests may order them.
- **Virtual** products need a **logged-in account**, an online payment method and have no shipping. Their
  orders can't be marked "Shipped".
- **Variants:** a product with active variants is bought as one of them; the variant supplies price and stock,
  and the product's own price becomes the lowest variant price ("from ...").
- **Stock** is taken with a compare-and-swap inside the order transaction, so two buyers can't get the last
  item. Cancelling an order puts stock back. `CANCELLED` is final.
- **Payment methods** live in [src/lib/payments.ts](src/lib/payments.ts): D17, Binance Pay, bank transfer,
  crypto (with a network choice). **Edit that file with your real account details** — they are shown to
  customers after they order.
- **Payment proof flow:** the customer uploads a photo in the order chat and presses "Payment sent" (blocked
  until a proof exists). The admin sees it on the dashboard, checks the photo, then marks the order Paid or
  asks for a new proof.
- **Reviews:** only a logged-in customer with a **paid, shipped or delivered** order containing the product can
  review it (so every review is a verified purchase); pending and cancelled orders don't count. One review per
  product — submitting again edits it. Rating 1-5 is required, the message (max 1000 characters) is optional.
  With "hide my name" the name is masked (`anouar dario` → `a***r d***o`, see `src/lib/mask.ts`)
  **before saving**, so the full name is never stored for that review. Admins can hide (removes it from the shop and
  from the average), reply publicly, or delete from `/admin/reviews`. Reviews are published immediately.
- **AliExpress shipments:** the admin creates a shipment at `/admin/shipments` (customer, item, parcel number,
  ETA), moves it through the stages in `src/lib/shipments.ts` and can add notes; each update is a timeline entry
  (a mistaken one can be removed, except the first). The customer opens `/track/<code>` with no account. That
  page is built by `ShipmentService.getPublic`, which returns the name, phone and address **already masked**
  (`src/lib/mask.ts`; the `*` runs are then smudged with CSS blur) — the real details, the internal notes, the
  AliExpress link and the contact channel never reach a visitor's browser. Tracking pages are `noindex`.
- **Admin alerts by email:** a new order and a customer tapping "Payment sent" each email the shop owner
  (`ADMIN_NOTIFY_EMAIL` in `.env`, comma-separated; empty = every admin account). Sent only once SMTP is set up.
- **Order stages in the chat:** once an order is Paid / Shipped / Delivered, the banner above the chat shows that stage
  and its date (`Order.paidAt`, `shippedAt`, `deliveredAt`, stamped by `OrderService.setStatus`).
- **After payment is confirmed** (admin sets an order with digital items from Pending to Paid), the customer gets an
  automatic chat message and an email saying they will receive the order **within about an hour**; outside the team's
  hours (`SUPPORT_HOURS`, Tunisian time, in [src/lib/store.ts](src/lib/store.ts)) the message says the team is offline
  and delivery may take longer. Sent once per order, in the customer's language ([src/services/order-notifications.ts](src/services/order-notifications.ts)).
- **Delivering by email:** on `/admin/orders/[id]` a paid order has a *Deliver by email* panel: the admin writes what
  the customer receives (account, key…), previews the designed email, and sends it. The text is only emailed, never
  stored; the chat just says "check your inbox" (masked address). Optionally marks the order Delivered. Sending needs SMTP.
- **Placing an order:** the cart stays on screen behind a "Placing your order…" spinner until the order page opens;
  the order page (`?new=1`) then empties the cart, once, only for the order just placed ([src/lib/placed-order.ts](src/lib/placed-order.ts)).
- **Chat encryption:** every chat message and photo is stored encrypted (AES-256-GCM, [src/lib/crypto.ts](src/lib/crypto.ts)),
  done inside `MessageRepository`, with the key `CHAT_ENCRYPTION_KEY` from `.env`. A leaked database or backup shows only
  scrambled text. **Back the key up**: losing it makes the chats unreadable forever. `npm run chat:encrypt` encrypts
  messages saved before the key was set (safe to re-run). Messages sent with **"contains login details"** are hidden
  until *Show* is pressed, can be erased by either side with *Delete now*, and are erased automatically after
  `SENSITIVE_MESSAGE_DAYS` (7) days. This is encryption at rest, not end-to-end: the server (and the admin) can read them.
- **Chat security:** only the order's owner and admins can read or write; the caller must state which side they
  speak as and the server verifies it. Messages are text-only (rendered escaped), rate limited, and photos are
  checked by their real bytes (JPEG/PNG/WebP, max 5 MB) and served through an authenticated route.

## Adding things

- **A schema change:** edit `contract.prisma` → `npm run contract:emit` → `npm run db:update` → update the
  repository, service, action and UI. Never skip the two commands.
- **A text on the shop:** add the key to `en.ts` *and* `fr.ts`, then use `t("section.key")`. Never write visible
  English straight into a component (admin pages are the only exception).
- **A language:** add it to `LOCALES` in `src/i18n/config.ts`, create its dictionary next to `fr.ts`
  (typed as `Messages`) and register it in `src/i18n/translate.ts`.
- **A category:** create it in `/admin/categories`, tick "Show in the header menu" and set its order. No code.
- **A payment method:** add it to the `PaymentMethod` enum in `contract.prisma`, then to `PAYMENT_INFO` /
  `ONLINE_METHODS` in `src/lib/payments.ts`.
- **A page's look:** find the class in `src/styles/*.css`; colours and fonts are tokens in `tokens.css`.

## Checking your changes

There is no automated test suite yet. Before you push: `npm run typecheck`, `npm run lint`, `npm run build`,
then click through the flow you touched. `npm run dev` can be slow to compile under memory pressure; for
scripted browser tests prefer `npm run build && npm start`.

## Known gaps

- Emails are ready but need your SMTP settings in `.env` (see above); there is no online payment gateway — the admin
  confirms payments by hand.
- No forgot-password screen (the server side exists in the better-auth email-OTP plugin).
- Digital goods are delivered by the admin through the order chat / email; there is no automatic delivery.
- The dashboard's low-stock list ignores per-variant stock.
- `baseURL` in `src/lib/auth.ts` is hardcoded to `localhost:3000`.

