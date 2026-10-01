// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import CheckoutFields, { type CheckoutForm } from "./CheckoutFields";
import { en } from "@/src/i18n/messages/en";
import { renderWithLocale } from "@/src/test/render";

const form: CheckoutForm = { name: "Sami", email: "zz-sami@example.tn", phone: "", address: "", city: "", postalCode: "", notes: "", paymentMethod: "", cryptoNetwork: "" };

function fields(isPick: boolean, onAccept = vi.fn(), accepted = false) {
  renderWithLocale(
    <CheckoutFields
      form={form} onChange={() => () => {}} onSubmit={() => {}} error="" signedIn needsLogin={false} requiresShipping hasVirtual={isPick}
      isPick={isPick} acceptedPickTerms={accepted} onAcceptPickTerms={onAccept} availability={{ responseMinutes: 15, awayUntilMs: null }}
    />,
  );
  return onAccept;
}

describe("AliExpress Picks terms at checkout", () => {
  it("shows the key terms, including the unboxing video, with a required checkbox", () => {
    const onAccept = fields(true);

    for (const text of [en.checkout.picksTermDelivery, en.checkout.picksTermCustoms, en.checkout.picksTermVideo, en.checkout.picksTermPrepaid]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    const box = screen.getByRole("checkbox", { name: new RegExp(en.checkout.picksAccept) }) as HTMLInputElement;
    expect(box.required).toBe(true);
    expect(screen.getByRole("link", { name: en.checkout.picksReadAll }).getAttribute("href")).toBe("/terms#aliexpress-picks");

    fireEvent.click(box);
    expect(onAccept).toHaveBeenCalledWith(true);
  });

  it("isn't shown for a normal order", () => {
    fields(false);
    expect(screen.queryByText(en.checkout.picksTermsTitle)).toBeNull();
  });
});
