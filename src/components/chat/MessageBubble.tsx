"use client";

import { useState } from "react";
import type { ChatMessage } from "@/src/services/messages";
import { timeLabel } from "@/src/components/chat/format";
import { STORE_NAME } from "@/src/lib/store";
import { useT } from "@/src/i18n/client";

type Props = {
  message: ChatMessage;
  asAdmin: boolean;
  // Called when a photo finishes loading, so the log can stay scrolled to the bottom.
  onImageLoad: () => void;
  // Erases a login-details message for good.
  onWipe: (messageId: string) => void;
};

export default function MessageBubble({ message, asAdmin, onImageLoad, onWipe }: Props) {
  const t = useT();
  const mine = message.fromAdmin === asAdmin;
  // Login details start hidden: nobody reads them over your shoulder or in a screenshot by accident.
  const [shown, setShown] = useState(false);

  const photo = message.hasImage && (
    <a href={`/api/chat-images/${message.id}`} target="_blank" rel="noopener noreferrer" className="msgPhoto">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, authenticated image */}
      <img src={`/api/chat-images/${message.id}`} alt={t("chat.attachedPhoto")} onLoad={onImageLoad} />
    </a>
  );

  return (
    <div className={`msg ${mine ? "msgMine" : "msgTheirs"}`}>
      <span className="msgWho">
        {mine ? t("chat.you") : message.fromAdmin ? STORE_NAME : t("chat.customer")}
        {/* Admins see which staff member wrote a store message ("automatic" = sent by the shop itself). */}
        {asAdmin && message.fromAdmin && ` · ${message.senderName ?? "automatic"}`}
      </span>

      {message.wiped ? (
        <p className="msgWiped">{t("chat.wiped")}</p>
      ) : message.sensitive ? (
        <div className="msgSecret">
          <span className="msgSecretTag">{t("chat.secretTag")}</span>
          {shown ? (
            <>
              {photo}
              {message.body && <p>{message.body}</p>}
            </>
          ) : (
            <p className="muted">{t("chat.secretHidden")}</p>
          )}
          <span className="msgSecretActions">
            <button type="button" className="linkBtn" onClick={() => setShown((value) => !value)}>
              {shown ? t("chat.hide") : t("chat.show")}
            </button>
            <button
              type="button"
              className="linkBtn"
              onClick={() => {
                if (confirm(t("chat.wipeConfirm"))) onWipe(message.id);
              }}
            >
              {t("chat.wipeNow")}
            </button>
          </span>
        </div>
      ) : (
        <>
          {photo}
          {message.body && <p>{message.body}</p>}
        </>
      )}

      <time dateTime={message.createdAt}>{timeLabel(message.createdAt, t.locale)}</time>
    </div>
  );
}
