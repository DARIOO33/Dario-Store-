// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import PaymentBar, { PaymentSentBox } from "./PaymentBar";
import type { ChatPayment } from "@/src/services/messages";
import { en } from "@/src/i18n/messages/en";
import { renderWithLocale } from "@/src/test/render";

function payment(changes: Partial<ChatPayment> = {}): ChatPayment {
  return { online: true, canMarkSent: false, hasProof: false, sentAt: null, canRequestNewProof: false, stage: null, ...changes };
}

describe("PaymentSentBox (customer's Payment sent button)", () => {
  it("is hidden when the customer can't mark the payment as sent", () => {
    renderWithLocale(<PaymentSentBox payment={payment()} busy={false} onMarkSent={() => {}} />);
    expect(screen.queryByText(en.chat.paymentSentButton)).toBeNull();
  });

  it("stays disabled until a proof photo is uploaded", () => {
    renderWithLocale(<PaymentSentBox payment={payment({ canMarkSent: true })} busy={false} onMarkSent={() => {}} />);

    expect(screen.getByText(en.chat.proofNeeded)).toBeTruthy();
    expect((screen.getByText(en.chat.paymentSentButton) as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls onMarkSent once the proof is there", () => {
    const onMarkSent = vi.fn();
    renderWithLocale(<PaymentSentBox payment={payment({ canMarkSent: true, hasProof: true })} busy={false} onMarkSent={onMarkSent} />);

    fireEvent.click(screen.getByText(en.chat.paymentSentButton));
    expect(onMarkSent).toHaveBeenCalledOnce();
  });

  it("is disabled while another action runs", () => {
    renderWithLocale(<PaymentSentBox payment={payment({ canMarkSent: true, hasProof: true })} busy onMarkSent={() => {}} />);
    expect((screen.getByText(en.chat.paymentSentButton) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("PaymentBar (banner above the messages)", () => {
  const sent = payment({ sentAt: "2026-09-21T08:00:00Z" });

  it("tells the customer the store is checking their payment", () => {
    renderWithLocale(<PaymentBar payment={sent} closed={false} asAdmin={false} busy={false} onAskNewProof={() => {}} />);
    expect(screen.getByText(en.chat.waitingForStore)).toBeTruthy();
  });

  it("lets the admin ask for a new proof", () => {
    const onAskNewProof = vi.fn();
    renderWithLocale(<PaymentBar payment={{ ...sent, canRequestNewProof: true }} closed={false} asAdmin busy={false} onAskNewProof={onAskNewProof} />);

    expect(screen.getByText(en.chat.customerSaysSent)).toBeTruthy();
    fireEvent.click(screen.getByText(en.chat.askNewProof));
    expect(onAskNewProof).toHaveBeenCalledOnce();
  });

  it("shows the order's stage instead once the payment is confirmed", () => {
    renderWithLocale(<PaymentBar payment={{ ...sent, stage: { status: "PAID", at: "2026-09-22T09:30:00Z" } }} closed={false} asAdmin={false} busy={false} onAskNewProof={() => {}} />);

    expect(screen.getByText(en.chat.stage.PAID)).toBeTruthy();
    expect(screen.queryByText(en.chat.waitingForStore)).toBeNull();
  });

  it("shows nothing on a cancelled order", () => {
    const { container } = renderWithLocale(<PaymentBar payment={sent} closed asAdmin={false} busy={false} onAskNewProof={() => {}} />);
    expect(container.textContent).toBe("");
  });
});
