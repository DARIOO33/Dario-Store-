import type { LegalTexts } from "./types";

export const legalEn: LegalTexts = {
  terms: {
    title: "Terms of sale",
    intro: "These terms apply to every order placed on {store}. By placing an order you accept them.",
    sections: [
      {
        heading: "What we sell",
        paragraphs: [
          "Digital products (game accounts, game keys, mobile game coins, subscriptions) delivered by email or in your private order chat, and physical products (IEMs) delivered in Tunisia.",
          "Product pages describe what you receive, including the platform, region and duration where it matters. Please read them before ordering; ask us in the chat if anything is unclear.",
        ],
      },
      {
        heading: "Prices and payment",
        paragraphs: [
          "Prices are in Tunisian dinar (DT) and are checked again by the server when you order. Physical orders may have a delivery fee, shown before you order.",
          "Digital products are paid online with one of the methods offered at checkout, then confirmed by us after we check your proof of payment. Physical products are paid in cash on delivery.",
          "Only pay to the details shown on your order page. We will never ask for your password or login codes.",
        ],
      },
      {
        heading: "Delivery",
        paragraphs: [
          "Digital products are delivered after your payment is confirmed, usually within about an hour during our opening hours ({from}:00–{to}:00, Tunisia time). Orders confirmed at night are delivered when we are back.",
          "Physical products are delivered to the address you give at checkout. Delivery times depend on the courier.",
          "Some top-ups require access to your game account. Send those details only in your order chat with “This message contains login details” ticked, and change your password once the order is done.",
        ],
      },
      {
        heading: "Cancellations and refunds",
        paragraphs: [
          "You can cancel an order yourself from your order page while it is still pending (before we confirm payment).",
          "Once a digital product has been delivered it cannot be returned, because it can't be taken back. If it doesn't work or isn't what the product page describes, tell us in the order chat within 7 days: we will fix it, replace it or refund you.",
          "If we cancel a paid order (for example, a product is no longer available), we refund the full amount using the same payment method where possible.",
          "Physical products must be checked at delivery. Report a damaged or wrong item within 7 days in the order chat or through our contact channels.",
        ],
      },
      {
        heading: "Your account",
        paragraphs: [
          "Keep your login details private. Orders placed from your account are considered placed by you.",
          "We may refuse or cancel an order in case of suspected fraud, a pricing error or misuse of the shop.",
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "This page explains what {store} collects about you, why, and what you can ask us to do with it.",
    sections: [
      {
        heading: "What we collect",
        paragraphs: [
          "Your account: name, email and password (stored hashed; we never see it), or your Google account's name and email if you sign in with Google.",
          "Your orders: what you bought, prices, the payment method, and for deliveries your phone number and address.",
          "Your order chat: messages and photos you send (for example, payment proofs).",
          "For AliExpress orders we manage for you: the name, phone, address and item you give us.",
        ],
      },
      {
        heading: "Why we use it",
        paragraphs: [
          "Only to run the shop: to take and deliver your orders, check payments, answer you, send order emails and prevent fraud. We don't sell your data and don't send advertising emails.",
        ],
      },
      {
        heading: "How we protect it",
        paragraphs: [
          "Order chats and their photos are stored encrypted. Chat photos are kept as private files that only you and our team can open.",
          "Messages marked as containing login details stay hidden until opened and are erased automatically after {days} days; either side can erase them earlier.",
          "Public tracking pages for AliExpress orders show your name, phone and address only partly (masked).",
        ],
      },
      {
        heading: "Who else handles it",
        paragraphs: [
          "Service providers that help run the shop: our hosting and database provider, Cloudinary (image storage), our email provider (order emails), and Google if you choose to sign in with Google. They process data only to provide their service.",
        ],
      },
      {
        heading: "Cookies and storage",
        paragraphs: [
          "We use a login cookie (to keep you signed in), a language cookie (English or French), and your browser's storage for your cart. No advertising or tracking cookies.",
        ],
      },
      {
        heading: "How long we keep it",
        paragraphs: ["Orders and their chat are kept as long as needed for the order, after-sales service and our accounting obligations. You can ask us to delete your account at any time."],
      },
      {
        heading: "Your rights",
        paragraphs: ["You can ask to see, correct or delete your personal data by contacting us through the channels below."],
      },
    ],
  },
};
