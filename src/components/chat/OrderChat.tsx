"use client";

import { useEffect, useRef, useState } from "react";
import MessageBubble from "@/src/components/chat/MessageBubble";
import PaymentBar, { PaymentSentBox } from "@/src/components/chat/PaymentBar";
import { useOrderChat } from "@/src/components/chat/useOrderChat";
import ChatReviewCard from "@/src/components/chat/ChatReviewCard";
import { usePhotoAttachment } from "@/src/components/chat/usePhotoAttachment";
import { SENSITIVE_MESSAGE_DAYS, STORE_NAME } from "@/src/lib/store";
import { useT } from "@/src/i18n/client";

const MAX_LENGTH = 1000;

// A simple, private conversation about one order. `asAdmin` says which side of
// the conversation this screen is (the server double-checks it).
export default function OrderChat({ orderId, asAdmin }: { orderId: string; asAdmin: boolean }) {
  const t = useT();
  const chat = useOrderChat(orderId, asAdmin);
  const { photo, preview, pick, clear: clearPhoto } = usePhotoAttachment(chat.setError);
  const [text, setText] = useState("");
  const [sensitive, setSensitive] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Follow new messages only while the reader is already at the bottom.
  const stickToBottom = useRef(true);

  const scrollToBottom = () => {
    const log = logRef.current;
    if (log && stickToBottom.current) log.scrollTop = log.scrollHeight;
  };

  useEffect(scrollToBottom, [chat.messages]);

  const handleScroll = () => {
    const log = logRef.current;
    if (log) stickToBottom.current = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  };

  const send = async () => {
    if (chat.busy || (!text.trim() && !photo)) return;

    const message = await chat.send(text, photo, sensitive);
    if (!message) return;

    setText("");
    setSensitive(false);
    clearPhoto();
    stickToBottom.current = true;
    chat.appendMessage(message);
    chat.refresh();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <section className="chat" aria-label={t("chat.label")}>
      <header className="chatHead">
        <div>
          <h2>{asAdmin ? t("chat.withCustomer") : t("chat.withStore", { name: STORE_NAME })}</h2>
          <p className="muted">{t("chat.private")}</p>
        </div>
        {/* A delivered order's chat stays open until the team closes it. */}
        {asAdmin && chat.loaded && chat.closure !== "cancelled" && (
          <button
            type="button"
            className="btn btnGhost"
            disabled={chat.busy}
            onClick={() => {
              if (chat.closure === "store" || confirm(t("chat.closeConfirm"))) chat.setClosed(chat.closure !== "store");
            }}
          >
            {chat.closure === "store" ? t("chat.reopenChat") : t("chat.closeChat")}
          </button>
        )}
      </header>

      <p className="chatSafety">
        {asAdmin ? t("chat.safetyAdmin") : t("chat.safetyCustomer")}
      </p>

      <PaymentBar
        payment={chat.payment}
        closed={chat.closure === "cancelled"}
        asAdmin={asAdmin}
        busy={chat.busy}
        onAskNewProof={chat.askNewProof}
      />

      <div className="chatLog" ref={logRef} onScroll={handleScroll} role="log" aria-live="polite">
        {!chat.loaded && !chat.error && <p className="muted chatEmpty">{t("chat.loading")}</p>}
        {chat.loaded && chat.messages.length === 0 && (
          <p className="muted chatEmpty">
            {asAdmin ? t("chat.emptyAdmin") : t("chat.emptyCustomer")}
          </p>
        )}
        {chat.messages.map((message) => (
          <MessageBubble key={message.id} message={message} asAdmin={asAdmin} onImageLoad={scrollToBottom} onWipe={chat.wipe} />
        ))}
        {chat.review && <ChatReviewCard review={chat.review} onSaved={chat.refresh} />}
      </div>

      {chat.closed ? (
        <p className="chatClosed">{chat.closure === "cancelled" ? t("chat.closed") : asAdmin ? t("chat.closedByYou") : t("chat.closedByStore")}</p>
      ) : (
        <form className="chatForm" onSubmit={handleSubmit}>
          {preview && (
            <div className="photoPreview">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
              <img src={preview} alt={t("chat.photoToSend")} />
              <button type="button" onClick={clearPhoto} aria-label={t("chat.removePhoto")}>
                ×
              </button>
            </div>
          )}
          <div className="chatRow">
            {chat.payment?.online && (
              <>
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={pick} />
                <button type="button" className="attachBtn" onClick={() => fileRef.current?.click()} aria-label={t("chat.attachLabel")} title={t("chat.attachTitle")}>
                  {t("chat.attach")}
                </button>
              </>
            )}
            <textarea
              className="input"
              rows={2}
              placeholder={t("chat.placeholder")}
              value={text}
              maxLength={MAX_LENGTH}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              aria-label={t("chat.message")}
            />
            <button type="submit" className="btn btnPrimary" disabled={chat.busy || (!text.trim() && !photo)}>
              {chat.busy ? t("chat.sending") : t("chat.send")}
            </button>
          </div>
          {!asAdmin && <PaymentSentBox payment={chat.payment} busy={chat.busy} onMarkSent={chat.markSent} />}
          <label className="check chatSecret">
            <input type="checkbox" checked={sensitive} onChange={(e) => setSensitive(e.target.checked)} />
            <span>
              {t("chat.sensitiveLabel")}
              <span className="hint"> — {t("chat.sensitiveHint", { days: SENSITIVE_MESSAGE_DAYS })}</span>
            </span>
          </label>
        </form>
      )}
      {chat.error && <p className="error" role="alert">{chat.error}</p>}
    </section>
  );
}
