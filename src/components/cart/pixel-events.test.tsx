// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("@/src/lib/meta-pixel", () => ({ pixel: { addToCart: vi.fn(), purchase: vi.fn(), pageView: vi.fn() }, loadMetaPixel: vi.fn() }));
const cart = vi.hoisted(() => ({ add: vi.fn(), clear: vi.fn(), ready: true }));
vi.mock("@/src/components/cart/CartProvider", () => ({ useCart: () => cart }));
const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));

import { loadMetaPixel, pixel } from "@/src/lib/meta-pixel";
import { AddToCartPanel, QuickAdd } from "./AddToCart";
import ClearCartAfterOrder from "./ClearCartAfterOrder";
import MetaPixel from "@/src/components/layout/MetaPixel";
import { rememberPlacedOrder } from "@/src/lib/placed-order";
import { en } from "@/src/i18n/messages/en";
import { renderWithLocale } from "@/src/test/render";

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  route.pathname = "/";
});

describe("Meta Pixel events in the shop", () => {
  it("the product page's add button reports AddToCart with the chosen quantity", () => {
    renderWithLocale(<AddToCartPanel productId="p-1" name="KZ Castor (Bass)" priceMillimes={60_000} available stock={5} />);
    fireEvent.click(screen.getByLabelText(en.cart.increase));
    fireEvent.click(screen.getByText(en.cart.addToCart));

    expect(cart.add).toHaveBeenCalledWith({ productId: "p-1", variantId: null }, 2, 5);
    expect(pixel.addToCart).toHaveBeenCalledWith({ productId: "p-1", name: "KZ Castor (Bass)", priceMillimes: 60_000, quantity: 2 });
  });

  it("the card's + reports AddToCart for one item", () => {
    renderWithLocale(<QuickAdd productId="p-2" name="Netflix" priceMillimes={20_000} available stock={null} />);
    fireEvent.click(screen.getByLabelText(en.cart.addToCartLabel));
    expect(pixel.addToCart).toHaveBeenCalledWith({ productId: "p-2", name: "Netflix", priceMillimes: 20_000, quantity: 1 });
  });

  it("the thank-you page reports the purchase once, only for the order this browser just placed", () => {
    const lines = [{ productId: "p-1", quantity: 1, priceMillimes: 50_000 }];
    rememberPlacedOrder("order-1");

    const first = render(<ClearCartAfterOrder orderId="order-1" totalMillimes={57_000} lines={lines} />);
    first.unmount();
    render(<ClearCartAfterOrder orderId="order-1" totalMillimes={57_000} lines={lines} />); // page opened again
    render(<ClearCartAfterOrder orderId="order-old" totalMillimes={10_000} lines={lines} />); // an old link

    expect(pixel.purchase).toHaveBeenCalledOnce();
    expect(pixel.purchase).toHaveBeenCalledWith("order-1", lines, 57_000);
    expect(cart.clear).toHaveBeenCalledOnce();
  });

  it("counts page views in the shop but never in the admin area", () => {
    const view = render(<MetaPixel pixelId="1231199037661013" />);
    expect(loadMetaPixel).toHaveBeenCalledWith("1231199037661013");
    expect(pixel.pageView).toHaveBeenCalledOnce();

    route.pathname = "/admin/orders";
    view.rerender(<MetaPixel pixelId="1231199037661013" />);
    expect(pixel.pageView).toHaveBeenCalledOnce();
  });
});
