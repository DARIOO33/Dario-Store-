// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

vi.mock("@/src/actions/reviews", () => ({ submitReviewAction: vi.fn() }));

import { submitReviewAction } from "@/src/actions/reviews";
import ChatReviewCard from "./ChatReviewCard";
import type { ChatReview } from "@/src/services/messages";
import { en } from "@/src/i18n/messages/en";
import { fr } from "@/src/i18n/messages/fr";
import { renderWithLocale } from "@/src/test/render";

const submit = vi.mocked(submitReviewAction);

const review: ChatReview = {
  reviewerName: "Sami Ben Ali",
  items: [
    { productId: "iem", name: "KZ Castor", existing: null },
    { productId: "netflix", name: "Netflix 1 month", existing: { rating: 4, message: "Fast", hideName: false } },
  ],
};

beforeEach(() => {
  submit.mockReset();
  submit.mockResolvedValue({ ok: true });
});

describe("ChatReviewCard", () => {
  it("asks the customer to rate each product", () => {
    renderWithLocale(<ChatReviewCard review={review} onSaved={() => {}} />);

    expect(screen.getByText(en.chat.reviewTitle)).toBeTruthy();
    expect(screen.getByText("KZ Castor")).toBeTruthy();
    expect(screen.getByText(en.reviews.post)).toBeTruthy();
  });

  it("shows an existing review as done, with an Edit button that opens the form filled in", () => {
    renderWithLocale(<ChatReviewCard review={review} onSaved={() => {}} />);

    expect(screen.getByText(en.chat.reviewDone, { exact: false })).toBeTruthy();
    fireEvent.click(screen.getByText(en.chat.reviewEdit));
    expect(screen.getByDisplayValue("Fast")).toBeTruthy();
    expect(screen.getByText(en.reviews.update)).toBeTruthy();
  });

  it("needs a star rating before sending", () => {
    renderWithLocale(<ChatReviewCard review={review} onSaved={() => {}} />);

    fireEvent.click(screen.getByText(en.reviews.post));
    expect(screen.getByRole("alert").textContent).toBe(en.reviews.ratingRequired);
    expect(submit).not.toHaveBeenCalled();
  });

  it("posts the review through the normal review action, then refreshes the chat", async () => {
    const onSaved = vi.fn();
    const { container } = renderWithLocale(<ChatReviewCard review={review} onSaved={onSaved} />);

    fireEvent.click(container.querySelector('input[name="rating-iem"][value="5"]')!);
    fireEvent.change(screen.getAllByPlaceholderText(en.reviews.placeholder)[0]!, { target: { value: "Great bass" } });
    fireEvent.click(screen.getByText(en.reviews.hideName));
    fireEvent.click(screen.getByText(en.reviews.post));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(submit).toHaveBeenCalledWith("iem", { rating: 5, message: "Great bass", hideName: true });
  });

  it("previews the masked name when 'hide my name' is ticked", () => {
    renderWithLocale(<ChatReviewCard review={review} onSaved={() => {}} />);

    expect(screen.getByText("Sami Ben Ali")).toBeTruthy();
    fireEvent.click(screen.getByText(en.reviews.hideName));
    expect(screen.getByText("S***i B***n A***i")).toBeTruthy();
  });

  it("shows the server's error (for example: not a buyer)", async () => {
    submit.mockResolvedValue({ ok: false, error: "Only customers who bought this product can review it." });
    const { container } = renderWithLocale(<ChatReviewCard review={review} onSaved={() => {}} />);

    fireEvent.click(container.querySelector('input[name="rating-iem"][value="3"]')!);
    fireEvent.click(screen.getByText(en.reviews.post));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Only customers"));
  });

  it("speaks French", () => {
    renderWithLocale(<ChatReviewCard review={review} onSaved={() => {}} />, "fr");
    expect(screen.getByText(fr.chat.reviewTitle)).toBeTruthy();
  });
});
