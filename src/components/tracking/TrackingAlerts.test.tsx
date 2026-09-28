// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";

vi.mock("@/src/actions/tracking", () => ({ requestTrackingAlertsCodeAction: vi.fn(), verifyTrackingAlertsAction: vi.fn() }));

import { requestTrackingAlertsCodeAction, verifyTrackingAlertsAction } from "@/src/actions/tracking";
import TrackingAlerts from "./TrackingAlerts";
import { en } from "@/src/i18n/messages/en";
import { renderWithLocale } from "@/src/test/render";

const request = vi.mocked(requestTrackingAlertsCodeAction);
const verify = vi.mocked(verifyTrackingAlertsAction);

beforeEach(() => {
  vi.resetAllMocks();
  request.mockResolvedValue({ ok: true, alreadyEnabled: false });
  verify.mockResolvedValue({ ok: true });
});

const typeEmail = () => {
  fireEvent.change(screen.getByLabelText(en.tracking.alertsEmail), { target: { value: "zz-sami@example.tn" } });
  fireEvent.click(screen.getByRole("button", { name: en.tracking.alertsSend }));
};

describe("TrackingAlerts", () => {
  it("email -> code (with the spam note) -> 'updates are on'", async () => {
    renderWithLocale(<TrackingAlerts trackingCode="DS-7K4Q9-X2M3F" />);
    typeEmail();

    await screen.findByText(/We sent a 6-digit code to zz-sami@example.tn\. Can't find it\? Check your spam or junk folder\./);
    expect(request).toHaveBeenCalledWith("DS-7K4Q9-X2M3F", "zz-sami@example.tn");

    fireEvent.change(screen.getByLabelText(en.tracking.alertsCode), { target: { value: "12 34 56" } });
    fireEvent.click(screen.getByRole("button", { name: en.tracking.alertsVerify }));

    await screen.findByText("Email updates are on for zz-sami@example.tn. You'll get an email at every change.");
    expect(verify).toHaveBeenCalledWith("DS-7K4Q9-X2M3F", "zz-sami@example.tn", "123456");
  });

  it("says so when the address already gets updates (no code sent)", async () => {
    request.mockResolvedValue({ ok: true, alreadyEnabled: true });
    renderWithLocale(<TrackingAlerts trackingCode="DS-7K4Q9-X2M3F" />);
    typeEmail();
    await screen.findByText("Email updates are already on for zz-sami@example.tn.");
  });

  it("keeps the code step until the right code is typed, and shows why", async () => {
    verify.mockResolvedValue({ ok: false, error: en.errors.trackingCodeInvalid });
    renderWithLocale(<TrackingAlerts trackingCode="DS-7K4Q9-X2M3F" />);
    typeEmail();
    await screen.findByLabelText(en.tracking.alertsCode);

    fireEvent.change(screen.getByLabelText(en.tracking.alertsCode), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: en.tracking.alertsVerify }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(en.errors.trackingCodeInvalid));
    expect(screen.getByLabelText(en.tracking.alertsCode)).toBeTruthy();
  });
});
