"use server";

// Server actions for reviews: check who is calling, hand the input to the
// service, and refresh the pages that show the result.

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireRole } from "../lib/session";
import { safely } from "../lib/result";
import { ReviewService } from "../services/reviews";

function refreshReviews() {
  revalidatePath("/", "layout");
}

export async function submitReviewAction(productId: string, input: { rating: number; message: string; hideName: boolean }) {
  const user = await getCurrentUser();

  return await safely(async () => {
    await ReviewService.submit(user, String(productId), {
      rating: Number(input?.rating),
      message: String(input?.message ?? ""),
      hideName: input?.hideName === true,
    });
    refreshReviews();
  });
}

export async function deleteReviewAction(reviewId: string) {
  const user = await getCurrentUser();

  return await safely(async () => {
    await ReviewService.remove(user, String(reviewId));
    refreshReviews();
  });
}

export async function setReviewHiddenAction(reviewId: string, hidden: boolean) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await ReviewService.setHidden(String(reviewId), hidden === true);
    refreshReviews();
  });
}

export async function replyToReviewAction(reviewId: string, text: string) {
  await requireRole("ADMIN");

  return await safely(async () => {
    await ReviewService.reply(String(reviewId), String(text ?? ""));
    refreshReviews();
  });
}
