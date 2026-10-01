import "dotenv/config";
import { db, connectDatabase } from "./db";
import { CategoryRepository } from "./categories";
import { ProductRepository } from "./products";
import { CategoryService } from "../services/categories";
import { ProductService } from "../services/products";

// Demo catalogue so the storefront isn't empty. Safe to re-run: anything that
// already exists (by name) is skipped. Delete it all from /admin when you
// have your own products.
// The shop's shelves, in header-menu order.
const CATEGORIES = [
  { name: "Game Accounts", blurb: "Ready-to-play game accounts, delivered to your inbox." },
  { name: "Game Keys", blurb: "Game keys, delivered instantly by email." },
  { name: "Mobile Game Coins", blurb: "Top up Free Fire, eFootball and more." },
  { name: "Subscriptions", blurb: "Claude, ChatGPT and other subscriptions, by email." },
  { name: "IEMs", blurb: "In-ear monitors, delivered to your door." },
  { name: "AliExpress Picks", blurb: "New AliExpress deals every week. We order for you: 15-30 days to your door." },
];

type Seed = {
  name: string;
  category: string;
  type: "PHYSICAL" | "VIRTUAL";
  price: string;
  stock: string;
  featured?: boolean;
  description: string;
  // Optional options; when given, the price above is ignored (the lowest wins).
  variants?: { name: string; price: string; stock?: string }[];
  // AliExpress pick whose offer ends this many days from today (negative = already ended, to see "Offer ended").
  pickEndsInDays?: number;
};

const dayFromToday = (days: number) => Temporal.Now.plainDateISO("Africa/Tunis").add({ days }).toString();
const PICK = "Ordered from AliExpress for you: delivered in 15-30 days. Customs fees (from 4 DT per parcel) are paid on delivery.";

// 1 / 3 / 12 month options for a subscription, from three prices in dinars.
const months = (one: number, three: number, twelve: number) => [
  { name: "1 month", price: one.toFixed(3) },
  { name: "3 months", price: three.toFixed(3) },
  { name: "12 months", price: twelve.toFixed(3) },
];

const DELIVERY = "Delivered by email once payment is confirmed.";

const PRODUCTS: Seed[] = [
  { name: "Steam account — starter", category: "Game Accounts", type: "VIRTUAL", price: "35.000", stock: "", featured: true, description: "A ready-to-play Steam account with a game already in the library. " + DELIVERY, variants: [{ name: "1 game", price: "35.000" }, { name: "3 games", price: "85.000" }] },
  { name: "Game key — PC", category: "Game Keys", type: "VIRTUAL", price: "25.000", stock: "", description: "A game key you redeem on your platform. " + DELIVERY, variants: [{ name: "Standard", price: "25.000" }, { name: "Deluxe", price: "39.000" }] },
  { name: "Free Fire diamonds", category: "Mobile Game Coins", type: "VIRTUAL", price: "6.000", stock: "", featured: true, description: "Top up your Free Fire account by player ID. " + DELIVERY, variants: [{ name: "100 diamonds", price: "6.000" }, { name: "520 diamonds", price: "28.000" }, { name: "1080 diamonds", price: "55.000" }] },
  { name: "eFootball coins", category: "Mobile Game Coins", type: "VIRTUAL", price: "9.000", stock: "", description: "Coins for eFootball Mobile, sent to your account. " + DELIVERY, variants: [{ name: "130 coins", price: "9.000" }, { name: "300 coins", price: "20.000" }, { name: "1040 coins", price: "65.000" }] },
  { name: "ChatGPT Plus", category: "Subscriptions", type: "VIRTUAL", price: "75.000", stock: "", featured: true, description: "Faster answers, the latest models and image generation. Activation details are sent by email once payment is confirmed.", variants: months(75, 210, 780) },
  { name: "Claude Pro", category: "Subscriptions", type: "VIRTUAL", price: "75.000", stock: "", featured: true, description: "Higher usage limits and longer conversations. Activation details are sent by email once payment is confirmed.", variants: months(75, 210, 780) },
  { name: "In-ear monitors (IEM) — studio", category: "IEMs", type: "PHYSICAL", price: "89.000", stock: "20", featured: true, description: "Detachable-cable in-ear monitors with a balanced sound signature. Delivered to your door." },
  { name: "Wireless earbuds ANC — pick of the week", category: "AliExpress Picks", type: "PHYSICAL", price: "59.000", stock: "10", featured: true, pickEndsInDays: 6, description: "Active noise cancelling, 30 h battery with the case, USB-C. " + PICK, variants: [{ name: "Black", price: "59.000", stock: "6" }, { name: "White", price: "59.000", stock: "4" }] },
  { name: "Mechanical keyboard 65% hot-swap", category: "AliExpress Picks", type: "PHYSICAL", price: "119.000", stock: "5", pickEndsInDays: 6, description: "Hot-swappable switches, RGB, USB-C and 2.4 GHz wireless. " + PICK },
  { name: "Gaming mouse 26K DPI", category: "AliExpress Picks", type: "PHYSICAL", price: "45.000", stock: "", pickEndsInDays: 3, description: "Light 59 g shell, 26,000 DPI sensor, 4 kHz wireless. " + PICK },
  { name: "Phone cooler for gaming", category: "AliExpress Picks", type: "PHYSICAL", price: "35.000", stock: "", pickEndsInDays: -1, description: "Magnetic Peltier cooler, keeps your phone cool in long sessions. (Last week's pick: shows \"Offer ended\".) " + PICK },
];

async function main() {
  await connectDatabase();

  const existingCategories = await CategoryRepository.findAll();
  for (const [index, { name, blurb }] of CATEGORIES.entries()) {
    if (existingCategories.some((c) => c.name === name)) continue;

    const { id } = await CategoryService.create(name);
    await CategoryService.updateSettings(id, { blurb, nameFr: "", blurbFr: "", inNav: true, position: index + 1 });
  }
  const categories = await CategoryRepository.findAll();

  const existing = await ProductRepository.findMany({ includeInactive: true }, "newest", 500, 0);
  let created = 0;

  for (const seed of PRODUCTS) {
    if (existing.some((p) => p.name === seed.name)) continue;

    await ProductService.create({
      name: seed.name,
      description: seed.description,
      nameFr: "",
      descriptionFr: "",
      type: seed.type,
      price: seed.price,
      stock: seed.stock,
      categoryId: categories.find((c) => c.name === seed.category)?.id ?? "",
      imageUrls: "",
      variants: (seed.variants ?? []).map((v) => ({ name: v.name, price: v.price, stock: v.stock ?? "", imageUrl: "", active: true })),
      featured: seed.featured ?? false,
      active: true,
      aliexpressPick: seed.pickEndsInDays !== undefined,
      offerEndsAt: seed.pickEndsInDays !== undefined ? dayFromToday(seed.pickEndsInDays) : "",
    });
    created += 1;
  }

  console.log(`Seeded ${created} new product(s); ${categories.length} categories.`);
  await db.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
