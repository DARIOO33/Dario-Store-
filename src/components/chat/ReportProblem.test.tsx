// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

vi.mock("@/src/actions/messages", () => ({ reportProblemAction: vi.fn() }));

import { reportProblemAction } from "@/src/actions/messages";
import ReportProblem from "./ReportProblem";
import { CONTACT } from "@/src/lib/store";
import { en } from "@/src/i18n/messages/en";
import { renderWithLocale } from "@/src/test/render";

const report = vi.mocked(reportProblemAction);
const available = { kind: "available" as const, until: "2026-10-26T10:00:00Z" };

beforeEach(() => {
  report.mockReset();
  report.mockResolvedValue({ ok: true });
});

describe("ReportProblem", () => {
  it("offers the button with the last day it can be used", () => {
    renderWithLocale(<ReportProblem orderId="o-1" state={available} onReported={() => {}} />);

    expect(screen.getByText(en.chat.problemIntro)).toBeTruthy();
    expect(screen.getByText(/You can report a problem until 26 Oct/)).toBeTruthy();
    expect(screen.getByRole("button", { name: en.chat.problemButton })).toBeTruthy();
  });

  it("asks what is wrong before sending", () => {
    renderWithLocale(<ReportProblem orderId="o-1" state={available} onReported={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: en.chat.problemButton }));
    fireEvent.change(screen.getByPlaceholderText(en.chat.problemPlaceholder), { target: { value: "The key says already used" } });
    fireEvent.click(screen.getByRole("button", { name: en.chat.problemSend }));

    expect(screen.getByRole("alert").textContent).toBe(en.errors.problemReason);
    expect(report).not.toHaveBeenCalled();
  });

  it("sends the reason and the message, then refreshes the chat", async () => {
    const onReported = vi.fn();
    renderWithLocale(<ReportProblem orderId="o-1" state={available} onReported={onReported} />);
    fireEvent.click(screen.getByRole("button", { name: en.chat.problemButton }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "WRONG_ITEM" } });
    fireEvent.change(screen.getByPlaceholderText(en.chat.problemPlaceholder), { target: { value: "I got the EU key, not TN" } });
    fireEvent.click(screen.getByRole("button", { name: en.chat.problemSend }));

    await waitFor(() => expect(onReported).toHaveBeenCalled());
    expect(report).toHaveBeenCalledWith("o-1", "WRONG_ITEM", "I got the EU key, not TN");
  });

  it("shows the server's refusal", async () => {
    report.mockResolvedValue({ ok: false, error: en.errors.problemWait });
    renderWithLocale(<ReportProblem orderId="o-1" state={available} onReported={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: en.chat.problemButton }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "OTHER" } });
    fireEvent.change(screen.getByPlaceholderText(en.chat.problemPlaceholder), { target: { value: "help" } });
    fireEvent.click(screen.getByRole("button", { name: en.chat.problemSend }));

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(en.errors.problemWait));
  });

  it("after the window, shows the shop's contact channels instead of the button", () => {
    renderWithLocale(<ReportProblem orderId="o-1" state={{ kind: "expired", days: 30 }} onReported={() => {}} />);

    expect(screen.getByText(/up to 30 days after delivery/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.chat.problemButton })).toBeNull();
    if (CONTACT.instagram) expect(screen.getByRole("link", { name: new RegExp(CONTACT.instagram) }).getAttribute("href")).toBe(`https://instagram.com/${CONTACT.instagram}`);
  });

  it("after a recent report, says when it can be used again and shows the contact channels", () => {
    renderWithLocale(<ReportProblem orderId="o-1" state={{ kind: "wait", after: "2026-09-27T10:00:00Z" }} onReported={() => {}} />);
    expect(screen.getByText(/You can report again after 27 Sept/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: en.chat.problemButton })).toBeNull();
  });
});
