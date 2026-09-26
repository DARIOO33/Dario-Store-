"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { markPaymentSentAction, openChatAction, requestNewProofAction, sendChatMessageAction, setChatClosedAction, wipeChatMessageAction } from "@/src/actions/messages";
import type { ChatClosure, ChatMessage, ChatPayment, ChatReview, ProblemReportState } from "@/src/services/messages";

const POLL_MS = 5000;

// Talks to the server for one order's chat. It refreshes every few seconds
// while the tab is visible — no websockets to keep alive. Opening the chat also
// marks the other side's messages as read (done server-side).
export function useOrderChat(orderId: string, asAdmin: boolean) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [payment, setPayment] = useState<ChatPayment | null>(null);
  const [closure, setClosure] = useState<ChatClosure>(null);
  const [review, setReview] = useState<ChatReview | null>(null);
  const [problemReport, setProblemReport] = useState<ProblemReportState | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const result = await openChatAction(orderId, asAdmin);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessages(result.messages);
    setClosure(result.closure);
    setReview(result.review);
    setProblemReport(result.problemReport);
    setPayment(result.payment);
    setLoaded(true);
  }, [orderId, asAdmin]);

  useEffect(() => {
    // The first fetch happens after mount; later ones come from the timer.
    const first = setTimeout(refresh, 0);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh]);

  // Sends a message; returns it when the server accepted it, or null (with
  // `error` set) when it didn't.
  const send = async (text: string, photo: File | null, sensitive: boolean) => {
    setBusy(true);
    setError("");

    const form = new FormData();
    form.set("text", text);
    if (photo) form.set("image", photo);
    if (sensitive) form.set("sensitive", "true");

    const result = await sendChatMessageAction(orderId, asAdmin, form);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return null;
    }
    return result.message;
  };

  const wipe = async (messageId: string) => {
    const result = await wipeChatMessageAction(orderId, asAdmin, messageId);
    if (!result.ok) setError(result.error);
    await refresh();
  };

  const appendMessage = (message: ChatMessage) =>
    setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));

  // Runs a payment action, then reloads the chat and the surrounding page (the
  // order page shows the payment state too).
  const runPaymentAction = async (action: (orderId: string) => Promise<{ ok: boolean } & { error?: string }>) => {
    setBusy(true);
    setError("");
    const result = await action(orderId);
    if (!result.ok) setError(result.error ?? "");
    await refresh();
    router.refresh();
    setBusy(false);
  };

  return {
    messages,
    payment,
    closed: closure !== null,
    closure,
    review,
    problemReport,
    loaded,
    error,
    busy,
    setError,
    refresh,
    send,
    wipe,
    appendMessage,
    markSent: () => runPaymentAction(markPaymentSentAction),
    askNewProof: () => runPaymentAction(requestNewProofAction),
    // The team's "Close chat" / "Reopen chat".
    setClosed: (closed: boolean) => runPaymentAction((id) => setChatClosedAction(id, closed)),
  };
}
