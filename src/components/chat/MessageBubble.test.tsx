// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import MessageBubble from "./MessageBubble";
import type { ChatMessage } from "@/src/services/messages";
import { STORE_NAME } from "@/src/lib/store";
import { en } from "@/src/i18n/messages/en";
import { fr } from "@/src/i18n/messages/fr";
import { renderWithLocale } from "@/src/test/render";

function message(changes: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "msg-1",
    fromAdmin: false,
    senderName: null,
    body: "Hello, is my order ready?",
    hasImage: false,
    sensitive: false,
    wiped: false,
    createdAt: new Date().toISOString(),
    ...changes,
  };
}

function bubble(msg: ChatMessage, asAdmin = false, onWipe = vi.fn()) {
  renderWithLocale(<MessageBubble message={msg} asAdmin={asAdmin} onImageLoad={() => {}} onWipe={onWipe} />);
  return { onWipe };
}

describe("MessageBubble", () => {
  it("shows the customer's own message as theirs", () => {
    bubble(message());

    expect(screen.getByText("Hello, is my order ready?")).toBeTruthy();
    expect(screen.getByText(en.chat.you).closest(".msg")?.className).toContain("msgMine");
  });

  it("labels store messages with the store name for the customer", () => {
    bubble(message({ fromAdmin: true, senderName: "Dario" }));

    expect(screen.getByText(STORE_NAME)).toBeTruthy();
    expect(screen.queryByText(/Dario ·|· Dario/)).toBeNull();
  });

  it("shows admins which staff member wrote a store message", () => {
    bubble(message({ fromAdmin: true, senderName: "Dario" }), true);
    expect(screen.getByText(`${en.chat.you} · Dario`)).toBeTruthy();
  });

  it("shows the photo through the private image route", () => {
    bubble(message({ hasImage: true, body: "" }));

    const img = screen.getByAltText(en.chat.attachedPhoto) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/api/chat-images/msg-1");
  });

  it("hides login details until the person taps Show", () => {
    bubble(message({ sensitive: true, body: "login: sami / pass123" }));

    expect(screen.queryByText("login: sami / pass123")).toBeNull();
    expect(screen.getByText(en.chat.secretHidden)).toBeTruthy();

    fireEvent.click(screen.getByText(en.chat.show));
    expect(screen.getByText("login: sami / pass123")).toBeTruthy();

    fireEvent.click(screen.getByText(en.chat.hide));
    expect(screen.queryByText("login: sami / pass123")).toBeNull();
  });

  it("deletes login details only after confirming", () => {
    const confirm = vi.spyOn(window, "confirm");
    const { onWipe } = bubble(message({ sensitive: true }));

    confirm.mockReturnValueOnce(false);
    fireEvent.click(screen.getByText(en.chat.wipeNow));
    expect(onWipe).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    fireEvent.click(screen.getByText(en.chat.wipeNow));
    expect(onWipe).toHaveBeenCalledWith("msg-1");
  });

  it("shows a deleted notice instead of wiped login details", () => {
    bubble(message({ sensitive: true, wiped: true, body: "" }));

    expect(screen.getByText(en.chat.wiped)).toBeTruthy();
    expect(screen.queryByText(en.chat.show)).toBeNull();
  });

  it("speaks French when the visitor chose French", () => {
    renderWithLocale(<MessageBubble message={message()} asAdmin={false} onImageLoad={() => {}} onWipe={() => {}} />, "fr");
    expect(screen.getByText(fr.chat.you)).toBeTruthy();
  });
});
