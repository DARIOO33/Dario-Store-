# Dario Store — Social media kit

Everything for Instagram and Facebook, in the store's look (cream paper, black ink, flat spot colours, Anton
type, ticket shapes). No design skills or internet needed.

## What's inside

| Folder / file | What it is |
| --- | --- |
| **`studio.html`** | The Social Studio. Double-click it (Chrome or Edge work best). Pick a template, change the text, colour and photo, press **Download PNG**. "All templates (ZIP)" downloads every template at once. |
| `png/en/`, `png/fr/` | Ready-made examples in English and French: posts, stories, covers and 8 highlight covers. Use them as inspiration, or as they are after you put your own handle in the studio. |
| `brand/` | Logos (horizontal, ticket mark, round) and the three profile pictures (cream / ink / yellow). |
| `CONTENT-PLAYBOOK.md` | Bio, weekly posting plan, caption bank (EN + FR), hashtags, DM reply templates, a pre-post checklist. |
| `tools/` | Only needed if a developer wants to change the templates (see the bottom of this page). |

## Templates

| Template | Size | Use it for |
| --- | --- | --- |
| Product spotlight | 1080×1350 | One product: name, price sticker, 3 points, your photo (or generated artwork). |
| Promo / sale | 1080×1350 | Discounts with a giant number and an "ends…" sticker. |
| Customer review | 1080×1350 | A real review, stars, masked name, "verified purchase". |
| How to order | 1080×1350 | The 4 steps to buy. |
| AliExpress service | 1080×1350 | "We order it, you track it". |
| Price list | 1080×1350 | Up to 7 lines "name \| price" (subscriptions, keys, coins…). |
| Announcement | 1080×1350 | New arrival, back in stock, holiday hours. |
| Payment methods | 1080×1350 | D17, Binance Pay, bank, crypto. |
| Product / Flash sale / Review / Announcement story | 1080×1920 | Stories and WhatsApp status. |
| Order tracking story | 1080×1920 | Send it to a customer: shows the 8 stages with the current one highlighted. |
| Question box | 1080×1920 | Put Instagram's question sticker on top of the white box. |
| Facebook cover | 1640×624 | Keep everything in the middle 820 px: phones crop the sides. |
| Instagram highlight cover | 1080×1920 | Word + small text; Instagram shows the centre circle. Ready sets: Games, Keys, Coins, Subs, IEMs, Reviews, Track, How. |

Posts are 4:5 (1080×1350), the best size for the feed. Any post also works as a carousel slide.

## Using the studio

1. Open `studio.html`. Choose a template on the left.
2. On the right, change the texts. Long texts shrink to fit by themselves.
3. **Background**: six colours (yellow, orange, mint, pink, cream, ink). Pick one that differs from your last post.
4. **Your details** (bottom right): set your real Instagram handle and website once. They appear on every template.
5. **EN / FR** (top): loads the sample texts of that language. It replaces the texts you edited, so switch first, then edit.
6. **Download PNG**, then upload it to Instagram / Facebook.

Your edits are remembered by the browser. Product photos are not: choose the photo again next time.

Stories: keep important text out of the top and bottom 250 px, where Instagram puts its buttons. The templates already do.

## Rules that keep the look consistent

- Two fonts only: **Anton** for headlines, **JetBrains Mono** for small labels (and Instrument Sans for sentences).
- One colour background per post, black ink outlines, no gradients, no emoji stickers, no stock icons.
- Product photos: square or 4:5, one product, plain background. Without a photo the studio makes a poster-style cover.

## For developers

`tools/studio.src.html` is the source of the studio; `node marketing/social-kit/tools/build.mjs` embeds the
fonts and logos and writes `studio.html`. Templates are the `TEMPLATES` array in that file (one `render`
function each). The ready-made PNGs are produced by opening `studio.html?render=<template-id>&lang=fr`
in a browser and screenshotting the `.cv` element. Nothing here is part of the Next.js app.
